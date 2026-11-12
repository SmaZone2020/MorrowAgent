import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { QuestionCard } from "@/features/training/QuestionCard";
import { DrillToolbar } from "@/features/training/DrillToolbar";
import { PointFilter } from "@/pages/training/PointFilter";
import { BreadcrumbActions } from "@/app/shell/breadcrumbActions";
import { recordAttempt } from "@/features/training/attempts";
import { refreshAttempts } from "@/features/training/attemptCache";
import { usePersistedState } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import { findPoint } from "@/features/knowledge";
import type { KnowledgeIndex, Question } from "@/features/knowledge";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";
import { workspacePath } from "@/app/navigation";

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

const EMPTY_RUN: DrillRun = {
  key: "",
  index: 0,
  results: {},
  answers: {},
  run: 0,
};

/** Every question in the package, in the order the package lists them. */
function allQuestions(index: KnowledgeIndex): Question[] {
  return index.view.questions;
}

/**
 * Drill picks a point first, then walks its questions one at a time. Point
 * selection lives in the query string so a link from the knowledge page can
 * jump straight into a specific point.
 */
export function DrillPage() {
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const [params, setParams] = useSearchParams();
  // Repeated `point` parameters, so a link may open several points at once and
  // the multi-select can round-trip through the URL like the old single chip.
  const pointIds = useMemo(() => params.getAll("point"), [params]);
  const questionId = params.get("question");

  const [stored, setStored] = usePersistedState<DrillRun>(
    workspaceScope(workspaceId, "drill.run"),
    EMPTY_RUN,
  );

  const openQuestions = useMemo(() => {
    // A `question` link wins over the point filter: the wrong book sends the
    // user to the exact question they missed, not to its whole point. It does
    // not fall back, because showing the whole set under a "single question"
    // header would misrepresent what is on screen.
    if (questionId) {
      const one = index.questionsById.get(questionId);
      return one ? [one] : [];
    }
    if (pointIds.length === 0) return allQuestions(index);
    // Several points selected: keep the package's own order rather than
    // concatenating per-point lists, so the numbering stays predictable.
    const wanted = new Set(pointIds);
    return allQuestions(index).filter((question) =>
      question.knowledgeTags.some((id) => wanted.has(id)),
    );
  }, [index, pointIds, questionId]);

  const runKey = questionId
    ? `q:${questionId}`
    : pointIds.length > 0
      ? `p:${[...pointIds].sort().join(",")}`
      : "all";
  // Deriving instead of resetting in an effect keeps the first frame correct:
  // a stored run for another set must never render its question number here.
  const session = stored.key === runKey ? stored : { ...EMPTY_RUN, key: runKey };
  // The content pack can shrink between launches, so a stored index is only
  // trusted while it still points at a question.
  const position =
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
      const base =
        current.key === runKey ? current : { ...EMPTY_RUN, key: runKey };
      return { ...base, ...next(base) };
    });

  // The empty-state panel names the point only when the filter is a single one;
  // with several selected there is no single name to show.
  const point =
    pointIds.length === 1 ? findPoint(index, pointIds[0] ?? "") : undefined;
  const current = openQuestions[position];

  const answered = openQuestions.filter((entry) => entry.id in results).length;
  const scored = openQuestions.filter(
    (entry) =>
      results[entry.id] === "correct" || results[entry.id] === "wrong",
  ).length;
  const correct = openQuestions.filter(
    (entry) => results[entry.id] === "correct",
  ).length;

  const selectPoints = (next: string[]) => {
    patch(() => ({ index: 0, results: {}, answers: {}, run: 0 }));
    if (next.length === 0) {
      setParams({});
      return;
    }
    const search = new URLSearchParams();
    for (const id of next) search.append("point", id);
    setParams(search);
  };

  // A single-question link hides the point filter, which would otherwise look
  // idle while the list is clearly narrowed to one question.
  const filterVisible = !questionId;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-5 sm:p-7">
      {filterVisible ? (
        <BreadcrumbActions>
          <PointFilter
            index={index}
            selected={pointIds}
            onChange={selectPoints}
          />
        </BreadcrumbActions>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <AnimatedBadge status="info" size="sm" contentKey="single">
            错题重做
          </AnimatedBadge>
          {pointIds[0] ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-sm"
              onClick={() => selectPoints(pointIds)}
            >
              返回本知识点
            </Button>
          ) : null}
        </div>
      )}

      {current ? (
        <>
          <QuestionCard
            key={`${current.id}-${session.run}`}
            question={current}
            index={position + 1}
            total={openQuestions.length}
            initialAnswer={answers[current.id] ?? null}
            initialVerdict={results[current.id] ?? null}
            onAnswered={(answer, isCorrect, ink) => {
              // Record the answer and, on a correct one, advance in a single
              // update: two writes from the same render would race.
              const last = position + 1 >= openQuestions.length;
              patch((base) => ({
                results: {
                  ...base.results,
                  [current.id]: isCorrect ? "correct" : "wrong",
                },
                answers: { ...(base.answers ?? {}), [current.id]: answer },
                // Answering correctly flows straight to the next question; a
                // wrong answer stays put so the explanation is read.
                index: isCorrect && !last ? position + 1 : base.index,
              }));
              void recordAttempt(
                workspaceId,
                current,
                answer,
                isCorrect,
                { inkSummary: ink },
              )
                // The tool context reads the snapshot, not the database, so a
                // refresh here is what lets "我最近错在哪" see this answer.
                .then(() => refreshAttempts(workspaceId))
                .catch(() => {
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
              position + 1 < openQuestions.length
                ? () => patch(() => ({ index: position + 1 }))
                : undefined
            }
          />
          {!questionId &&
          position + 1 >= openQuestions.length &&
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
                  className="ml-auto text-sm"
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
          <EmptyState
            mood={questionId ? "bored" : "confused"}
            title={
              questionId
                ? "这道题已不在当前知识包中"
                : pointIds.length > 0
                  ? "所选知识点暂无题目"
                  : "这个学习包暂无题目"
            }
          />
        </Panel>
      )}

      <DrillToolbar
        className="absolute top-32 right-10"
        question={current}
        answerState={
          current
            ? {
                answered: current.id in results,
                verdict: results[current.id] ?? null,
              }
            : undefined
        }
      />
    </div>
  );
}

/** Kept for the wrong book, which links back into the drill by question id. */
export function drillQuestionPath(workspaceId: string, questionId: string) {
  return `${workspacePath(workspaceId, "/drill")}?question=${questionId}`;
}
