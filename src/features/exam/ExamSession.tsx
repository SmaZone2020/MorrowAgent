import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Xmark } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Modal } from "@/components/Modal";
import { Panel } from "@/components/Panel";
import { ExamClock } from "@/features/exam/ExamClock";
import { ExamQuestion } from "@/features/exam/ExamQuestion";
import { EXAM_MINUTES, sectionOf, unanswered } from "@/features/exam/paper";
import type { ExamPaper } from "@/features/exam/paper";
import type { ExamRun } from "@/features/exam/api";
import { saveExam } from "@/features/exam/api";
import { usePersistedState } from "@/features/uiState";
import { appScope, workspaceScope } from "@/features/uiState/scope";

/** How long after the last keystroke the paper is written to the database. */
const AUTOSAVE_MS = 700;

/**
 * What a pause has cost the paper so far.
 *
 * The clock is derived from `startedAt`, so a pause cannot stop it by itself:
 * it records how long the paper was stopped and the clock hands that time back.
 * Keeping the total rather than a shifting start time means a reload during a
 * pause resumes with the same remaining time.
 */
interface PauseState {
  runId: string;
  /** Paused time already closed, in milliseconds. */
  totalMs: number;
  /** When the current pause began; null while the paper is running. */
  pausedAt: number | null;
}

const NO_PAUSE: PauseState = { runId: "", totalMs: 0, pausedAt: null };

/**
 * A paper in progress.
 *
 * The whole paper is one scrolling column, the way a printed paper is read: a
 * learner works a calculation for ten minutes and should not have to step
 * through a wizard to reach the next one. The answer card is a rail beside the
 * column so "what is left" is always visible without leaving the question, and
 * the status bar floats above both because the clock is the one thing that must
 * never scroll away.
 *
 * Answers are held locally and written on a short debounce, so typing does not
 * issue a query per character while a crash still costs at most one pause.
 */
