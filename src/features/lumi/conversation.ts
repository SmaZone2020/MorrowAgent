import { create } from "zustand";
import { activeProvider } from "@/features/settings/providerStatus";
import { usePreferences } from "@/features/settings/preferencesStore";
import { streamChat } from "@/features/settings/aiStream";
import type { ChatMessage } from "@/features/settings/aiBridge";
import {
  appendMessage,
  deleteConversation,
  discardEmptyConversation,
  loadConversations,
  loadMessages,
  renameConversation,
  type ConversationSummary,
} from "@/features/lumi/history";
import { readScope, writeScope } from "@/features/uiState/store";
import { SYSTEM_PROMPT } from "@/features/lumi/prompt";

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Set when the request for this turn failed. */
  error?: string;
  pending?: boolean;
}

interface ConversationState {
  /** Current conversation id; null means the draft the user has not sent yet. */
  conversationId: string | null;
  turns: ConversationTurn[];
  sending: boolean;
  /** History list, newest first. */
  list: ConversationSummary[];
  listLoaded: boolean;
  /** Pull the conversation the user last had open, else the newest one. */
  hydrate: () => Promise<void>;
  refreshList: () => Promise<void>;
  openConversation: (conversationId: string) => Promise<void>;
  startNew: () => Promise<void>;
  rename: (conversationId: string, title: string) => Promise<void>;
  remove: (conversationId: string) => Promise<void>;
  send: (message: string) => Promise<void>;
  /** Ask again for the last user message, dropping the answers after it. */
  regenerate: () => Promise<void>;
  stop: () => void;
}

/** Where the last opened conversation is remembered (D-068). */
const LAST_CONVERSATION = "lumi.conversationId";

let counter = 0;
const nextId = (prefix: string) =>
  `${prefix}-${Date.now()}-${(counter += 1)}`;

let controller: AbortController | null = null;
// Identifies the request that currently owns `sending`. Stopping and sending
// again in the same conversation leaves the old promise alive for a moment, and
// its cleanup must not clear the flag for the request that replaced it.
let activeRequest = 0;
// The first hydrate is kicked off from an effect, which React runs twice in
// development; sharing the promise keeps that from loading the history twice.
let hydrating: Promise<void> | null = null;

function toHistory(turns: ConversationTurn[], skipId: string): ChatMessage[] {
  return turns
    .filter((turn) => !turn.error && turn.id !== skipId && turn.content)
    .map((turn) => ({
      role: turn.role === "user" ? ("user" as const) : ("assistant" as const),
      content: turn.content,
    }));
}

// Persisting is fire-and-forget: a local write must never block the stream, and
// a failed write is not worth interrupting a reply over.
function persist(conversationId: string, turn: ConversationTurn) {
  if (turn.error || !turn.content) return;
  void appendMessage(conversationId, {
    id: turn.id,
    role: turn.role,
    content: turn.content,
  }).catch(() => undefined);
}

function rememberConversation(conversationId: string | null) {
  writeScope(LAST_CONVERSATION, conversationId);
}

