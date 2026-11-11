import {
  deleteConversation,
  loadConversations,
  loadMessages,
  renameConversation,
} from "@/features/lumi/history";
import { decodeTurn } from "@/features/lumi/conversationTurn";
import { clearRemembered, dropDraft } from "@/features/lumi/conversationHistoryOps";
import { rememberedKey } from "@/features/lumi/conversationKeys";
import type { ConversationRuntime } from "@/features/lumi/conversationRuntime";
import { writeScope } from "@/features/uiState/store";

/**
 * The history-list actions: which conversation is open and what the list says.
 *
 * They are grouped apart from sending because they never touch a request — a
 * user can rename a conversation mid-stream without disturbing it.
 */
export function createListActions(runtime: ConversationRuntime) {
  const { get, set, scope, stop } = runtime;

  return {
    refreshList: async () => {
      const workspaceId = get().workspaceId;
      if (!workspaceId) return;
      try {
        set({ list: await loadConversations(workspaceId), listLoaded: true });
      } catch {
        // Keep whatever list is on screen; a stale list beats an empty one.
      }
    },

    openConversation: async (conversationId: string) => {
      if (get().conversationId === conversationId) return;
      // A stream belongs to the conversation it was started from (D-069).
      stop();

      const workspaceId = get().workspaceId;
      set({
        conversationId,
        editingTurnId: null,
        pending: null,
        turns: (await loadMessages(conversationId).catch(() => [])).map(decodeTurn),
      });
      if (workspaceId) {
        writeScope(rememberedKey(scope, workspaceId), conversationId);
      }
    },

    startNew: async () => {
      stop();
      // The previous conversation may be an untouched draft; do not leave it in
      // the history list as an empty row.
      if (await dropDraft(get().conversationId, get().turns)) {
        void get().refreshList();
      }
      const workspaceId = get().workspaceId;
      set({
        conversationId: null,
        turns: [],
        editingTurnId: null,
        pending: null,
      });
      if (workspaceId) clearRemembered(scope, workspaceId);
    },

    rename: async (conversationId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      set((state) => ({
        list: state.list.map((entry) =>
          entry.id === conversationId ? { ...entry, title: trimmed } : entry,
        ),
      }));
      try {
        await renameConversation(conversationId, trimmed);
      } catch {
        // Put the stored title back rather than showing a name never saved.
        void get().refreshList();
      }
    },

    remove: async (conversationId: string) => {
      const wasOpen = get().conversationId === conversationId;
      if (wasOpen) stop();

      set((state) => ({
        list: state.list.filter((entry) => entry.id !== conversationId),
      }));

      try {
        await deleteConversation(conversationId);
      } catch {
        void get().refreshList();
        return;
      }

      if (!wasOpen) return;
      // Land on the next most recent conversation instead of a blank page.
      const next = get().list[0];
      if (next) await get().openConversation(next.id);
      else {
        const workspaceId = get().workspaceId;
        set({
          conversationId: null,
          turns: [],
          editingTurnId: null,
          pending: null,
        });
        if (workspaceId) {
          writeScope(rememberedKey(scope, workspaceId), null);
        }
      }
    },
  };
}
