import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { QuestionCard } from "@/features/training/QuestionCard";
import { recordAttempt } from "@/features/training/attempts";
import { knowledgePoints, questions, questionsFor } from "@/features/knowledge";

/**
 * Drill picks a point first, then walks its questions one at a time. Point
 * selection lives in the query string so a link from the knowledge page can
 * jump straight into a specific point.
 */
export function DrillPage() {
  const [params, setParams] = useSearchParams();
  const pointId = params.get("point");
  const questionId = params.get("question");
  const [index, setIndex] = useState(0);
  // Keyed by question id so revisiting a point keeps the session tally.
  // "revealed" is a board question whose answer was shown without scoring.
  const [results, setResults] = useState<
    Record<string, "correct" | "wrong" | "revealed">
  >({});
  // Bumping this remounts the card, which is how "redo" clears a finished
  // single-question run whose id never changes.
  const [run, setRun] = useState(0);

  const openQuestions = useMemo(() => {
    // A `question` link wins over the point filter: the wrong book sends the
    // user to the exact question they missed, not to its whole point. It does
    // not fall back, because showing the whole set under a "single question"
    // header would misrepresent what is on screen.
    if (questionId) return questions.filter((entry) => entry.id === questionId);
    return pointId ? questionsFor(pointId) : questions;
  }, [pointId, questionId]);

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
    setIndex(0);
    setResults({});
    if (next) setParams({ point: next });
    else setParams({});
  };

  // A single-question link hides the point chips, which would otherwise all
  // look inactive while the list is clearly filtered.
  const chipsVisible = !questionId;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
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
            className="ml-auto"
            onClick={() => selectPoint(pointId)}
          >
            {pointId ? "返回本知识点" : "全部题目"}
          </Button>
        </div>
      )}

      {current ? (
        <>
          <QuestionCard
            key={`${current.id}-${run}`}
            question={current}
            index={index + 1}
            total={openQuestions.length}
            onAnswered={(answer, isCorrect) => {
              setResults((previous) => ({
                ...previous,
                [current.id]: isCorrect ? "correct" : "wrong",
              }));
              void recordAttempt(current, answer, isCorrect).catch(() => {
                // A failed write must not block the drill; the answer stays on
                // screen and the next submit simply tries again.
              });
            }}
            onRevealed={() => {
              setResults((previous) => ({
                ...previous,
                [current.id]: "revealed",
              }));
            }}
            onNext={
              index + 1 < openQuestions.length
                ? () => setIndex((value) => value + 1)
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
                  onClick={() => {
                    setResults({});
                    setIndex(0);
                    setRun((value) => value + 1);
                  }}
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
