import { compileExpression, type ExpressionScope } from "@/features/plot/expression";

export interface PlotSlider {
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface PlotCurve {
  expr: string;
  label: string;
  evaluate: (scope: ExpressionScope) => number;
}

export interface PlotSpec {
  title: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  sliders: PlotSlider[];
  curves: PlotCurve[];
}

const DEFAULT_RANGE = 6;

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function readRange(raw: unknown, fallback: number): [number, number] {
  if (Array.isArray(raw) && raw.length >= 2) {
    const low = asNumber(raw[0], -fallback);
    const high = asNumber(raw[1], fallback);
    return low < high ? [low, high] : [high, low];
  }
  return [-fallback, fallback];
}

function readSliders(raw: unknown): PlotSlider[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    // `x` and `y` are the axes; a slider with those names would shadow them.
    if (!name || name === "x" || name === "y") return [];
    const min = asNumber(record.min, -5);
    const max = asNumber(record.max, 5);
    if (min >= max) return [];
    const step = Math.abs(asNumber(record.step, 0.1)) || 0.1;
    const value = Math.min(max, Math.max(min, asNumber(record.value, min)));
    return [{ name, min, max, step, value }];
  });
}

function readCurves(raw: unknown): PlotCurve[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const record =
      typeof entry === "string"
        ? { expr: entry }
        : entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : null;
    const expr = typeof record?.expr === "string" ? record.expr.trim() : "";
    if (!expr) return [];
    try {
      const label =
        typeof record?.label === "string" && record.label.trim()
          ? record.label.trim()
          : expr;
      return [{ expr, label, evaluate: compileExpression(expr) }];
    } catch {
      // One bad curve must not blank the whole figure; the caller shows the
      // remaining ones and the parse error is visible as a missing line.
      return [];
    }
  });
}

/**
 * Reads a `plot` block. Everything is optional except the curves, so the model
 * can write the minimum `{"curves":["sin(x)"]}` and still get a usable figure.
 */
export function parsePlotSpec(source: string): PlotSpec | null {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const curves = readCurves(record.curves ?? record.functions);
  if (curves.length === 0) return null;
  const [xMin, xMax] = readRange(record.x ?? record.xRange, DEFAULT_RANGE);
  const [yMin, yMax] = readRange(record.y ?? record.yRange, DEFAULT_RANGE / 2);
  return {
    title: typeof record.title === "string" ? record.title : "",
    xMin,
    xMax,
    yMin,
    yMax,
    sliders: readSliders(record.sliders ?? record.vars),
    curves,
  };
}
