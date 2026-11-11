import type { ChatMessage, ContentPart, ToolCall } from "@/features/settings/aiBridge";
import type { MessageAttachment, StoredMessage } from "@/features/lumi/history";

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
  /** Files the user attached; only a user turn ever carries them. */
  attachments?: MessageAttachment[];
  /** Something the client did to the request, said in the bubble. */
  note?: string;
}

/**
 * Structured turns are not prose, so the transcript stores them as JSON behind
 * a marker. A plain turn is written verbatim, which keeps every existing row and
 * every grep over the database readable.
 */
const MARK = "\u0000morrow";

interface StoredTurn {
  text: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  attachments?: MessageAttachment[];
  note?: string;
}

function isStructured(turn: ConversationTurn): boolean {
  return Boolean(
    turn.toolCalls?.length ||
      turn.toolCallId ||
      turn.attachments?.length ||
      turn.note,
  );
}

/** The string to persist for one turn. */
export function encodeTurn(turn: ConversationTurn): string {
  if (!isStructured(turn)) return turn.content;
  const payload: StoredTurn = {
    text: turn.content,
    toolCalls: turn.toolCalls,
    toolCallId: turn.toolCallId,
    attachments: turn.attachments,
    note: turn.note,
  };
  return `${MARK}${JSON.stringify(payload)}`;
}

/** A turn worth writing: a tool turn or an upload carries structure. */
export function shouldPersist(turn: ConversationTurn): boolean {
  if (turn.error) return false;
  return (
    Boolean(turn.content) ||
    Boolean(turn.toolCalls?.length) ||
    Boolean(turn.attachments?.length) ||
    Boolean(turn.note)
  );
}

export function decodeTurn(row: StoredMessage): ConversationTurn {
  const base: ConversationTurn = {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
  };
  if (!row.content.startsWith(MARK)) {
    // Rows written before attachments existed still have the column, and an
    // older row's attachments are the only thing the marker never held.
    const attachments = row.attachments ?? [];
    return attachments.length > 0 ? { ...base, attachments } : base;
  }

  try {
    const payload = JSON.parse(row.content.slice(MARK.length)) as StoredTurn;
    return {
      ...base,
      content: payload.text ?? "",
      toolCalls: payload.toolCalls,
      toolCallId: payload.toolCallId,
      attachments: payload.attachments,
      note: payload.note,
    };
  } catch {
    // A damaged marker is not worth losing the turn over; show it as text.
    return base;
  }
}

/**
 * The text a document contributes to a request.
 *
 * The filename goes in front so the model can say "在 notes.md 里" instead of
 * quoting an anonymous blob, and the body is fenced so it does not get confused
 * with the user's own words.
 */
function documentBlock(attachment: MessageAttachment): string {
  return [
    `<document name="${attachment.name}">`,
    attachment.text,
    "</document>",
  ].join("\n");
}

/**
 * One turn as a wire message.
 *
 * Images become parts so a vision model sees them; documents are inlined as
 * text because every model can read text and only some can read a PDF. A turn
 * with neither stays a plain string, which is what older providers expect.
 */
export function turnContent(turn: ConversationTurn): ChatMessage["content"] {
  const attachments = turn.attachments ?? [];
  if (attachments.length === 0) return turn.content;

  const documents = attachments
    .filter((attachment) => attachment.kind === "document")
    .map(documentBlock);
  const text = [turn.content, ...documents].filter(Boolean).join("\n\n");

  const images = attachments.filter((attachment) => attachment.kind === "image");
  if (images.length === 0) return text;

  // Some providers reject a part list whose text block is empty, and a turn
  // that is only a screenshot has no words of its own.
  const parts: ContentPart[] = [{ type: "text", text: text || "（见附图）" }];
  for (const image of images) {
    parts.push({ type: "image", mimeType: image.mimeType, data: image.data });
  }
  return parts;
}

/** True when a turn would send images, which a text-only model rejects. */
export function turnHasImage(turn: ConversationTurn): boolean {
  return (turn.attachments ?? []).some(
    (attachment) => attachment.kind === "image" && Boolean(attachment.data),
  );
}

/**
 * Turns the transcript into the message list the model sees.
 *
 * A tool call without a matching result is a protocol error at every provider.
 * That happens when the user ignores a quiz and types something else instead,
 * so the call is flattened back into plain text and the history stays valid.
 */
export function toHistory(
  turns: ConversationTurn[],
  skipId: string,
  options: { dropImages?: boolean } = {},
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const content = (turn: ConversationTurn) => {
    if (!options.dropImages) return turnContent(turn);
    // The retry after a 400 sends the same turn without its pictures: the text
    // and the extracted documents still describe the question.
    const withoutImages = (turn.attachments ?? []).filter(
      (attachment) => attachment.kind !== "image",
    );
    return turnContent({ ...turn, attachments: withoutImages });
  };

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

    const body = content(turn);
    if (typeof body === "string" && !body) continue;
    messages.push({ role: turn.role, content: body });
  }

  return messages;
}
