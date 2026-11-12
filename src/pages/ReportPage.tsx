import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChartColumn, CircleCheck, Clock, ListCheck } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { InfoHint } from "@/components/InfoHint";
import { SquircleWrapper } from "@/components/SquircleWrapper";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { workspacePath } from "@/app/navigation";
import { useScrollMemory } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";
import { loadPointStats, type PointStats } from "@/features/training/attempts";
import { coverageOf, masteryOf } from "@/features/training/mastery";
import { loadTrend } from "@/features/plan/goal";
import { isoDay } from "@/features/plan/calendar";
import type { TrendPoint } from "@/features/plan/types";
import { TrendChart, streakOf } from "@/features/plan/TrendChart";

const WINDOWS = [7, 14, 30] as const;

/**
 * How the practice is actually going, as opposed to how the profile thinks it
 * is going. Everything here is counted from `answer_attempts`; nothing is
 * estimated except the mastery numbers, which are labelled as such.
 */
export function ReportPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const [days, setDays] = useState<number>(14);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [stats, setStats] = useState<PointStats[]>([]);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useScrollMemory<HTMLDivElement>(
    workspaceScope(workspaceId, "report.scrollTop"),
  );

  useEffect(() => {
    setLoaded(false);
    void Promise.all([loadTrend(workspaceId, days), loadPointStats(workspaceId)]).then(
      ([points, rows]) => {
        setTrend(points);
        setStats(rows);
        setLoaded(true);
      },
    );
  }, [workspaceId, days]);

  const tallies = useMemo(() => {
    const byPoint = new Map(stats.map((row) => [row.knowledgePointId, row]));
    return index.view.points.map((point) => {
      const row = byPoint.get(point.id);
      return masteryOf({
        pointId: point.id,
        attempts: row?.attempts ?? 0,
        correct: row?.correct ?? 0,
        lastAttemptAt: row?.lastAttemptAt ?? 0,
      });
    });
  }, [index, stats]);

  const totals = useMemo(() => {
    const attempts = trend.reduce((sum, point) => sum + point.attempts, 0);
    const correct = trend.reduce((sum, point) => sum + point.correct, 0);
    return {
      attempts,
      correct,
      rate: attempts === 0 ? null : Math.round((correct / attempts) * 100),
    };
  }, [trend]);

  const coverage = coverageOf(tallies, index.view.points.length);
  const tested = tallies.filter((entry) => entry.attempts > 0).length;
  // The window's last day is today, so the chart is filled with zero days in
  // between: a gap in practice is information, not a missing point.
  const series = useMemo(() => fillDays(trend, days), [trend, days]);
  // Counting the streak on the filled series is what makes a skipped day end
  // it; the raw rows simply omit that day.
  const streak = streakOf(series);
  const empty = loaded && totals.attempts === 0;

  return (
    <div
      ref={scrollRef}
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7"
    >
      <Panel
        title="练习趋势"
        action={
          <div className="flex items-center gap-1">
            {WINDOWS.map((window) => (
              <Button
                key={window}
                size="sm"
                variant={window === days ? "secondary" : "ghost"}
                className="text-sm"
                onClick={() => setDays(window)}
              >
                {window} 天
              </Button>
            ))}
          </div>
        }
      >
        {!isTauriRuntime ? (
          <EmptyState mood="thinking" title="浏览器预览中不读取本地作答记录" />
        ) : !loaded ? (
          <p className="py-3 text-sm text-muted-foreground">读取中</p>
        ) : empty ? (
          <EmptyState
            mood="curious"
            title={`最近 ${days} 天还没有练习记录`}
            action={
              <Button
                size="sm"
                className="text-sm"
                onClick={() => navigate(workspacePath(workspaceId, "/drill"))}
              >
                去专项训练
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            <SquircleWrapper radius={22} className="w-full">
              <TrendChart points={series} label={`最近 ${days} 天的作答数`} />
            </SquircleWrapper>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="tabular-nums">作答 {totals.attempts} 次</span>
              <span className="tabular-nums">正确 {totals.correct} 次</span>
              {totals.rate !== null ? (
                <span className="tabular-nums">正确率 {totals.rate}%</span>
              ) : null}
              <span className="flex items-center gap-1 tabular-nums">
                连续 {streak} 天
                <InfoHint label="连续天数从今天往前算，中间断一天就清零。" />
              </span>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={<ListCheck className="size-4" />}
          label="已测知识点"
          value={`${tested} / ${index.view.points.length}`}
        />
        <Stat
          icon={<ChartColumn className="size-4" />}
          label="覆盖度"
          value={`${coverage}%`}
        />
        <Stat
          icon={<CircleCheck className="size-4" />}
          label="区间正确率"
          value={totals.rate === null ? "—" : `${totals.rate}%`}
        />
        <Stat
          icon={<Clock className="size-4" />}
          label="连续练习"
          value={`${streak} 天`}
        />
      </div>

      <Panel title="下一步">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {tested === 0
              ? "还没有作答记录，先做一次诊断测评，让画像有据可依。"
              : tested < index.view.points.length
                ? `还有 ${index.view.points.length - tested} 个知识点没有测过，它们会排在计划的最前面。`
                : "所有知识点都有记录了，去知识画像看具体哪几个最弱。"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="text-sm"
              onClick={() => navigate(workspacePath(workspaceId, "/plan"))}
            >
              看今日计划
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => navigate(workspacePath(workspaceId, "/profile"))}
            >
              知识画像
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/**
 * Pads the returned days into a contiguous window ending today, so the chart's
 * x axis is time rather than the list of days that happened to have answers.
 */
function fillDays(trend: TrendPoint[], days: number): TrendPoint[] {
  const byDate = new Map(trend.map((point) => [point.date, point]));
  const filled: TrendPoint[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offset,
    );
    const key = isoDay(date);
    filled.push(byDate.get(key) ?? { date: key, attempts: 0, correct: 0 });
  }
  return filled;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export { };
