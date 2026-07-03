/**
 * docxToMarkdown.ts
 * -----------------
 * Browser-only utility. Parses a `.docx` Word document to extract its
 * **text content** and **embedded images** separately using mammoth.js.
 *
 * Text is returned as a markdown string with `[IMAGE_REF: name.png]`
 * placeholders that reference the extracted images by name. The images
 * are returned as synthetic PNG/JPEG Files, identical in shape to a
 * user-uploaded screenshot, so the rest of the upload flow and the AI
 * pipeline treat them like regular screenshots.
 */

export type DocxImageFile = {
  /** Unique ID for React key / file-list state */
  id: string;
  /** e.g. "design_spec_img_01.png" */
  name: string;
  type: "Screenshot";
  status: "Ready";
  /** Synthetic image File */
  file: File;
  /** Object URL for the preview thumbnail (revoke when done) */
  previewUrl: string;
};

export type DocxExtractionResult = {
  /** Markdown text with [IMAGE_REF: ...] placeholders */
  markdown: string;
  /** Extracted images */
  images: DocxImageFile[];
};

const TEXT_CANVAS_WIDTH = 1600;
const TEXT_CANVAS_HEIGHT = 2200;
const TEXT_MARGIN_X = 80;
const TEXT_MARGIN_Y = 90;
const TEXT_LINE_HEIGHT = 36;
const TEXT_MAX_LINES = 52;
const TEXT_MAX_CHARS_PER_LINE = 110;
const MAX_TEXT_IMAGE_PAGES = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map common MIME types to file extensions. */
function mimeToExt(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("svg")) return "svg+xml";
  if (mime.includes("webp")) return "webp";
  // Default to png for anything else (including jpeg — we re-encode to png below)
  return "png";
}

/** Convert a base64 string to a Blob. */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Convert simple HTML (as produced by mammoth) into clean markdown-like text.
 * This is intentionally lightweight — we only need readable plaintext with
 * structural markers, not a full HTML→Markdown converter.
 */
function htmlToSimpleMarkdown(html: string): string {
  let md = html;

  // Preserve image references before stripping generic HTML tags.
  md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (_full, src: string) => {
    return src.includes("@@DOCX_IMG_PLACEHOLDER@@") ? `\n${src}\n` : "\n[IMAGE_REF: embedded-image]\n";
  });

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n");
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "\n##### $1\n");
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "\n###### $1\n");

  // Bold / italic / underline
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, "$1");

  // List items — prefix with bullet/dash
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");

  // Paragraphs and divs → newlines
  md = md.replace(/<\/p>/gi, "\n");
  md = md.replace(/<p[^>]*>/gi, "");
  md = md.replace(/<\/div>/gi, "\n");
  md = md.replace(/<div[^>]*>/gi, "");

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // Strip remaining HTML tags (tables, spans, etc.)
  md = md.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, " ");

  // Collapse excessive blank lines
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}

function splitLongLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];

  const words = line.split(/\s+/).filter(Boolean);
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
    } else {
      wrapped.push(word.slice(0, maxChars));
      current = word.slice(maxChars);
    }
  }

  if (current) wrapped.push(current);
  return wrapped.length > 0 ? wrapped : [line.slice(0, maxChars)];
}

