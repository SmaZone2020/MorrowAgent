import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "@/app/shell/windowControls";
import type {
  ChatMessage,
  ProviderConfig,
  ToolCall,
  ToolDef,
} from "@/features/settings/aiBridge";

interface DeltaEvent {
  requestId: string;
  delta?: string;
  toolCalls?: ToolCall[];
  done: boolean;
  error?: string;
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDef[];
  /** Called with the full text so far, not just the newest fragment. */
  onProgress?: (text: string) => void;
  signal?: AbortSignal;
}

/** The finished reply: text and, when the model asked, the tools to run. */
export interface StreamResult {
  text: string;
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
    return Promise.reject(
      new Error("模型请求由 Tauri 后端转发；浏览器预览里无法调用，请用 pnpm tauri:dev。"),
    );
  }

  const requestId = newRequestId();

  return new Promise<StreamResult>((resolve, reject) => {
    let text = "";
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
      else resolve({ text, toolCalls });
    };

    function onAbort() {
      // Rust keeps draining the response, but the caller stopped caring.
      if (settled) return;
      cleanup();
      resolve({ text, toolCalls });
    }

    void listen<DeltaEvent>("ai://delta", (event) => {
      const payload = event.payload;
      if (payload.requestId !== requestId || settled) return;

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
      },
      requestId,
    }).catch((error: unknown) => {
      finish(typeof error === "string" ? error : "模型请求失败");
    });
  });
}
