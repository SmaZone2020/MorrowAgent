import { activeProvider } from "@/features/settings/providerStatus";
import { usePreferences } from "@/features/settings/preferencesStore";
import {
  asThinkingLevel,
  supportsThinking,
  thinkingPayload,
} from "@/features/settings/thinking";
import { streamChat } from "@/features/settings/aiStream";
import type { ChatMessage, ToolCall } from "@/features/settings/aiBridge";
import {
  toHistory,
  turnHasImage,
  type ConversationTurn,
} from "@/features/lumi/conversationTurn";
import {
  findTool,
  parseArguments,
  QUIZ_TOOL,
  toolDefs,
  type ToolContext,
} from "@/features/lumi/tools";

/** One round of the loop is one request; this bounds a runaway tool chain. */
export const MAX_TOOL_ROUNDS = 4;

export interface LoopDeps {
  systemPrompt: string;
  /** Per-request prompt; wins over `systemPrompt` when present. */
  promptFor?: (workspaceId: string) => string;
  /** Names of the tools this surface offers; empty means none. */
  toolNames: string[];
  context: () => ToolContext | null;
  /** Reads the live transcript; the loop must not capture a stale snapshot. */
  turns: () => ConversationTurn[];
  conversationId: () => string | null;
  workspaceId: () => string | null;
  setTurns: (update: (turns: ConversationTurn[]) => ConversationTurn[]) => void;
  patchReply: (turnId: string, patch: Partial<ConversationTurn>) => void;
  /** Writes one finished turn to the transcript table. */
  persist: (workspaceId: string, conversationId: string, turn: ConversationTurn) => void;
  newId: (prefix: string) => string;
  refreshList: () => void;
  /** Parks a turn whose tool calls need the user before they can be answered. */
  park: (pending: {
    turnId: string;
    calls: ToolCall[];
    results: Record<string, string>;
    message: string;
  }) => void;
  abortSignal: () => AbortSignal;
  /**
   * Called once the request that owns `sending` has finished.
   *
   * `delivered` is false when the turn ended in an error: a failed request is
   * something the learner is already looking at, and announcing it as a finished
   * reply would be a lie.
   */
  releaseRequest: (delivered?: boolean) => void;
}

/** Runs one tool, falling back to a sentence the model can read. */
async function runTool(
  call: ToolCall,
  context: ToolContext | null,
): Promise<string> {
  const handler = findTool(call.name);
  if (!handler) return `未知工具：${call.name}`;
  if (!context) return "当前学习包没有可查询的内容。";
  const outcome = await handler.run(parseArguments(call.arguments), context);
  return outcome.output;
}

/**
 * The request loop, separated from the store so the store stays about state.
 *
 * One pass is: send the transcript, stream a reply, then either finish or run
 * the tools the model asked for and send again with their results. A tool that
 * needs the user (`ask_questions`) ends the pass instead, and the store resumes
 * it from `answerQuiz`.
 */
