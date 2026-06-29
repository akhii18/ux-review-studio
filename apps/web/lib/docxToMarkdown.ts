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

  return {
    markdown: markdown || `(No readable text extracted from ${docxFile.name})`,
    images,
  };
}
