import { useEffect } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";
import type { ConversationState } from "@/features/lumi/conversationCore";

/**
 * Binds a conversation store to the current package and loads its history.
 *
 * The store is a module singleton so a stream survives a re-render, which means
 * it also survives a route change to another package. Binding on mount is what
 * makes the second half of that safe: the old transcript is dropped before the
 * new package's history is read (MLPS §1.2).
 */
export function useBoundConversation(
  store: UseBoundStore<StoreApi<ConversationState>>,
) {
  const workspaceId = useWorkspaceId();
  const bind = store((state) => state.bindWorkspace);
  const hydrate = store((state) => state.hydrate);
  const listLoaded = store((state) => state.listLoaded);
  const bound = store((state) => state.workspaceId);

  useEffect(() => {
    bind(workspaceId);
  }, [bind, workspaceId]);

  useEffect(() => {
    if (bound === workspaceId && !listLoaded) void hydrate();
  }, [bound, hydrate, listLoaded, workspaceId]);
}
