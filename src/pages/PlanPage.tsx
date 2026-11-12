import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Target } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Input } from "@/vendor/beui/components/motion/input";
import { Checkbox } from "@/vendor/beui/components/motion/checkbox";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { InfoHint } from "@/components/InfoHint";
import { SquircleWrapper } from "@/components/SquircleWrapper";
import { ChoiceTabs } from "@/pages/settings/SettingsBlocks";
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
import { MINUTES_CHOICES } from "@/features/plan/types";
import { daysUntil } from "@/features/plan/calendar";
import { useGoal } from "@/features/plan/useGoal";
import {
  buildPlan,
  difficultyBand,
  PLAN_REASON_LABEL,
  type PlanReason,
} from "@/features/plan/plan";

const BANDS: { value: string; label: string }[] = [
  { value: "basic", label: "基础" },
  { value: "advanced", label: "提高" },
  { value: "challenging", label: "综合" },
];

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
 */
export function PlanPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const { goal, update, loaded: goalLoaded } = useGoal(workspaceId);
  const [stats, setStats] = useState<PointStats[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
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

  const left = daysUntil(goal.examDate);
  const toggleBand = (band: string) =>
    update({
      difficultyFocus: goal.difficultyFocus.includes(band)
        ? goal.difficultyFocus.filter((entry) => entry !== band)
        : [...goal.difficultyFocus, band],
    });

  return (
    <div
      ref={scrollRef}
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7"
    >
      <Panel
        title="学习目标"
        action={
          left === null ? undefined : (
            <AnimatedBadge
              status={left < 0 ? "neutral" : left <= 30 ? "warning" : "info"}
              size="sm"
              contentKey={left}
            >
              {left < 0 ? `已过 ${-left} 天` : `距考试 ${left} 天`}
            </AnimatedBadge>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="目标分数"
              hint="满分 150。留空表示还没有定目标，计划会按薄弱点排序。"
            >
              <Input
                value={goal.targetScore === null ? "" : String(goal.targetScore)}
                onChange={(value) => {
                  const digits = value.replace(/[^\d]/g, "").slice(0, 3);
                  const score = digits ? Math.min(150, Number(digits)) : null;
                  update({ targetScore: score });
                }}
                inputMode="numeric"
                aria-label="目标分数"
                placeholder="120"
                className="w-full"
                classNames={{
                  field: "h-10 rounded-xl",
                  input: "pl-3 pr-3 text-sm tabular-nums",
                }}
              />
            </Field>

            <Field
              label="考试日期"
              hint="只用来算剩余天数；没有日期时，计划按掌握度排序，不会报错。"
            >
              <Input
                type="date"
                value={goal.examDate ?? ""}
                onChange={(value) => update({ examDate: value || null })}
                aria-label="考试日期"
                className="w-full"
                classNames={{
                  field: "h-10 rounded-xl",
                  input: "pl-3 pr-3 text-sm",
                }}
              />
            </Field>
          </div>

          <Field
            label="每天可支配时间"
            hint="决定今天列几条任务：时间越多，列得越长。"
          >
            <ChoiceTabs
              label="每天可支配时间"
              options={MINUTES_CHOICES.map((minutes) => ({
                value: String(minutes),
                label: `${minutes} 分钟`,
              }))}
              value={String(goal.minutesPerDay)}
              onChange={(value) => update({ minutesPerDay: Number(value) })}
            />
          </Field>

          <Field
            label="难度侧重"
            hint="只影响计划的取题范围；不选表示不限难度。"
          >
            <div className="flex flex-wrap items-center gap-4">
              {BANDS.map((band) => (
                <Checkbox
                  key={band.value}
                  checked={goal.difficultyFocus.includes(band.value)}
                  onCheckedChange={() => toggleBand(band.value)}
                  label={band.label}
                  className="text-sm"
                />
              ))}
            </div>
          </Field>

          <Field label="备注" hint="写给自己看的一句话，Lumi 也会读到。">
            <Input
              value={goal.note}
              onChange={(value) => update({ note: value.slice(0, 120) })}
              aria-label="备注"
              placeholder="例如：先把极限补上"
              className="w-full"
              classNames={{
                field: "h-10 rounded-xl",
                input: "pl-3 pr-3 text-sm",
              }}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="今日计划"
        action={
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {plan.minutes} 分钟
            <InfoHint label="计划每次打开都按当前作答记录重算，不需要手动更新。" />
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
          <div className="flex flex-col gap-3">
            <SquircleWrapper radius={22} className="w-full">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="size-4" />
                  今天
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {plan.tasks.length} 个知识点 ·{" "}
                  {plan.tasks.reduce((sum, task) => sum + task.questions, 0)} 道题
                </span>
              </div>
            </SquircleWrapper>

            <ul className="flex flex-col">
              {plan.tasks.map((task) => (
                <li
                  key={task.pointId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 py-2.5 first:pt-0 last:border-0 last:pb-0"
                >
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

      <Panel title="难度分布">
        <div className="grid grid-cols-3 gap-2">
          {BANDS.map((band) => {
            const count = index.view.points.filter(
              (point) => difficultyBand(point.difficulty) === band.value,
            ).length;
            return (
              <div
                key={band.value}
                className="flex flex-col gap-1 rounded-xl border border-border/60 px-3 py-2.5"
              >
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Target className="size-4" />
                  {band.label}
                </span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/** One labelled control; the hint goes to the info glyph, never under the label. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {label}
        {hint ? <InfoHint label={hint} /> : null}
      </span>
      {children}
    </div>
  );
}
