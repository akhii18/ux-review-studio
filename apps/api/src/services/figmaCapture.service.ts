import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { AppError } from "../middleware/errorHandler";
import { config } from "../config";
import { prisma } from "../config/prisma";
import { uploadReviewAssetToStorage } from "./supabaseStorage";

const DEFAULT_MAX_SCREENS = 10;
const MAX_SCREEN_LIMIT = 16;
const NAVIGATION_TIMEOUT_MS = 45000;

export type FigmaCapturedScreen = {
  name: string;
  mimeType: string;
  base64Data: string;
  sizeBytes: number;
  contentText: string;
  sourceUrl: string;
  title: string;
};

export type FigmaCaptureResult = {
  requestedUrl: string;
  finalUrl: string;
  screens: FigmaCapturedScreen[];
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
  screen: FigmaCapturedScreen;
};


type FigmaOEmbedResponse = {
  title?: string;
  thumbnail_url?: string;
};

type HotspotCandidate = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  href?: string;
};

async function createSyntheticFallbackScreen(requestedUrl: string, launchFailureReason?: string): Promise<FigmaCapturedScreen | null> {
  try {
    const title = "Figma Prototype (Fallback Capture)";
    const screenName = buildScreenName(1, title, requestedUrl);
    const failureText = normalizeWhitespace(launchFailureReason ?? "Browser automation unavailable in deployment.");
    const safeUrl = requestedUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeFailure = failureText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const svg = `
<svg width="1440" height="1024" viewBox="0 0 1440 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="1440" height="1024" fill="url(#bg)" />
  <rect x="80" y="80" width="1280" height="864" rx="24" fill="#111827" stroke="#334155" stroke-width="2" />
  <text x="120" y="170" fill="#f8fafc" font-size="44" font-family="Arial, Helvetica, sans-serif" font-weight="700">Figma Review Fallback Screenshot</text>
  <text x="120" y="228" fill="#cbd5e1" font-size="24" font-family="Arial, Helvetica, sans-serif">Browser launch was unavailable in deployment, so this synthetic screenshot keeps the review pipeline running.</text>
  <text x="120" y="300" fill="#94a3b8" font-size="22" font-family="Arial, Helvetica, sans-serif">Requested URL:</text>
  <foreignObject x="120" y="320" width="1200" height="110">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#e2e8f0;font-family:Arial, Helvetica, sans-serif;font-size:20px;line-height:1.4;word-break:break-all;">${safeUrl}</div>
  </foreignObject>
  <text x="120" y="500" fill="#94a3b8" font-size="22" font-family="Arial, Helvetica, sans-serif">Launch reason:</text>
  <foreignObject x="120" y="520" width="1200" height="260">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#fda4af;font-family:Arial, Helvetica, sans-serif;font-size:20px;line-height:1.45;word-break:break-word;">${safeFailure}</div>
  </foreignObject>
  <text x="120" y="890" fill="#a3e635" font-size="24" font-family="Arial, Helvetica, sans-serif">Review pipeline fallback active: AI analysis will continue using this generated input.</text>
</svg>`;

    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

    return {
      name: screenName,
      mimeType: "image/png",
      base64Data: buffer.toString("base64"),
      sizeBytes: buffer.byteLength,
      contentText: [
        "Source: Synthetic Figma fallback screenshot",
        `Captured URL: ${requestedUrl}`,
        `Screen title: ${title}`,
        "Visible text: Browser automation and thumbnail capture were unavailable. Generated synthetic screenshot to keep review pipeline operational.",
        launchFailureReason ? `Failure reason: ${launchFailureReason}` : "",
      ].filter(Boolean).join("\n"),
      sourceUrl: requestedUrl,
      title,
    };
  } catch {
    return null;
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePotentialUrl(value: string): string {
  let normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/^['"`]+|['"`]+$/g, "")
    .trim();

  // Common copy/paste artifact from logs/messages: trailing arrow markers like "--->".
  normalized = normalized.replace(/-+>+$/g, "");

  // Remove trailing characters that cannot terminate a URL.
  normalized = normalized.replace(/[>\])}]+$/g, "");

  try {
    const parsed = new URL(normalized);
    const nodeId = parsed.searchParams.get("node-id");
    if (nodeId) {
      const cleanNodeId = nodeId.replace(/[^0-9:-]/g, "");
      if (cleanNodeId) {
        parsed.searchParams.set("node-id", cleanNodeId);
        normalized = parsed.toString();
      }
    }
  } catch {
    // Validation will throw later with a user-facing message.
  }

  return normalized;
}

