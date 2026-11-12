import type { ConversationTurn } from "@/features/lumi/conversationTurn";

/**
 * One message in the transcript.
 *
 * A single answer is not one row: the model may ask for a tool, read the
 * result, and only then write the reply. The user reads that as one message,
 * so copy, delete and retry act on the group — deleting half a tool round
 * would leave a call with no result, which every provider rejects.
 */
export interface MessageGroup {
  /** The first turn of the group; where a truncate or a retry starts. */
  anchorId: string;
  role: "user" | "assistant";
  turns: ConversationTurn[];
  /** What the speaker actually wrote, ready for the clipboard. */
  text: string;
  /** Something in this group is still arriving. */
  pending: boolean;
}

/** Everything said in a group, leaving out tool output and failures. */
function groupText(turns: ConversationTurn[]): string {
  return turns
    .filter((turn) => !turn.toolCallId && !turn.error)
    .map((turn) => turn.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Folds the flat transcript into messages.
 *
 * Consecutive assistant rows are one message: the tool results and the reply
 * that follows them belong to the turn that asked for them. User rows always
 * stand alone.
 */
export function groupTurns(turns: ConversationTurn[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const turn of turns) {
    const last = groups[groups.length - 1];
    if (last && last.role === "assistant" && turn.role === "assistant") {
      last.turns.push(turn);
      last.pending ||= Boolean(turn.pending);
      continue;
    }
    groups.push({
      anchorId: turn.id,
      role: turn.role,
      turns: [turn],
      text: "",
      pending: Boolean(turn.pending),
    });
  }

  for (const group of groups) group.text = groupText(group.turns);
  return groups;
}

/**
 * The turn ids a delete from one message has to remove.
 *
 * Deleting a question without its answer would leave a reply to something the
 * reader can no longer see, so a user message takes the answer after it. An
 * assistant message stands alone: removing it is how a retry gets rid of a
 * reply that went wrong.
 */
export function deletionScope(
  turns: ConversationTurn[],
  group: MessageGroup,
): string[] {
  const ids = group.turns.map((turn) => turn.id);
  if (group.role !== "user") return ids;

  const start = turns.findIndex((turn) => turn.id === group.anchorId);
  if (start === -1) return ids;
  for (let index = start + group.turns.length; index < turns.length; index += 1) {
    const turn = turns[index]!;
    if (turn.role === "user") break;
    ids.push(turn.id);
  }
  return ids;
}

/**
 * Tool names by call id.
 *
 * A result row only carries `toolCallId`; the name lives on the turn that
 * asked for the call, which may sit several rows above it.
 */
export function callNames(turns: ConversationTurn[]): Record<string, string> {
  const names: Record<string, string> = {};
  for (const turn of turns) {
    for (const call of turn.toolCalls ?? []) names[call.id] = call.name;
  }
  return names;
}
