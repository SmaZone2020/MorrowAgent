import { create } from "zustand";
import { activeProvider } from "@/features/settings/providerStatus";
import { usePreferences } from "@/features/settings/preferencesStore";
import { streamChat } from "@/features/settings/aiStream";
import type { ChatMessage } from "@/features/settings/aiBridge";
import {
  appendMessage,
  deleteConversation,
  deleteMessage,
  discardEmptyConversation,
  loadConversations,
  loadMessages,
  renameConversation,
  truncateFrom,
  type ConversationSummary,
} from "@/features/lumi/history";
import { readScope, writeScope } from "@/features/uiState/store";
import { workspaceScope } from "@/features/uiState/scope";

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Set when the request for this turn failed. */
  error?: string;
  pending?: boolean;
}

export interface ConversationState {
  /** The package this transcript belongs to; null until the page binds one. */
  workspaceId: string | null;
  /** Current conversation id; null means the draft the user has not sent yet. */
  conversationId: string | null;
  turns: ConversationTurn[];
  sending: boolean;
  /** History list, newest first. */
  list: ConversationSummary[];
  listLoaded: boolean;
  /** Points the store at one package, discarding the previous one's screen state. */
  bindWorkspace: (workspaceId: string) => void;
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
  /** Removes a single turn; the rest of the transcript stays. */
  deleteTurn: (turnId: string) => void;
  /** Marks a user turn for rewriting. The next send replaces it and everything after. */
  beginEdit: (turnId: string) => void;
  cancelEdit: () => void;
  /** The user turn whose text is currently in the composer. */
  editingTurnId: string | null;
  stop: () => void;
}