function sanitizeFileStem(value: string): string {
  const normalized = normalizeWhitespace(value)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "screen";
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
    label: index === 0 && process.env.FIGMA_BROWSER_EXECUTABLE_PATH ? "configured browser" : `system browser ${index + 1}`,
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

export function isValidFigmaPrototypeUrl(value: string): boolean {
  try {
    const url = new URL(normalizePotentialUrl(value));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return false;
    if (host !== "figma.com" && host !== "www.figma.com") return false;

    const path = url.pathname.toLowerCase();
    return Boolean(
      path.includes("/proto/") ||
      path.includes("/present/") ||
      path.includes("/presentation/") ||
      path.includes("/design/") ||
      (path.includes("/file/") && url.searchParams.has("node-id")) ||
      url.searchParams.has("node-id")
    );
  } catch {
    return false;
  }
}

export function assertValidFigmaPrototypeUrl(value: string): string {
  const normalized = normalizePotentialUrl(value);
  if (!isValidFigmaPrototypeUrl(normalized)) {
    throw new AppError(400, "Enter a valid public Figma prototype URL.");
  }
  return normalized;
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
    `Unable to launch a browser for Figma capture. Set FIGMA_BROWSER_EXECUTABLE_PATH (or CHROME_BIN) to a valid Chromium/Chrome path in deployment, or ensure Playwright Chromium is installed. ${errors.join(" | ")}`
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
  await page.waitForLoadState("networkidle", { timeout: 2500 }).catch(() => undefined);
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
  throw new AppError(422, `Could not load the Figma prototype URL. ${message}`);
}

async function dismissCommonOverlays(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("I agree")',
    'button:has-text("Got it")',
    'button:has-text("Continue")',
    '[aria-label*="close" i]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click({ timeout: 1000 }).catch(() => undefined);
      await page.waitForTimeout(250);
    }
  }
}

async function extractVisibleText(page: Page): Promise<string> {
  const text = await page.evaluate(() => {
    const bodyText = document.body?.innerText ?? "";
    const labels = Array.from(document.querySelectorAll("a, button, [role='button']"))
      .map((element) => {
        const text = (element.textContent ?? "").trim();
        const aria = element.getAttribute("aria-label")?.trim() ?? "";
        return [text, aria].filter(Boolean).join(" ");
      })
      .filter(Boolean)
      .join("\n");

    return [bodyText, labels].filter(Boolean).join("\n");
  }).catch(() => "");

  return normalizeWhitespace(text).slice(0, 6000);
}

function buildScreenName(order: number, title: string, url: string): string {
  const derived = title || (() => {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get("node-id") ?? parsed.pathname.split("/").filter(Boolean).at(-1) ?? "screen";
    } catch {
      return "screen";
    }
  })();

  return `figma-screen-${String(order).padStart(2, "0")}-${sanitizeFileStem(derived)}.png`;
}

