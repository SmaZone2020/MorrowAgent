import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | string;
  content: string;
  createdAt: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
}

// History is optional by design: the browser preview has no database, and a
// failed read should cost a reload, not the app.
export async function appendMessage(
  conversationId: string,
  message: { id: string; role: string; content: string },
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("chat_append", { conversationId, message });
}

export async function loadMessages(
  conversationId: string,
): Promise<StoredMessage[]> {
  if (!isTauriRuntime) return [];
  return invoke<StoredMessage[]>("chat_messages", { conversationId });
}

export async function loadConversations(
  limit = 50,
): Promise<ConversationSummary[]> {
  if (!isTauriRuntime) return [];
  return invoke<ConversationSummary[]>("chat_conversations", { limit });
}

export async function renameConversation(
  conversationId: string,
  title: string,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("chat_rename", { conversationId, title });
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("chat_delete", { conversationId });
}

/** Drops a conversation that never got a turn, so the list has no empty rows. */
export async function discardEmptyConversation(
  conversationId: string,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("chat_discard_empty", { conversationId });
}