export function ExamSession({
  run,
  paper,
  onSubmit,
  onExit,
}: {
  run: ExamRun;
  paper: ExamPaper;
  onSubmit: (answers: Record<string, string>) => void;
  /** Leaves the sitting without handing the paper in. */
  onExit: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(run.answers);
  const [asking, setAsking] = useState<"submit" | "exit" | null>(null);
  // The timer and the button can both close the paper; only the first counts.
  const submitted = useRef(false);

  const [stored, setPause] = usePersistedState<PauseState>(
    workspaceScope(run.workspaceId, "exam.pause"),
    NO_PAUSE,
  );
  // A pause belongs to the sitting that recorded it: a fresh paper starts with
  // the whole clock, not with the previous one's debt.
  const pause = stored.runId === run.id ? stored : { ...NO_PAUSE, runId: run.id };
  const paused = pause.pausedAt !== null;
  const pausedMs =
    pause.totalMs + (pause.pausedAt === null ? 0 : Date.now() - pause.pausedAt);

  const togglePause = () =>
    setPause((current) => {
      const base =
        current.runId === run.id ? current : { ...NO_PAUSE, runId: run.id };
      if (base.pausedAt !== null) {
        return {
          ...base,
          totalMs: base.totalMs + (Date.now() - base.pausedAt),
          pausedAt: null,
        };
      }
      return { ...base, pausedAt: Date.now() };
    });

  // The shell reads this to give the paper the whole window: no rail, no
  // breadcrumb, no way to wander into another page mid-sitting.
  const [, setExamActive] = usePersistedState<string | null>(
    appScope("exam.active"),
    null,
  );
  useEffect(() => {
    setExamActive(run.id);
    return () => setExamActive(null);
  }, [run.id, setExamActive]);

  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      // A failed save is silent: the next keystroke tries again, and the paper
      // is written once more at submission.
      void saveExam(run.id, answers).catch(() => undefined);
    }, AUTOSAVE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [run.id, answers]);

  const close = () => {
    if (submitted.current) return;
    submitted.current = true;
    onSubmit(answers);
  };

  const blank = unanswered(paper, answers);
  const answered = paper.slots.length - blank;

  // Leaving while stopped would bank the pause as free time, so the clock is
  // restarted before the paper is abandoned.
  const exit = () => {
    if (paused) togglePause();
    onExit();
  };

  const anchors = useRef(new Map<string, HTMLDivElement | null>());
  const jump = (questionId: string) => {
    anchors.current.get(questionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Grouping by section is what makes the paper's shape legible while reading
  // it: a bare 1–22 list says nothing about where the marks are.
  const groups = useMemo(() => {
    const order: {
      key: string;
      title: string;
      points: number;
      slots: { index: number; questionId: string }[];
    }[] = [];
    paper.slots.forEach((slot, index) => {
      const last = order[order.length - 1];
      if (last && last.key === slot.sectionKey) {
        last.slots.push({ index, questionId: slot.question.id });
      } else {
        order.push({
          key: slot.sectionKey,
          title: sectionOf(slot.sectionKey)?.title ?? slot.sectionKey,
          points: slot.points,
          slots: [{ index, questionId: slot.question.id }],
        });
      }
    });
    return order;
  }, [paper]);

  const answerCard = (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">{group.title}</span>
          <div className="flex flex-wrap gap-1.5">
            {group.slots.map((slot) => {
              const done = Boolean(
                (answers[slot.questionId] ?? "").trim(),
              );
              return (
                <Button
                  key={slot.questionId}
                  size="sm"
                  variant="ghost"
                  aria-label={`第 ${slot.index + 1} 题${done ? "，已答" : ""}`}
                  className={`size-9 rounded-lg p-0 text-sm tabular-nums ${
                    // A finished question reads green, so the card answers
                    // "what is left" at a glance instead of needing a legend.
                    done
                      ? "border border-success/40 bg-success/10 text-success hover:bg-success/15"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => jump(slot.questionId)}
                >
                  {slot.index + 1}
                </Button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
        <span className="text-sm text-muted-foreground">
          {blank > 0 ? `还有 ${blank} 题没填` : "全部填完了，可以交卷"}
        </span>
        <Button
          size="sm"
          className="w-full text-sm"
          onClick={() => setAsking("submit")}
        >
          交卷
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* The status bar floats: the clock, the count and the way out stay put
          while the paper scrolls under them. */}
      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-5 py-2.5 sm:px-7">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            模拟考试
          </span>
          <AnimatedBadge status="neutral" size="sm" contentKey={answered}>
            已答 {answered} / {paper.slots.length}
          </AnimatedBadge>
          <ExamClock
            startedAt={run.startedAt}
            minutes={EXAM_MINUTES}
            pausedMs={pausedMs}
            paused={paused}
            onExpire={close}
          />
          <Button
            size="sm"
            variant="secondary"
            className="text-sm"
            onClick={togglePause}
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? "继续" : "暂停"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-sm"
            onClick={() => setAsking("exit")}
          >
            <Xmark className="size-4" />
            退出考试
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl items-start gap-5 p-5 sm:p-7">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-3">
              <h2 className="Siyuan text-base font-semibold text-foreground">
                {group.title}
                <span className="ml-2 text-sm font-normal tabular-nums text-muted-foreground">
                  每题 {group.points} 分
                </span>
              </h2>
              {group.slots.map((slot) => {
                const entry = paper.slots[slot.index];
                if (!entry) return null;
                return (
                  <div
                    key={slot.questionId}
                    ref={(node) => {
                      anchors.current.set(slot.questionId, node);
                    }}
                    className="scroll-mt-24 rounded-2xl bg-card p-5 shadow-surface"
                  >
                    <ExamQuestion
                      question={entry.question}
                      index={slot.index + 1}
                      total={paper.slots.length}
                      answer={answers[slot.questionId] ?? ""}
                      inkKey={workspaceScope(
                        run.workspaceId,
                        `exam.ink.${run.id}.${slot.questionId}`,
                      )}
                      onChange={(value) =>
                        setAnswers((previous) => ({
                          ...previous,
                          [slot.questionId]: value,
                        }))
                      }
                    />
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        {/* Below `lg` the rail would squeeze the question, so the same card
            becomes a section at the end of the paper instead of a side column.
            `self-start` is what lets it stick: a stretched column has no room
            to travel, so it would scroll away with the questions. */}
        <aside className="sticky top-[52px] hidden max-h-[calc(100svh-140px)] w-72 shrink-0 self-start overflow-y-auto lg:block">
          <Panel title="答题卡">{answerCard}</Panel>
        </aside>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pb-7 sm:px-7 lg:hidden">
        <Panel title="答题卡">{answerCard}</Panel>
      </div>

      {paused ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur-sm">
          <div className="flex w-80 flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-surface">
            <Pause className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">考试已暂停</p>
            <p className="text-sm text-muted-foreground">
              计时停在暂停的那一刻，继续后接着走。
            </p>
            <Button className="w-full" onClick={togglePause}>
              <Play className="size-4" />
              继续考试
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={asking === "submit"}
        onOpenChange={(open) => setAsking(open ? "submit" : null)}
        title="现在交卷？"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => setAsking(null)}
            >
              继续作答
            </Button>
            <Button
              size="sm"
              className="text-sm"
              onClick={() => {
                setAsking(null);
                close();
              }}
            >
              交卷
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          {blank > 0
            ? `还有 ${blank} 题没有填，空题按 0 分计。交卷后不能再改。`
            : "交卷后不能再改，计算题和证明题需要你对照答案自己打分。"}
        </p>
      </Modal>

      <Modal
        open={asking === "exit"}
        onOpenChange={(open) => setAsking(open ? "exit" : null)}
        title="退出考试？"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => setAsking(null)}
            >
              继续作答
            </Button>
            <Button
              size="sm"
              className="text-sm"
              onClick={() => {
                setAsking(null);
                exit();
              }}
            >
              退出考试
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          已填的答案会留着，计时不会停：回来继续时，时间照常往前走。没交卷的卷子不算成绩。
        </p>
      </Modal>
    </>
  );
}
