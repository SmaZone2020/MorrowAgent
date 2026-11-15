import { create } from "zustand";
import type { ToolCall, ToolDef } from "@/features/settings/aiBridge";
import {
  appendMessage,
  type ConversationSummary,
  type MessageAttachment,
} from "@/features/lumi/history";
import {
  encodeTurn,
  shouldPersist,
  type ConversationTurn,
} from "@/features/lumi/conversationTurn";
import { createLoop, type CallGate } from "@/features/lumi/agentLoop";
import { readHydrated } from "@/features/lumi/conversationHistoryOps";
import { nextId, pendingKey } from "@/features/lumi/conversationKeys";
import { createListActions } from "@/features/lumi/conversationListOps";
import type { ConversationRuntime } from "@/features/lumi/conversationRuntime";
import { createTurnActions } from "@/features/lumi/conversationTurnOps";
import type { ToolContext } from "@/features/lumi/tools";
import { writeScope } from "@/features/uiState/store";

export type { ConversationTurn } from "@/features/lumi/conversationTurn";

/** A tool call the client could not answer, kept until the user acts. */
export interface PendingTurn {
  /** The assistant turn the calls arrived on. */
  turnId: string;
  /** Every call of that turn: all results go back together. */
  calls: ToolCall[];
  /**
   * Outputs collected so far, keyed by call id. Read-only calls are already
   * filled in; the quiz calls arrive as the user finishes each set.
   */
  results: Record<string, string>;
  /** The assistant turn's text, so the card can show what led to the quiz. */
  message: string;
  /**
   * Why the turn is parked: a question set the user has to answer, or a call
   * that needs permission. Both resume the same way, so they share one slot.
   */
  kind: "quiz" | "approve";
}

/** The shape older transcripts and the Lumi page already use. */
export type PendingQuiz = PendingTurn;

/** The calls of a parked turn that still need the user. */
export function unansweredQuizCalls(pending: PendingTurn): ToolCall[] {
  return pending.calls.filter(
    (call) =>
      call.name === "ask_questions" && pending.results[call.id] === undefined,
  );
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
  /**
   * A quiz the model posed and the user has not answered. It blocks the turn:
   * the next request is the tool result, not another user message.
   */
  pending: PendingTurn | null;
  /** Points the store at one package, discarding the previous one's screen state. */
  bindWorkspace: (workspaceId: string) => void;
  /** Pull the conversation the user last had open, else the newest one. */
  hydrate: () => Promise<void>;
  refreshList: () => Promise<void>;
  openConversation: (conversationId: string) => Promise<void>;
  startNew: () => Promise<void>;
  rename: (conversationId: string, title: string) => Promise<void>;
  remove: (conversationId: string) => Promise<void>;
  send: (message: string, attachments?: MessageAttachment[]) => Promise<void>;
  /** Resolves one parked quiz call with what the user did. */
  answerQuiz: (callId: string, output: string) => Promise<void>;
  /**
   * Resolves one parked approval: `allowed` runs the call, and a refusal hands
   * `reason` back to the model as the tool result.
   */
  approveCall: (callId: string, allowed: boolean, reason?: string) => Promise<void>;
  /** Abandons the parked call so the composer is usable again. */
  dismissQuiz: () => void;
  /** Ask again for the last user message, dropping the answers after it. */
  regenerate: () => Promise<void>;
  /** Removes one message, which is every turn it was assembled from. */
  deleteTurns: (turnIds: string[]) => void;
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
   * Builds the prompt per request instead of using the static one. The learner
   * block changes with the goal and the tallies, so a prompt captured at module
   * scope would describe the learner as they were at startup.
   */
  promptFor?: (workspaceId: string) => string;
  /**
   * Prefix for generated conversation ids. The history table is shared, so the
   * prefix is what keeps the drill's transcripts out of the Lumi page's list.
   */
  idPrefix?: string;
  /**
   * Tools this surface offers. The drill rail gets only the read tools it can
   * resolve; it never poses questions of its own.
   */
  tools?: string[];
  /** Definitions to send, when the surface's tools are not the package ones. */
  defs?: () => ToolDef[];
  /** Runs one call; a surface with its own tools has to answer them itself. */
  runTool?: (call: ToolCall) => Promise<string>;
  /**
   * Decides what happens to a call before it runs. Builder Mode parks a call
   * until the user allows it; the package surfaces run everything they know.
   */
  gate?: (call: ToolCall) => CallGate;
  /** Upper bound on tool rounds, for a surface whose work takes longer. */
  maxRounds?: number;
  /** Reads the package so a tool answer comes from real content. */
  context?: () => ToolContext | null;
  /**
   * Called once a request that produced a visible answer has finished.
   *
   * The store cannot know whether the learner is looking at it: it is a module
   * singleton, and the page that shows it may have been navigated away from
   * while the reply was still streaming. The host supplies this so a finished
   * answer can be announced where the learner actually is.
   */
  onRequestSettled?: (workspaceId: string | null) => void;
}

