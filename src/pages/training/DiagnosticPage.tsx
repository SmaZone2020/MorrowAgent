import { useMemo } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { InfoHint } from "@/components/InfoHint";
import { QuestionCard } from "@/features/training/QuestionCard";
import { recordAttempt } from "@/features/training/attempts";
import { buildDiagnostic } from "@/features/training/blueprint";
import { usePersistedState } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import { findPoint } from "@/features/knowledge";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";
import { DiagnosticResult } from "@/pages/training/DiagnosticResult";
import {
  emptyRun,
  QUESTIONS_PER_PAPER,
  type DiagnosticRun,
} from "@/features/training/diagnosticRun";

/**
 * The first thing a new learner sees in a package: a short paper spread over
 * every knowledge point, so the profile has evidence instead of guesses
 * (MLPS §11). It is not a drill: coverage comes first, depth second.
 */
export function DiagnosticPage() {
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const scope = workspaceScope(workspaceId, "diagnostic.run");
  const [run, setRun] = usePersistedState<DiagnosticRun | null>(scope, null);

  const plan = useMemo(
    () => buildDiagnostic(index.view.questions, { limit: QUESTIONS_PER_PAPER }),
    [index],
  );

  const paper = useMemo(
    () =>
      (run?.questionIds ?? [])
        .map((id) => index.questionsById.get(id))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [index, run],
  );

  if (index.view.questions.length === 0) {
    return (
      <Shell>
        <Panel title="诊断测评">
          <EmptyState mood="confused" title="这个学习包暂无题目" />
        </Panel>
      </Shell>
    );
  }

  // Not started, or the package changed under a finished paper.
  if (!run || paper.length === 0) {
    return (
      <Shell>
        <Panel
          title="诊断测评"
          action={
            <AnimatedBadge
              status="info"
              size="sm"
              contentKey={plan.questions.length}
            >
              {plan.questions.length} 题
            </AnimatedBadge>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-1 text-sm leading-6 text-muted-foreground">
              先摸清底子，再决定练什么。每个知识点至少一题，难度从易到难。
              <InfoHint label="组卷按知识点覆盖优先，不随机抽题；同一份学习包每次生成的试卷相同。" />
            </p>

            {plan.missing.length > 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {plan.missing.length} 个知识点还没有题目，本次不测：
                {plan.missing
                  .slice(0, 6)
                  .map((id) => findPoint(index, id)?.name ?? id)
                  .join("、")}
                {plan.missing.length > 6
                  ? ` 等 ${plan.missing.length} 个`
                  : ""}
              </p>
            ) : null}

            <div className="flex items-center justify-end">
              <Button
                onClick={() =>
                  setRun(emptyRun(plan.questions.map((entry) => entry.id)))
                }
              >
                开始诊断
              </Button>
            </div>
          </div>
        </Panel>
      </Shell>
    );
  }

  const patch = (next: (current: DiagnosticRun) => Partial<DiagnosticRun>) =>
    setRun((previous) =>
      previous ? { ...previous, ...next(previous) } : previous,
    );

  // Stepping past the last question ends the paper, so its explanation stays
  // on screen until the reader chooses to move on.
  if (run.index >= paper.length) {
    return (
      <Shell>
        <DiagnosticResult
          paper={paper}
          run={run}
          onRestart={() => setRun(null)}
        />
      </Shell>
    );
  }

  const position = Math.min(run.index, paper.length - 1);
  const current = paper[position]!;

  return (
    <Shell>
      <div className="flex items-center gap-2">
        <AnimatedBadge status="info" size="sm" contentKey={position + 1}>
          {position + 1} / {paper.length}
        </AnimatedBadge>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-sm"
          onClick={() => setRun(null)}
        >
          重新开始
        </Button>
      </div>

      <QuestionCard
        key={current.id}
        question={current}
        index={position + 1}
        total={paper.length}
        initialAnswer={run.answers[current.id] ?? null}
        initialVerdict={run.results[current.id] ?? null}
        onAnswered={(answer, isCorrect) => {
          patch((base) => ({
            results: {
              ...base.results,
              [current.id]: isCorrect ? "correct" : "wrong",
            },
            answers: { ...base.answers, [current.id]: answer },
          }));
          void recordAttempt(workspaceId, current, answer, isCorrect).catch(
            () => undefined,
          );
        }}
        onRevealed={() => {
          patch((base) => ({
            results: { ...base.results, [current.id]: "revealed" },
          }));
        }}
        onNext={() => patch(() => ({ index: position + 1 }))}
        nextLabel={position + 1 < paper.length ? "下一题" : "查看结果"}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      {children}
    </div>
  );
}
