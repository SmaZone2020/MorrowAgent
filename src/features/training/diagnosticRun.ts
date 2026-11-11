/**
 * The shape a stored diagnostic paper has.
 *
 * It lives apart from the page so the scorecard and the page can both name it
 * without importing each other, and so a later "resume the paper" entry point
 * can read the same record.
 */
export type DiagnosticVerdict = "correct" | "wrong" | "revealed";

export interface DiagnosticRun {
  /** The paper's question ids, in the order they are asked. */
  questionIds: string[];
  index: number;
  results: Record<string, DiagnosticVerdict>;
  answers: Record<string, string>;
  startedAt: number;
}

/** How many questions one paper holds; enough to touch every chapter. */
export const QUESTIONS_PER_PAPER = 15;

export function emptyRun(questionIds: string[]): DiagnosticRun {
  return {
    questionIds,
    index: 0,
    results: {},
    answers: {},
    startedAt: Date.now(),
  };
}
