import {
  deleteMessage,
  discardEmptyConversation,
} from "@/features/lumi/history";
import type { ConversationTurn } from "@/features/lumi/conversationTurn";
import { prepareEdit } from "@/features/lumi/conversationHistoryOps";
import { nextId, pendingKey, rememberedKey } from "@/features/lumi/conversationKeys";
import type { ConversationRuntime } from "@/features/lumi/conversationRuntime";
import { writeScope } from "@/features/uiState/store";

/**
 * The send-side actions: a user message, a quiz answer, a retry, a deletion.
 *
 * Every one of them ends by entering the request loop, which is why they share
 * this file: they all have to build a well-formed last turn before sending.
 */
export function createTurnActions(runtime: ConversationRuntime) {
  const { get, set, scope, idPrefix, persist, request, stop } = runtime;

  return {
    send: async (message: string) => {
      const text = message.trim();
      const workspaceId = get().workspaceId;
      if (!text || get().sending || !workspaceId) return;
      // A parked quiz owns the turn: sending a chat message instead would
      // leave a tool call with no result, which every provider rejects.
      if (get().pending) return;

      const conversationId = get().conversationId ?? nextId(idPrefix);
      const editingTurnId = get().editingTurnId;

      // An edit rewrites the question, so the old answer and everything the
      // user said after it describe a prompt that no longer exists. They go
      // first, both on screen and on disk.
      const base = await prepareEdit(conversationId, editingTurnId, get().turns);

      const userTurn: ConversationTurn = {
        id: nextId("turn"),
        role: "user",
        content: text,
      };
      const replyTurn: ConversationTurn = {
        id: nextId("turn"),
        role: "assistant",
        content: "",
        pending: true,
      };

      set({
        conversationId,
        editingTurnId: null,
        turns: [...base, userTurn, replyTurn],
        sending: true,
      });
      writeScope(rememberedKey(scope, workspaceId), conversationId);
      persist(workspaceId, conversationId, userTurn);
      // The first user turn becomes the title, so the list has to catch up.
      void get().refreshList();

      await request(replyTurn, 0);
    },

    answerQuiz: async (callId: string, output: string) => {
      const pending = get().pending;
      const workspaceId = get().workspaceId;
      const conversationId = get().conversationId;
      if (!pending || !workspaceId || !conversationId) return;

      const results = { ...pending.results, [callId]: output };
      const waiting = pending.calls.filter(
        (call) =>
          call.name === "ask_questions" && results[call.id] === undefined,
      );

      // More sets in the same turn: keep the pause alive with the answer
      // banked, so the next submission completes the turn instead.
      if (waiting.length > 0) {
        const next = { ...pending, results };
        set({ pending: next });
        writeScope(pendingKey(scope, workspaceId), next);
        return;
      }

      const toolTurns: ConversationTurn[] = pending.calls.map((call) => ({
        id: nextId("turn"),
        role: "assistant",
        content: results[call.id] ?? "",
        toolCallId: call.id,
      }));

      set({ pending: null, sending: true });
      writeScope(pendingKey(scope, workspaceId), null);
      for (const turn of toolTurns) persist(workspaceId, conversationId, turn);

      const nextReply: ConversationTurn = {
        id: nextId("turn"),
        role: "assistant",
        content: "",
        pending: true,
      };
      set((state) => ({ turns: [...state.turns, ...toolTurns, nextReply] }));
      await request(nextReply, 0);
    },

    dismissQuiz: () => {
      const workspaceId = get().workspaceId;
      set({ pending: null, sending: false });
      if (workspaceId) writeScope(pendingKey(scope, workspaceId), null);
    },

    regenerate: async () => {
      if (get().sending) return;
      const conversationId = get().conversationId;
      if (!conversationId) return;
      if (get().pending) return;

      // Trim back to the last user message: everything after it was a failed
      // or rejected attempt at the same answer.
      const trimmed = [...get().turns];
      while (trimmed.length && trimmed[trimmed.length - 1]?.role === "assistant") {
        trimmed.pop();
      }
      if (!trimmed.length) return;

      const replyTurn: ConversationTurn = {
        id: nextId("turn"),
        role: "assistant",
        content: "",
        pending: true,
      };

      set({ turns: [...trimmed, replyTurn], sending: true });
      await request(replyTurn, 0);
    },

    deleteTurn: (turnId: string) => {
      const conversationId = get().conversationId;
      if (!conversationId) return;

      const target = get().turns.find((turn) => turn.id === turnId);
      if (!target) return;

      // Dropping the reply that is still arriving would leave a requesting
      // turn with nothing to write into, so stop it first.
      if (target.pending) stop();

      // A parked turn owns the whole group of calls; deleting any part of it
      // leaves results that can never be sent, so the pause goes with it.
      if (get().pending?.turnId === turnId) get().dismissQuiz();

      const remaining = get().turns.filter((turn) => turn.id !== turnId);
      const wasEditing = get().editingTurnId === turnId;

      if (remaining.length === 0) {
        // An empty transcript is just an empty row in the history list.
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
        void discardEmptyConversation(conversationId).catch(() => undefined);
        void get().refreshList();
        return;
      }

      set({
        turns: remaining,
        editingTurnId: wasEditing ? null : get().editingTurnId,
      });

      void deleteMessage(turnId).catch(() => undefined);
      // Deleting the first question changes the derived title.
      void get().refreshList();
    },
  };
}
