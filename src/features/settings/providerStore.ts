import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";
import type { Protocol } from "@/features/settings/aiBridge";

/** One saved provider. The key is stored encrypted, never in interface state. */
export interface StoredProviderProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  /** Defaults to `openai-chat` when absent, which keeps old blobs readable. */
  protocol?: Protocol;
  models: string[];
}

/** Everything the user configured, plus the one model currently in use. */
export interface ProviderBook {
  providers: StoredProviderProfile[];
  activeProviderId: string | null;
  activeModel: string | null;
}

export const emptyProviderBook: ProviderBook = {
  providers: [],
  activeProviderId: null,
  activeModel: null,
};

function requireRuntime(): void {
  if (!isTauriRuntime) {
    throw new Error("密钥存储由 Tauri 后端提供，浏览器预览中不可用。");
  }
}

// The blob itself is opaque to the frontend: Rust encrypts it with DPAPI before
// touching the disk, so these three calls are the only way in or out.
export async function saveProvider(book: ProviderBook): Promise<void> {
  requireRuntime();
  await invoke("provider_save", { book });
}

export async function loadProvider(): Promise<ProviderBook | null> {
  if (!isTauriRuntime) return null;
  return invoke<ProviderBook | null>("provider_load");
}

export async function clearProvider(): Promise<void> {
  requireRuntime();
  await invoke("provider_clear");
}
