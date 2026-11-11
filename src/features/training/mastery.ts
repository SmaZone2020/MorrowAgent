/**
 * Turning attempt tallies into a mastery estimate.
 *
 * The package only ships suggested criteria (MLPS §12), so the number has to be
 * earned from the user's own answers. Two rules keep it honest:
 *
 * - Laplace smoothing: one correct answer is not 100%. The score is
 *   `(correct + 1) / (attempts + 2)`, so a single right answer reads 67% and a
 *   single wrong one 33%, and only repeated evidence moves it far.
 * - A separate confidence: the score is meaningless while `attempts` is small,
 *   so `confidence` rises with sample size and the UI can say "证据不足"
 *   instead of printing a number it does not believe.
 */
export interface Mastery {
  pointId: string;
  /** 0–100, smoothed; never 0 or 100 while the sample is small. */
  score: number;
  /** 0–1, how much the score should be trusted. */
  confidence: number;
  attempts: number;
  correct: number;
  lastAttemptAt: number;
}

export type MasteryLevel = "untouched" | "learning" | "familiar" | "solid";

/** Attempts at which the score is considered trustworthy enough to rank. */
const CONFIDENT_ATTEMPTS = 6;

export function masteryOf(input: {
  pointId: string;
  attempts: number;
  correct: number;
  lastAttemptAt: number;
}): Mastery {
  const attempts = Math.max(0, input.attempts);
  const correct = Math.min(Math.max(0, input.correct), attempts);
  const score = Math.round(((correct + 1) / (attempts + 2)) * 100);
  // A rational curve rather than a step: 1 attempt ≈ 0.14, 6 ≈ 0.5, 20 ≈ 0.77.
  const confidence = attempts / (attempts + CONFIDENT_ATTEMPTS);
  return {
    pointId: input.pointId,
    score,
    confidence,
    attempts,
    correct,
    lastAttemptAt: input.lastAttemptAt,
  };
}

/**
 * The label the profile prints. A high score from one lucky answer stays
 * "learning": the level describes evidence, not the smoothed percentage.
 */
export function levelOf(mastery: Mastery): MasteryLevel {
  if (mastery.attempts === 0) return "untouched";
  if (mastery.confidence < 0.3) return "learning";
  if (mastery.score >= 85 && mastery.confidence >= 0.5) return "solid";
  if (mastery.score >= 60) return "familiar";
  return "learning";
}

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  untouched: "未测",
  learning: "学习中",
  familiar: "较熟练",
  solid: "已掌握",
};

/**
 * What to study next: weakest first, but a point with no evidence ranks above a
 * point that was answered well, because an untested point is an unknown rather
 * than a strength.
 */
export function weakestFirst(masteries: Mastery[]): Mastery[] {
  return [...masteries].sort((a, b) => {
    const left = a.attempts === 0 ? -1 : a.score;
    const right = b.attempts === 0 ? -1 : b.score;
    if (left !== right) return left - right;
    return a.pointId.localeCompare(b.pointId);
  });
}

/** How much of the package the user has any evidence for at all. */
export function coverageOf(masteries: Mastery[], totalPoints: number): number {
  if (totalPoints <= 0) return 0;
  const tested = masteries.filter((entry) => entry.attempts > 0).length;
  return Math.round((tested / totalPoints) * 100);
}
