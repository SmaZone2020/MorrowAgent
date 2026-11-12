import { isTauriRuntime } from "@/app/shell/windowControls";
import {
  loadPointStats,
  loadRecentAttempts,
  loadWrongAttempts,
} from "@/features/training/attempts";

/** One attempt as the tools see it: no stem, no snapshot, just the facts. */
export interface RecentAttempt {
  questionId: string;
  knowledgePointId: string;
  correct: boolean;
  answer: string;
  at: number;
  /** Empty until the learner says why it went wrong. */
  errorType: string;
  /** JSON summary of the scratchpad work, empty when nothing was drawn. */
  inkSummary: string;
}

/**
 * What the tools are allowed to know about the student.
 *
 * A tool handler runs synchronously in the middle of a reply, so it cannot
 * await a database read; the numbers have to be sitting here already. The
 * snapshot is refreshed when the page mounts and after every answer, which is
 * the only two moments the tallies can change.
 */
export interface AttemptSnapshot {
  /** Per-point tallies, keyed by knowledge point id. */
  stats: Map<string, { attempts: number; correct: number; lastAttemptAt: number }>;
  /** Wrong-book rows, newest first. */
  wrong: { questionId: string; knowledgePointId: string; createdAt: number }[];
  /** Every recent attempt, newest first, right and wrong. */
  recent: RecentAttempt[];
}

const EMPTY: AttemptSnapshot = { stats: new Map(), wrong: [], recent: [] };

const cache = new Map<string, AttemptSnapshot>();

/** The last snapshot read for this package, or an empty one. */
export function attemptSnapshot(workspaceId: string): AttemptSnapshot {
  return cache.get(workspaceId) ?? EMPTY;
}

/**
 * Re-reads the tables for one package. A failure keeps the previous snapshot
 * rather than blanking it: stale numbers are more useful to a tutor than none.
 */
export async function refreshAttempts(
  workspaceId: string,
): Promise<AttemptSnapshot> {
  if (!isTauriRuntime) return EMPTY;
  try {
    const [stats, wrong, recent] = await Promise.all([
      loadPointStats(workspaceId),
      loadWrongAttempts(workspaceId),
      loadRecentAttempts(workspaceId),
    ]);
    const snapshot: AttemptSnapshot = {
      stats: new Map(
        stats.map((row) => [
          row.knowledgePointId,
          {
            attempts: row.attempts,
            correct: row.correct,
            lastAttemptAt: row.lastAttemptAt,
          },
        ]),
      ),
      wrong: wrong.map((row) => ({
        questionId: row.questionId,
        knowledgePointId: row.knowledgePointId,
        createdAt: row.createdAt,
      })),
      recent: recent.map((row) => ({
        questionId: row.questionId,
        knowledgePointId: row.knowledgePointId,
        correct: row.isCorrect,
        answer: row.answer,
        at: row.createdAt,
        errorType: row.errorType,
        inkSummary: row.inkSummary,
      })),
    };
    cache.set(workspaceId, snapshot);
    return snapshot;
  } catch {
    return attemptSnapshot(workspaceId);
  }
}
