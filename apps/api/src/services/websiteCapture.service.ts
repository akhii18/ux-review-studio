import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { AppError } from "../middleware/errorHandler";
import { config } from "../config";
import { prisma } from "../config/prisma";
import { uploadReviewAssetToStorage } from "./supabaseStorage";

const DEFAULT_MAX_SCREENS = 8;
const MAX_SCREEN_LIMIT = 16;
const NAVIGATION_TIMEOUT_MS = 30000;
const MAX_VISIBLE_TEXT_CHARS = 6000;
const MAX_LINKS_PER_PAGE = 12;

export type WebsiteCapturedScreen = {
  name: string;
  mimeType: string;
  base64Data: string;
  sizeBytes: number;
  contentText: string;
  sourceUrl: string;
  title: string;
};

export type WebsiteCaptureResult = {
  requestedUrl: string;
  finalUrl: string;
  screens: WebsiteCapturedScreen[];
  visitedUrls: string[];
  titles: string[];
  navigationSummary: string;
};

type BrowserLaunchCandidate = {
  label: string;
  executablePath?: string;
  channel?: "chrome" | "msedge";
};

type ScreenCandidate = {
  hash: string;
  screen: WebsiteCapturedScreen;
};

type CrawlQueueItem = {
  url: string;
  depth: number;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePotentialUrl(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/^['"`]+|['"`]+$/g, "")
    .trim();
}

function sanitizeFileStem(value: string): string {
  const normalized = normalizeWhitespace(value)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "page";
}

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false;
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true;

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;

  return false;
}

function isDisallowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host) return true;
  if (host === "localhost") return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "0.0.0.0" || host === "::1" || host === "[::1]") return true;
  if (isPrivateIpv4(host)) return true;
  return false;
}

function normalizeCrawlUrl(urlValue: string): string {
  const parsed = new URL(urlValue);
  parsed.hash = "";

  if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
    parsed.port = "";
  }

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
}

export function isValidWebsiteReferenceUrl(value: string): boolean {
  try {
    const normalized = normalizePotentialUrl(value);
    const url = new URL(normalized);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.username || url.password) return false;
    if (isDisallowedHost(url.hostname)) return false;

    return true;
  } catch {
    return false;
  }
}

export function assertValidWebsiteReferenceUrl(value: string): string {
  const normalized = normalizePotentialUrl(value);
  if (!isValidWebsiteReferenceUrl(normalized)) {
    throw new AppError(400, "Enter a valid public website URL in Design System Reference.");
  }

  return normalizeCrawlUrl(normalized);
}

function findExistingPaths(candidates: string[]): string[] {
  const existing = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (fs.existsSync(candidate)) {
        existing.add(candidate);
      }
    } catch {
      // Ignore invalid path checks.
    }
  }
  return Array.from(existing);
}

function getPlaywrightCachedChromiumPaths(): string[] {
  const roots = findExistingPaths([
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), ".cache", "ms-playwright"),
    "/ms-playwright",
    "/home/site/wwwroot/.cache/ms-playwright",
    "/home/.cache/ms-playwright",
  ].filter((candidate): candidate is string => Boolean(candidate)));

  const discovered: string[] = [];

  for (const root of roots) {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(root);
    } catch {
      continue;
    }

    const chromiumDirs = entries.filter((entry) => /^chromium-\d+/i.test(entry));
    for (const chromiumDir of chromiumDirs) {
      const base = path.join(root, chromiumDir);
      discovered.push(
        path.join(base, "chrome-linux", "chrome"),
        path.join(base, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        path.join(base, "chrome-win", "chrome.exe")
      );
    }
  }

  return findExistingPaths(discovered);
}