export function createLoop(deps: LoopDeps) {
  /**
   * Handles every call of one assistant turn.
   *
   * All the results must go back together: a provider rejects a turn whose
   * tool calls are only partly answered. So read-only calls are computed here,
   * and if any call needs the user the whole set is parked until they answer.
   */
  async function handleToolCalls(
    replyTurn: ConversationTurn,
    calls: ToolCall[],
    depth: number,
  ) {
    const workspaceId = deps.workspaceId();
    const conversationId = deps.conversationId();
    if (!workspaceId || !conversationId) return;

    const context = deps.context();
    const results: Record<string, string> = {};
    let needsUser = false;
    for (const call of calls) {
      if (call.name === QUIZ_TOOL) {
        needsUser = true;
        continue;
      }
      // Sequential on purpose: two searches in one turn would spend the
      // account's quota twice for answers the model reads together anyway.
      results[call.id] = await runTool(call, context);
    }

    if (needsUser) {
      deps.park({
        turnId: replyTurn.id,
        calls,
        results,
        message: replyTurn.content,
      });
      return;
    }

    for (const call of calls) {
      const toolTurn: ConversationTurn = {
        id: deps.newId("turn"),
        role: "assistant",
        content: results[call.id] ?? "",
        toolCallId: call.id,
      };
      deps.setTurns((turns) => [...turns, toolTurn]);
      deps.persist(workspaceId, conversationId, toolTurn);
    }

    if (depth >= MAX_TOOL_ROUNDS) {
      deps.releaseRequest();
      return;
    }

    // Round trip: the model now has the results and continues on its own.
    const nextReply: ConversationTurn = {
      id: deps.newId("turn"),
      role: "assistant",
      content: "",
      pending: true,
    };
    deps.setTurns((turns) => [...turns, nextReply]);
    await request(nextReply, depth + 1);
  }

  async function request(replyTurn: ConversationTurn, depth: number): Promise<void> {
    const workspaceId = deps.workspaceId();
    const conversationId = deps.conversationId();
    if (!workspaceId || !conversationId) return;

    const config = activeProvider();
    if (!config) {
      deps.patchReply(replyTurn.id, { pending: false, error: "还没有配置 Provider" });
      deps.releaseRequest(false);
      return;
    }

    const signal = deps.abortSignal();
    const prefs = usePreferences.getState();
    // The switch is per request, not per conversation: a learner turns it down
    // for a definition and back up for a proof without leaving the chat. Only
    // the builtin DeepSeek endpoint is documented to understand the field, so
    // anything else never sees it.
    const thinking = supportsThinking({ id: config.profileId })
      ? thinkingPayload(asThinkingLevel(prefs.thinking)).thinking
      : undefined;

    /**
     * One attempt. `dropImages` exists because a provider that cannot read an
     * image answers 400 instead of ignoring it, and losing the whole turn over
     * an attached screenshot would be worse than answering the text.
     */
    const attempt = (dropImages: boolean) => {
      const system = deps.promptFor
        ? deps.promptFor(workspaceId)
        : deps.systemPrompt;
      const history: ChatMessage[] = [
        { role: "system", content: system },
        ...toHistory(deps.turns(), replyTurn.id, { dropImages }),
      ];
      return streamChat(config, history, {
        signal,
        maxTokens: prefs.maxTokens,
        temperature: prefs.temperature,
        tools: deps.toolNames.length > 0 ? toolDefs(deps.toolNames) : undefined,
        thinking,
        onProgress: (partial) => {
          // Switching conversations aborts the request, but a delta already in
          // flight must not land in the conversation that is now on screen.
          if (deps.conversationId() !== conversationId) return;
          deps.patchReply(replyTurn.id, { content: partial });
        },
        onReasoning: (partial) => {
          if (deps.conversationId() !== conversationId) return;
          deps.patchReply(replyTurn.id, { reasoning: partial });
        },
      });
    };

    let failed = false;
    try {
      // Whether this request would carry pictures is decided by the transcript,
      // not by the reply turn: the images sit on the user turn that was sent.
      const historyTurns = deps
        .turns()
        .filter((turn) => !turn.error && turn.id !== replyTurn.id);
      const hasImages = historyTurns.some(turnHasImage);
      const canSendImages = hasImages && config.supportsVision;
      let degraded = hasImages && !config.supportsVision;

      let answer;
      try {
        answer = await attempt(!canSendImages);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        // A 400 on a request that carried pictures usually means the model has
        // no vision after all; retrying once without them is worth the round.
        if (!canSendImages || !message.includes("400")) throw error;
        degraded = true;
        answer = await attempt(true);
      }
      if (deps.conversationId() !== conversationId) return;

      const final = answer.text || "";
      const calls = answer.toolCalls;
      const note = degraded
        ? "这个模型不支持图片，本次只发送了文字与文档内容。"
        : undefined;
      const reasoning = answer.reasoning.trim() || undefined;
      // The calls are part of the turn: they are written with it so a reload
      // shows the same questions instead of a reply with nothing underneath.
      const settled: ConversationTurn = {
        ...replyTurn,
        content: final,
        pending: false,
        toolCalls: calls.length > 0 ? calls : undefined,
        note,
        reasoning,
      };
      deps.patchReply(replyTurn.id, {
        content: final,
        pending: false,
        toolCalls: calls.length > 0 ? calls : undefined,
        note,
        reasoning,
      });

      if (calls.length > 0) {
        deps.persist(workspaceId, conversationId, settled);
        deps.refreshList();
        await handleToolCalls(settled, calls, depth);
      } else if (final || note || reasoning) {
        deps.persist(workspaceId, conversationId, settled);
        deps.refreshList();
      }
    } catch (error) {
      if (deps.conversationId() !== conversationId) return;
      failed = true;
      deps.patchReply(replyTurn.id, {
        pending: false,
        error: error instanceof Error ? error.message : "请求失败",
      });
    } finally {
      // Only the outermost pass owns the flag: a tool round trip re-enters this
      // function, and clearing `sending` between rounds would flash the UI back
      // to idle mid-chain.
      if (depth === 0) deps.releaseRequest(!failed);
    }
  }

  return request;
}
