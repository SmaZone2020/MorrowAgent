import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

export interface Preferences {
  temperature: number;
  maxTokens: number;
  /** Drill text scale for questions and explanations, 1 = default size. */
  questionScale: number;
  /** How Lumi teaches: `guided`, `direct` or `socratic`. */
  teachingStyle: string;
}

export interface StoreStats {
  path: string;
  sizeBytes: number;
  conversations: number;
  messages: number;
  attempts: number;
  correctAttempts: number;
  attemptedPoints: number;
}

export const defaultPreferences: Preferences = {
  temperature: 0.6,
  maxTokens: 2048,
  questionScale: 1,
  teachingStyle: "guided",
};

export async function loadPreferences(): Promise<Preferences> {
  if (!isTauriRuntime) return defaultPreferences;
  return invoke<Preferences>("prefs_load");
}

export async function savePreferences(
  preferences: Preferences,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("prefs_save", { preferences });
}

export async function loadStats(): Promise<StoreStats | null> {
  if (!isTauriRuntime) return null;
  try {
    return await invoke<StoreStats>("data_stats");
  } catch {
    return null;
  }
}

export async function resetAllData(): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("data_reset");
}

/** Bytes to "12.4 MB", which is the only precision worth showing here. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
