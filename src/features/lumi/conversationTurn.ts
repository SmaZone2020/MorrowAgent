import type { ChatMessage, ToolCall } from "@/features/settings/aiBridge";
import type { StoredMessage } from "@/features/lumi/history";

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Set when the request for this turn failed. */
  error?: string;
  pending?: boolean;
  /** Present when the assistant asked for tools on this turn. */
  toolCalls?: ToolCall[];
  /** Present on the `role: "tool"` turn that answers one call. */
  toolCallId?: string;
}

/**
 * Tool turns are not prose, so the transcript stores them as JSON behind a
 * marker. A plain turn is written verbatim, which keeps every existing row and
 * every grep over the database readable.
 */
const MARK = "\u0000morrow";

interface StoredToolTurn {
  text: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/** The string to persist for one turn. */
export function encodeTurn(turn: ConversationTurn): string {
  if (!turn.toolCalls?.length && !turn.toolCallId) return turn.content;
  const payload: StoredToolTurn = {
    text: turn.content,
    toolCalls: turn.toolCalls,
    toolCallId: turn.toolCallId,
  };
  return `${MARK}${JSON.stringify(payload)}`;
}

/** A turn worth writing: a tool turn carries structure even with no text. */
export function shouldPersist(turn: ConversationTurn): boolean {
  if (turn.error) return false;
  return Boolean(turn.content) || Boolean(turn.toolCalls?.length);
}

export function decodeTurn(row: StoredMessage): ConversationTurn {
  const base: ConversationTurn = {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
  };
  if (!row.content.startsWith(MARK)) return base;

  try {
    const payload = JSON.parse(row.content.slice(MARK.length)) as StoredToolTurn;
    return {
      ...base,
      content: payload.text ?? "",
      toolCalls: payload.toolCalls,
      toolCallId: payload.toolCallId,
    };
  } catch {
    // A damaged marker is not worth losing the turn over; show it as text.
    return base;
  }
}

/**
 * Turns the transcript into the message list the model sees.
 *
 * A tool call without a matching result is a protocol error at every provider.
 * That happens when the user ignores a quiz and types something else instead,
 * so the call is flattened back into plain text and the history stays valid.
 */
export function toHistory(turns: ConversationTurn[], skipId: string): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (let index = 0; index < turns.length; index += 1) {
    const turn = turns[index]!;
    if (turn.error || turn.id === skipId) continue;

    if (turn.toolCallId) {
      messages.push({
        role: "tool",
        content: turn.content,
        toolCallId: turn.toolCallId,
      });
      continue;
    }

    if (turn.toolCalls?.length) {
      // Every call must have a result: a partially answered assistant turn is a
      // protocol error, so one missing result degrades the whole turn to text.
      const answered = new Set(
        turns
          .slice(index + 1)
          .map((next) => next.toolCallId)
          .filter((id): id is string => Boolean(id)),
      );
      if (turn.toolCalls.every((call) => answered.has(call.id))) {
        messages.push({
          role: "assistant",
          content: turn.content,
          toolCalls: turn.toolCalls,
        });
      } else if (turn.content) {
        messages.push({ role: "assistant", content: turn.content });
      }
      continue;
    }

    if (!turn.content) continue;
    messages.push({ role: turn.role, content: turn.content });
  }

  return messages;
}
