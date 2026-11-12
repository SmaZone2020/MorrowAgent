import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";
import type { StudyGoal, TrendPoint } from "@/features/plan/types";

/** Every goal read and write goes through here; the store shape is in types.ts. */
export async function loadGoal(workspaceId: string): Promise<StudyGoal | null> {
  if (!isTauriRuntime) return null;
  try {
    return await invoke<StudyGoal | null>("goal_load", { workspaceId });
  } catch {
    return null;
  }
}

export async function saveGoal(
  workspaceId: string,
  goal: StudyGoal,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("goal_save", { workspaceId, goal });
}

export async function loadTrend(
  workspaceId: string,
  days = 14,
): Promise<TrendPoint[]> {
  if (!isTauriRuntime) return [];
  try {
    return await invoke<TrendPoint[]>("attempt_trend", { workspaceId, days });
  } catch {
    return [];
  }
}