async function captureScreen(page: Page, order: number, seenHashes: Set<string>): Promise<ScreenCandidate | null> {
  const title = normalizeWhitespace(await page.title().catch(() => ""));
  const sourceUrl = page.url();
  const visibleText = await extractVisibleText(page);
  const buffer = await page.screenshot({ type: "png", fullPage: false, animations: "disabled" });
  const hash = crypto.createHash("sha1").update(buffer).digest("hex");

  if (seenHashes.has(hash)) {
    return null;
  }

  seenHashes.add(hash);
  const contentTextParts = [
    "Source: Figma prototype",
    `Captured URL: ${sourceUrl}`,
    title ? `Screen title: ${title}` : "",
    visibleText ? `Visible text: ${visibleText}` : "Visible text: No DOM text extracted from the prototype frame.",
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

async function collectHotspots(page: Page): Promise<HotspotCandidate[]> {
  const hotspots = await page.evaluate(() => {
    const isVisible = (element: Element, rect: DOMRect) => {
      const style = window.getComputedStyle(element as HTMLElement);
      if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return false;
      return rect.width >= 24 && rect.height >= 24 && rect.bottom >= 0 && rect.right >= 0;
    };

    const candidates: HotspotCandidate[] = [];

    for (const element of Array.from(document.querySelectorAll("a, button, [role='button'], [tabindex='0']"))) {
        const rect = element.getBoundingClientRect();
        const label = [
          (element.textContent ?? "").trim(),
          element.getAttribute("aria-label")?.trim() ?? "",
          element.getAttribute("title")?.trim() ?? "",
        ].filter(Boolean).join(" ");

        if (!isVisible(element, rect)) continue;

        candidates.push({
          key: `${Math.round(rect.x)}:${Math.round(rect.y)}:${Math.round(rect.width)}:${Math.round(rect.height)}:${label}`,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          label,
          href: element instanceof HTMLAnchorElement ? element.href : undefined,
        });
    }

    return candidates;
  }).catch(() => [] as HotspotCandidate[]);

  const scoreCandidate = (candidate: HotspotCandidate) => {
    const area = candidate.width * candidate.height;
    const label = candidate.label.toLowerCase();
    let score = area / 250;
    score += candidate.x / 10;

    if (/(next|continue|proceed|start|play|open|forward)/i.test(label)) score += 2000;
    if (/(back|previous|close|cancel|sign in|log in|home)/i.test(label)) score -= 2000;
    if (!label) score += 150;

    return score;
  };

  return hotspots.sort((left, right) => scoreCandidate(right) - scoreCandidate(left));
}

async function pageLooksInaccessible(page: Page): Promise<boolean> {
  const currentUrl = page.url().toLowerCase();
  if (currentUrl.includes("/login") || currentUrl.includes("/signin")) {
    return true;
  }

  const text = (await extractVisibleText(page)).toLowerCase();
  const blockingSignals = [
    "request access",
    "this file is private",
    "you need permission",
    "ask the owner for access",
    "sign up for figma",
    "continue with google",
    "continue with email",
  ];

  const matchedSignals = blockingSignals.filter((snippet) => text.includes(snippet));

  // Require stronger evidence than a single generic phrase to avoid false
  // positives from normal prototype copy that may include terms like "login".
  return matchedSignals.length >= 2;
}

async function tryAdvance(page: Page, currentHash: string, seenHashes: Set<string>, attemptedActions: Set<string>, nextOrder: number) {
  const selectorActions = [
    { key: `${currentHash}:key:ArrowRight`, run: () => page.keyboard.press("ArrowRight") },
    { key: `${currentHash}:key:PageDown`, run: () => page.keyboard.press("PageDown") },
    { key: `${currentHash}:key:Space`, run: () => page.keyboard.press("Space") },
    { key: `${currentHash}:selector:next`, run: () => page.locator('[aria-label*="next" i], button:has-text("Next"), a:has-text("Next")').first().click({ timeout: 1200 }) },
    { key: `${currentHash}:selector:continue`, run: () => page.locator('button:has-text("Continue"), a:has-text("Continue"), [aria-label*="continue" i]').first().click({ timeout: 1200 }) },
  ];

  for (const action of selectorActions) {
    if (attemptedActions.has(action.key)) continue;
    attemptedActions.add(action.key);

    await action.run().catch(() => undefined);
    await settlePage(page, 700);

    const candidate = await captureScreen(page, nextOrder, seenHashes);
    if (candidate) return candidate;
  }

  const hotspots = await collectHotspots(page);
  for (const hotspot of hotspots) {
    const actionKey = `${currentHash}:hotspot:${hotspot.key}`;
    if (attemptedActions.has(actionKey)) continue;
    attemptedActions.add(actionKey);

    const clickX = hotspot.x + hotspot.width / 2;
    const clickY = hotspot.y + hotspot.height / 2;
    await page.mouse.click(clickX, clickY).catch(() => undefined);
    await settlePage(page, 700);

    const host = (() => {
      try {
        return new URL(page.url()).hostname.toLowerCase();
      } catch {
        return "";
      }
    })();

    if (host && host !== "figma.com" && host !== "www.figma.com") {
      await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => undefined);
      await settlePage(page, 500);
      continue;
    }

    const candidate = await captureScreen(page, nextOrder, seenHashes);
    if (candidate) return candidate;
  }

  return null;
}

async function captureFromFigmaOEmbed(requestedUrl: string, launchFailureReason?: string): Promise<FigmaCaptureResult | null> {
  try {
    const oembedUrl = `https://www.figma.com/api/oembed?url=${encodeURIComponent(requestedUrl)}`;
    const oembedResponse = await fetch(oembedUrl);
    if (!oembedResponse.ok) return null;

    const oembed = (await oembedResponse.json()) as FigmaOEmbedResponse;
    const thumbnailUrl = oembed.thumbnail_url?.trim();
    if (!thumbnailUrl) return null;

    const thumbnailResponse = await fetch(thumbnailUrl);
    if (!thumbnailResponse.ok) return null;

    const mimeType = thumbnailResponse.headers.get("content-type")?.split(";")[0] ?? "image/png";
    if (!mimeType.startsWith("image/")) return null;

    const buffer = Buffer.from(await thumbnailResponse.arrayBuffer());
    if (buffer.byteLength === 0) return null;

    const title = normalizeWhitespace(oembed.title ?? "Figma Prototype Thumbnail");
    const screenName = buildScreenName(1, title, requestedUrl);
    const failureSuffix = launchFailureReason ? ` Browser launch fallback reason: ${launchFailureReason}` : "";

    return {
      requestedUrl,
      finalUrl: requestedUrl,
      screens: [
        {
          name: screenName,
          mimeType,
          base64Data: buffer.toString("base64"),
          sizeBytes: buffer.byteLength,
          contentText: [
            "Source: Figma oEmbed thumbnail fallback",
            `Captured URL: ${requestedUrl}`,
            `Screen title: ${title}`,
            "Visible text: Figma thumbnail fallback was used because browser automation was unavailable in deployment.",
            failureSuffix,
          ].filter(Boolean).join("\n"),
          sourceUrl: requestedUrl,
          title,
        },
      ],
      visitedUrls: [requestedUrl],
      titles: [title],
      navigationSummary: "Captured 1 fallback screen from Figma oEmbed thumbnail because browser automation was unavailable.",
    };
  } catch {
    return null;
  }
}

export async function captureFigmaPrototype(input: { url: string; maxScreens?: number }): Promise<FigmaCaptureResult> {
  const requestedUrl = assertValidFigmaPrototypeUrl(input.url);
  const maxScreens = Math.min(MAX_SCREEN_LIMIT, Math.max(1, input.maxScreens ?? DEFAULT_MAX_SCREENS));
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const seenHashes = new Set<string>();
  const attemptedActions = new Set<string>();
  const screens: ScreenCandidate[] = [];
  const visitedUrls = new Set<string>();
  const titles = new Set<string>();

  try {
    try {
      browser = await launchBrowser();
      context = await createContext(browser);
      page = await context.newPage();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const fallback = await captureFromFigmaOEmbed(requestedUrl, reason);
      if (fallback) {
        return fallback;
      }

      const syntheticFallback = await createSyntheticFallbackScreen(requestedUrl, reason);
      if (syntheticFallback) {
        return {
          requestedUrl,
          finalUrl: requestedUrl,
          screens: [syntheticFallback],
          visitedUrls: [requestedUrl],
          titles: [syntheticFallback.title],
          navigationSummary: "Captured 1 synthetic fallback screen because browser and thumbnail capture were unavailable.",
        };
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(503, `Unable to launch a browser for Figma capture and fallback capture failed. ${reason}`);
    }

    if (!page) {
      throw new AppError(503, "Failed to initialize browser page for Figma capture.");
    }

    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    page.setDefaultTimeout(12000);

    await gotoWithRetry(page, requestedUrl);
    await settlePage(page, 1200);
    await dismissCommonOverlays(page);
    await settlePage(page, 600);

    if (await pageLooksInaccessible(page)) {
      throw new AppError(422, "Unable to access the Figma prototype. Ensure the link is public and does not require sign-in.");
    }

    const first = await captureScreen(page, 1, seenHashes);
    if (!first) {
      throw new AppError(422, "Figma prototype loaded, but no reviewable screen could be captured.");
    }

    screens.push(first);
    visitedUrls.add(page.url());
    if (first.screen.title) titles.add(first.screen.title);

    while (screens.length < maxScreens) {
      const current = screens.at(-1);
      if (!current) break;

      const next = await tryAdvance(page, current.hash, seenHashes, attemptedActions, screens.length + 1);
      if (!next) break;

      screens.push(next);
      visitedUrls.add(page.url());
      if (next.screen.title) titles.add(next.screen.title);
    }

    return {
      requestedUrl,
      finalUrl: page.url(),
      screens: screens.map((item) => item.screen),
      visitedUrls: Array.from(visitedUrls),
      titles: Array.from(titles),
      navigationSummary: `Captured ${screens.length} unique screen${screens.length === 1 ? "" : "s"} from the public Figma prototype.`,
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

export async function persistCapturedFigmaScreens(reviewId: string, screens: FigmaCapturedScreen[]) {
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