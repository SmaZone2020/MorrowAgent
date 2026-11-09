import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

export type Protocol = "openai-chat" | "openai-responses" | "anthropic";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelInfo {
  id: string;
  displayName?: string;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  protocol: Protocol;
}

export class AiBridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiBridgeError";
  }
}

export function requireTauri(): void {
  if (!isTauriRuntime) {
    throw new AiBridgeError(
      "模型请求由 Tauri 后端转发；浏览器预览里无法调用，请用 pnpm tauri:dev。",
    );
  }
}

// Model traffic goes through Rust, not `fetch`: the debug endpoint rejects
// browser preflight with 403, and keeping the key out of the webview is the
// right shape anyway.
export async function listModels(
  config: ProviderConfig,
): Promise<ModelInfo[]> {
  requireTauri();
  try {
    return await invoke<ModelInfo[]>("ai_list_models", { config });
  } catch (error) {
    throw new AiBridgeError(
      typeof error === "string" ? error : "模型列表请求失败",
    );
  }
}