export const useConversation = create<ConversationState>((set, get) => {
  /** Streams one reply into an already-inserted pending turn. */
  const requestReply = async (
    conversationId: string,
    replyTurn: ConversationTurn,
  ) => {
    const patchReply = (patch: Partial<ConversationTurn>) =>
      set((state) => ({
        turns: state.turns.map((turn) =>
          turn.id === replyTurn.id ? { ...turn, ...patch } : turn,
        ),
      }));

    const config = activeProvider();
    if (!config) {
      set({ sending: false });
      patchReply({ pending: false, error: "还没有配置 Provider" });
      return;
    }

    const history: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...toHistory(get().turns, replyTurn.id),
    ];

    controller = new AbortController();
    const requestId = (activeRequest += 1);

    try {
      const answer = await streamChat(config, history, {
        signal: controller.signal,
        maxTokens: usePreferences.getState().maxTokens,
        temperature: usePreferences.getState().temperature,
        onProgress: (partial) => {
          // Switching conversations aborts the request, but a delta already in
          // flight must not land in the conversation that is now on screen.
          if (get().conversationId !== conversationId) return;
          patchReply({ content: partial });
        },
      });
      if (get().conversationId !== conversationId) return;

      const final = answer || "（已停止）";
      patchReply({ pending: false, content: final });
      if (answer) {
        persist(conversationId, { ...replyTurn, content: answer });
        void get().refreshList();
      }
    } catch (error) {
      if (get().conversationId !== conversationId) return;
      patchReply({
        pending: false,
        error: error instanceof Error ? error.message : "请求失败",
      });
    } finally {
      // A newer request may already own the flag; only the latest one clears it.
      if (requestId === activeRequest) {
        controller = null;
        set({ sending: false });
      }
    }
  };

  return {
    conversationId: null,
    turns: [],
    sending: false,
    list: [],
    listLoaded: false,

    hydrate: async () => {
      if (hydrating) return hydrating;
      hydrating = (async () => {
        try {
          const list = await loadConversations();
          const remembered = readScope<string | null>(LAST_CONVERSATION, null);
          // A remembered id can point at a conversation the user deleted on
          // another launch, so fall back to the newest one instead of an empty page.
          const target =
            list.find((entry) => entry.id === remembered) ?? list[0] ?? null;

          if (!target) {
            set({ list, listLoaded: true });
            // The remembered id pointed at nothing; drop it so the fallback is not
            // repeated on every launch.
            if (remembered !== null) rememberConversation(null);
            return;
          }

          const stored = await loadMessages(target.id);
          set({
            conversationId: target.id,
            list,
            listLoaded: true,
            turns: stored.map((message) => ({
              id: message.id,
              role: message.role === "user" ? "user" : "assistant",
              content: message.content,
            })),
          });
          // Keep the pointer honest so the next launch does not repeat the fallback.
          rememberConversation(target.id);
        } catch {
          // No database (browser preview) or a broken file: start empty.
          set({ listLoaded: true });
        } finally {
          hydrating = null;
        }
      })();
      return hydrating;
    },

    refreshList: async () => {
      try {
        set({ list: await loadConversations(), listLoaded: true });
      } catch {
        // Keep whatever list is on screen; a stale list beats an empty one.
      }
    },

    openConversation: async (conversationId) => {
      if (get().conversationId === conversationId) return;
      // A stream belongs to the conversation it was started from (D-069).
      get().stop();

      const stored = await loadMessages(conversationId).catch(() => []);
      set({
        conversationId,
        turns: stored.map((message) => ({
          id: message.id,
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        })),
      });
      rememberConversation(conversationId);
    },

    startNew: async () => {
      get().stop();
      // The previous conversation may be an untouched draft; do not leave it in
      // the history list as an empty row.
      const previous = get().conversationId;
      if (previous && !get().turns.some((turn) => turn.role === "user")) {
        await discardEmptyConversation(previous).catch(() => undefined);
        void get().refreshList();
      }
      set({ conversationId: null, turns: [] });
      rememberConversation(null);
    },

    rename: async (conversationId, title) => {
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
        // Put the stored title back rather than showing a name that was never saved.
        void get().refreshList();
      }
    },

    remove: async (conversationId) => {
      const wasOpen = get().conversationId === conversationId;
      if (wasOpen) get().stop();

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
        set({ conversationId: null, turns: [] });
        rememberConversation(null);
      }
    },

    send: async (message) => {
      const text = message.trim();
      if (!text || get().sending) return;

      const conversationId = get().conversationId ?? nextId("conv");
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

      set((state) => ({
        conversationId,
        turns: [...state.turns, userTurn, replyTurn],
        sending: true,
      }));
      rememberConversation(conversationId);
      persist(conversationId, userTurn);
      // The first user turn becomes the title, so the list has to catch up.
      void get().refreshList();

      await requestReply(conversationId, replyTurn);
    },

    regenerate: async () => {
      if (get().sending) return;
      const conversationId = get().conversationId;
      if (!conversationId) return;

      // Trim back to the last user message: everything after it was a failed or
      // rejected attempt at the same answer.
      const trimmed = [...get().turns];
      while (
        trimmed.length &&
        trimmed[trimmed.length - 1]?.role === "assistant"
      ) {
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
      await requestReply(conversationId, replyTurn);
    },

    stop: () => {
      controller?.abort();
      controller = null;
      set({ sending: false });
    },
  };
});
