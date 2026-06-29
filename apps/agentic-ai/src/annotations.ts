import { mkdirSync, writeFileSync } from "fs";
import { basename, extname, join } from "path";
import sharp from "sharp";
import type { BoundingBox, ScreenMetadata } from "./schemas.js";
import type { GraphStateType } from "./state.js";
export type { ScreenMetadata } from "./schemas.js";

type OverlayBox = {
  findingId: string;
  issueNumber: number;
  severity: "P0" | "P1" | "P2";
  screenIndex: number;
  bbox: BoundingBox;
};

const SEVERITY_STYLES = {
  P0: { stroke: "#d62828", fill: "rgba(214, 40, 40, 0.16)" },
  P1: { stroke: "#f77f00", fill: "rgba(247, 127, 0, 0.16)" },
  P2: { stroke: "#2a9d8f", fill: "rgba(42, 157, 143, 0.16)" },
} as const;

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toPixelBox(bbox: BoundingBox, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const x = Math.round(clamp01(bbox.x) * width);
  const y = Math.round(clamp01(bbox.y) * height);
  const w = Math.max(1, Math.round(clamp01(bbox.width) * width));
  const h = Math.max(1, Math.round(clamp01(bbox.height) * height));

  return {
    x: Math.min(width - 1, x),
    y: Math.min(height - 1, y),
    w: Math.min(width - x, w),
    h: Math.min(height - y, h),
  };
}

function buildOverlaySvg(width: number, height: number, boxes: OverlayBox[]): string {
  const strokeWidth = Math.max(2, Math.round(Math.max(width, height) * 0.002));
  const fontSize = Math.max(12, Math.round(Math.max(width, height) * 0.014));
  const badgeSize = Math.max(22, Math.round(fontSize * 1.35));
  const badgeGap = Math.max(2, Math.round(strokeWidth * 0.75));
  const outlineGap = Math.max(3, strokeWidth + 1);
  const occupiedBadgeSlots = new Map<string, number>();

  const preparedBoxes = boxes.map((box) => {
    const style = SEVERITY_STYLES[box.severity];
    const px = toPixelBox(box.bbox, width, height);
    const label = String(box.issueNumber);
    const slotKey = [px.x, px.y, px.w, px.h].join(":");
    const slot = occupiedBadgeSlots.get(slotKey) ?? 0;
    occupiedBadgeSlots.set(slotKey, slot + 1);
    const outlineInset = slot * outlineGap;

    const preferredBadgeX = px.x + slot * (badgeSize + badgeGap);
    const badgeX = Math.max(0, Math.min(preferredBadgeX, width - badgeSize));
    const badgeY = Math.max(0, Math.min(px.y, height - badgeSize));

    return {
      style,
      px,
      label,
      badgeX,
      badgeY,
      textX: badgeX + badgeSize / 2,
      textY: badgeY + badgeSize / 2 + fontSize * 0.36,
      outlineX: Math.min(width - 1, px.x + outlineInset),
      outlineY: Math.min(height - 1, px.y + outlineInset),
      outlineW: Math.max(1, px.w - outlineInset * 2),
      outlineH: Math.max(1, px.h - outlineInset * 2),
    };
  });

  const fills = preparedBoxes
    .map(({ px, style }) => `<rect x="${px.x}" y="${px.y}" width="${px.w}" height="${px.h}" fill="${style.fill}" />`)
    .join("");
  const outlines = preparedBoxes
    .map(({ outlineX, outlineY, outlineW, outlineH, style }) => `<rect x="${outlineX}" y="${outlineY}" width="${outlineW}" height="${outlineH}" fill="none" stroke="${style.stroke}" stroke-width="${strokeWidth}" />`)
    .join("");
  const badges = preparedBoxes
    .map(({ badgeX, badgeY, style }) => `<rect x="${badgeX}" y="${badgeY}" width="${badgeSize}" height="${badgeSize}" rx="${Math.round(badgeSize * 0.18)}" fill="${style.stroke}" stroke="#ffffff" stroke-width="${Math.max(1, strokeWidth - 1)}" />`)
    .join("");
  const labels = preparedBoxes
    .map(({ textX, textY, label }) => `<text x="${textX}" y="${textY}" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" font-weight="800">${escapeXml(label)}</text>`)
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    fills,
    outlines,
    badges,
    labels,
    "</svg>",
  ].join("");
}

