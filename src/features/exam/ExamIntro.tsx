import { useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Modal } from "@/components/Modal";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { InfoHint } from "@/components/InfoHint";
import { EXAM_MINUTES, EXAM_SECTIONS, EXAM_FULL_MARKS } from "@/features/exam/paper";
import type { ExamRun } from "@/features/exam/api";
import { relativeTime } from "@/features/lumi/ConversationList";

/**
 * The paper's brief, before anything is timed.
 *
 * A learner about to spend two hours needs to know the shape of the paper and
 * what happens to a half-finished one, so both are stated here rather than
 * discovered mid-exam. Past sittings sit below, because "how did the last one
 * go" is the reason to open this page twice.
 */
export function ExamIntro({
  runs,
  onStart,
  onOpen,
}: {
  runs: ExamRun[];
  onStart: () => void;
  onOpen: (run: ExamRun) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const submitted = runs.filter((run) => run.submittedAt !== null);
  // A sitting that was left without handing in keeps its answers and its clock:
  // the timer never stopped, so the brief says that instead of pretending the
  // paper can be restarted for free.
  const open = runs.find((run) => run.submittedAt === null);

  return (
    <>
      <Panel title="模拟考试">
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col">
            {EXAM_SECTIONS.map((section) => (
              <li
                key={section.key}
                className="flex items-center gap-3 border-b border-border/60 py-2 first:pt-0 last:border-0 last:pb-0"
              >
                <span className="min-w-0 flex-1 text-sm text-foreground">
                  {section.title}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {section.slots} 题 × {section.points} 分
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="tabular-nums">满分 {EXAM_FULL_MARKS}</span>
            <span className="tabular-nums">{EXAM_MINUTES} 分钟</span>
            <span className="flex items-center gap-1">
              计算题与证明题交卷后自评
              <InfoHint label="选择题与填空题由应用自动判分；计算题、应用题和证明题的写法太多，交卷后由你对照答案自己打分，分数同样记进作答记录。" />
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {open ? (
              <Button
                variant="secondary"
                className="text-sm"
                onClick={() => onOpen(open)}
              >
                继续未完成的考试
              </Button>
            ) : null}
            <Button onClick={() => setConfirming(true)}>
              {open ? "重新开考" : "开始考试"}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="考试记录">
        {submitted.length === 0 ? (
          <EmptyState mood="curious" title="还没有交过卷" />
        ) : (
          <ul className="flex flex-col">
            {submitted.map((run) => (
              <li
                key={run.id}
                className="flex items-center gap-3 border-b border-border/60 py-2 first:pt-0 last:border-0 last:pb-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {relativeTime(run.submittedAt ?? run.startedAt)}
                </span>
                <AnimatedBadge
                  status={run.score === null ? "neutral" : "info"}
                  size="sm"
                  contentKey={`${run.id}-${run.score}`}
                >
                  {run.score === null ? "未评分" : `${run.score} 分`}
                </AnimatedBadge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-sm"
                  onClick={() => onOpen(run)}
                >
                  看结果
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title="开始一场模拟考试"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => setConfirming(false)}
            >
              再想想
            </Button>
            <Button
              size="sm"
              className="text-sm"
              onClick={() => {
                setConfirming(false);
                onStart();
              }}
            >
              开始，计时 {EXAM_MINUTES} 分钟
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          计时从现在开始，关掉窗口也不会暂停；需要离开时用「暂停」，回来接着走。中途退出会保留已填的答案和剩余时间。
        </p>
      </Modal>
    </>
  );
}
