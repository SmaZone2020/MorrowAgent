import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";
import type { Question } from "@/features/knowledge";
import type { EvidenceState, PointEvidence } from "@/features/training/evidence";

export interface WrongAttempt {
  id: string;
  questionId: string;
  knowledgePointId: string;
  questionVersion: string;
  questionSnapshot: string;
  answer: string;
  isCorrect: boolean;
  createdAt: number;
  /** Empty until the learner says why it went wrong. */
  errorType: string;
  /** JSON summary of the scratchpad work, empty when nothing was drawn. */
  inkSummary: string;
}

export interface PointStats {
  knowledgePointId: string;
  attempts: number;
  correct: number;
  lastAttemptAt: number;
}

/**
 * Records one answered question. The snapshot travels with the row so a later
 * knowledge-pack edit can never rewrite what the user actually answered.
 *
 * A question can carry several knowledge tags, but the row keeps one point id
 * so tallies stay one-per-attempt; the first tag is the point the question is
 * primarily filed under. Every call is scoped to a package: attempts in two
 * workspaces are separate histories, not two rows in one list (MLPS §1.2).
 */
export async function recordAttempt(
  workspaceId: string,
  question: Question,
  answer: string,
  isCorrect: boolean,
  extra?: { errorType?: string; inkSummary?: string },
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("attempt_record", {
    workspaceId,
    attempt: {
      id: crypto.randomUUID(),
      questionId: question.id,
      knowledgePointId: question.knowledgeTags[0] ?? "",
      questionVersion: question.version ?? "",
      questionSnapshot: question.content,
      answer,
      isCorrect,
      errorType: extra?.errorType ?? "",
      inkSummary: extra?.inkSummary ?? "",
    },
  });
}

export async function loadWrongAttempts(
  workspaceId: string,
  limit = 50,
): Promise<WrongAttempt[]> {
  if (!isTauriRuntime) return [];
  return invoke<WrongAttempt[]>("attempt_wrong_list", { workspaceId, limit });
}

/**
 * Every recent attempt, right or wrong.
 *
 * The wrong book retires a question as soon as it is answered correctly, which
 * is right for a list of things to redo but wrong for a tutor: "you got this
 * one right after missing it twice" is the most useful thing Lumi can say.
 */
export async function loadRecentAttempts(
  workspaceId: string,
  limit = 20,
): Promise<WrongAttempt[]> {
  if (!isTauriRuntime) return [];
  return invoke<WrongAttempt[]>("attempt_recent", { workspaceId, limit });
}

export async function forgetAttempt(
  workspaceId: string,
  questionId: string,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("attempt_forget", { workspaceId, questionId });
}

export async function loadPointStats(
  workspaceId: string,
): Promise<PointStats[]> {
  if (!isTauriRuntime) return [];
  return invoke<PointStats[]>("attempt_point_stats", { workspaceId });
}

/** Names the reason one wrong attempt went wrong; empty clears the label. */
export async function setErrorType(
  workspaceId: string,
  attemptId: string,
  errorType: string,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("attempt_set_error_type", {
    workspaceId,
    attemptId,
    errorType,
  });
}

export async function loadEvidence(
  workspaceId: string,
): Promise<PointEvidence[]> {
  if (!isTauriRuntime) return [];
  try {
    return await invoke<PointEvidence[]>("evidence_list", { workspaceId });
  } catch {
    return [];
  }
}

export async function setEvidence(
  workspaceId: string,
  pointId: string,
  state: EvidenceState,
  note = "",
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("evidence_set", {
    workspaceId,
    pointId,
    stateName: state,
    note,
  });
}

export async function clearEvidence(
  workspaceId: string,
  pointId: string,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("evidence_clear", { workspaceId, pointId });
}
