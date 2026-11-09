import { create } from "zustand";
import { activeProvider } from "@/features/settings/providerStatus";
import { streamChat } from "@/features/settings/aiStream";
import type { ChatMessage } from "@/features/settings/aiBridge";

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Set when the request for this turn failed. */
  error?: string;
  pending?: boolean;
}

interface ConversationState {
  turns: ConversationTurn[];
  sending: boolean;
  send: (message: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

let counter = 0;
const nextId = () => `turn-${Date.now()}-${(counter += 1)}`;

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

export const useConversation = create<ConversationState>((set, get) => ({
  turns: [],
  sending: false,

  send: async (message) => {
    const text = message.trim();
    if (!text || get().sending) return;

    const userTurn: ConversationTurn = {
      id: nextId(),
      role: "user",
      content: text,
    };
    const replyTurn: ConversationTurn = {
      id: nextId(),
      role: "assistant",
      content: "",
      pending: true,
    };

    set((state) => ({
      turns: [...state.turns, userTurn, replyTurn],
      sending: true,
    }));

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
      // An empty answer with no error means the user stopped mid-flight.
      patchReply({
        pending: false,
        content: answer || "（已停止）",
      });
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
    set({ turns: [], sending: false });
  },
}));
