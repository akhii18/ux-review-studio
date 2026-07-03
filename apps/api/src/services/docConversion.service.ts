import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

type ConvertedImage = {
  name: string;
  mimeType: "image/png";
  base64Data: string;
  sizeBytes: number;
};

export type LegacyDocConversionResult = {
  markdown: string;
  images: ConvertedImage[];
};

const TEXT_PAGE_WIDTH = 1600;
const TEXT_PAGE_HEIGHT = 2200;
const TEXT_MARGIN_X = 72;
const TEXT_MARGIN_Y = 110;
const TEXT_LINE_HEIGHT = 34;
const TEXT_LINES_PER_PAGE = 52;
const TEXT_MAX_CHARS = 104;
const MAX_TEXT_IMAGE_PAGES = 4;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function splitLongLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [line.slice(0, maxChars)];

  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      wrapped.push(current);
      current = word;
      continue;
    }

    wrapped.push(word.slice(0, maxChars));
    current = word.slice(maxChars);
  }

  if (current) wrapped.push(current);
  return wrapped;
}

function normalizeBodyToMarkdown(rawBody: string): string {
  const lines = rawBody
    .replace(/\r\n/g, "\n")
    .replace(/\u0007/g, "")
    .replace(/\u000b/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0));

  const markdown = lines.join("\n").trim();
  return markdown || "(No readable text extracted from legacy Word document)";
}

function paginateMarkdown(markdown: string): string[][] {
  const wrappedLines = markdown
    .split("\n")
    .flatMap((line) => splitLongLine(line.trimEnd(), TEXT_MAX_CHARS));

  const pages: string[][] = [];
  for (let i = 0; i < wrappedLines.length && pages.length < MAX_TEXT_IMAGE_PAGES; i += TEXT_LINES_PER_PAGE) {
    pages.push(wrappedLines.slice(i, i + TEXT_LINES_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push(["(No readable text extracted)"]);
  }

  return pages;
}

async function renderTextPageToPngBase64(params: { lines: string[]; pageIndex: number; pageCount: number }): Promise<string> {
  const { lines, pageIndex, pageCount } = params;

  const bodyTextSvg = lines
    .map((line, index) => {
      const y = TEXT_MARGIN_Y + (index * TEXT_LINE_HEIGHT);
      return `<text x="${TEXT_MARGIN_X}" y="${y}" font-family="Consolas, 'Courier New', monospace" font-size="24" fill="#111827">${xmlEscape(line || " ")}</text>`;
    })
    .join("");

  const svg = `
<svg width="${TEXT_PAGE_WIDTH}" height="${TEXT_PAGE_HEIGHT}" viewBox="0 0 ${TEXT_PAGE_WIDTH} ${TEXT_PAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${TEXT_MARGIN_X}" y="62" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" fill="#0f172a">
    Legacy Word Content (${pageIndex + 1}/${pageCount})
  </text>
  ${bodyTextSvg}
</svg>`;

  const pngBuffer = await sharp(Buffer.from(svg), { density: 180 }).png({ compressionLevel: 9 }).toBuffer();
  return pngBuffer.toString("base64");
}

export async function convertLegacyDoc(params: {
  fileName: string;
  base64Data: string;
}): Promise<LegacyDocConversionResult> {
  const { fileName, base64Data } = params;

  const tempName = `${crypto.randomUUID()}.doc`;
  const tempPath = path.join(os.tmpdir(), tempName);
  const docBuffer = Buffer.from(base64Data, "base64");

  await fs.writeFile(tempPath, docBuffer);

  try {
    const WordExtractor = (await import("word-extractor")).default;
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(tempPath);

    const rawBody = extracted.getBody?.() ?? "";
    const markdown = normalizeBodyToMarkdown(rawBody);
    const pages = paginateMarkdown(markdown);
    const stem = fileName.replace(/\.doc$/i, "");

    const images: ConvertedImage[] = [];
    for (let i = 0; i < pages.length; i++) {
      const base64Png = await renderTextPageToPngBase64({
        lines: pages[i],
        pageIndex: i,
        pageCount: pages.length,
      });
      images.push({
        name: `${stem}_doc_text_page_${String(i + 1).padStart(2, "0")}.png`,
        mimeType: "image/png",
        base64Data: base64Png,
        sizeBytes: Buffer.byteLength(base64Png, "base64"),
      });
    }

    return { markdown, images };
  } finally {
    await fs.unlink(tempPath).catch(() => undefined);
  }
}
