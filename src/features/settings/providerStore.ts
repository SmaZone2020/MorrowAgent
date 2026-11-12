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
  /**
   * Whether the active model accepts images. Absent means yes, which is what a
   * profile saved before this flag existed expects.
   */
  supportsVision?: boolean;
  /**
   * True for the provider the app ships with. A builtin cannot be removed,
   * renamed or repointed: only its key, its models and the chosen model are
   * the user's to change.
   */
  builtin?: boolean;
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
    throw new Error("密钥存储需要桌面应用。");
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
