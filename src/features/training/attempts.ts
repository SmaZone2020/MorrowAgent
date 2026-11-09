import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";
import type { Question } from "@/features/knowledge";

export interface WrongAttempt {
  id: string;
  questionId: string;
  knowledgePointId: string;
  questionVersion: string;
  questionSnapshot: string;
  answer: string;
  isCorrect: boolean;
  createdAt: number;
}

/**
 * Records one answered question. The snapshot travels with the row so a later
 * knowledge-pack edit can never rewrite what the user actually answered.
 */
export async function recordAttempt(
  question: Question,
  answer: string,
  isCorrect: boolean,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("attempt_record", {
    attempt: {
      id: crypto.randomUUID(),
      questionId: question.id,
      knowledgePointId: question.knowledgeTags[0] ?? "",
      questionVersion: "",
      questionSnapshot: question.content,
      answer,
      isCorrect,
    },
  });
}

export async function loadWrongAttempts(limit = 50): Promise<WrongAttempt[]> {
  if (!isTauriRuntime) return [];
  return invoke<WrongAttempt[]>("attempt_wrong_list", { limit });
}

export async function forgetAttempt(questionId: string): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("attempt_forget", { questionId });
}
