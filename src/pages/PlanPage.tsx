import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
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
import { masteryOf } from "@/features/training/mastery";
import { daysUntil } from "@/features/plan/calendar";
import { useGoal } from "@/features/plan/useGoal";
import {
  buildPlan,
  DIFFICULTY_BANDS,
  difficultyBand,
  PLAN_REASON_LABEL,
  type PlanReason,
} from "@/features/plan/plan";
import { GoalEditor } from "@/features/plan/GoalEditor";

const REASON_STATUS: Record<PlanReason, "warning" | "info" | "neutral"> = {
  untested: "warning",
  weak: "info",
  review: "neutral",
};

/**
 * Where the learner says what they are aiming at, and what that means today.
 *
 * The goal is stored; the plan is not. A stored checklist would go stale the
 * moment an answer was recorded, so the list is recomputed from the goal and
 * the record on every render — the same numbers the profile shows.
 *
 * The aim is read here and edited in a modal. Five stacked form controls made
 * the settings look like the work; the work is the list, so the list keeps the
 * page and the aim is one line until it is opened.
 */
export function PlanPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const { goal, update, loaded: goalLoaded } = useGoal(workspaceId);
  const [stats, setStats] = useState<PointStats[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const scrollRef = useScrollMemory<HTMLDivElement>(
    workspaceScope(workspaceId, "plan.scrollTop"),
  );

  useEffect(() => {
    setStatsLoaded(false);
    void loadPointStats(workspaceId).then((rows) => {
      setStats(rows);
      setStatsLoaded(true);
    });
  }, [workspaceId]);

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

  const testable = useMemo(
    () => new Set(index.view.questions.flatMap((q) => q.knowledgeTags)),
    [index],
  );

  const plan = useMemo(
    () =>
      buildPlan({
        goal,
        masteries: tallies,
        points: index.view.points.map((point) => ({
          id: point.id,
          name: point.name,
          examImportance: point.examImportance,
          difficulty: point.difficulty,
        })),
        testable,
      }),
    [goal, tallies, index, testable],
  );

  const bands = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const point of index.view.points) {
      const band = difficultyBand(point.difficulty);
      counts[band] = (counts[band] ?? 0) + 1;
    }
    return counts;
  }, [index]);

  const left = daysUntil(goal.examDate);
  const questions = plan.tasks.reduce((sum, task) => sum + task.questions, 0);

  return (
    <div
      ref={scrollRef}
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-5 sm:p-7"
    >
      <Panel
        title="学习目标"
        action={
          <Button
            size="sm"
            variant="ghost"
            className="text-sm"
            onClick={() => setEditing(true)}
          >
            调整
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Meta
            label="目标分数"
            value={goal.targetScore === null ? "未设定" : `${goal.targetScore} 分`}
          />
          <Meta
            label="考试日期"
            value={
              goal.examDate === null
                ? "未设定"
                : left === null
                  ? goal.examDate
                  : left < 0
                    ? `已过 ${-left} 天`
                    : `还有 ${left} 天`
            }
          />
          <Meta label="每天" value={`${goal.minutesPerDay} 分钟`} />
          {goal.difficultyFocus.length > 0 ? (
            <Meta
              label="侧重"
              value={goal.difficultyFocus
                .map(
                  (band) =>
                    DIFFICULTY_BANDS.find((entry) => entry.value === band)
                      ?.label ?? band,
                )
                .join("、")}
            />
          ) : null}
        </div>
        {goal.note ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {goal.note}
          </p>
        ) : null}
      </Panel>

      <Panel
        title="今日计划"
        action={
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {plan.minutes} 分钟
            <InfoHint label="计划每次打开都按当前作答记录重算，不需要手动更新。考试日期临近时会多列几条。" />
          </span>
        }
      >
        {!isTauriRuntime ? (
          <EmptyState mood="thinking" title="浏览器预览中不读取本地作答记录" />
        ) : !goalLoaded || !statsLoaded ? (
          <p className="py-3 text-sm text-muted-foreground">读取中</p>
        ) : plan.tasks.length === 0 ? (
          <EmptyState
            mood="curious"
            title={
              index.view.questions.length === 0
                ? "这个学习包暂无题目"
                : "这个学习包还没有可以练习的知识点"
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            <SquircleWrapper radius={22} className="w-full">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {questions}
                </span>
                <span className="text-sm text-muted-foreground">
                  道题 · {plan.tasks.length} 个知识点
                </span>
              </div>
            </SquircleWrapper>

            <ul className="flex flex-col">
              {plan.tasks.map((task, indexOfTask) => (
                <li
                  key={task.pointId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 py-2.5 first:pt-0 last:border-0 last:pb-0"
                >
                  <span className="w-5 shrink-0 text-sm tabular-nums text-muted-foreground">
                    {indexOfTask + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {task.name}
                  </span>
                  <AnimatedBadge
                    status={REASON_STATUS[task.reason]}
                    size="sm"
                    contentKey={`${task.pointId}-${task.reason}`}
                  >
                    {PLAN_REASON_LABEL[task.reason]}
                  </AnimatedBadge>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {task.questions} 题
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-sm"
                    onClick={() =>
                      navigate(
                        `${workspacePath(workspaceId, "/drill")}?point=${task.pointId}`,
                      )
                    }
                  >
                    开始
                    <ArrowRight className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>

            {plan.untestable.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                另有 {plan.untestable.length} 个知识点暂时没有题目，补题后会自动进入计划。
              </p>
            ) : null}
          </div>
        )}
      </Panel>

      <Panel
        title="难度分布"
        action={
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            共 {index.view.points.length} 个知识点
            <InfoHint label="难度由学习包标注（1–5），这里按基础、提高、综合三档合并统计。" />
          </span>
        }
      >
        <ul className="flex flex-col gap-3">
          {DIFFICULTY_BANDS.map((band) => {
            const count = bands[band.value] ?? 0;
            const share =
              index.view.points.length === 0
                ? 0
                : Math.round((count / index.view.points.length) * 100);
            const focused = goal.difficultyFocus.includes(band.value);
            return (
              <li key={band.value} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-sm text-foreground">
                  {band.label}
                </span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    // A single point out of eighty-five rounds to 1%, which is
                    // a hairline; the floor keeps a small band legible.
                    style={{ width: count === 0 ? 0 : `${Math.max(3, share)}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {count}
                </span>
                {focused ? (
                  <AnimatedBadge
                    status="info"
                    size="sm"
                    contentKey={`${band.value}-focused`}
                  >
                    计划内
                  </AnimatedBadge>
                ) : (
                  <span className="w-16 shrink-0" />
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <GoalEditor
        open={editing}
        onOpenChange={setEditing}
        goal={goal}
        bandCounts={bands}
        onChange={update}
      />
    </div>
  );
}

/** One number of the aim, read-only outside the editor. */
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}
