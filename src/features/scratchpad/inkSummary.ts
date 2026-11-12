import type { Stroke } from "@/features/scratchpad/types";

/**
 * What the scratchpad records, as JSON on an attempt row.
 *
 * The strokes themselves stay in the ui-state file: they are stroke geometry,
 * which no model can read and no table wants to store per answer. What is worth
 * keeping beside the answer is how much work went into it — a wrong answer with
 * forty strokes is a slip, and a wrong answer with two is a blank.
 */
export interface InkSummary {
  strokes: number;
  points: number;
  /** Seconds spent with ink on the pad, rounded down. */
  seconds: number;
  /** True when the learner cleared the pad at least once. */
  cleared: boolean;
}

export function summarizeInk(
  strokes: Stroke[],
  seconds: number,
  cleared: boolean,
): InkSummary {
  return {
    strokes: strokes.length,
    points: strokes.reduce((total, stroke) => total + stroke.points.length, 0),
    seconds: Math.max(0, Math.round(seconds)),
    cleared,
  };
}

/** Serialises only when there was ink; an empty pad stores an empty string. */
export function inkSummaryJson(summary: InkSummary): string {
  return summary.strokes === 0 ? "" : JSON.stringify(summary);
}

/**
 * Renders a stored summary for a model or a row. Anything unreadable reads as
 * nothing rather than as zero strokes: a corrupt value is not evidence of a
 * blank answer.
 */
export function describeInk(inkSummary: string): string {
  if (!inkSummary) return "";
  let parsed: Partial<InkSummary> = {};
  try {
    parsed = JSON.parse(inkSummary) as Partial<InkSummary>;
  } catch {
    return "";
  }
  const strokes = Math.max(0, Math.round(parsed.strokes ?? 0));
  if (strokes === 0) return "";
  const seconds = Math.max(0, Math.round(parsed.seconds ?? 0));
  const work = seconds >= 60 ? `${Math.round(seconds / 60)} 分钟` : `${seconds} 秒`;
  return `草稿 ${strokes} 笔，约 ${work}`;
}
