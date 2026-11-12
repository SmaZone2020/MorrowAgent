import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

/** One sitting, as the database keeps it. */
export interface ExamRun {
  id: string;
  workspaceId: string;
  questionIds: string[];
  answers: Record<string, string>;
  /** The reader's own verdict on questions the app cannot grade. */
  marks: Record<string, boolean>;
  startedAt: number;
  submittedAt: number | null;
  durationLimit: number;
  score: number | null;
}

export async function startExam(
  workspaceId: string,
  questionIds: string[],
  duration: number,
): Promise<ExamRun | null> {
  if (!isTauriRuntime) return null;
  return invoke<ExamRun>("exam_start", { workspaceId, questionIds, duration });
}

/** Mid-paper autosave. Failure is silent: the next answer tries again. */
export async function saveExam(
  id: string,
  answers: Record<string, string>,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("exam_save", { id, answers });
}

export async function submitExam(
  id: string,
  answers: Record<string, string>,
  score: number,
): Promise<ExamRun | null> {
  if (!isTauriRuntime) return null;
  return invoke<ExamRun>("exam_submit", { id, answers, score });
}

/** Records self-marks after the paper is in, and the total that follows. */
export async function gradeExam(
  id: string,
  marks: Record<string, boolean>,
  score: number,
): Promise<ExamRun | null> {
  if (!isTauriRuntime) return null;
  return invoke<ExamRun>("exam_grade", { id, marks, score });
}

export async function loadExams(
  workspaceId: string,
  limit = 20,
): Promise<ExamRun[]> {
  if (!isTauriRuntime) return [];
  return invoke<ExamRun[]>("exam_list", { workspaceId, limit });
}

export async function loadExam(id: string): Promise<ExamRun | null> {
  if (!isTauriRuntime) return null;
  return invoke<ExamRun | null>("exam_load", { id });
}
