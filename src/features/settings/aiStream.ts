import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "@/app/shell/windowControls";
import type {
  ChatMessage,
  ProviderConfig,
  ThinkingRequest,
  ToolCall,
  ToolDef,
} from "@/features/settings/aiBridge";

interface DeltaEvent {
  requestId: string;
  delta?: string;
  /** The chain of thought, arriving on its own channel from the answer. */
  reasoning?: string;
  toolCalls?: ToolCall[];
  done: boolean;
  error?: string;
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDef[];
  /**
   * DeepSeek's thinking switch. Only sent when the caller knows the endpoint
   * understands it; other servers reject unknown fields.
   */
  thinking?: ThinkingRequest;
  /** Called with the full text so far, not just the newest fragment. */
  onProgress?: (text: string) => void;
  /** Called with the full reasoning so far, so it can be shown while it grows. */
  onReasoning?: (reasoning: string) => void;
  signal?: AbortSignal;
}

/** The finished reply: text, reasoning and, when the model asked, the tools. */
export interface StreamResult {
  text: string;
  /** The chain of thought, when the model produced one. */
  reasoning: string;
  toolCalls: ToolCall[];
}

function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Streams one completion through Rust. Resolves with the text and any tool
 * calls the model requested.
 *
 * The command returns as soon as the request is spawned, so the promise is
 * settled by the event channel rather than by the invoke result; anything the
 * stream reports after the caller aborts is ignored.
 */
export function streamChat(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: StreamOptions = {},
): Promise<StreamResult> {
  if (!isTauriRuntime) {
    return Promise.reject(new Error("模型请求需要桌面应用的后端转发。"));
  }

  const requestId = newRequestId();

  return new Promise<StreamResult>((resolve, reject) => {
    let text = "";
    let reasoning = "";
    let toolCalls: ToolCall[] = [];
    let settled = false;
    let unlisten: (() => void) | null = null;

    const cleanup = () => {
      settled = true;
      options.signal?.removeEventListener("abort", onAbort);
      unlisten?.();
    };

    const finish = (error?: string) => {
      if (settled) return;
      const failure = error ? new Error(error) : null;
      cleanup();
      if (failure) reject(failure);
      // A tool call often has no text yet; the reason still belongs to the turn,
      // because a later request has to echo it back.
      else resolve({ text, reasoning, toolCalls });
    };

    function onAbort() {
      // Rust keeps draining the response, but the caller stopped caring.
      if (settled) return;
      cleanup();
      resolve({ text, reasoning, toolCalls });
    }

    void listen<DeltaEvent>("ai://delta", (event) => {
      const payload = event.payload;
      if (payload.requestId !== requestId || settled) return;

      if (payload.reasoning) {
        reasoning += payload.reasoning;
        options.onReasoning?.(reasoning);
      }
      if (payload.delta) {
        text += payload.delta;
        options.onProgress?.(text);
      }
      if (payload.toolCalls) toolCalls = payload.toolCalls;
      if (payload.done) finish(payload.error);
    }).then((stop) => {
      // The stream can finish before the listener is registered on very short
      // replies, so a settled promise must not leave a stray subscription.
      if (settled) stop();
      else unlisten = stop;
    });

    options.signal?.addEventListener("abort", onAbort);

    invoke("ai_chat_stream", {
      config,
      request: {
        messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        tools: options.tools ?? [],
        thinking: options.thinking,
      },
      requestId,
    }).catch((error: unknown) => {
      finish(typeof error === "string" ? error : "模型请求失败");
    });
  });
}
