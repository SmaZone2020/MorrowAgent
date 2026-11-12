import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

export type Protocol = "openai-chat" | "openai-responses" | "anthropic";

/** One piece of a user turn. Text and images may share a single message. */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; mimeType: string; data: string };

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  /** A plain string for the common case, parts when the turn carries images. */
  content: string | ContentPart[];
  /** Set on an assistant turn that asked for tools. */
  toolCalls?: ToolCall[];
  /** Set on the `role: "tool"` turn that answers one call. */
  toolCallId?: string;
  /**
   * The chain of thought this assistant turn produced.
   *
   * DeepSeek requires it back on every later request that carries tools, or the
   * endpoint answers 400: the reasoning is part of the turn, not a display
   * detail. It is stored beside the answer and never shown in the bubble itself.
   */
  reasoningContent?: string;
}

/** DeepSeek's thinking switch, spelled once and sent per request. */
export interface ThinkingRequest {
  type: "enabled" | "disabled";
  effort?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string, exactly as the model streamed it. */
  arguments: string;
}

/** A tool the model may call. `parameters` is a JSON Schema object. */
export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
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

/** Plain text of a message body, with any images dropped. */
export function flattenContent(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((part): part is Extract<ContentPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

/** True when a body carries at least one image, which some models reject. */
export function hasImage(content: ChatMessage["content"]): boolean {
  return typeof content !== "string" && content.some((part) => part.type === "image");
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
