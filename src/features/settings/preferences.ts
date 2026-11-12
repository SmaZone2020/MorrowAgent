import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

export interface Preferences {
  temperature: number;
  maxTokens: number;
  /** Drill text scale for questions and explanations, 1 = default size. */
  questionScale: number;
  /** How Lumi talks: `warm`, `sharp`, `rigorous` or `playful`. */
  persona: string;
  /** How Lumi teaches: `guided`, `direct` or `socratic`. Global on purpose. */
  teachingStyle: string;
  /** What Lumi calls the learner; empty means nothing was chosen. */
  nickname: string;
  /** `YYYY-MM-DD` or empty. Used only to gauge what kind of learner this is. */
  birthday: string;
  /**
   * How hard a thinking model should think: `off`, `low`, `high` or `max`.
   * Only DeepSeek understands the switch; other providers never see it.
   */
  thinking: string;
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
  maxTokens: 8192,
  questionScale: 1,
  persona: "warm",
  teachingStyle: "guided",
  nickname: "",
  birthday: "",
  thinking: "high",
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

/** Packs the database and the preference files; returns the archive size. */
export async function backupData(target: string): Promise<number> {
  return invoke<number>("data_backup", { target });
}

/** Replaces the local store from a backup file. Restart afterwards. */
export async function restoreData(path: string): Promise<void> {
  await invoke("data_restore", { path });
}

/** Restarts the process so every page re-reads the restored store. */
export async function restartApp(): Promise<void> {
  await invoke("app_restart");
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
