import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { QuestionCard } from "@/features/training/QuestionCard";
import { DrillToolbar } from "@/features/training/DrillToolbar";
import { recordAttempt } from "@/features/training/attempts";
import { usePersistedState } from "@/features/uiState";
import { knowledgePoints, questions, questionsFor } from "@/features/knowledge";

type DrillResult = "correct" | "wrong" | "revealed";

/**
 * One sitting at the drill, tagged with the question set it belongs to.
 *
 * The set itself stays in the query string (D-066); what is stored here is the
 * progress through it. The `key` is what ties the two together: it changes when
 * the user picks another point, which is exactly when the progress should start
 * over rather than inherit a question number from the previous set.
 */
interface DrillRun {
  key: string;
  index: number;
  results: Record<string, DrillResult>;
  /** The choice made per question, so a reload can redraw the submitted card. */
  answers: Record<string, string>;
  run: number;
}

const EMPTY_RUN: DrillRun = { key: "", index: 0, results: {}, answers: {}, run: 0 };

/**
 * Drill picks a point first, then walks its questions one at a time. Point
 * selection lives in the query string so a link from the knowledge page can
 * jump straight into a specific point.
 */
export function DrillPage() {
  const [params, setParams] = useSearchParams();
  const pointId = params.get("point");
  const questionId = params.get("question");
  const [stored, setStored] = usePersistedState<DrillRun>(
    "drill.run",
    EMPTY_RUN,
  );

  const openQuestions = useMemo(() => {
    // A `question` link wins over the point filter: the wrong book sends the
    // user to the exact question they missed, not to its whole point. It does
    // not fall back, because showing the whole set under a "single question"
    // header would misrepresent what is on screen.
    if (questionId) return questions.filter((entry) => entry.id === questionId);
    return pointId ? questionsFor(pointId) : questions;
  }, [pointId, questionId]);

  const runKey = questionId ? `q:${questionId}` : pointId ? `p:${pointId}` : "all";
  // Deriving instead of resetting in an effect keeps the first frame correct:
  // a stored run for another set must never render its question number here.
  const session = stored.key === runKey ? stored : { ...EMPTY_RUN, key: runKey };
  // The content pack can shrink between launches, so a stored index is only
  // trusted while it still points at a question.
  const index =
    session.index >= 0 && session.index < openQuestions.length
      ? session.index
      : 0;
  const results = session.results;
  // A stored run from an older build may lack the answer map; treat it as empty
  // rather than spreading `undefined` into the next write.
  const answers = session.answers ?? {};
  // Functional updates, because one gesture can change several fields at once
  // (record the answer, then advance). A plain spread of `session` would let the
  // second write undo the first with the values captured at render time.
  const patch = (next: (current: DrillRun) => Partial<DrillRun>) =>
    setStored((current) => {
      const base = current.key === runKey ? current : { ...EMPTY_RUN, key: runKey };
      return { ...base, ...next(base) };
    });

  const point = pointId
    ? knowledgePoints.find((entry) => entry.id === pointId)
    : undefined;
  const current = openQuestions[index];

  const answered = openQuestions.filter((entry) => entry.id in results).length;
  const scored = openQuestions.filter(
    (entry) => results[entry.id] === "correct" || results[entry.id] === "wrong",
  ).length;
  const correct = openQuestions.filter(
    (entry) => results[entry.id] === "correct",
  ).length;

  const selectPoint = (next: string | null) => {
    patch(() => ({ index: 0, results: {}, answers: {}, run: 0 }));
    if (next) setParams({ point: next });
    else setParams({});
  };

  // A single-question link hides the point chips, which would otherwise all
  // look inactive while the list is clearly filtered.
  const chipsVisible = !questionId;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {chipsVisible ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={pointId ? "ghost" : "primary"}
                onClick={() => selectPoint(null)}
              >
                全部题目
              </Button>
              {knowledgePoints.map((entry) => (
                <Button
                  key={entry.id}
                  size="sm"
                  variant={entry.id === pointId ? "primary" : "ghost"}
                  onClick={() => selectPoint(entry.id)}
                >
                  {entry.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <AnimatedBadge status="info" size="sm" contentKey="single">
                错题重做
              </AnimatedBadge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => selectPoint(pointId)}
              >
                {pointId ? "返回本知识点" : "全部题目"}
              </Button>
            </div>
          )}
        </div>

        <DrillToolbar />
      </div>

      {current ? (
        <>
          <QuestionCard
            key={`${current.id}-${session.run}`}
            question={current}
            index={index + 1}
            total={openQuestions.length}
            initialAnswer={answers[current.id] ?? null}
            initialRevealed={results[current.id] === "revealed"}
            onAnswered={(answer, isCorrect) => {
              // Record the answer and, on a correct one, advance in a single
              // update: two writes from the same render would race.
              const last = index + 1 >= openQuestions.length;
              patch((base) => ({
                results: {
                  ...base.results,
                  [current.id]: isCorrect ? "correct" : "wrong",
                },
                answers: { ...(base.answers ?? {}), [current.id]: answer },
                // Answering correctly flows straight to the next question; a
                // wrong answer stays put so the explanation is read.
                index: isCorrect && !last ? index + 1 : base.index,
              }));
              void recordAttempt(current, answer, isCorrect).catch(() => {
                // A failed write must not block the drill; the answer stays on
                // screen and the next submit simply tries again.
              });
            }}
            onRevealed={() => {
              patch((base) => ({
                results: { ...base.results, [current.id]: "revealed" },
              }));
            }}
            onNext={
              index + 1 < openQuestions.length
                ? () => patch(() => ({ index: index + 1 }))
                : undefined
            }
          />
          {!questionId &&
          index + 1 >= openQuestions.length &&
          current.id in results ? (
            <Panel title="本轮完成">
              <div className="flex flex-wrap items-center gap-3">
                <AnimatedBadge
                  status={
                    scored === 0
                      ? "neutral"
                      : correct === scored
                        ? "success"
                        : "warning"
                  }
                  size="sm"
                  contentKey={`${correct}-${scored}`}
                >
                  {scored === 0
                    ? `看了 ${answered} 道答案`
                    : `${correct} / ${scored} 正确`}
                </AnimatedBadge>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ml-auto"
                  onClick={() =>
                    patch((base) => ({
                      results: {},
                      answers: {},
                      index: 0,
                      run: base.run + 1,
                    }))
                  }
                >
                  重做
                </Button>
              </div>
            </Panel>
          ) : null}
        </>
      ) : (
        <Panel title={point ? point.name : "专项训练"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {questionId ? "这道题已不在当前知识包中" : "该知识点暂无题目"}
            </span>
            <AnimatedBadge status="neutral" size="sm" contentKey="empty">
              {questionId ? "已下线" : "待补充"}
            </AnimatedBadge>
          </div>
        </Panel>
      )}
    </div>
  );
}
