import type { BoundingBox } from "../schemas.js";

export type PixelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function normalizePixelBox(box: PixelBox, imageWidth: number, imageHeight: number): BoundingBox {
  const x = Math.max(0, Math.min(imageWidth - 1, box.x));
  const y = Math.max(0, Math.min(imageHeight - 1, box.y));
  const right = Math.max(x + 1, Math.min(imageWidth, box.x + box.width));
  const bottom = Math.max(y + 1, Math.min(imageHeight, box.y + box.height));

  return {
    x: x / imageWidth,
    y: y / imageHeight,
    width: (right - x) / imageWidth,
    height: (bottom - y) / imageHeight,
  };
}

export function toPixelBox(box: BoundingBox, imageWidth: number, imageHeight: number): PixelBox {
  return {
    x: box.x * imageWidth,
    y: box.y * imageHeight,
    width: box.width * imageWidth,
    height: box.height * imageHeight,
  };
}

export function expandPixelBox(box: PixelBox, padding: number, imageWidth: number, imageHeight: number): PixelBox {
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const right = Math.min(imageWidth, box.x + box.width + padding);
  const bottom = Math.min(imageHeight, box.y + box.height + padding);

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

export function mergePixelBoxes(boxes: PixelBox[]): PixelBox {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

export function horizontalOverlapRatio(a: PixelBox, b: PixelBox): number {
  const overlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  return overlap / Math.max(1, Math.min(a.width, b.width));
}