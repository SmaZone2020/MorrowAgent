import { useCallback, useMemo } from "react";
import { usePersistedState } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";
import { recordAttempt } from "@/features/training/attempts";
import { refreshAttempts } from "@/features/training/attemptCache";
import type { Question } from "@/features/knowledge";
import type { QuizQuestion } from "@/features/lumi/quizSpec";
import {
  quizQuestionRef,
  quizSnapshot,
  type QuizAnswer,
  type QuizState,
} from "@/features/lumi/quizState";

/** Builds the attempt row a generated question writes. */
function asQuestion(question: QuizQuestion, componentId: string): Question {
  return {
    id: quizQuestionRef(componentId, question.id),
    content: quizSnapshot(question),
    questionType: question.type,
    explanation: question.explanation,
    options: question.options.map((option) => ({
      key: option.key,
      content: option.content,
    })),
    answer: question.answer.join(""),
    images: [],
    knowledgeTags: question.knowledgePoints,
    commonErrors: [],
    estimatedMinutes: question.estimatedMinutes,
    sourceType: "generated",
    version: "1",
  };
}

/**
 * The single tool result for a whole set.
 *
 * One call posed every question, so it must be answered once: a provider
 * rejects a call that gets several results, and a reply that arrives four
 * times would read as four separate interruptions.
 */
export function describeSet(
  componentId: string,
  questions: QuizQuestion[],
  answers: Record<string, QuizAnswer>,
): string {
  const lines: string[] = [];
  let correct = 0;

  questions.forEach((question, position) => {
    const answer = answers[question.id];
    if (!answer) return;
    if (answer.correct) correct += 1;
    lines.push(
      `第 ${position + 1} 题（${question.type}）${answer.correct ? "正确" : "错误"}`,
      `题干：${question.stem}`,
      `学生作答：${answer.selected.join("、") || "（未填）"}`,
      `正确答案：${question.answer.join("、") || "（开放题，由学生自评）"}`,
      `用时：${Math.round(answer.elapsedMs / 1000)} 秒`,
    );
    if (question.knowledgePoints.length > 0) {
      lines.push(`知识点：${question.knowledgePoints.join("、")}`);
    }
    lines.push("");
  });

  return [
    `[题组完成] ${componentId}`,
    `共 ${questions.length} 题，答对 ${correct} 题，答错 ${questions.length - correct} 题。`,
    "",
    ...lines,
  ]
    .join("\n")
    .trim();
}

/**
 * The answers to one generated set.
 *
 * State lives above the transcript because a streamed reply is re-parsed on
 * every delta: an answer kept inside the rendered card would be wiped at the
 * next token boundary. It is keyed by the tool call id rather than the model's
 * `componentId`, which is free text and may repeat.
 */
export function useQuizSession(
  stateKey: string,
  componentId: string | null,
  questions: QuizQuestion[],
  onComplete: (output: string) => void,
) {
  const workspaceId = useWorkspaceId();
  const [answers, setAnswers] = usePersistedState<QuizState>(
    workspaceScope(workspaceId, "quiz.answers"),
    {},
  );

  const answered = answers[stateKey] ?? {};

  const confirm = useCallback(
    (question: QuizQuestion, answer: QuizAnswer) => {
      if (!componentId) return;

      setAnswers((current) => ({
        ...current,
        [stateKey]: { ...(current[stateKey] ?? {}), [question.id]: answer },
      }));

      // The attempt is recorded the moment the question is marked, not when the
      // set is submitted: an abandoned set still produced evidence.
      const attempt = asQuestion(question, componentId);
      void recordAttempt(
        workspaceId,
        attempt,
        answer.selected.join(""),
        answer.correct,
      )
        .then(() => refreshAttempts(workspaceId))
        .catch(() => undefined);
    },
    [componentId, setAnswers, stateKey, workspaceId],
  );

  const complete = useCallback(() => {
    if (!componentId) return;
    onComplete(describeSet(componentId, questions, answered));
  }, [answered, componentId, onComplete, questions]);

  const summary = useMemo(() => {
    const done = questions.filter((question) => answered[question.id]).length;
    const correct = questions.filter(
      (question) => answered[question.id]?.correct,
    ).length;
    return { done, correct };
  }, [answered, questions]);

  return { answers: answered, confirm, complete, summary };
}