async function renderTextAsImageFiles(stem: string, markdown: string): Promise<DocxImageFile[]> {
  const normalizedLines = markdown
    .split("\n")
    .flatMap((line) => splitLongLine(line.trimEnd(), TEXT_MAX_CHARS_PER_LINE));

  if (normalizedLines.length === 0) {
    normalizedLines.push("(No readable text extracted)");
  }

  const pages: string[][] = [];
  for (let i = 0; i < normalizedLines.length && pages.length < MAX_TEXT_IMAGE_PAGES; i += TEXT_MAX_LINES) {
    pages.push(normalizedLines.slice(i, i + TEXT_MAX_LINES));
  }

  const files: DocxImageFile[] = [];

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const canvas = document.createElement("canvas");
    canvas.width = TEXT_CANVAS_WIDTH;
    canvas.height = TEXT_CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not render extracted Word text preview image");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0f172a";
    ctx.font = "600 32px sans-serif";
    ctx.fillText(`Extracted Word Content (${pageIndex + 1}/${pages.length})`, TEXT_MARGIN_X, 56);

    ctx.fillStyle = "#111827";
    ctx.font = "26px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    const lines = pages[pageIndex];
    lines.forEach((line, lineIndex) => {
      const y = TEXT_MARGIN_Y + (lineIndex * TEXT_LINE_HEIGHT);
      ctx.fillText(line || " ", TEXT_MARGIN_X, y);
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to create text preview image"));
      }, "image/png");
    });

    const fileName = `${stem}_text_page_${String(pageIndex + 1).padStart(2, "0")}.png`;
    const syntheticFile = new File([blob], fileName, { type: "image/png" });

    files.push({
      id: `docx-text-${pageIndex + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: fileName,
      type: "Screenshot",
      status: "Ready",
      file: syntheticFile,
      previewUrl: URL.createObjectURL(blob),
    });
  }

  return files;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function processDocx(docxFile: File): Promise<DocxExtractionResult> {
  // Lazy-load mammoth so it's only bundled when a .docx is actually uploaded.
  const mammoth = await import("mammoth");

  const arrayBuffer = await docxFile.arrayBuffer();
  const stem = docxFile.name.replace(/\.docx?$/i, "");

  const images: DocxImageFile[] = [];
  let imageCounter = 0;

  // Use mammoth's convertImage hook to intercept each embedded image.
  // We replace images with a text placeholder in the HTML, then collect
  // the image data as separate file entries.
  const PLACEHOLDER_PREFIX = "@@DOCX_IMG_PLACEHOLDER@@";

  const options = {
    convertImage: mammoth.images.imgElement((image: { contentType: string; read: (encoding: string) => Promise<string> }) => {
      // Return a promise that resolves to an img element whose src we'll
      // later replace with our placeholder text.
      return image.read("base64").then((base64Data: string) => {
        imageCounter++;
        const ext = mimeToExt(image.contentType);
        const fileName = `${stem}_img_${String(imageCounter).padStart(2, "0")}.${ext}`;

        const blob = base64ToBlob(base64Data, image.contentType);
        const syntheticFile = new File([blob], fileName, { type: image.contentType });

        images.push({
          id: `docx-img-${imageCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: fileName,
          type: "Screenshot",
          status: "Ready",
          file: syntheticFile,
          previewUrl: URL.createObjectURL(blob),
        });

        // Return an <img> tag with a recognisable placeholder src.
        // We'll find-and-replace these after HTML→markdown conversion.
        return { src: `${PLACEHOLDER_PREFIX}${fileName}${PLACEHOLDER_PREFIX}` };
      });
    }),
  };

  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  const html = result.value;

  // Convert HTML to markdown-like text
  let markdown = htmlToSimpleMarkdown(html);

  // Replace image placeholder srcs with our [IMAGE_REF: ...] format.
  // The mammoth output wraps these as <img src="@@...@@filename@@...@@" />
  // but htmlToSimpleMarkdown strips HTML tags, so we need to handle both
  // the case where the <img> survived and where only the placeholder text remains.
  //
  // After htmlToSimpleMarkdown strips tags, the placeholder text may appear
  // as just the raw src value if it wasn't inside an img tag that got stripped.
  // Let's do a final pass to clean up:
  const placeholderRegex = new RegExp(
    `${PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(.+?)${PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    "g"
  );
  markdown = markdown.replace(placeholderRegex, "[IMAGE_REF: $1]");

  if (images.length === 0) {
    const textScreenshotFiles = await renderTextAsImageFiles(stem, markdown);
    images.push(...textScreenshotFiles);
  }

  return {
    markdown: markdown || `(No readable text extracted from ${docxFile.name})`,
    images,
  };
}