function collectOverlayBoxes(state: GraphStateType): OverlayBox[] {

  if (!state.synthesisOutput) return [];

  const elementLookup = new Map(
    (state.groundingOutput?.elements ?? []).map((el) => [el.elementId, el])
  );

  const overlays: OverlayBox[] = [];

  for (const [findingIndex, finding] of state.synthesisOutput.findings.entries()) {
    const fromBboxRefs = finding.bboxRefs.map((ref) => ({
      screenIndex: ref.screenIndex,
      bbox: ref.bbox,
    }));

    const fromElementRefs = finding.elementRefs
      .map((elementId) => elementLookup.get(elementId))
      .filter((el): el is NonNullable<typeof el> => Boolean(el))
      .map((el) => ({
        screenIndex: el.screenIndex,
        bbox: el.bbox,
      }));

    const refs = fromElementRefs.length > 0 ? fromElementRefs : fromBboxRefs;

    for (const ref of refs) {
      overlays.push({
        findingId: finding.id,
        issueNumber: findingIndex + 1,
        severity: finding.severity,
        screenIndex: ref.screenIndex,
        bbox: ref.bbox,
      });
    }
  }

  return overlays;
}

export function writeHumanReviewArtifacts(params: {
  runStamp: string;
  outputRootDir: string;
  imagePaths: string[];
  state: GraphStateType;
  screenMetadata: ScreenMetadata[];
}): { reviewArtifactsDir: string; issueReviewJsonPath: string } {
  const { runStamp, outputRootDir, imagePaths, state, screenMetadata } = params;
  const reviewArtifactsDir = join(outputRootDir, "review-artifacts", runStamp);
  mkdirSync(reviewArtifactsDir, { recursive: true });

  const issueReviewJsonPath = join(reviewArtifactsDir, "issues.json");
  const synthesisFindings = state.synthesisOutput?.findings ?? [];
  const issues = synthesisFindings.map((finding, index) => ({
    findingId: finding.id,
    severity: finding.severity,
    region: finding.region,
    issue: finding.issue,
    fix: finding.fix,
    issueNumber: index + 1,
    displayLabel: String(index + 1),
  }));

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      runStamp,
      imagePaths,
      screenMetadata,
      artifactSchemaVersion: "1.0.0",
      annotationLabelMode: "issue-number",
    },
    summary: state.synthesisOutput?.deduplicationNote ?? "No synthesis output available.",
    coverageNote: `${synthesisFindings.length} canonical findings from synthesis.`,
    issues,
  };

  writeFileSync(issueReviewJsonPath, JSON.stringify(output, null, 2), "utf-8");

  return {
    reviewArtifactsDir,
    issueReviewJsonPath,
  };
}

export async function getScreenMetadata(imagePaths: string[]): Promise<ScreenMetadata[]> {
  const metadata = await Promise.all(
    imagePaths.map(async (path, index) => {
      const image = sharp(path);
      const info = await image.metadata();

      if (!info.width || !info.height) {
        throw new Error(`Unable to read dimensions for image: ${path}`);
      }

      return {
        screenIndex: index,
        screenId: `screen-${index + 1}`,
        path,
        width: info.width,
        height: info.height,
      } satisfies ScreenMetadata;
    })
  );

  return metadata;
}

export async function writeAnnotatedScreenshots(params: {
  runStamp: string;
  outputRootDir: string;
  imagePaths: string[];
  state: GraphStateType;
  screenMetadata?: ScreenMetadata[];
}): Promise<{ annotatedDir: string; annotatedImagePaths: string[] }> {
  const { runStamp, outputRootDir, imagePaths, state, screenMetadata } = params;
  const annotatedDir = join(outputRootDir, "annotated", runStamp);
  mkdirSync(annotatedDir, { recursive: true });

  const overlays = collectOverlayBoxes(state);
  const metadata = screenMetadata ?? await getScreenMetadata(imagePaths);

  const annotatedImagePaths: string[] = [];

  for (const screen of metadata) {
    const sourcePath = screen.path;
    const sourceName = basename(sourcePath, extname(sourcePath));
    const outputPath = join(annotatedDir, `${sourceName}-annotated.png`);
    const screenBoxes = overlays.filter((box) => box.screenIndex === screen.screenIndex);

    if (screenBoxes.length === 0) {
      await sharp(sourcePath).png().toFile(outputPath);
      annotatedImagePaths.push(outputPath);
      continue;
    }

    const svg = buildOverlaySvg(screen.width, screen.height, screenBoxes);

    await sharp(sourcePath)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toFile(outputPath);

    annotatedImagePaths.push(outputPath);
  }

  return {
    annotatedDir,
    annotatedImagePaths,
  };
}
