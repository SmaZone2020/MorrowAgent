import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { SquircleWrapper } from "@/components/SquircleWrapper";
import type { RadarAxis } from "@/features/profile/radar";

/** Room for the axis labels, which sit outside the ring. */
const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 92;
const RINGS = 4;

function pointAt(index: number, count: number, radius: number) {
  // Start at twelve o'clock and go clockwise, which is how a radar is read.
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function polygon(values: number[], count: number, radius: number): string {
  return values
    .map((value, index) => {
      const point = pointAt(index, count, (radius * value) / 100);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Mastery by chapter, drawn by hand.
 *
 * A radar is the right shape here because the question is "which part of the
 * syllabus is weak", not "how did I do over time": thirteen chapters compared
 * on one 0–100 scale read at a glance as a lopsided polygon. It is deliberately
 * not a force-directed graph — that answers a different question, and nobody
 * reads one to decide what to study tonight.
 */
export function ChapterRadar({ axes }: { axes: RadarAxis[] }) {
  const count = axes.length;
  if (count < 3) return null;

  const values = axes.map((axis) => axis.value);

  return (
    <SquircleWrapper radius={22} className="w-full">
      <div className="flex justify-center p-3">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="各章节掌握度"
          className="h-auto w-full max-w-[22rem]"
        >
          {Array.from({ length: RINGS }, (_, ring) => {
            const radius = (RADIUS * (ring + 1)) / RINGS;
            return (
              <polygon
                key={ring}
                points={polygon(Array(count).fill(100), count, radius)}
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
            );
          })}

          {axes.map((axis, index) => {
            const outer = pointAt(index, count, RADIUS);
            return (
              <line
                key={axis.chapterId}
                x1={CENTER}
                y1={CENTER}
                x2={outer.x}
                y2={outer.y}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
            );
          })}

          <polygon
            points={polygon(values, count, RADIUS)}
            className="fill-primary/25 stroke-primary"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {axes.map((axis, index) => {
            const dot = pointAt(index, count, (RADIUS * axis.value) / 100);
            return (
              <circle
                key={`dot-${axis.chapterId}`}
                cx={dot.x}
                cy={dot.y}
                r={2.5}
                className="fill-primary"
              />
            );
          })}

          {axes.map((axis, index) => {
            const label = pointAt(index, count, RADIUS + 20);
            // Anchor the text away from the ring so the left half does not run
            // back over the polygon.
            const anchor =
              Math.abs(label.x - CENTER) < 8
                ? "middle"
                : label.x > CENTER
                  ? "start"
                  : "end";
            return (
              <text
                key={`label-${axis.chapterId}`}
                x={label.x}
                y={label.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                // A chart axis is the one place a size attribute is right: the
                // label has to fit between two spokes, and the readable full
                // name is in the legend underneath.
                fontSize={11}
                className="fill-muted-foreground"
              >
                {axis.label}
                {axis.tested === 0 ? "*" : ""}
              </text>
            );
          })}
        </svg>
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1 px-3 pb-3 text-sm text-muted-foreground">
        {axes.map((axis) => (
          <li key={axis.chapterId} className="tabular-nums">
            <Tooltip
              content={`${axis.name}：掌握度 ${axis.value}%，已测 ${axis.tested} / ${axis.total} 个知识点`}
            >
              <span className="cursor-default">
                {axis.label} {axis.value}%
              </span>
            </Tooltip>
          </li>
        ))}
      </ul>
    </SquircleWrapper>
  );
}
