import { getStroke } from "perfect-freehand";
import type { Stroke, StrokePoint } from "@/features/scratchpad/types";

// A fixed nib width keeps the ink legible at any window size; thinning is what
// gives the pen its pressure feel, so it stays enabled even for a mouse.
const INK_SIZE = 4.2;
const THINNING = 0.62;

/** Nib width multipliers, so the pen can be made finer for dense working. */
export const INK_WIDTHS = [0.6, 1, 1.6] as const;
export type InkWidth = (typeof INK_WIDTHS)[number];

/** Coerces a stored stroke width back to a known nib, defaulting to standard. */
export function normalizeWidth(width: number | undefined): InkWidth {
  return INK_WIDTHS.find((entry) => entry === width) ?? 1;
}

export function strokeToPath(stroke: Stroke, width: InkWidth = 1): Path2D {
  const outline = getStroke(
    stroke.points.map((point) => [point.x, point.y, point.pressure]),
    {
      size: INK_SIZE * width,
      thinning: THINNING,
      smoothing: 0.55,
      streamline: 0.42,
      simulatePressure: true,
      last: true,
    },
  );

  return new Path2D(polygonToPath(outline));
}

/**
 * perfect-freehand returns a closed polygon. Quadratic midpoints round the
 * corners enough that a fast flick does not look like a chain of straight
 * segments.
 */
function polygonToPath(points: number[][]): string {
  const first = points[0];
  if (!first) return "";

  const startX = first[0] ?? 0;
  const startY = first[1] ?? 0;
  let path = `M ${startX.toFixed(2)} ${startY.toFixed(2)}`;

  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) continue;
    const currentX = current[0] ?? 0;
    const currentY = current[1] ?? 0;
    const midX = (currentX + (next[0] ?? 0)) / 2;
    const midY = (currentY + (next[1] ?? 0)) / 2;
    path += ` Q ${currentX.toFixed(2)} ${currentY.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }

  return `${path} Z`;
}

export function pointFromEvent(event: {
  clientX: number;
  clientY: number;
  pressure: number;
}, rect: DOMRect): StrokePoint {
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    // A mouse reports 0 pressure; treat it as a normal pen press instead of an
    // invisible stroke.
    pressure: event.pressure > 0 ? event.pressure : 0.5,
  };
}
