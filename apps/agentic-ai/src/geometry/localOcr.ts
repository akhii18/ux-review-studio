import sharp from "sharp";
import { createWorker } from "tesseract.js";
import type { GeometryCandidate, ScreenMetadata } from "../schemas.js";
import type { GeometryProvider, GeometryProviderResult } from "./providers.js";
import {
  expandPixelBox,
  horizontalOverlapRatio,
  mergePixelBoxes,
  normalizePixelBox,
  toPixelBox,
  type PixelBox,
} from "./boxUtils.js";

type OcrItem = {
  text?: string;
  confidence?: number;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

function normalizeConfidence(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(1, numeric / 100));
}

function itemToPixelBox(item: OcrItem): PixelBox | null {
  if (!item.bbox) return null;
  const { x0, y0, x1, y1 } = item.bbox;
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
  if (x1 <= x0 || y1 <= y0) return null;

  return {
    x: x0,
    y: y0,
    width: x1 - x0,
    height: y1 - y0,
  };
}

function makeCandidate(params: {
  screen: ScreenMetadata;
  id: string;
  box: PixelBox;
  text: string | null;
  label: string;
  confidence: number;
  evidence: string;
}): GeometryCandidate {
  const { screen, id, box, text, label, confidence, evidence } = params;

  return {
    candidateId: `screen${screen.screenIndex + 1}-${id}`,
    screenIndex: screen.screenIndex,
    bbox: normalizePixelBox(box, screen.width, screen.height),
    sourceType: label === "text-group" ? "layout" : "ocr",
    sourceConfidence: Math.max(0, Math.min(1, confidence)),
    label,
    text,
    sourceEvidence: evidence,
  };
}

function buildGroupedCandidates(screen: ScreenMetadata, lineCandidates: GeometryCandidate[]): GeometryCandidate[] {
  const lines = lineCandidates
    .map((candidate) => ({
      candidate,
      box: toPixelBox(candidate.bbox, screen.width, screen.height),
    }))
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);

  const groups: GeometryCandidate[] = [];
  let groupCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];
    if (!next) continue;

    const verticalGap = next.box.y - (current.box.y + current.box.height);
    const leftDelta = Math.abs(next.box.x - current.box.x);
    const overlap = horizontalOverlapRatio(current.box, next.box);
    const likelyStack = verticalGap >= 0 && verticalGap <= 28 && (leftDelta <= 90 || overlap >= 0.25);

    if (!likelyStack) continue;

    const merged = expandPixelBox(
      mergePixelBoxes([current.box, next.box]),
      8,
      screen.width,
      screen.height
    );
    const text = [current.candidate.text, next.candidate.text].filter(Boolean).join(" / ");
    const confidence = Math.min(current.candidate.sourceConfidence, next.candidate.sourceConfidence) * 0.9;

    groupCount += 1;
    groups.push(makeCandidate({
      screen,
      id: `layout-group-${groupCount}`,
      box: merged,
      text,
      label: "text-group",
      confidence,
      evidence: `Grouped adjacent OCR lines: ${current.candidate.candidateId}, ${next.candidate.candidateId}`,
    }));
  }

  return groups;
}

export function createLocalOcrGeometryProvider(): GeometryProvider {
  return {
    name: "local-ocr-layout",
    async extract(screen: ScreenMetadata): Promise<GeometryProviderResult> {
      const imageBuffer = await sharp(screen.path)
        .greyscale()
        .normalize()
        .png()
        .toBuffer();

      const worker: any = await createWorker("eng");

      try {
        const result = await worker.recognize(imageBuffer);
        const data = result?.data ?? {};
        const rawLines = Array.isArray(data.lines) ? data.lines as OcrItem[] : [];
        const rawWords = Array.isArray(data.words) ? data.words as OcrItem[] : [];

        const lineCandidates = rawLines
          .map((line, index) => {
            const text = line.text?.trim() ?? "";
            const box = itemToPixelBox(line);
            const confidence = normalizeConfidence(line.confidence);
            if (!text || !box || confidence < 0.35) return null;

            return makeCandidate({
              screen,
              id: `ocr-line-${index + 1}`,
              box: expandPixelBox(box, 4, screen.width, screen.height),
              text,
              label: "text-line",
              confidence,
              evidence: `tesseract.js line confidence=${Math.round(confidence * 100)}%`,
            });
          })
          .filter((candidate): candidate is GeometryCandidate => Boolean(candidate));

        const wordCandidates = rawWords
          .map((word, index) => {
            const text = word.text?.trim() ?? "";
            const box = itemToPixelBox(word);
            const confidence = normalizeConfidence(word.confidence);
            if (text.length < 3 || !box || confidence < 0.55) return null;

            return makeCandidate({
              screen,
              id: `ocr-word-${index + 1}`,
              box: expandPixelBox(box, 3, screen.width, screen.height),
              text,
              label: "text-word",
              confidence,
              evidence: `tesseract.js word confidence=${Math.round(confidence * 100)}%`,
            });
          })
          .filter((candidate): candidate is GeometryCandidate => Boolean(candidate));

        const groupedCandidates = buildGroupedCandidates(screen, lineCandidates);
        const candidates = [...lineCandidates, ...groupedCandidates, ...wordCandidates];

        return {
          candidates,
          providerNotes: [
            `${screen.path}: ${lineCandidates.length} OCR lines, ${groupedCandidates.length} layout groups, ${wordCandidates.length} OCR words`,
          ],
        };
      } finally {
        await worker.terminate();
      }
    },
  };
}