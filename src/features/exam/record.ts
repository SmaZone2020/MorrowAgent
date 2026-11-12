import { answersMatch } from "@/features/training/answerMatch";
import { recordAttempt } from "@/features/training/attempts";
import { refreshAttempts } from "@/features/training/attemptCache";
import type { ExamPaper } from "@/features/exam/paper";

/**
 * Writes one sitting into the attempt log.
 *
 * A mock exam is practice, so its questions must reach the profile and the wrong
 * book like any other answer; the `source` is what lets a later reader tell a
 * paper from a drill. The id is derived from the run and the question rather
 * than random, because self-marking re-records the same question and the row
 * must be corrected instead of counted twice.
 *
 * Blank answers and unmarked calculations are skipped: an untouched slot is not
 * evidence of not knowing, it is evidence of not getting there.
 */
export async function recordExamAttempts(
  workspaceId: string,
  runId: string,
  paper: ExamPaper,
  answers: Record<string, string>,
  marks: Record<string, boolean>,
): Promise<void> {
  const writes = paper.slots.flatMap((slot) => {
    const answer = (answers[slot.question.id] ?? "").trim();
    if (!answer) return [];
    const isCorrect = slot.selfAssessed
      ? marks[slot.question.id]
      : answersMatch(answer, slot.question.answer);
    // A calculation the reader has not marked yet has no verdict; writing it as
    // wrong would put an unread answer into the wrong book.
    if (isCorrect === undefined) return [];
    return [
      recordAttempt(workspaceId, slot.question, answer, isCorrect, {
        id: `exam-${runId}-${slot.question.id}`,
        source: `exam:${runId}`,
      }),
    ];
  });

  await Promise.allSettled(writes);
  await refreshAttempts(workspaceId).catch(() => undefined);
}
