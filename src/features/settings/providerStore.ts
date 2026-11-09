import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

export interface StoredProvider {
  baseUrl: string;
  model: string;
  apiKey: string;
}

function requireRuntime(): void {
  if (!isTauriRuntime) {
    throw new Error("密钥存储由 Tauri 后端提供，浏览器预览中不可用。");
  }
}

// The blob itself is opaque to the frontend: Rust encrypts it with DPAPI before
// touching the disk, so these three calls are the only way in or out.
export async function saveProvider(provider: StoredProvider): Promise<void> {
  requireRuntime();
  await invoke("provider_save", { provider });
}

export async function loadProvider(): Promise<StoredProvider | null> {
  if (!isTauriRuntime) return null;
  return invoke<StoredProvider | null>("provider_load");
}

export async function clearProvider(): Promise<void> {
  requireRuntime();
  await invoke("provider_clear");
}
