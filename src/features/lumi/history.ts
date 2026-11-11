import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

/** One file attached to a turn: image bytes, or text pulled from a document. */
export interface MessageAttachment {
  id: string;
  kind: "image" | "document";
  name: string;
  mimeType: string;
  size: number;
  /** Base64 without the `data:` prefix; empty for documents. */
  data: string;
  /** Extracted text; empty for images. */
  text: string;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | string;
  content: string;
  createdAt: number;
  attachments: MessageAttachment[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
}

// History is optional by design: the browser preview has no database, and a
// failed read should cost a reload, not the app. Every call is scoped to one
// workspace, because two packages must not share a transcript (MLPS §1.2).
export async function appendMessage(
  workspaceId: string,
  conversationId: string,
  message: {
    id: string;
    role: string;
    content: string;
    attachments?: MessageAttachment[];
  },
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("chat_append", {
    workspaceId,
    conversationId,
    message: { ...message, attachments: message.attachments ?? [] },
  });
}

export async function loadMessages(
  conversationId: string,
): Promise<StoredMessage[]> {
  if (!isTauriRuntime) return [];
  return invoke<StoredMessage[]>("chat_messages", { conversationId });
}

export async function loadConversations(
  workspaceId: string,
  limit = 50,
): Promise<ConversationSummary[]> {
  if (!isTauriRuntime) return [];
  return invoke<ConversationSummary[]>("chat_conversations", {
    workspaceId,
    limit,
  });
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

/** Removes one turn, leaving its neighbours in place. */
export async function deleteMessage(messageId: string): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("chat_delete_message", { messageId });
}

/** Removes one turn and everything after it, for an edit that rewrites a prompt. */
export async function truncateFrom(
  conversationId: string,
  messageId: string,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("chat_truncate", { conversationId, messageId });
}
