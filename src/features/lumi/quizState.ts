import type { QuizQuestion } from "@/features/lumi/quizSpec";

/** One answered question in a quiz the model generated. */
export interface QuizAnswer {
  /** Option keys for a choice, or one written answer for a blank. */
  selected: string[];
  correct: boolean;
  /** Milliseconds between the question appearing and the user confirming. */
  elapsedMs: number;
}

/**
 * Every quiz the model has posed in one conversation, keyed by component id.
 *
 * This lives in interface state rather than in the transcript because it is
 * what the card renders from: a streamed reply is re-parsed on every delta, so
 * an answer kept inside the message would be wiped mid-token.
 */
export type QuizState = Record<string, Record<string, QuizAnswer>>;

/** What travels back to the model when a question is confirmed. */
export interface QuizEvent {
  componentId: string;
  /** 1-based position, so the model can talk about "第 2 题". */
  index: number;
  total: number;
  questionId: string;
  questionType: string;
  stem: string;
  selected: string[];
  answer: string[];
  correct: boolean;
  knowledgePoints: string[];
  elapsedMs: number;
}

/**
 * The fact summary a confirmed answer becomes.
 *
 * It is written as data, not prose, because the model has to reason about it:
 * restating the question in sentences would bury the useful part.
 */
export function describeEvent(event: QuizEvent): string {
  const picked = event.selected.join("") || "（未选）";
  const answer = event.answer.join("") || "（无标准答案）";
  const lines = [
    `[作答] 第 ${event.index}/${event.total} 题 · ${event.questionType} · ${event.correct ? "正确" : "错误"}`,
    `题目：${event.stem}`,
    `用户答案：${picked}`,
    `正确答案：${answer}`,
  ];
  if (event.knowledgePoints.length > 0) {
    lines.push(`知识点：${event.knowledgePoints.join("、")}`);
  }
  lines.push(`用时：${Math.round(event.elapsedMs / 1000)} 秒`);
  return lines.join("\n");
}

/** The compact line the transcript shows for a confirmed answer. */
export function summarizeEvent(event: QuizEvent): string {
  return `第 ${event.index} 题 · ${event.correct ? "正确" : "错误"}`;
}

/** A stable synthetic id so an AI-posed question can enter the wrong book. */
export function quizQuestionRef(componentId: string, questionId: string): string {
  return `quiz:${componentId}:${questionId}`;
}

/**
 * Converts a generated question into the same shape the drill records, so one
 * attempt table holds both sources and the profile counts them together.
 */
export function quizSnapshot(question: QuizQuestion): string {
  const options = question.options
    .map((option) => `${option.key}. ${option.content}`)
    .join("\n");
  return options ? `${question.stem}\n${options}` : question.stem;
}
