import sharp from "sharp";
import type { GeometryCandidate, ScreenMetadata } from "../schemas.js";
import type { GeometryProvider, GeometryProviderResult } from "./providers.js";
import {
  expandPixelBox,
  horizontalOverlapRatio,
  mergePixelBoxes,
  normalizePixelBox,
  type PixelBox,
} from "./boxUtils.js";

type Component = PixelBox & {
  area: number;
};

function makeCandidate(params: {
  screen: ScreenMetadata;
  id: string;
  box: PixelBox;
  label: string;
  confidence: number;
  evidence: string;
}): GeometryCandidate {
  const { screen, id, box, label, confidence, evidence } = params;

  return {
    candidateId: `screen${screen.screenIndex + 1}-${id}`,
    screenIndex: screen.screenIndex,
    bbox: normalizePixelBox(box, screen.width, screen.height),
    sourceType: "layout",
    sourceConfidence: confidence,
    label,
    text: null,
    sourceEvidence: evidence,
  };
}

function findDarkComponents(data: Buffer, width: number, height: number): Component[] {
  const visited = new Uint8Array(width * height);
  const components: Component[] = [];
  const stack: number[] = [];

  for (let start = 0; start < data.length; start += 1) {
    if (visited[start] || data[start] > 115) continue;

    visited[start] = 1;
    stack.push(start);

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let area = 0;

    while (stack.length > 0) {
      const current = stack.pop()!;
      const x = current % width;
      const y = Math.floor(current / width);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      area += 1;

      const neighbors = [current - 1, current + 1, current - width, current + width];
      for (const next of neighbors) {
        if (next < 0 || next >= data.length || visited[next] || data[next] > 115) continue;
        const nextX = next % width;
        if (Math.abs(nextX - x) > 1) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }

    const componentWidth = maxX - minX + 1;
    const componentHeight = maxY - minY + 1;
    if (area < 8 || componentWidth < 2 || componentHeight < 2) continue;

    components.push({
      x: minX,
      y: minY,
      width: componentWidth,
      height: componentHeight,
      area,
    });
  }

  return components;
}

function buildLineGroups(components: Component[], screen: ScreenMetadata): GeometryCandidate[] {
  const glyphs = components
    .filter((component) => component.width <= 90 && component.height >= 5 && component.height <= 55)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const rows: Component[][] = [];

  for (const glyph of glyphs) {
    const centerY = glyph.y + glyph.height / 2;
    const row = rows.find((items) => {
      const rowBox = mergePixelBoxes(items);
      const rowCenterY = rowBox.y + rowBox.height / 2;
      return Math.abs(centerY - rowCenterY) <= Math.max(7, rowBox.height * 0.45);
    });

    if (row) row.push(glyph);
    else rows.push([glyph]);
  }

  const candidates: GeometryCandidate[] = [];
  let lineCount = 0;

  for (const row of rows) {
    const sorted = row.sort((a, b) => a.x - b.x);
    let currentGroup: Component[] = [];

    for (const component of sorted) {
      const last = currentGroup[currentGroup.length - 1];
      const gap = last ? component.x - (last.x + last.width) : 0;
      const shouldContinue = !last || gap <= 34;

      if (!shouldContinue && currentGroup.length > 0) {
        const box = expandPixelBox(mergePixelBoxes(currentGroup), 5, screen.width, screen.height);
        if (box.width >= 18 && box.height >= 8) {
          lineCount += 1;
          candidates.push(makeCandidate({
            screen,
            id: `vision-line-${lineCount}`,
            box,
            label: "visual-line",
            confidence: 0.58,
            evidence: `Grouped ${currentGroup.length} dark connected components into a visual line`,
          }));
        }
        currentGroup = [];
      }

      currentGroup.push(component);
    }

    if (currentGroup.length > 0) {
      const box = expandPixelBox(mergePixelBoxes(currentGroup), 5, screen.width, screen.height);
      if (box.width >= 18 && box.height >= 8) {
        lineCount += 1;
        candidates.push(makeCandidate({
          screen,
          id: `vision-line-${lineCount}`,
          box,
          label: "visual-line",
          confidence: 0.58,
          evidence: `Grouped ${currentGroup.length} dark connected components into a visual line`,
        }));
      }
    }
  }

  return candidates;
}

function buildStackedGroups(lines: GeometryCandidate[], screen: ScreenMetadata): GeometryCandidate[] {
  const lineBoxes = lines
    .map((candidate) => ({
      candidate,
      box: {
        x: candidate.bbox.x * screen.width,
        y: candidate.bbox.y * screen.height,
        width: candidate.bbox.width * screen.width,
        height: candidate.bbox.height * screen.height,
      },
    }))
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);

  const groups: GeometryCandidate[] = [];
  let groupCount = 0;

  for (let index = 0; index < lineBoxes.length; index += 1) {
    const current = lineBoxes[index];
    const next = lineBoxes[index + 1];
    if (!next) continue;

    const verticalGap = next.box.y - (current.box.y + current.box.height);
    const leftDelta = Math.abs(next.box.x - current.box.x);
    const overlap = horizontalOverlapRatio(current.box, next.box);

    if (verticalGap < 0 || verticalGap > 32 || (leftDelta > 105 && overlap < 0.2)) continue;

    groupCount += 1;
    groups.push(makeCandidate({
      screen,
      id: `vision-stack-${groupCount}`,
      box: expandPixelBox(mergePixelBoxes([current.box, next.box]), 8, screen.width, screen.height),
      label: "visual-stack",
      confidence: 0.62,
      evidence: `Stacked nearby visual lines: ${current.candidate.candidateId}, ${next.candidate.candidateId}`,
    }));
  }

  return groups;
}

function buildLargeComponentCandidates(components: Component[], screen: ScreenMetadata): GeometryCandidate[] {
  const large = components
    .filter((component) => {
      const aspect = component.width / Math.max(1, component.height);
      return component.width >= 32 && component.height >= 16 && component.area >= 60 && aspect <= 30;
    })
    .slice(0, 80);

  return large.map((component, index) => makeCandidate({
    screen,
    id: `vision-component-${index + 1}`,
    box: expandPixelBox(component, 3, screen.width, screen.height),
    label: "visual-component",
    confidence: 0.5,
    evidence: `Dark connected component area=${component.area}`,
  }));
}

export function createLocalImageGeometryProvider(): GeometryProvider {
  return {
    name: "local-image-layout",
    async extract(screen: ScreenMetadata): Promise<GeometryProviderResult> {
      const { data, info } = await sharp(screen.path)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const components = findDarkComponents(data, info.width, info.height);
      const lines = buildLineGroups(components, screen);
      const stacks = buildStackedGroups(lines, screen);
      const largeComponents = buildLargeComponentCandidates(components, screen);

      return {
        candidates: [...lines, ...stacks, ...largeComponents],
        providerNotes: [
          `${screen.path}: ${components.length} dark components, ${lines.length} visual lines, ${stacks.length} stacks, ${largeComponents.length} large components`,
        ],
      };
    },
  };
}