import {
  discardEmptyConversation,
  loadConversations,
  loadMessages,
  truncateFrom,
  type ConversationSummary,
} from "@/features/lumi/history";
import { decodeTurn, type ConversationTurn } from "@/features/lumi/conversationTurn";
import { pendingKey, rememberedKey } from "@/features/lumi/conversationKeys";
import type { PendingQuiz } from "@/features/lumi/conversationCore";
import { readScope, writeScope } from "@/features/uiState/store";

/**
 * The transcript side of the store: which conversation is open, what it says,
 * and the remembered pointer that reopens it on the next launch.
 *
 * It is separated from the request machinery because a conversation is read far
 * more often than it is written to; keeping the two apart leaves the store's
 * own methods readable.
 */
export interface ConversationHistory {
  list: ConversationSummary[];
  listLoaded: boolean;
  conversationId: string | null;
  turns: ConversationTurn[];
  pending: PendingQuiz | null;
}

export interface HistoryPatch extends Partial<ConversationHistory> {}

/**
 * Reads the remembered conversation, or the newest one.
 *
 * A remembered id can point at a conversation deleted on another launch, so a
 * miss falls back to the newest row rather than an empty page; the pointer is
 * rewritten so the fallback is not repeated every launch.
 */
export async function readHydrated(
  scope: string,
  workspaceId: string,
): Promise<HistoryPatch> {
  const list = await loadConversations(workspaceId);
  const remembered = readScope<string | null>(rememberedKey(scope, workspaceId), null);
  const target = list.find((entry) => entry.id === remembered) ?? list[0] ?? null;

  if (!target) {
    if (remembered !== null) writeScope(rememberedKey(scope, workspaceId), null);
    return { list, listLoaded: true };
  }

  const rows = await loadMessages(target.id);
  const parked = readScope<PendingQuiz | null>(pendingKey(scope, workspaceId), null);
  writeScope(rememberedKey(scope, workspaceId), target.id);

  return {
    conversationId: target.id,
    list,
    listLoaded: true,
    turns: rows.map(decodeTurn),
    // A quiz answered on another launch left a stale row; it is only honoured
    // while its call is still in this transcript.
    pending: parked && rows.some((row) => row.id === parked.turnId) ? parked : null,
  };
}

/** Drops an untouched draft so it does not linger as an empty history row. */
export async function dropDraft(
  conversationId: string | null,
  turns: ConversationTurn[],
): Promise<boolean> {
  if (!conversationId) return false;
  if (turns.some((turn) => turn.role === "user")) return false;
  await discardEmptyConversation(conversationId).catch(() => undefined);
  return true;
}

/** Truncates a transcript at the turn the user is rewriting. */
export async function prepareEdit(
  conversationId: string,
  editingTurnId: string | null,
  turns: ConversationTurn[],
): Promise<ConversationTurn[]> {
  if (!editingTurnId) return turns;
  const index = turns.findIndex((turn) => turn.id === editingTurnId);
  await truncateFrom(conversationId, editingTurnId).catch(() => undefined);
  return index === -1 ? [] : turns.slice(0, index);
}

export async function clearRemembered(scope: string, workspaceId: string) {
  writeScope(rememberedKey(scope, workspaceId), null);
  writeScope(pendingKey(scope, workspaceId), null);
}
