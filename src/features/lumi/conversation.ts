import { create } from "zustand";
import { activeProvider } from "@/features/settings/providerStatus";
import { streamChat } from "@/features/settings/aiStream";
import type { ChatMessage } from "@/features/settings/aiBridge";
import {
  appendMessage,
  loadConversations,
  loadMessages,
} from "@/features/lumi/history";

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Set when the request for this turn failed. */
  error?: string;
  pending?: boolean;
}

interface ConversationState {
  /** Current conversation id; created lazily on the first message. */
  conversationId: string | null;
  turns: ConversationTurn[];
  sending: boolean;
  /** Pull the most recent conversation from disk. */
  hydrate: () => Promise<void>;
  send: (message: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

let counter = 0;
const nextId = (prefix: string) =>
  `${prefix}-${Date.now()}-${(counter += 1)}`;

// Lumi's opening instruction: a study partner, not a generic assistant. It
// moves into the prompt registry once that lands.
const SYSTEM_PROMPT = [
  "你是 Lumi，Morrow Agent 的学习伙伴。",
  "用户备考陕西专升本高等数学。回答用中文，简洁、直接，先给结论再解释。",
  "数学式子用 LaTeX 行内写法，不要长篇铺陈，也不要反复确认用户意图。",
].join("\n");

let controller: AbortController | null = null;

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

export const useConversation = create<ConversationState>((set, get) => ({
  conversationId: null,
  turns: [],
  sending: false,

  hydrate: async () => {
    try {
      const [latest] = await loadConversations(1);
      if (!latest) return;
      const stored = await loadMessages(latest.id);
      if (!stored.length) return;
      set({
        conversationId: latest.id,
        turns: stored.map((message) => ({
          id: message.id,
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        })),
      });
    } catch {
      // No database (browser preview) or a broken file: start empty.
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
    persist(conversationId, userTurn);

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

    try {
      const answer = await streamChat(config, history, {
        signal: controller.signal,
        onProgress: (partial) => patchReply({ content: partial }),
      });
      const final = answer || "（已停止）";
      patchReply({ pending: false, content: final });
      if (answer) {
        persist(conversationId, { ...replyTurn, content: answer });
      }
    } catch (error) {
      patchReply({
        pending: false,
        error: error instanceof Error ? error.message : "请求失败",
      });
    } finally {
      controller = null;
      set({ sending: false });
    }
  },

  stop: () => {
    controller?.abort();
    controller = null;
    set({ sending: false });
  },

  reset: () => {
    controller?.abort();
    controller = null;
    set({ conversationId: null, turns: [], sending: false });
  },
}));
