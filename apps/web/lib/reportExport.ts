import { marked } from "marked";
import DOMPurify from "dompurify";
import { jsPDF } from "jspdf";

type ExportableReport = {
  name?: string | null;
  contentMd?: string | null;
  executiveSummary?: string | null;
};

type PdfTextOptions = {
  fontSize?: number;
  fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
  indent?: number;
  lineHeight?: number;
  gapAfter?: number;
};

function markdownToSafeHtml(markdown: string) {
  const parsedHtml = marked.parse(markdown || "", { gfm: true, breaks: true });
  return DOMPurify.sanitize(typeof parsedHtml === "string" ? parsedHtml : String(parsedHtml));
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

function getListItemText(element: Element) {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("ul, ol").forEach((list) => list.remove());
  return normalizeText(clone.textContent);
}

function downloadPdfReport(report: ExportableReport) {
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

  const drawRule = () => {
    ensureSpace(12);
    pdf.setDrawColor(210, 214, 220);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 12;
  };

  const renderChildren = (parent: Element, indent = 0) => {
    Array.from(parent.children).forEach((child) => renderElement(child, indent));
  };

  const renderList = (list: Element, indent: number, ordered: boolean) => {
    Array.from(list.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .forEach((item, index) => {
        writeBullet(ordered ? `${index + 1}.` : "•", getListItemText(item), indent);
        item.querySelectorAll(":scope > ul, :scope > ol").forEach((nested) => {
          renderList(nested, indent + 18, nested.tagName.toLowerCase() === "ol");
        });
      });
    addGap(4);
  };

  const renderTable = (table: Element, indent: number) => {
    Array.from(table.querySelectorAll("tr")).forEach((row) => {
      const cells = Array.from(row.querySelectorAll("th, td")).map((cell) => normalizeText(cell.textContent));
      if (cells.length === 0) return;
      const hasHeader = row.querySelector("th") != null;
      writeText(cells.join(" | "), { fontSize: 9, fontStyle: hasHeader ? "bold" : "normal", indent, lineHeight: 13, gapAfter: 1 });
    });
    addGap(6);
  };

  const renderElement = (element: Element, indent = 0) => {
    const tag = element.tagName.toLowerCase();
    const text = normalizeText(element.textContent);

    if (!text && tag !== "hr") return;

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
    if (tag === "ul" || tag === "ol") {
      renderList(element, indent, tag === "ol");
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
      renderTable(element, indent);
      return;
    }
    if (tag === "hr") {
      drawRule();
      return;
    }
    if (tag === "p") {
      writeText(text, { indent, lineHeight: 15, gapAfter: 5 });
      return;
    }

    if (element.children.length > 0) {
      renderChildren(element, indent);
    } else {
      writeText(text, { indent, lineHeight: 15, gapAfter: 5 });
    }
  };

  const safeHtml = markdownToSafeHtml(String(report.contentMd ?? ""));
  const doc = new DOMParser().parseFromString(safeHtml || "<p>No content</p>", "text/html");

  writeText(String(report.name ?? "UX Report"), { fontSize: 16, fontStyle: "bold", lineHeight: 21, gapAfter: 12 });
  if (report.executiveSummary) {
    writeText(`Executive Summary: ${report.executiveSummary}`, { fontStyle: "bold", lineHeight: 15, gapAfter: 10 });
  }
  renderChildren(doc.body);

  const safeName = sanitizeFileName(String(report.name ?? "report"));
  triggerBlobDownload(pdf.output("blob"), `${safeName}.pdf`);
}

function downloadWordReport(report: ExportableReport) {
  const reportHtml = markdownToSafeHtml(String(report.contentMd ?? ""));
  const reportName = String(report.name ?? "UX Report");

  const wordHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(reportName)}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1f2937; }
        h1, h2, h3, h4 { color: #111827; margin-top: 18px; margin-bottom: 8px; }
        p { margin: 8px 0; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
        code { background: #f3f4f6; padding: 1px 4px; border-radius: 4px; }
        pre { background: #f3f4f6; padding: 10px; border-radius: 6px; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(reportName)}</h1>
      ${report.executiveSummary ? `<p><strong>Executive Summary:</strong> ${escapeHtml(String(report.executiveSummary))}</p>` : ""}
      ${reportHtml}
    </body>
    </html>
  `;

  const wordBlob = new Blob([wordHtml], {
    type: "application/msword;charset=utf-8",
  });
  const safeName = sanitizeFileName(reportName);
  triggerBlobDownload(wordBlob, `${safeName}.doc`);
}

export function downloadReport(report: ExportableReport, format: "pdf" | "word") {
  if (format === "pdf") {
    downloadPdfReport(report);
    return;
  }

  downloadWordReport(report);
}