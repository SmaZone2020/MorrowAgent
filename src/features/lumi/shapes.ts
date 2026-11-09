// Lumi's own geometry. Two silhouettes share one cubic structure (four
// segments) so the character can morph between them by interpolating points
// instead of cross-fading two unrelated paths.
export type Point = readonly [number, number];

export interface ShapeSegment {
  readonly c1: Point;
  readonly c2: Point;
  readonly to: Point;
}

export interface ShapeFace {
  readonly x: number;
  readonly y: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

export interface LumiShape {
  readonly start: Point;
  readonly segments: readonly ShapeSegment[];
  readonly face: ShapeFace;
  readonly eyeGap: number;
}

const CENTER = 120;

export const BLOB: LumiShape = {
  start: [120, 18],
  segments: [
    { c1: [172, 18], c2: [222, 58], to: [224, 118] },
    { c1: [226, 178], c2: [188, 224], to: [130, 226] },
    { c1: [72, 228], c2: [18, 190], to: [16, 130] },
    { c1: [14, 70], c2: [62, 18], to: [120, 18] },
  ],
  face: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
  eyeGap: 27,
};

export const PEBBLE: LumiShape = {
  start: [120, 40],
  segments: [
    { c1: [176, 40], c2: [224, 74], to: [226, 126] },
    { c1: [228, 180], c2: [184, 212], to: [120, 212] },
    { c1: [56, 212], c2: [12, 180], to: [14, 126] },
    { c1: [16, 74], c2: [64, 40], to: [120, 40] },
  ],
  face: { x: 0, y: 5, scaleX: 1.03, scaleY: 0.9 },
  eyeGap: 29,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function pathFrom(start: Point, segments: readonly ShapeSegment[]) {
  const n = (value: number) => value.toFixed(2);
  const head = `M${n(start[0])} ${n(start[1])}`;
  return segments.reduce((acc, segment) => {
    const { c1, c2, to } = segment;
    return (
      `${acc}C${n(c1[0])} ${n(c1[1])} ` +
      `${n(c2[0])} ${n(c2[1])} ${n(to[0])} ${n(to[1])}`
    );
  }, head) + "Z";
}

export interface MorphFrame {
  readonly d: string;
  readonly face: ShapeFace;
  readonly eyeGap: number;
}

export function morphShape(from: LumiShape, to: LumiShape, t: number): MorphFrame {
  const amount = Math.min(1, Math.max(0, t));
  const segments = from.segments.map((segment, index) => {
    const target = to.segments[index] ?? segment;
    return {
      c1: lerpPoint(segment.c1, target.c1, amount),
      c2: lerpPoint(segment.c2, target.c2, amount),
      to: lerpPoint(segment.to, target.to, amount),
    };
  });

  return {
    d: pathFrom(lerpPoint(from.start, to.start, amount), segments),
    face: {
      x: lerp(from.face.x, to.face.x, amount),
      y: lerp(from.face.y, to.face.y, amount),
      scaleX: lerp(from.face.scaleX, to.face.scaleX, amount),
      scaleY: lerp(from.face.scaleY, to.face.scaleY, amount),
    },
    eyeGap: lerp(from.eyeGap, to.eyeGap, amount),
  };
}

export const VIEW_CENTER = CENTER;
