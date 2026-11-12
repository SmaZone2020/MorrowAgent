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

/**
 * How the sheet sits inside the canvas: `screen = world * scale + offset`.
 *
 * Strokes stay in sheet coordinates, so panning and zooming never rewrite the
 * ink — the view is a lens, not an edit. That matters because the strokes are
 * what gets persisted and replayed.
 */
export interface ViewTransform {
  scale: number;
  x: number;
  y: number;
}

export const IDENTITY_VIEW: ViewTransform = { scale: 1, x: 0, y: 0 };

/** Below this the ink stops being legible; above it a stroke fills the pad. */
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;

export function isIdentityView(view: ViewTransform): boolean {
  return view.scale === 1 && view.x === 0 && view.y === 0;
}

/**
 * Zooms about a point in canvas space, leaving whatever is under the cursor
 * under the cursor. Zooming about the centre instead would make the learner
 * chase the detail they were aiming at.
 */
export function zoomAt(
  view: ViewTransform,
  factor: number,
  anchorX: number,
  anchorY: number,
): ViewTransform {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.scale * factor));
  if (scale === view.scale) return view;

  const worldX = (anchorX - view.x) / view.scale;
  const worldY = (anchorY - view.y) / view.scale;
  return {
    scale,
    x: anchorX - worldX * scale,
    y: anchorY - worldY * scale,
  };
}

export function pointFromEvent(event: {
  clientX: number;
  clientY: number;
  pressure: number;
}, rect: DOMRect, view: ViewTransform = IDENTITY_VIEW): StrokePoint {
  return {
    x: (event.clientX - rect.left - view.x) / view.scale,
    y: (event.clientY - rect.top - view.y) / view.scale,
    // A mouse reports 0 pressure; treat it as a normal pen press instead of an
    // invisible stroke.
    pressure: event.pressure > 0 ? event.pressure : 0.5,
  };
}
