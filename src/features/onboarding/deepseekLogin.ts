import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

/**
 * The console session behind the phone sign-in.
 *
 * Signing in and minting a key both live on `platform.deepseek.com`, which
 * refuses cross-origin calls and verifies its own captcha, so neither can be
 * done from the webview. The backend opens the platform's real sign-in window,
 * keeps the token in memory, and hands back only what the wizard needs to show:
 * which account it is and whether a key already exists.
 */
export interface DeepSeekAccount {
  mobile: string;
  email: string;
}

export interface DeepSeekKeySlot {
  name: string;
  /** The masked value; the console never repeats a key in full. */
  masked: string;
  trackingId: string;
  createdAt: number;
}

export interface DeepSeekKeyPlan {
  /** Whether a key already named after this app exists. */
  exists: boolean;
  total: number;
  limit: number;
  keys: DeepSeekKeySlot[];
}

export interface DeepSeekConnectedKey {
  models: string[];
  model: string;
  /** Whether an older key of the same name was removed on the way. */
  replaced: boolean;
}

function requireRuntime(): void {
  if (!isTauriRuntime) {
    throw new Error("连接 DeepSeek 需要桌面应用的后端支持。");
  }
}

/**
 * Opens the platform's own sign-in page and waits for the learner to finish.
 *
 * The window is the real console, so the phone number, the captcha and the SMS
 * all stay on infrastructure that already knows how to handle them. Resolving
 * means a token was captured; rejecting with 「已取消登录」 means the window was
 * closed without one, which is not an error worth a toast of its own.
 */
export async function signInDeepSeek(): Promise<DeepSeekAccount> {
  requireRuntime();
  return invoke<DeepSeekAccount>("deepseek_sign_in");
}

/** What the account already holds, so a replacement can be confirmed first. */
export async function readDeepSeekKeyPlan(): Promise<DeepSeekKeyPlan> {
  requireRuntime();
  return invoke<DeepSeekKeyPlan>("deepseek_key_plan");
}

/**
 * Mints the app's key and adopts it for chat and search in one step.
 *
 * The plaintext key never travels through here: the backend writes it into the
 * encrypted provider blob and the search blob itself, so the only thing that
 * comes back is what the wizard shows — the models it can reach.
 */
export async function connectDeepSeekKey(
  replace: boolean,
): Promise<DeepSeekConnectedKey> {
  requireRuntime();
  return invoke<DeepSeekConnectedKey>("deepseek_connect_key", { replace });
}

/** Forgets the console token when the learner backs out. */
export async function signOutDeepSeek(): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("deepseek_sign_out");
}
