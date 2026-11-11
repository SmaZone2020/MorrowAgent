import { useMemo, useState } from "react";
import { MathLabel } from "@/components/MathLabel";
import type { PlotSpec } from "@/features/plot/plotSpec";
import type { ExpressionScope } from "@/features/plot/expression";

const WIDTH = 640;
const HEIGHT = 400;
const PAD = { top: 18, right: 20, bottom: 28, left: 40 };
const SAMPLES = 720;

/** Mid-tone hues that stay legible on both the light and dark card. */
const CURVE_COLORS = ["#5b8fa8", "#c07a5a", "#7fa07a", "#9a7fae"];

const AXIS_COLOR = "#8a8580";
const GRID_COLOR = "#8a8580";

/** A round step so grid lines land on readable numbers. */
function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

function ticks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let value = start; value <= max + step * 0.001; value += step) {
    out.push(Number(value.toFixed(10)));
  }
  return out;
}

function formatTick(value: number): string {
  if (Math.abs(value) < 1e-9) return "0";
  const rounded = Number(value.toFixed(2));
  return String(rounded);
}

/**
 * A sampled Cartesian plot. Curves are sampled in screen space and broken at
 * discontinuities so `tan(x)` does not draw a vertical line across the canvas.
 */
export function FunctionPlot({ spec }: { spec: PlotSpec }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(spec.sliders.map((slider) => [slider.name, slider.value])),
  );

  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;

  const xScale = (x: number) =>
    PAD.left + ((x - spec.xMin) / (spec.xMax - spec.xMin)) * innerWidth;
  const yScale = (y: number) =>
    PAD.top + innerHeight - ((y - spec.yMin) / (spec.yMax - spec.yMin)) * innerHeight;

  const scope: ExpressionScope = useMemo(
    () => ({ ...values, x: 0 }),
    [values],
  );

  const paths = useMemo(() => {
    return spec.curves.map((curve, curveIndex) => {
      let d = "";
      let drawing = false;
      let previousY: number | null = null;
      for (let index = 0; index <= SAMPLES; index += 1) {
        const x = spec.xMin + ((spec.xMax - spec.xMin) * index) / SAMPLES;
        const y = curve.evaluate({ ...scope, x });
        const inRange = Number.isFinite(y) && y >= spec.yMin - 1e-6 && y <= spec.yMax + 1e-6;
        if (!inRange) {
          drawing = false;
          previousY = null;
          continue;
        }
        // A jump larger than half the canvas is an asymptote, not a slope.
        const jump =
          previousY !== null &&
          Math.abs(yScale(y) - yScale(previousY)) > innerHeight * 0.5;
        const px = xScale(x);
        const py = yScale(y);
        if (!drawing || jump) {
          d += `M${px.toFixed(2)} ${py.toFixed(2)}`;
          drawing = true;
        } else {
          d += `L${px.toFixed(2)} ${py.toFixed(2)}`;
        }
        previousY = y;
      }
      return { d, color: CURVE_COLORS[curveIndex % CURVE_COLORS.length]!, key: curve.expr };
    });
  }, [spec, scope, innerHeight]);

  const xStep = niceStep(spec.xMax - spec.xMin, 8);
  const yStep = niceStep(spec.yMax - spec.yMin, 6);
  const xTicks = ticks(spec.xMin, spec.xMax, xStep);
  const yTicks = ticks(spec.yMin, spec.yMax, yStep);

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={spec.title || "函数图像"}
        className="mx-auto h-auto max-h-[60vh] w-full rounded-xl bg-card"
      >
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="none" />

        {xTicks.map((tick) => (
          <line
            key={`gx-${tick}`}
            x1={xScale(tick)}
            x2={xScale(tick)}
            y1={PAD.top}
            y2={PAD.top + innerHeight}
            stroke={GRID_COLOR}
            strokeOpacity={tick === 0 ? 0 : 0.14}
            strokeWidth={1}
          />
        ))}
        {yTicks.map((tick) => (
          <line
            key={`gy-${tick}`}
            x1={PAD.left}
            x2={PAD.left + innerWidth}
            y1={yScale(tick)}
            y2={yScale(tick)}
            stroke={GRID_COLOR}
            strokeOpacity={tick === 0 ? 0 : 0.14}
            strokeWidth={1}
          />
        ))}

        <line
          x1={PAD.left}
          x2={PAD.left + innerWidth}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke={AXIS_COLOR}
          strokeOpacity={0.7}
          strokeWidth={1.2}
        />
        <line
          x1={xScale(0)}
          x2={xScale(0)}
          y1={PAD.top}
          y2={PAD.top + innerHeight}
          stroke={AXIS_COLOR}
          strokeOpacity={0.7}
          strokeWidth={1.2}
        />

        {xTicks.map((tick) => (
          <text
            key={`tx-${tick}`}
            x={xScale(tick)}
            y={PAD.top + innerHeight + 16}
            textAnchor="middle"
            fontSize={11}
            fill={AXIS_COLOR}
          >
            {formatTick(tick)}
          </text>
        ))}
        {yTicks.map((tick) => (
          <text
            key={`ty-${tick}`}
            x={PAD.left - 6}
            y={yScale(tick) + 4}
            textAnchor="end"
            fontSize={11}
            fill={AXIS_COLOR}
          >
            {formatTick(tick)}
          </text>
        ))}

        {paths.map((path) => (
          <path
            key={path.key}
            d={path.d}
            fill="none"
            stroke={path.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {spec.curves.length > 1 || spec.curves[0]?.label !== spec.curves[0]?.expr ? (
        <div className="flex flex-wrap items-center gap-3">
          {spec.curves.map((curve, index) => (
            <span key={curve.expr} className="flex items-center gap-1.5 text-sm">
              <span
                aria-hidden="true"
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ backgroundColor: CURVE_COLORS[index % CURVE_COLORS.length] }}
              />
              <MathLabel className="text-muted-foreground">
                {curve.label}
              </MathLabel>
            </span>
          ))}
        </div>
      ) : null}

      {spec.sliders.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {spec.sliders.map((slider) => (
            <label
              key={slider.name}
              className="flex items-center gap-3 text-sm text-foreground"
            >
              <span className="w-6 shrink-0 font-mono">{slider.name}</span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={values[slider.name] ?? slider.value}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [slider.name]: Number(event.target.value),
                  }))
                }
                aria-label={`变量 ${slider.name}`}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">
                {(values[slider.name] ?? slider.value).toFixed(2)}
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
