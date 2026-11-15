import type { ConversationState } from "@/features/lumi/conversationCore";
import type { ToolCall } from "@/features/settings/aiBridge";
import type { ConversationTurn } from "@/features/lumi/conversationTurn";

/**
 * What the action groups need from the store that owns them.
 *
 * The groups are plain functions rather than hooks so they can be tested and
 * read on their own; this is the whole surface they are allowed to touch.
 */
export interface ConversationRuntime {
  get: () => ConversationState;
  set: (
    patch:
      | Partial<ConversationState>
      | ((state: ConversationState) => Partial<ConversationState>),
  ) => void;
  /** Remembered-conversation scope, e.g. `lumi`. */
  scope: string;
  /** Generated conversation id prefix, e.g. `conv`. */
  idPrefix: string;
  /** Writes one finished turn to the transcript table. */
  persist: (
    workspaceId: string,
    conversationId: string,
    turn: ConversationTurn,
  ) => void;
  /** Runs the request loop for one assistant turn. */
  request: (turn: ConversationTurn, depth: number) => Promise<void>;
  /** Runs one tool call, for a surface that answers its own tools. */
  runTool?: (call: ToolCall) => Promise<string>;
  /** Aborts the in-flight request, if any. */
  stop: () => void;
}