export interface ConversationStoreOptions {
  /** Prefix for the remembered conversation id, one per surface. */
  scope: string;
  /** Opening instruction sent with every request. */
  systemPrompt: string;
  /**
   * Prefix for generated conversation ids. The history table is shared, so the
   * prefix is what keeps the drill's transcripts out of the Lumi page's list.
   */
  idPrefix?: string;
}

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${(counter += 1)}`;

function toHistory(turns: ConversationTurn[], skipId: string): ChatMessage[] {
  return turns
    .filter((turn) => !turn.error && turn.id !== skipId && turn.content)
    .map((turn) => ({
      role: turn.role === "user" ? ("user" as const) : ("assistant" as const),
      content: turn.content,
    }));
}

/**
 * Builds one independent conversation store.
 *
 * The drill page and the Lumi page each own a transcript, so the streaming
 * controller, the request counter and the in-flight hydrate all have to live in
 * this closure rather than at module scope — otherwise stopping one surface
 * would abort the other's reply.
 *
 * A store is shared across packages, so the package id is bound at runtime by
 * the page. Every read and write is scoped by it: the remembered conversation
 * lives under `ws:<id>:…`, and the database rows carry the same id (MLPS §1.2).
 */
export function createConversationStore({
  scope,
  systemPrompt,
  idPrefix = "conv",
}: ConversationStoreOptions) {
  let controller: AbortController | null = null;
  // Identifies the request that currently owns `sending`. Stopping and sending
  // again in the same conversation leaves the old promise alive for a moment, and
  // its cleanup must not clear the flag for the request that replaced it.
  let activeRequest = 0;
  // The first hydrate is kicked off from an effect, which React runs twice in
  // development; sharing the promise keeps that from loading the history twice.
  let hydrating: Promise<void> | null = null;

  const lastKey = (workspaceId: string) =>
    workspaceScope(workspaceId, `${scope}.conversationId`);

  // Persisting is fire-and-forget: a local write must never block the stream, and
  // a failed write is not worth interrupting a reply over.
  const persist = (
    workspaceId: string,
    conversationId: string,
    turn: ConversationTurn,
  ) => {
    if (turn.error || !turn.content) return;
    void appendMessage(workspaceId, conversationId, {
      id: turn.id,
      role: turn.role,
      content: turn.content,
    }).catch(() => undefined);
  };

  const decode = (messages: Awaited<ReturnType<typeof loadMessages>>) =>
    messages.map((message) => ({
      id: message.id,
      role: message.role === "user" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    }));

  return create<ConversationState>((set, get) => {
    /** Streams one reply into an already-inserted pending turn. */
    const requestReply = async (replyTurn: ConversationTurn) => {
      const { workspaceId, conversationId } = get();
      if (!workspaceId || !conversationId) return;

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
        { role: "system", content: systemPrompt },
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
          persist(workspaceId, conversationId, { ...replyTurn, content: answer });
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
      workspaceId: null,
      conversationId: null,
      turns: [],
      sending: false,
      editingTurnId: null,
      list: [],
      listLoaded: false,

      bindWorkspace: (workspaceId) => {
        if (get().workspaceId === workspaceId) return;
        // Another package's transcript must not survive the switch, and a
        // reply still streaming belongs to the package being left behind.
        get().stop();
        hydrating = null;
        set({
          workspaceId,
          conversationId: null,
          turns: [],
          editingTurnId: null,
          list: [],
          listLoaded: false,
        });
      },

      hydrate: async () => {
        if (hydrating) return hydrating;
        const workspaceId = get().workspaceId;
        if (!workspaceId) return;

        hydrating = (async () => {
          try {
            const list = await loadConversations(workspaceId);
            const remembered = readScope<string | null>(
              lastKey(workspaceId),
              null,
            );
            // A remembered id can point at a conversation the user deleted on
            // another launch, so fall back to the newest one instead of an empty page.
            const target =
              list.find((entry) => entry.id === remembered) ?? list[0] ?? null;

            if (!target) {
              set({ list, listLoaded: true });
              // The remembered id pointed at nothing; drop it so the fallback is not
              // repeated on every launch.
              if (remembered !== null) writeScope(lastKey(workspaceId), null);
              return;
            }

            set({
              conversationId: target.id,
              list,
              listLoaded: true,
              turns: decode(await loadMessages(target.id)),
            });
            // Keep the pointer honest so the next launch does not repeat the fallback.
            writeScope(lastKey(workspaceId), target.id);
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
        const workspaceId = get().workspaceId;
        if (!workspaceId) return;
        try {
          set({ list: await loadConversations(workspaceId), listLoaded: true });
        } catch {
          // Keep whatever list is on screen; a stale list beats an empty one.
        }
      },

      openConversation: async (conversationId) => {
        if (get().conversationId === conversationId) return;
        // A stream belongs to the conversation it was started from (D-069).
        get().stop();

        const workspaceId = get().workspaceId;
        set({
          conversationId,
          editingTurnId: null,
          turns: decode(await loadMessages(conversationId).catch(() => [])),
        });
        if (workspaceId) writeScope(lastKey(workspaceId), conversationId);
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
        const workspaceId = get().workspaceId;
        set({ conversationId: null, turns: [], editingTurnId: null });
        if (workspaceId) writeScope(lastKey(workspaceId), null);
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
          const workspaceId = get().workspaceId;
          set({ conversationId: null, turns: [], editingTurnId: null });
          if (workspaceId) writeScope(lastKey(workspaceId), null);
        }
      },

      send: async (message) => {
        const text = message.trim();
        const workspaceId = get().workspaceId;
        if (!text || get().sending || !workspaceId) return;

        const conversationId = get().conversationId ?? nextId(idPrefix);
        const editingTurnId = get().editingTurnId;

        // An edit rewrites the question, so the old answer and everything the
        // user said after it describe a prompt that no longer exists. They go
        // first, both on screen and on disk.
        let base = get().turns;
        if (editingTurnId) {
          const index = base.findIndex((turn) => turn.id === editingTurnId);
          base = index === -1 ? [] : base.slice(0, index);
          await truncateFrom(conversationId, editingTurnId).catch(() => undefined);
        }

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
        writeScope(lastKey(workspaceId), conversationId);
        persist(workspaceId, conversationId, userTurn);
        // The first user turn becomes the title, so the list has to catch up.
        void get().refreshList();

        await requestReply(replyTurn);
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
        await requestReply(replyTurn);
      },

      deleteTurn: (turnId) => {
        const conversationId = get().conversationId;
        if (!conversationId) return;

        const target = get().turns.find((turn) => turn.id === turnId);
        if (!target) return;

        // Dropping the reply that is still arriving would leave a requesting
        // turn with nothing to write into, so stop it first.
        if (target.pending) get().stop();

        const remaining = get().turns.filter((turn) => turn.id !== turnId);
        const wasEditing = get().editingTurnId === turnId;

        if (remaining.length === 0) {
          // An empty transcript is just an empty row in the history list.
          const workspaceId = get().workspaceId;
          set({ conversationId: null, turns: [], editingTurnId: null });
          if (workspaceId) writeScope(lastKey(workspaceId), null);
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

      beginEdit: (turnId) => {
        const target = get().turns.find((turn) => turn.id === turnId);
        if (!target || target.role !== "user" || get().sending) return;
        set({ editingTurnId: turnId });
      },

      cancelEdit: () => set({ editingTurnId: null }),

      stop: () => {
        controller?.abort();
        controller = null;
        set({ sending: false });
      },
    };
  });
}
