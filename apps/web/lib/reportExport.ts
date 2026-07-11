import { marked } from "marked";
import DOMPurify from "dompurify";
import { jsPDF } from "jspdf";

type ExportVisualAsset = {
  id?: string;
  name?: string | null;
  mimeType?: string | null;
  blobUrl?: string | null;
  base64Data?: string | null;
};

type ExportVisualFinding = {
  id: string;
  title: string;
  severity?: string | null;
  area?: string | null;
  screen?: string | null;
  observation?: string | null;
  description?: string | null;
  why?: string | null;
  recommendation?: string | null;
  businessImpact?: string | null;
  a11yImpact?: string | null;
  status?: string | null;
  bboxRefs?: unknown;
};

type ExportVisualContext = {
  assets?: ExportVisualAsset[];
  findings?: ExportVisualFinding[];
};

type ExportableReport = {
  name?: string | null;
  contentMd?: string | null;
  executiveSummary?: string | null;
  visualContext?: ExportVisualContext | null;
};

type PdfTextOptions = {
  fontSize?: number;
  fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
  indent?: number;
  lineHeight?: number;
  gapAfter?: number;
};

type PdfInlineSegment = {
  text: string;
  fontStyle: NonNullable<PdfTextOptions["fontStyle"]>;
};

type BoundingBoxRef = {
  screenIndex: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type GroupedScreenshotFinding = {
  finding: ExportVisualFinding;
  referenceNumber: number;
  ref: BoundingBoxRef | null;
};

type GroupedScreenshotSection = {
  assetLabel: string;
  imageDataUrl?: string;
  findings: GroupedScreenshotFinding[];
};

type InlineImageBlock = {
  assetLabel: string;
  imageDataUrl?: string;
};

function markdownToSafeHtml(markdown: string) {
  const parsedHtml = marked.parse(markdown || "", { gfm: true, breaks: true });
  return DOMPurify.sanitize(typeof parsedHtml === "string" ? parsedHtml : String(parsedHtml));
}

function buildInlineImageBlocks(report: ExportableReport): InlineImageBlock[] {
  const context = report.visualContext;
  const imageAssets = (context?.assets ?? []).filter((asset) => (asset.mimeType ?? "").toLowerCase().startsWith("image/"));
  if (imageAssets.length === 0) return [];

  return imageAssets.map((asset, index) => ({
    assetLabel: stripExtension(String(asset.name ?? `Asset ${index + 1}`)),
    imageDataUrl: asset.base64Data
      ? `data:${asset.mimeType ?? "image/png"};base64,${asset.base64Data}`
      : asset.blobUrl ?? undefined,
  }));
}
function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() || "report";
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function normalizeScreenLabel(value: string): string {
  return stripExtension(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function findingMatchesScreen(findingScreen?: string | null, screenName?: string): boolean {
  if (!findingScreen || !screenName) return false;
  const fs = normalizeScreenLabel(findingScreen);
  const sn = normalizeScreenLabel(screenName);
  if (!fs || fs === "unknown") return false;
  if (fs === "multiple") return true;
  return fs === sn || fs.includes(sn) || sn.includes(fs);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeBBoxRefsInput(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;

  if (typeof input === "string") {
    try {
      return normalizeBBoxRefsInput(JSON.parse(input));
    } catch {
      return [];
    }
  }

  if (isRecord(input)) {
    if (Array.isArray(input.bboxRefs)) return input.bboxRefs;
    if (Array.isArray(input.refs)) return input.refs;
    if (Array.isArray(input.items)) return input.items;
  }

  return [];
}

function normalizeHeadingTitle(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/^\d+\.\s*/, "")
    .replace(/^#+\s*/, "")
    .toLowerCase();
}

function readHeadingReferenceNumber(value: string | null | undefined): number | null {
  const match = normalizeText(value).match(/^(\d+)\./);
  if (!match) return null;
  const referenceNumber = Number(match[1]);
  return Number.isFinite(referenceNumber) ? referenceNumber : null;
}

function normalizeBBoxRef(ref: unknown): BoundingBoxRef | null {
  if (!isRecord(ref)) return null;

  const bboxValue = isRecord(ref.bbox)
    ? ref.bbox
    : isRecord(ref.box)
      ? ref.box
      : isRecord(ref.bboxRect)
        ? ref.bboxRect
        : isRecord(ref.coordinates)
          ? ref.coordinates
          : null;

  const screenIndexValue = ref.screenIndex ?? ref.screen ?? ref.pageIndex ?? ref.page ?? ref.index;
  const xValue = bboxValue?.x ?? bboxValue?.left ?? bboxValue?.x1;
  const yValue = bboxValue?.y ?? bboxValue?.top ?? bboxValue?.y1;
  const widthValue = bboxValue?.width ?? (typeof bboxValue?.x1 === "number" && typeof bboxValue?.x2 === "number" ? bboxValue.x2 - bboxValue.x1 : undefined);
  const heightValue = bboxValue?.height ?? (typeof bboxValue?.y1 === "number" && typeof bboxValue?.y2 === "number" ? bboxValue.y2 - bboxValue.y1 : undefined);

  const screenIndex = Number(screenIndexValue);
  const x = Number(xValue);
  const y = Number(yValue);
  const width = Number(widthValue);
  const height = Number(heightValue);

  if (![screenIndex, x, y, width, height].every((entry) => Number.isFinite(entry))) return null;

  return {
    screenIndex,
    bbox: {
      x: clamp01(x),
      y: clamp01(y),
      width: clamp01(width),
      height: clamp01(height),
    },
  };
}

function getValidBBoxRefs(finding: ExportVisualFinding): BoundingBoxRef[] {
  return normalizeBBoxRefsInput(finding.bboxRefs)
    .map(normalizeBBoxRef)
    .filter((ref): ref is BoundingBoxRef => Boolean(ref));
}

function getBboxRefForScreen(finding: ExportVisualFinding, screenIndex?: number): BoundingBoxRef | null {
  if (typeof screenIndex !== "number") return null;

  const refs = getValidBBoxRefs(finding);
  if (refs.length === 0) return null;

  return refs.find((ref) => ref.screenIndex === screenIndex) ?? null;
}

function findingMatchesScreenContext(finding: ExportVisualFinding, screenName?: string, screenIndex?: number): boolean {
  const refs = getValidBBoxRefs(finding);
  if (refs.length > 0 && typeof screenIndex === "number") {
    return Boolean(getBboxRefForScreen(finding, screenIndex));
  }
  return findingMatchesScreen(finding.screen, screenName);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read blob as data URL"));
    reader.readAsDataURL(blob);
  });
}

async function resolveAssetDataUrl(asset: ExportVisualAsset): Promise<string | null> {
  const mimeType = asset.mimeType ?? "image/png";

  if (asset.base64Data) {
    return `data:${mimeType};base64,${asset.base64Data}`;
  }

  if (typeof asset.blobUrl === "string" && asset.blobUrl.startsWith("data:image/")) {
    return asset.blobUrl;
  }

  if (!asset.blobUrl) return null;

  try {
    const response = await fetch(asset.blobUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = dataUrl;
  });
}

async function drawAnnotatedScreenshot(dataUrl: string, findings: GroupedScreenshotFinding[]): Promise<string> {
  const drawableFindings = findings.filter((item) => Boolean(item.ref));
  if (drawableFindings.length === 0) return dataUrl;

  try {
    const image = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");
    if (!context) return dataUrl;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const markerRadius = Math.max(14, Math.round(Math.min(canvas.width, canvas.height) * 0.018));
    const fontSize = Math.max(11, Math.round(markerRadius * 0.9));
    const severityColor: Record<string, string> = {
      P0: "#2f2f2f",
      P1: "#f59e0b",
      P2: "#0a0838",
    };

    drawableFindings.forEach((item) => {
      const ref = item.ref;
      if (!ref) return;

      const centerX = (ref.bbox.x + ref.bbox.width / 2) * canvas.width;
      const centerY = (ref.bbox.y + ref.bbox.height / 2) * canvas.height;
      const severityKey = String(item.finding.severity ?? "P2").toUpperCase();

      context.beginPath();
      context.fillStyle = severityColor[severityKey] ?? severityColor.P2;
      context.strokeStyle = "#ffffff";
      context.lineWidth = Math.max(2, Math.round(markerRadius * 0.16));
      context.arc(centerX, centerY, markerRadius, 0, Math.PI * 2);
      context.fill();
      context.stroke();

      context.fillStyle = "#ffffff";
      context.font = `700 ${fontSize}px Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(item.referenceNumber), centerX, centerY);
    });

    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

function takeRenderedReferenceNumber(referenceNumbers: Map<string, number[]>, finding: ExportVisualFinding): number | null {
  const title = normalizeHeadingTitle(finding.title);
  const queue = referenceNumbers.get(title);
  if (!queue || queue.length === 0) return null;
  const referenceNumber = queue.shift() ?? null;
  if (queue.length === 0) {
    referenceNumbers.delete(title);
  } else {
    referenceNumbers.set(title, queue);
  }
  return referenceNumber;
}

async function buildGroupedScreenshotSections(
  report: ExportableReport,
  renderedReferenceNumbers = new Map<string, number[]>()
): Promise<GroupedScreenshotSection[]> {
  const context = report.visualContext;
  const findings = (context?.findings ?? []).filter(
    (finding) => finding.status === "ACCEPTED" || finding.status === "EDITED" || finding.status === "ESCALATED"
  );
  const imageAssets = (context?.assets ?? []).filter((asset) => (asset.mimeType ?? "").toLowerCase().startsWith("image/"));

  if (findings.length === 0 || imageAssets.length === 0) return [];

  const sections: GroupedScreenshotSection[] = [];
  const matchedFindingIds = new Set<string>();

  for (let index = 0; index < imageAssets.length; index += 1) {
    const asset = imageAssets[index];
    const screenName = stripExtension(String(asset.name ?? `Asset ${index + 1}`));

    const matchingFindings = findings
      .filter((finding) => findingMatchesScreenContext(finding, screenName, index))
      .map((finding, findingIndex) => ({
        finding,
        referenceNumber: takeRenderedReferenceNumber(renderedReferenceNumbers, finding) ?? findingIndex + 1,
        ref: getBboxRefForScreen(finding, index),
      }));

    if (matchingFindings.length === 0) continue;

    const baseImageDataUrl = await resolveAssetDataUrl(asset);
    if (!baseImageDataUrl) continue;

    const imageDataUrl = await drawAnnotatedScreenshot(baseImageDataUrl, matchingFindings);

    matchingFindings.forEach((item) => matchedFindingIds.add(item.finding.id));

    sections.push({
      assetLabel: screenName,
      imageDataUrl,
      findings: matchingFindings,
    });
  }

  const unmatchedFindings = findings.filter((finding) => !matchedFindingIds.has(finding.id));
  if (unmatchedFindings.length > 0) {
    sections.push({
      assetLabel: "Additional Findings",
      findings: unmatchedFindings.map((finding, index) => ({
        finding,
        referenceNumber: takeRenderedReferenceNumber(renderedReferenceNumbers, finding) ?? index + 1,
        ref: null,
      })),
    });
  }

  return sections;
}

function renderFindingSummaryHtml(item: GroupedScreenshotFinding): string {
  const finding = item.finding;
  const lines = [
    `<div class="screenshot-finding-title"><strong>${escapeHtml(finding.title)}</strong></div>`,
    finding.severity ? `<div class=\"screenshot-finding-meta\">Severity: ${escapeHtml(String(finding.severity))}</div>` : "",
    finding.area ? `<div class=\"screenshot-finding-meta\">Area: ${escapeHtml(String(finding.area))}</div>` : "",
    finding.observation ? `<div>${escapeHtml(String(finding.observation))}</div>` : "",
    finding.description ? `<div>${escapeHtml(String(finding.description))}</div>` : "",
    finding.why ? `<div><em>${escapeHtml(String(finding.why))}</em></div>` : "",
    finding.recommendation ? `<div>Recommendation: ${escapeHtml(String(finding.recommendation))}</div>` : "",
  ].filter(Boolean);

  return `<li>${lines.join("")}</li>`;
}

function collectRenderedFindingBlocks(doc: Document): Map<string, string[]> {
  const blocks = new Map<string, string[]>();
  const headings = Array.from(doc.body.querySelectorAll("h2"));
  const includedHeading = headings.find((heading) => normalizeText(heading.textContent).toLowerCase() === "included findings");
  if (!includedHeading) return blocks;

  let cursor = includedHeading.nextElementSibling;
  while (cursor && cursor.tagName.toLowerCase() !== "h2") {
    if (cursor.tagName.toLowerCase() !== "h3") {
      cursor = cursor.nextElementSibling;
      continue;
    }

    const title = normalizeHeadingTitle(cursor.textContent);
    const htmlParts: string[] = [];
    let blockCursor: Element | null = cursor;

    while (blockCursor && blockCursor.tagName.toLowerCase() !== "h2") {
      if (blockCursor !== cursor && blockCursor.tagName.toLowerCase() === "h3") break;
      htmlParts.push(blockCursor.outerHTML);
      blockCursor = blockCursor.nextElementSibling;
    }

    const existing = blocks.get(title) ?? [];
    existing.push(htmlParts.join("\n"));
    blocks.set(title, existing);
    cursor = blockCursor;
  }

  return blocks;
}

function collectRenderedReferenceNumbers(doc: Document): Map<string, number[]> {
  const referenceNumbers = new Map<string, number[]>();
  const headings = Array.from(doc.body.querySelectorAll("h2"));
  const includedHeading = headings.find((heading) => normalizeText(heading.textContent).toLowerCase() === "included findings");
  if (!includedHeading) return referenceNumbers;

  let cursor = includedHeading.nextElementSibling;
  while (cursor && cursor.tagName.toLowerCase() !== "h2") {
    if (cursor.tagName.toLowerCase() === "h3") {
      const title = normalizeHeadingTitle(cursor.textContent);
      const referenceNumber = readHeadingReferenceNumber(cursor.textContent);
      if (referenceNumber !== null) {
        const existing = referenceNumbers.get(title) ?? [];
        existing.push(referenceNumber);
        referenceNumbers.set(title, existing);
      }
    }
    cursor = cursor.nextElementSibling;
  }

  return referenceNumbers;
}

function takeRenderedFindingBlock(blocks: Map<string, string[]>, finding: ExportVisualFinding): string | null {
  const title = normalizeHeadingTitle(finding.title);
  const queue = blocks.get(title);
  if (!queue || queue.length === 0) return null;
  const block = queue.shift() ?? null;
  if (queue.length === 0) {
    blocks.delete(title);
  } else {
    blocks.set(title, queue);
  }
  return block;
}

function buildVisualSectionHtml(sections: GroupedScreenshotSection[], renderedFindingBlocks?: Map<string, string[]>): string {
  if (sections.length === 0) return "";

  return [
    "<h2>Assets and Pins</h2>",
    ...sections.map((section) => {
      const renderedFindings = section.findings.map((item) => {
        return renderedFindingBlocks
          ? takeRenderedFindingBlock(renderedFindingBlocks, item.finding) ?? renderFindingSummaryHtml(item)
          : renderFindingSummaryHtml(item);
      });

      return [
        '<section class="screenshot-group">',
        `<h3>${escapeHtml(section.assetLabel)}</h3>`,
        section.imageDataUrl
          ? `<img src="${section.imageDataUrl}" alt="Annotated asset for ${escapeHtml(section.assetLabel)}" class="screenshot-image" />`
          : "",
        '<div class="screenshot-findings">',
        ...renderedFindings,
        "</div>",
        "</section>",
      ].join("\n");
    }),
  ].join("\n");
}

function buildVisualSectionWordHtml(sections: GroupedScreenshotSection[]): string {
  if (sections.length === 0) return "";

  return [
    "<h2 style=\"margin-top:22px;\">Assets and Pins</h2>",
    ...sections.map((section) => {
      return [
        '<div style="margin: 12px 0 18px; page-break-inside: avoid;">',
        `<h3 style="margin: 6px 0 8px;">${escapeHtml(section.assetLabel)}</h3>`,
        section.imageDataUrl
          ? `<img src="${section.imageDataUrl}" alt="Annotated asset for ${escapeHtml(section.assetLabel)}" style="display:block; width:100%; max-width:640px; height:auto; border:1px solid #d1d5db; border-radius:6px; margin:0 0 10px 0;" />`
          : "",
        '<ol style="margin: 0; padding-left: 20px;">',
        ...section.findings.map((item) => renderFindingSummaryHtml(item)),
        "</ol>",
        "</div>",
      ].join("\n");
    }),
  ].join("\n");
}

function getJsPdfImageFormat(dataUrl: string): "PNG" | "JPEG" {
  const normalized = dataUrl.toLowerCase();
  if (normalized.startsWith("data:image/jpeg") || normalized.startsWith("data:image/jpg")) return "JPEG";
  return "PNG";
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
  try {
    const image = await loadImage(dataUrl);
    return { width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    return null;
  }
}

function stripIncludedFindingsSection(safeHtml: string): string {
  const doc = new DOMParser().parseFromString(safeHtml || "<p>No content</p>", "text/html");
  const headings = Array.from(doc.body.querySelectorAll("h2"));
  const includedHeading = headings.find((heading) => normalizeText(heading.textContent).toLowerCase() === "included findings");
  if (!includedHeading) return safeHtml;

  let cursor: Element | null = includedHeading;
  while (cursor) {
    const next: Element | null = cursor.nextElementSibling;
    cursor.remove();
    if (next && next.tagName.toLowerCase() === "h2") break;
    cursor = next;
  }

  return doc.body.innerHTML;
}

function buildStandaloneHtmlDocument(params: {
  reportName: string;
  executiveSummary?: string | null;
  reportHtml: string;
}): string {
  const { reportName, executiveSummary, reportHtml } = params;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportName)}</title>
  <style>
    body { font-family: Inter, Segoe UI, Arial, sans-serif; margin: 20px auto; max-width: 980px; line-height: 1.6; color: #111827; padding: 0 16px; }
    h1, h2, h3, h4 { color: #111827; margin-top: 1.1em; margin-bottom: 0.5em; }
    p { margin: 0.6em 0; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
    code { background: #f3f4f6; padding: 1px 4px; border-radius: 4px; }
    pre { background: #f3f4f6; padding: 10px; border-radius: 6px; overflow: auto; }
    .inline-image-block { margin: 18px 0 10px; page-break-inside: avoid; }
    .inline-image-label { font-size: 0.9em; font-weight: 600; color: #374151; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.02em; }
    .inline-image { display: block; width: 100%; max-width: 940px; height: auto; border: 1px solid #d1d5db; border-radius: 8px; margin: 0 0 8px; }
    .screenshot-group { margin: 18px 0 24px; page-break-inside: avoid; }
    .screenshot-image { display: block; width: 100%; max-width: 940px; height: auto; border: 1px solid #d1d5db; border-radius: 8px; margin: 0 0 12px; }
    .screenshot-findings { margin-top: 8px; }
    .screenshot-findings > h3:first-child { margin-top: 0.4em; }
    .screenshot-findings li { margin: 0 0 4px; }
    .screenshot-finding-title { margin-bottom: 3px; }
    .screenshot-finding-meta { color: #4b5563; font-size: 0.92em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(reportName)}</h1>
  ${executiveSummary ? `<p><strong>Executive Summary:</strong> ${escapeHtml(String(executiveSummary))}</p>` : ""}
  ${reportHtml}
</body>
</html>`;
}

async function buildReportBodyHtml(report: ExportableReport): Promise<string> {
  const baseHtml = markdownToSafeHtml(String(report.contentMd ?? ""));
  const doc = new DOMParser().parseFromString(baseHtml || "<p>No content</p>", "text/html");
  const groupedSections = await buildGroupedScreenshotSections(report, collectRenderedReferenceNumbers(doc));

  if (groupedSections.length > 0) {
    const renderedFindingBlocks = collectRenderedFindingBlocks(doc);
    const narrativeHtml = stripIncludedFindingsSection(doc.body.innerHTML);
    return [narrativeHtml, buildVisualSectionHtml(groupedSections, renderedFindingBlocks)].filter(Boolean).join("\n");
  }

  for (const section of groupedSections) {
    if (!section.imageDataUrl || section.findings.length === 0) continue;

    const firstHeadingTitle = normalizeHeadingTitle(section.findings[0].finding.title);
    const targetHeading = Array.from(doc.body.querySelectorAll("h3")).find((heading) => {
      const headingTitle = normalizeHeadingTitle(heading.textContent);
      return headingTitle === firstHeadingTitle;
    });

    if (!targetHeading) continue;

    const wrapper = doc.createElement("div");
    wrapper.className = "inline-image-block";

    const label = doc.createElement("div");
    label.className = "inline-image-label";
    label.textContent = section.assetLabel;

    const image = doc.createElement("img");
    image.className = "inline-image";
    image.alt = `Reference image for ${section.assetLabel}`;
    image.src = section.imageDataUrl;

    wrapper.appendChild(label);
    wrapper.appendChild(image);
    targetHeading.parentElement?.insertBefore(wrapper, targetHeading);
  }

  return doc.body.innerHTML;
}

function getListItemText(element: Element) {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("ul, ol").forEach((list) => list.remove());
  return normalizeText(clone.textContent);
}

function getInlineSegments(element: Element, inheritedStyle: NonNullable<PdfTextOptions["fontStyle"]> = "normal"): PdfInlineSegment[] {
  const segments: PdfInlineSegment[] = [];

  const walk = (node: Node, fontStyle: NonNullable<PdfTextOptions["fontStyle"]>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) segments.push({ text, fontStyle });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const childElement = node as Element;
    const tag = childElement.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") return;

    const nextStyle = tag === "strong" || tag === "b"
      ? fontStyle === "italic" || fontStyle === "bolditalic" ? "bolditalic" : "bold"
      : tag === "em" || tag === "i"
        ? fontStyle === "bold" || fontStyle === "bolditalic" ? "bolditalic" : "italic"
        : fontStyle;

    childElement.childNodes.forEach((child) => walk(child, nextStyle));
  };

  element.childNodes.forEach((child) => walk(child, inheritedStyle));
  return segments;
}

async function downloadPdfReport(report: ExportableReport) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 44;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    pdf.addPage();
    y = margin;
  };

  const addGap = (height: number) => {
    y += height;
  };

  const writeText = (text: string, options: PdfTextOptions = {}) => {
    const value = normalizeText(text);
    if (!value) return;

    const fontSize = options.fontSize ?? 10;
    const fontStyle = options.fontStyle ?? "normal";
    const indent = options.indent ?? 0;
    const lineHeight = options.lineHeight ?? Math.max(fontSize + 4, 14);
    const gapAfter = options.gapAfter ?? 4;

    pdf.setFont("helvetica", fontStyle);
    pdf.setFontSize(fontSize);

    const lines = pdf.splitTextToSize(value, contentWidth - indent);
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(String(line), margin + indent, y);
      y += lineHeight;
    }
    addGap(gapAfter);
  };

  const writeInlineSegments = (segments: PdfInlineSegment[], options: PdfTextOptions = {}) => {
    const compactSegments = segments
      .map((segment) => ({ ...segment, text: segment.text.replace(/\s+/g, " ") }))
      .filter((segment) => segment.text.trim().length > 0);
    if (compactSegments.length === 0) return;

    const fontSize = options.fontSize ?? 10;
    const indent = options.indent ?? 0;
    const lineHeight = options.lineHeight ?? Math.max(fontSize + 4, 14);
    const gapAfter = options.gapAfter ?? 4;
    const availableWidth = contentWidth - indent;
    let cursorX = margin + indent;

    const newLine = () => {
      y += lineHeight;
      cursorX = margin + indent;
    };

    pdf.setFontSize(fontSize);
    ensureSpace(lineHeight);

    compactSegments.forEach((segment) => {
      pdf.setFont("helvetica", segment.fontStyle);
      const words = segment.text.trim().split(/\s+/);
      words.forEach((word, index) => {
        const token = index === 0 && cursorX === margin + indent ? word : ` ${word}`;
        const tokenWidth = pdf.getTextWidth(token);
        if (cursorX > margin + indent && cursorX + tokenWidth > margin + indent + availableWidth) {
          newLine();
        }
        ensureSpace(lineHeight);
        pdf.setFont("helvetica", segment.fontStyle);
        pdf.text(token, cursorX, y);
        cursorX += tokenWidth;
      });
    });

    y += lineHeight;
    addGap(gapAfter);
  };

  const writeBullet = (marker: string, text: string, indent: number) => {
    const value = normalizeText(text);
    if (!value) return;

    const fontSize = 10;
    const lineHeight = 15;
    const markerWidth = 18;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontSize);

    const lines = pdf.splitTextToSize(value, contentWidth - indent - markerWidth);
    lines.forEach((line: string, index: number) => {
      ensureSpace(lineHeight);
      if (index === 0) pdf.text(marker, margin + indent, y);
      pdf.text(String(line), margin + indent + markerWidth, y);
      y += lineHeight;
    });
    addGap(2);
  };

  const writeBulletSegments = (marker: string, segments: PdfInlineSegment[], indent: number) => {
    const value = normalizeText(segments.map((segment) => segment.text).join(""));
    if (!value) return;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    ensureSpace(15);
    pdf.text(marker, margin + indent, y);
    writeInlineSegments(segments, { indent: indent + 18, lineHeight: 15, gapAfter: 2 });
  };

  const drawRule = () => {
    ensureSpace(12);
    pdf.setDrawColor(210, 214, 220);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 12;
  };

  const renderImage = async (src: string, indent: number) => {
    const image = await loadImage(src);
    const maxWidth = contentWidth - indent;
    const drawWidth = Math.min(maxWidth, image.naturalWidth || maxWidth);
    const drawHeight = drawWidth * (image.naturalHeight / Math.max(image.naturalWidth, Number.EPSILON));
    ensureSpace(drawHeight + 8);
    pdf.addImage(src, getJsPdfImageFormat(src), margin + indent, y, drawWidth, drawHeight, undefined, "FAST");
    y += drawHeight + 8;
  };

  const renderChildren = async (parent: Element, indent = 0) => {
    for (const child of Array.from(parent.children)) {
      await renderElement(child, indent);
    }
  };

  const renderList = async (list: Element, indent: number, ordered: boolean) => {
    const items = Array.from(list.children).filter((child) => child.tagName.toLowerCase() === "li");
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const segments = getInlineSegments(item);
      if (segments.length > 0) {
        writeBulletSegments(ordered ? `${index + 1}.` : "•", segments, indent);
      } else {
        writeBullet(ordered ? `${index + 1}.` : "•", getListItemText(item), indent);
      }
      for (const nested of Array.from(item.querySelectorAll(":scope > ul, :scope > ol"))) {
        await renderList(nested, indent + 18, nested.tagName.toLowerCase() === "ol");
      }
    }
    addGap(4);
  };

  const renderTable = async (table: Element, indent: number) => {
    for (const row of Array.from(table.querySelectorAll("tr"))) {
      const cells = Array.from(row.querySelectorAll("th, td")).map((cell) => normalizeText(cell.textContent));
      if (cells.length === 0) continue;
      const hasHeader = row.querySelector("th") != null;
      writeText(cells.join(" | "), { fontSize: 9, fontStyle: hasHeader ? "bold" : "normal", indent, lineHeight: 13, gapAfter: 1 });
    }
    addGap(6);
  };

  const renderElement = async (element: Element, indent = 0) => {
    const tag = element.tagName.toLowerCase();
    const text = normalizeText(element.textContent);

    if (!text && tag !== "hr" && tag !== "img") return;

    if (tag === "h1") {
      addGap(y === margin ? 0 : 8);
      writeText(text, { fontSize: 18, fontStyle: "bold", lineHeight: 23, gapAfter: 8 });
      return;
    }
    if (tag === "h2") {
      addGap(6);
      writeText(text, { fontSize: 14, fontStyle: "bold", lineHeight: 19, gapAfter: 6 });
      return;
    }
    if (tag === "h3") {
      addGap(5);
      writeText(text, { fontSize: 12, fontStyle: "bold", lineHeight: 17, gapAfter: 4 });
      return;
    }
    if (tag === "h4" || tag === "h5" || tag === "h6") {
      addGap(4);
      writeText(text, { fontSize: 11, fontStyle: "bold", lineHeight: 16, gapAfter: 3 });
      return;
    }
    if (tag === "img") {
      const src = element.getAttribute("src") ?? "";
      if (src) await renderImage(src, indent);
      return;
    }
    if (tag === "ul" || tag === "ol") {
      await renderList(element, indent, tag === "ol");
      return;
    }
    if (tag === "blockquote") {
      writeText(text, { fontSize: 10, fontStyle: "italic", indent: indent + 14, lineHeight: 15, gapAfter: 6 });
      return;
    }
    if (tag === "pre" || tag === "code") {
      writeText(text, { fontSize: 9, fontStyle: "normal", indent: indent + 10, lineHeight: 13, gapAfter: 6 });
      return;
    }
    if (tag === "table") {
      await renderTable(element, indent);
      return;
    }
    if (tag === "hr") {
      drawRule();
      return;
    }
    if (tag === "p") {
      writeInlineSegments(getInlineSegments(element), { indent, lineHeight: 15, gapAfter: 5 });
      return;
    }

    if (element.children.length > 0) {
      await renderChildren(element, indent);
    } else {
      writeText(text, { indent, lineHeight: 15, gapAfter: 5 });
    }
  };

  const bodyHtml = await buildReportBodyHtml(report);
  const doc = new DOMParser().parseFromString(bodyHtml || "<p>No content</p>", "text/html");

  writeText(String(report.name ?? "UX Report"), { fontSize: 16, fontStyle: "bold", lineHeight: 21, gapAfter: 12 });
  if (report.executiveSummary) {
    writeText(`Executive Summary: ${report.executiveSummary}`, { fontStyle: "bold", lineHeight: 15, gapAfter: 10 });
  }
  await renderChildren(doc.body);

  const safeName = sanitizeFileName(String(report.name ?? "report"));
  triggerBlobDownload(pdf.output("blob"), `${safeName}.pdf`);
}

async function downloadWordReport(report: ExportableReport) {
  const reportName = String(report.name ?? "UX Report");
  const reportHtml = await buildReportBodyHtml(report);

  const wordHtml = buildStandaloneHtmlDocument({
    reportName,
    executiveSummary: report.executiveSummary,
    reportHtml,
  });

  const wordBlob = new Blob([wordHtml], {
    type: "application/msword;charset=utf-8",
  });
  const safeName = sanitizeFileName(reportName);
  triggerBlobDownload(wordBlob, `${safeName}.doc`);
}

async function downloadHtmlReport(report: ExportableReport) {
  const reportName = String(report.name ?? "UX Report");
  const reportHtml = await buildReportBodyHtml(report);

  const htmlDocument = buildStandaloneHtmlDocument({
    reportName,
    executiveSummary: report.executiveSummary,
    reportHtml,
  });

  const htmlBlob = new Blob([htmlDocument], { type: "text/html;charset=utf-8" });
  const safeName = sanitizeFileName(reportName);
  triggerBlobDownload(htmlBlob, `${safeName}.html`);
}

export async function buildReportPreviewHtml(report: ExportableReport): Promise<string> {
  return buildStandaloneHtmlDocument({
    reportName: String(report.name ?? "UX Report"),
    executiveSummary: report.executiveSummary,
    reportHtml: await buildReportBodyHtml(report),
  });
}

async function downloadReportInternal(report: ExportableReport, format: "pdf" | "word" | "html") {
  if (format === "pdf") {
    await downloadPdfReport(report);
    return;
  }

  if (format === "html") {
    await downloadHtmlReport(report);
    return;
  }

  await downloadWordReport(report);
}

export function downloadReport(report: ExportableReport, format: "pdf" | "word" | "html") {
  void downloadReportInternal(report, format).catch(() => {
    if (format === "pdf") {
      void downloadPdfReport(report);
      return;
    }

    if (format === "html") {
      void downloadHtmlReport(report);
      return;
    }

    void downloadWordReport(report);
  });
}