function getCommonBrowserPaths(): string[] {
  const configured = [
    process.env.WEBSITE_BROWSER_EXECUTABLE_PATH,
    process.env.FIGMA_BROWSER_EXECUTABLE_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
  ].filter((value): value is string => Boolean(value));

  const cachedPlaywrightBinaries = getPlaywrightCachedChromiumPaths();

  if (process.platform === "win32") {
    return [
      ...configured,
      ...cachedPlaywrightBinaries,
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
  }

  if (process.platform === "darwin") {
    return [
      ...configured,
      ...cachedPlaywrightBinaries,
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
  }

  return [
    ...configured,
    ...cachedPlaywrightBinaries,
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/microsoft-edge",
    "/opt/google/chrome/chrome",
  ];
}

function buildBrowserCandidates(): BrowserLaunchCandidate[] {
  const commonBrowserPaths = getCommonBrowserPaths();
  const pathCandidates = commonBrowserPaths.map((executablePath, index) => ({
    label: index === 0 && process.env.WEBSITE_BROWSER_EXECUTABLE_PATH ? "configured browser" : `system browser ${index + 1}`,
    executablePath,
  }));

  const channelCandidates: BrowserLaunchCandidate[] =
    process.platform === "linux"
      ? []
      : [
          { label: "chrome channel", channel: "chrome" },
          { label: "edge channel", channel: "msedge" },
        ];

  return [
    ...pathCandidates,
    ...channelCandidates,
    { label: "bundled chromium" },
  ];
}

async function launchBrowser(): Promise<Browser> {
  const errors: string[] = [];

  for (const candidate of buildBrowserCandidates()) {
    try {
      return await chromium.launch({
        headless: true,
        ...(candidate.executablePath ? { executablePath: candidate.executablePath } : {}),
        ...(candidate.channel ? { channel: candidate.channel } : {}),
        args: [
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check",
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${candidate.label}: ${message}`);
    }
  }

  throw new AppError(
    503,
    `Unable to launch a browser for website capture. Set WEBSITE_BROWSER_EXECUTABLE_PATH (or CHROME_BIN) to a valid Chromium/Chrome path in deployment, or ensure Playwright Chromium is installed. ${errors.join(" | ")}`
  );
}

async function createContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
}

async function settlePage(page: Page, waitMs = 900): Promise<void> {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 3500 }).catch(() => undefined);
  await page.waitForTimeout(waitMs);
}

async function gotoWithRetry(page: Page, url: string): Promise<void> {
  const attempts: Array<{ waitUntil: "domcontentloaded" | "commit"; timeout: number }> = [
    { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS },
    { waitUntil: "commit", timeout: NAVIGATION_TIMEOUT_MS },
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      await page.goto(url, { waitUntil: attempt.waitUntil, timeout: attempt.timeout });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new AppError(422, `Could not load the website URL. ${message}`);
}

async function dismissCommonOverlays(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("I agree")',
    'button:has-text("Got it")',
    'button:has-text("Continue")',
    'button:has-text("Close")',
    '[aria-label*="close" i]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click({ timeout: 1000 }).catch(() => undefined);
      await page.waitForTimeout(200);
    }
  }
}

type PageSignalSummary = {
  visibleText: string;
  componentSummary: string;
  accessibilitySummary: string;
  performanceSummary: string;
  internalLinks: string[];
};

async function extractPageSignals(page: Page, origin: string): Promise<PageSignalSummary> {
  return page.evaluate((rootOrigin) => {
    const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

    const visibleText = normalizeText(document.body?.innerText ?? "").slice(0, 6000);

    const tagCount = (selector: string) => document.querySelectorAll(selector).length;
    const componentSummary = [
      `buttons=${tagCount("button, [role='button']")}`,
      `links=${tagCount("a[href]")}`,
      `inputs=${tagCount("input, select, textarea")}`,
      `forms=${tagCount("form")}`,
      `modals=${tagCount("dialog, [role='dialog']")}`,
      `nav=${tagCount("nav, [role='navigation']")}`,
      `cards=${tagCount("article, [class*='card'], [data-component*='card']")}`,
    ].join(", ");

    const a11yIssues: string[] = [];
    const imagesMissingAlt = Array.from(document.querySelectorAll("img")).filter((img) => !(img.getAttribute("alt") ?? "").trim()).length;
    if (imagesMissingAlt > 0) a11yIssues.push(`images_missing_alt=${imagesMissingAlt}`);

    const unlabeledButtons = Array.from(document.querySelectorAll("button, [role='button']")).filter((node) => {
      const text = (node.textContent ?? "").trim();
      const aria = (node.getAttribute("aria-label") ?? "").trim();
      const labelledBy = (node.getAttribute("aria-labelledby") ?? "").trim();
      return !text && !aria && !labelledBy;
    }).length;
    if (unlabeledButtons > 0) a11yIssues.push(`buttons_without_name=${unlabeledButtons}`);

    const formControlsWithoutLabel = Array.from(document.querySelectorAll("input, select, textarea")).filter((control) => {
      const id = control.getAttribute("id");
      const ariaLabel = (control.getAttribute("aria-label") ?? "").trim();
      const labelledBy = (control.getAttribute("aria-labelledby") ?? "").trim();
      const wrappedLabel = control.closest("label");
      const explicitLabel = id ? document.querySelector(`label[for=\"${CSS.escape(id)}\"]`) : null;
      return !ariaLabel && !labelledBy && !wrappedLabel && !explicitLabel;
    }).length;
    if (formControlsWithoutLabel > 0) a11yIssues.push(`form_controls_without_label=${formControlsWithoutLabel}`);

    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((heading) => Number.parseInt(heading.tagName.slice(1), 10));
    let headingJumps = 0;
    for (let index = 1; index < headings.length; index += 1) {
      if (headings[index] - headings[index - 1] > 1) {
        headingJumps += 1;
      }
    }
    if (headingJumps > 0) a11yIssues.push(`heading_level_jumps=${headingJumps}`);

    if (!document.documentElement.getAttribute("lang")) {
      a11yIssues.push("missing_html_lang");
    }

    if (!document.querySelector("main, [role='main']")) {
      a11yIssues.push("missing_main_landmark");
    }

    const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const firstPaint = performance.getEntriesByName("first-paint")[0] as PerformanceEntry | undefined;
    const firstContentfulPaint = performance.getEntriesByName("first-contentful-paint")[0] as PerformanceEntry | undefined;

    const perfParts: string[] = [];
    if (navigationEntry) {
      perfParts.push(`dom_content_loaded_ms=${Math.round(navigationEntry.domContentLoadedEventEnd)}`);
      perfParts.push(`load_ms=${Math.round(navigationEntry.loadEventEnd)}`);
      perfParts.push(`transfer_kb=${Math.round((navigationEntry.transferSize || 0) / 1024)}`);
      perfParts.push(`encoded_body_kb=${Math.round((navigationEntry.encodedBodySize || 0) / 1024)}`);
    }
    if (firstPaint) perfParts.push(`fp_ms=${Math.round(firstPaint.startTime)}`);
    if (firstContentfulPaint) perfParts.push(`fcp_ms=${Math.round(firstContentfulPaint.startTime)}`);

    const internalLinks = Array.from(document.querySelectorAll("a[href]"))
      .map((anchor) => {
        const href = anchor.getAttribute("href") ?? "";
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) return null;

        try {
          const absolute = new URL(href, window.location.href);
          if (absolute.origin !== rootOrigin) return null;
          absolute.hash = "";
          return absolute.toString();
        } catch {
          return null;
        }
      })
      .filter((href): href is string => Boolean(href));

    return {
      visibleText,
      componentSummary,
      accessibilitySummary: a11yIssues.length > 0 ? a11yIssues.join(", ") : "no_critical_heuristic_flags",
      performanceSummary: perfParts.length > 0 ? perfParts.join(", ") : "performance_entries_unavailable",
      internalLinks: Array.from(new Set(internalLinks)).slice(0, 12),
    };
  }, origin);
}

function buildScreenName(order: number, title: string, url: string): string {
  const derived = title || (() => {
    try {
      const parsed = new URL(url);
      return parsed.pathname.split("/").filter(Boolean).at(-1) ?? parsed.hostname;
    } catch {
      return "page";
    }
  })();

  return `website-screen-${String(order).padStart(2, "0")}-${sanitizeFileStem(derived)}.png`;
}

async function captureScreen(page: Page, order: number, seenHashes: Set<string>, depth: number): Promise<ScreenCandidate | null> {
  const title = normalizeWhitespace(await page.title().catch(() => ""));
  const sourceUrl = normalizeCrawlUrl(page.url());
  const origin = new URL(sourceUrl).origin;
  const pageSignals = await extractPageSignals(page, origin).catch((): PageSignalSummary => ({
    visibleText: "",
    componentSummary: "component_summary_unavailable",
    accessibilitySummary: "a11y_summary_unavailable",
    performanceSummary: "performance_summary_unavailable",
    internalLinks: [],
  }));

  const buffer = await page.screenshot({ type: "png", fullPage: true, animations: "disabled" });
  const hash = crypto.createHash("sha1").update(buffer).digest("hex");

  if (seenHashes.has(hash)) {
    return null;
  }

  seenHashes.add(hash);
  const contentTextParts = [
    "Source: Website design system reference",
    `Captured URL: ${sourceUrl}`,
    title ? `Screen title: ${title}` : "",
    `Crawl depth: ${depth}`,
    `DOM component summary: ${pageSignals.componentSummary}`,
    `Accessibility heuristic summary: ${pageSignals.accessibilitySummary}`,
    `Performance summary: ${pageSignals.performanceSummary}`,
    pageSignals.visibleText ? `Visible text: ${pageSignals.visibleText.slice(0, MAX_VISIBLE_TEXT_CHARS)}` : "Visible text: No meaningful DOM text extracted.",
  ].filter(Boolean);

  return {
    hash,
    screen: {
      name: buildScreenName(order, title, sourceUrl),
      mimeType: "image/png",
      base64Data: buffer.toString("base64"),
      sizeBytes: buffer.byteLength,
      contentText: contentTextParts.join("\n"),
      sourceUrl,
      title,
    },
  };
}

function enqueueLinks(queue: CrawlQueueItem[], seenUrls: Set<string>, currentDepth: number, maxDepth: number, links: string[]) {
  if (currentDepth >= maxDepth) return;

  for (const link of links.slice(0, MAX_LINKS_PER_PAGE)) {
    let normalized: string;
    try {
      normalized = normalizeCrawlUrl(link);
    } catch {
      continue;
    }

    if (seenUrls.has(normalized)) continue;
    seenUrls.add(normalized);
    queue.push({ url: normalized, depth: currentDepth + 1 });
  }
}

export async function captureWebsiteReference(input: { url: string; maxScreens?: number }): Promise<WebsiteCaptureResult> {
  const requestedUrl = assertValidWebsiteReferenceUrl(input.url);
  const maxScreens = Math.min(MAX_SCREEN_LIMIT, Math.max(1, input.maxScreens ?? DEFAULT_MAX_SCREENS));
  const maxDepth = Math.max(1, Math.ceil(maxScreens / 2));

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const seenHashes = new Set<string>();
  const queuedOrVisitedUrls = new Set<string>([requestedUrl]);
  const visitedUrls = new Set<string>();
  const titles = new Set<string>();
  const screens: ScreenCandidate[] = [];
  const queue: CrawlQueueItem[] = [{ url: requestedUrl, depth: 0 }];
  let lastNavigatedUrl = requestedUrl;

  try {
    browser = await launchBrowser();
    context = await createContext(browser);
    page = await context.newPage();

    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    page.setDefaultTimeout(12000);

    while (queue.length > 0 && screens.length < maxScreens) {
      const next = queue.shift();
      if (!next) break;

      await gotoWithRetry(page, next.url);
      await settlePage(page, 1000);
      await dismissCommonOverlays(page);
      await settlePage(page, 500);

      const normalizedUrl = normalizeCrawlUrl(page.url());
      const parsed = new URL(normalizedUrl);
      if (isDisallowedHost(parsed.hostname)) {
        continue;
      }

      visitedUrls.add(normalizedUrl);
      lastNavigatedUrl = normalizedUrl;

      const candidate = await captureScreen(page, screens.length + 1, seenHashes, next.depth);
      if (candidate) {
        screens.push(candidate);
        if (candidate.screen.title) titles.add(candidate.screen.title);
      }

      const links = await extractPageSignals(page, parsed.origin)
        .then((signals) => signals.internalLinks)
        .catch(() => [] as string[]);

      enqueueLinks(queue, queuedOrVisitedUrls, next.depth, maxDepth, links);
    }

    if (screens.length === 0) {
      throw new AppError(422, "Website loaded, but no reviewable page could be captured.");
    }

    return {
      requestedUrl,
      finalUrl: lastNavigatedUrl,
      screens: screens.map((item) => item.screen),
      visitedUrls: Array.from(visitedUrls),
      titles: Array.from(titles),
      navigationSummary: `Captured ${screens.length} unique page${screens.length === 1 ? "" : "s"} from website crawl (${visitedUrls.size} URL${visitedUrls.size === 1 ? "" : "s"} visited).`,
    };
  } finally {
    if (context) {
      await context.close().catch(() => undefined);
    }
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

export async function persistCapturedWebsiteScreens(reviewId: string, screens: WebsiteCapturedScreen[]) {
  const hasSupabaseStorageConfig = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);

  const createdAssetIds: string[] = [];
  for (const screen of screens) {
    const blobUrl = hasSupabaseStorageConfig
      ? (await uploadReviewAssetToStorage({
          reviewId,
          name: screen.name,
          mimeType: screen.mimeType,
          base64Data: screen.base64Data,
        })).storageRef
      : `data:${screen.mimeType};base64,${screen.base64Data}`;

    const asset = await prisma.asset.create({
      data: {
        reviewId,
        name: screen.name,
        mimeType: screen.mimeType,
        blobUrl,
        contentText: screen.contentText,
        sizeBytes: screen.sizeBytes,
      },
    });

    createdAssetIds.push(asset.id);
  }

  return createdAssetIds;
}