/**
 * Builds one independent conversation store.
 *
 * The drill page and the Lumi page each own a transcript, so the streaming
 * controller and the in-flight hydrate live in this closure rather than at
 * module scope — otherwise stopping one surface would abort the other's reply.
 *
 * A store is shared across packages, so the package id is bound at runtime by
 * the page. Every read and write is scoped by it: the remembered conversation
 * lives under `ws:<id>:…`, and the database rows carry the same id (MLPS §1.2).
 */
export function createConversationStore({
  scope,
  systemPrompt,
  promptFor,
  idPrefix = "conv",
  tools: toolNames = [],
  defs,
  runTool,
  gate,
  maxRounds,
  context,
  onRequestSettled,
}: ConversationStoreOptions) {
  let controller: AbortController | null = null;
  // The first hydrate is kicked off from an effect, which React runs twice in
  // development; sharing the promise keeps that from loading the history twice.
  let hydrating: Promise<void> | null = null;

  return create<ConversationState>((set, get) => {
    // Persisting is fire-and-forget: a local write must never block the stream,
    // and a failed write is not worth interrupting a reply over.
    const persist = (
      workspaceId: string,
      conversationId: string,
      turn: ConversationTurn,
    ) => {
      if (!shouldPersist(turn)) return;
      void appendMessage(workspaceId, conversationId, {
        id: turn.id,
        role: turn.role,
        content: encodeTurn(turn),
        // The column is the cheap way to redraw a chip; the encoded marker also
        // carries them so an edit keeps the picture with the question.
        attachments: turn.attachments,
      }).catch(() => undefined);
    };

    const stop = () => {
      controller?.abort();
      controller = null;
      set({ sending: false });
    };

    const runtime: ConversationRuntime = {
      get,
      set,
      scope,
      idPrefix,
      persist,
      stop,
      runTool,
      request: createLoop({
        systemPrompt,
        promptFor,
        toolNames,
        defs,
        runTool,
        gate,
        maxRounds,
        context: () => context?.() ?? null,
        turns: () => get().turns,
        conversationId: () => get().conversationId,
        workspaceId: () => get().workspaceId,
        setTurns: (update) => set((state) => ({ turns: update(state.turns) })),
        patchReply: (turnId, patch) =>
          set((state) => ({
            turns: state.turns.map((turn) =>
              turn.id === turnId ? { ...turn, ...patch } : turn,
            ),
          })),
        persist,
        newId: nextId,
        refreshList: () => void get().refreshList(),
        park: (pending) => {
          const workspaceId = get().workspaceId;
          if (workspaceId) {
            // A pause must survive a reload, so the calls are stored too.
            writeScope(pendingKey(scope, workspaceId), pending);
          }
          set({ pending, sending: false });
        },
        abortSignal: () => {
          // One controller per request; `stop` aborts whichever is current.
          controller?.abort();
          controller = new AbortController();
          return controller.signal;
        },
        releaseRequest: (delivered = true) => {
          if (get().pending) return;
          if (!get().sending) return;
          set({ sending: false });
          if (delivered) onRequestSettled?.(get().workspaceId);
        },
      }),
    };

    const list = createListActions(runtime);
    const turns = createTurnActions(runtime);

    return {
      workspaceId: null,
      conversationId: null,
      turns: [],
      sending: false,
      editingTurnId: null,
      list: [],
      listLoaded: false,
      pending: null,

      bindWorkspace: (workspaceId) => {
        if (get().workspaceId === workspaceId) return;
        // Another package's transcript must not survive the switch, and a
        // reply still streaming belongs to the package being left behind.
        stop();
        hydrating = null;
        set({
          workspaceId,
          conversationId: null,
          turns: [],
          editingTurnId: null,
          list: [],
          listLoaded: false,
          pending: null,
        });
      },

      hydrate: async () => {
        if (hydrating) return hydrating;
        const workspaceId = get().workspaceId;
        if (!workspaceId) return;

        hydrating = (async () => {
          try {
            set(await readHydrated(scope, workspaceId));
          } catch {
            // No database (browser preview) or a broken file: start empty.
            set({ listLoaded: true });
          } finally {
            hydrating = null;
          }
        })();
        return hydrating;
      },

      ...list,
      ...turns,

      beginEdit: (turnId) => {
        const target = get().turns.find((turn) => turn.id === turnId);
        if (!target || target.role !== "user" || get().sending) return;
        set({ editingTurnId: turnId });
      },

      cancelEdit: () => set({ editingTurnId: null }),
      stop,
    };
  });
}
