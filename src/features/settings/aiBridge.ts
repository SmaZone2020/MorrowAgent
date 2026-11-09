import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { readDebugProvider } from "@/features/settings/debugProvider";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatReply {
  content: string;
  model: string;
  finishReason?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface ModelInfo {
  id: string;
  displayName?: string;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class AiBridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiBridgeError";
  }
}

// Model traffic goes through Rust, not `fetch`: the debug endpoint rejects
// browser preflight with 403, and keeping the key out of the webview is the
// right shape anyway.
async function invokeAi<T>(
  command: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntime) {
    throw new AiBridgeError(
      "模型请求由 Tauri 后端转发；浏览器预览里无法调用，请用 pnpm tauri:dev。",
    );
  }
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new AiBridgeError(
      typeof error === "string" ? error : "模型请求失败",
    );
  }
}

export async function listModels(
  config: ProviderConfig,
): Promise<ModelInfo[]> {
  return invokeAi<ModelInfo[]>("ai_list_models", { config });
}

export async function sendChat(
  config: ProviderConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<ChatReply> {
  return invokeAi<ChatReply>("ai_chat", {
    config,
    request: {
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    },
  });
}

/**
 * Build a config from the local debug environment. UI code should call this
 * instead of reading env vars, so the swap to the encrypted store is one edit.
 */
export function debugProviderConfig(): ProviderConfig | null {
  const debug = readDebugProvider();
  if (!debug) return null;
  return {
    baseUrl: debug.baseUrl,
    apiKey: debug.apiKey,
    model: debug.model,
  };
}
