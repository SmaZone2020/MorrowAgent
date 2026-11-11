import { workspaceScope } from "@/features/uiState/scope";

/** Where one surface remembers the conversation it last had open. */
export function rememberedKey(scope: string, workspaceId: string): string {
  return workspaceScope(workspaceId, `${scope}.conversationId`);
}

/** Where a paused tool turn survives a reload. */
export function pendingKey(scope: string, workspaceId: string): string {
  return workspaceScope(workspaceId, `${scope}.pending`);
}

let counter = 0;

/** A turn id unique within this run; the persistence layer keys on it. */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}
