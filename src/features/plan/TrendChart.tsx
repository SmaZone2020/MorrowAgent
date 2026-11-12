import type { TrendPoint } from "@/features/plan/types";

/**
 * A bar per day. Hand-drawn SVG is fine here because it is not interactive:
 * the only affordance is the tooltip, which the native `<title>` supplies
 * without a hit area of its own.
 */
export function TrendChart({
  points,
  label,
}: {
  points: TrendPoint[];
  label: string;
}) {
  const width = 720;
  const height = 160;
  const gap = 3;
  const count = Math.max(1, points.length);
  const bar = Math.max(2, width / count - gap);
  const peak = Math.max(1, ...points.map((point) => point.attempts));

  return (
    <figure className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
      >
        {points.map((point, index) => {
          const x = index * (bar + gap);
          const full = (point.attempts / peak) * (height - 24);
          const right = (point.correct / peak) * (height - 24);
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={height - full}
                width={bar}
                height={full}
                rx={2}
                className="fill-muted"
              >
                <title>
                  {`${point.date} · 作答 ${point.attempts} · 正确 ${point.correct}`}
                </title>
              </rect>
              {right > 0 ? (
                <rect
                  x={x}
                  y={height - right}
                  width={bar}
                  height={right}
                  rx={2}
                  className="fill-primary"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{points[0]?.date ?? ""}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-muted" />
            作答
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-primary" />
            正确
          </span>
        </span>
        <span>{points[points.length - 1]?.date ?? ""}</span>
      </figcaption>
    </figure>
  );
}

/** Consecutive days with practice, counting back from the most recent day. */
export function streakOf(points: TrendPoint[]): number {
  let streak = 0;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if ((points[index]?.attempts ?? 0) > 0) streak += 1;
    else break;
  }
  return streak;
}
