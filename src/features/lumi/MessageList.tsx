import { useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { ArrowUturnCcwLeft, CircleExclamation, Pencil, TrashBin } from "@gravity-ui/icons";
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageBubbleContent,
  MessageContent,
} from "@/vendor/beui/components/agents/message";
import { MessageScroller } from "@/vendor/beui/components/agents/message-scroller";
import { StreamingResponse } from "@/vendor/beui/components/agents/streaming-response";
import { ReasoningText } from "@/vendor/beui/components/agents/loading-states";
import {
  ToolResult,
  ToolResultOutput,
} from "@/vendor/beui/components/agents/tool-result";
import { Markdown } from "@/features/rich/Markdown";
import { LumiMark } from "@/features/lumi/LumiMark";
import { TurnAttachments } from "@/features/lumi/AttachmentPreview";
import { QuizTurn, isQuizCall } from "@/features/lumi/QuizTurn";
import type { ConversationTurn } from "@/features/lumi/conversation";
import type { PendingQuiz } from "@/features/lumi/conversationCore";

interface MessageListProps {
  turns: ConversationTurn[];
  onRetry?: () => void;
  /** Drops one turn, whichever side wrote it. */
  onDelete?: (turnId: string) => void;
  /** Hands a user turn back to the composer so it can be rewritten. */
  onEdit?: (turnId: string) => void;
  /** The user turn currently loaded into the composer. */
  editingTurnId?: string | null;
  /** The quiz the conversation is waiting on, if any. */
  pending?: PendingQuiz | null;
  /** Hands a finished question set back to the conversation. */
  onAnswerQuiz?: (callId: string, output: string) => void;
}

// Phrased as work in progress rather than a spinner label: the reply really is
// the model reading the question and drafting an answer.
const THINKING_PHRASES = ["正在读题", "在理清思路", "正在组织表述", "马上就好"];

/**
 * Delete (and, for a question, edit) under one turn. It stays quiet until the
 * row is hovered or something inside it takes focus, so a long transcript still
 * reads as prose rather than as a wall of controls.
 *
 * Deleting a turn cannot be undone — the row is gone from the database too — so
 * the trash icon only arms the action; a second, explicit press commits it.
 */
function TurnActions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className={`flex items-center gap-0.5 transition-opacity ${
        confirming
          ? "opacity-100"
          : "opacity-0 group-hover/message:opacity-100 focus-within:opacity-100"
      }`}
    >
      {confirming ? (
        <>
          <Button
            size="icon"
            variant="ghost"
            aria-label="确认删除"
            title="确认删除"
            className="size-7 rounded-lg text-destructive"
            onClick={onDelete}
          >
            <TrashBin className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="取消删除"
            title="取消删除"
            className="size-7 rounded-lg"
            onClick={() => setConfirming(false)}
          >
            <ArrowUturnCcwLeft className="size-3.5" />
          </Button>
        </>
      ) : (
        <>
          {onEdit ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label="编辑消息"
              title="编辑消息"
              className="size-7 rounded-lg"
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            aria-label="删除消息"
            title="删除消息"
            className="size-7 rounded-lg text-muted-foreground hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            <TrashBin className="size-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

/** How each tool reads in the result row's title slot. */
const TOOL_LABEL: Record<string, string> = {
  search_knowledge: "检索知识点",
  get_mastery: "查看掌握度",
  read_question: "读取题目",
  list_wrong_questions: "查看错题本",
};

/**
 * A tool result is not something the user said, so it is not a bubble: one
 * quiet line reports that work happened, and the substance lives in the card
 * above it.
 */
function ToolTurnRow({
  turn,
  name,
}: {
  turn: ConversationTurn;
  name: string;
}) {
  return (
    <ToolResult
      tool={name}
      title={TOOL_LABEL[name] ?? "工具调用"}
      status="success"
      kind="custom"
      copyText={turn.content}
      className="text-foreground"
    >
      <ToolResultOutput language="text">{turn.content}</ToolResultOutput>
    </ToolResult>
  );
}

export function MessageList({
  turns,
  onRetry,
  onDelete,
  onEdit,
  editingTurnId = null,
  pending = null,
  onAnswerQuiz,
}: MessageListProps) {
  const busy = turns.at(-1)?.pending === true;

  const isWaiting = (callId: string) =>
    pending !== null && pending.results[callId] === undefined;

  return (
    <MessageScroller
      // Text in the transcript is content, not chrome, so the subtree opts back
      // into selection (see the `[data-selectable]` rule in globals.css).
      data-selectable
      label="与 Lumi 的对话"
      busy={busy}
      followOutput
      navigation="rail"
      navigationLabel="对话导航"
      className="min-h-0 flex-1"
      contentClassName="flex flex-col gap-5 py-2 pr-2"
    >
      {turns.map((turn, index) => {
        // One avatar per run of assistant turns. A reply, its tool results and
        // the follow-up all belong to the same speaker, so drawing Lumi for
        // each row turned one answer into a column of faces.
        const previous = turns[index - 1];
        const continuesRun =
          turn.role === "assistant" && previous?.role === "assistant";
        // `toolCallId` only names the call; the tool's own name lives on the
        // assistant turn that asked for it, which is the nearest row above.
        const callName = turn.toolCallId
          ? [...turns.slice(0, index)]
              .reverse()
              .flatMap((entry) => entry.toolCalls ?? [])
              .find((call) => call.id === turn.toolCallId)?.name ?? ""
          : "";
        const mark = continuesRun ? (
          <MessageAvatar placeholder />
        ) : (
          <MessageAvatar className="bg-transparent">
            <LumiMark className="size-7" />
          </MessageAvatar>
        );

        return turn.role === "user" ? (
          <Message key={turn.id} from="user" animateIn>
            <MessageContent>
              <MessageBubble
                variant="soft"
                // The composer holds this text while it is being rewritten, so
                // the bubble marks which question the draft will replace.
                className={
                  editingTurnId === turn.id ? "ring-2 ring-ring/50" : undefined
                }
              >
                <TurnAttachments attachments={turn.attachments ?? []} />
                <MessageBubbleContent className="whitespace-pre-wrap">
                  {turn.content}
                </MessageBubbleContent>
              </MessageBubble>
              {editingTurnId === turn.id ? null : (
                <TurnActions
                  onEdit={onEdit ? () => onEdit(turn.id) : undefined}
                  onDelete={() => onDelete?.(turn.id)}
                />
              )}
            </MessageContent>
          </Message>
        ) : turn.toolCallId ? (
          <Message
            key={turn.id}
            from="assistant"
            animateIn
            className={continuesRun ? "-mt-2" : undefined}
          >
            {mark}
            <MessageContent>
              <ToolTurnRow turn={turn} name={callName} />
              <TurnActions onDelete={() => onDelete?.(turn.id)} />
            </MessageContent>
          </Message>
        ) : (
          <Message
            key={turn.id}
            from="assistant"
            animateIn
            className={continuesRun ? "-mt-2" : undefined}
          >
            {mark}
            <MessageContent>
              {turn.error ? (
                <>
                  <MessageBubble variant="danger">
                    <MessageBubbleContent>{turn.error}</MessageBubbleContent>
                  </MessageBubble>
                  <TurnActions onDelete={() => onDelete?.(turn.id)} />
                </>
              ) : turn.pending && !turn.content ? (
                <ReasoningText
                  phrases={THINKING_PHRASES}
                  variant="cascade"
                  interval={2200}
                  className="py-1"
                />
              ) : (
                <>
                  {turn.note ? (
                    <p className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CircleExclamation className="size-3.5 shrink-0" />
                      {turn.note}
                    </p>
                  ) : null}
                  {turn.content ? (
                    <StreamingResponse
                      status={turn.pending ? "streaming" : "complete"}
                      copyText={turn.content}
                      onRetry={onRetry}
                      onDelete={onDelete ? () => onDelete(turn.id) : undefined}
                      announce={false}
                      className="w-full"
                      contentClassName="text-foreground"
                    >
                      <Markdown source={turn.content} />
                      {turn.pending ? (
                        <span
                          aria-hidden="true"
                          className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-foreground align-middle"
                        />
                      ) : null}
                    </StreamingResponse>
                  ) : null}
                  {/* A quiz arrives as a tool call, so its card sits under the
                      prose that introduced it and survives the next reply. */}
                  {turn.toolCalls?.filter(isQuizCall).map((call) => (
                    <QuizTurn
                      key={call.id}
                      call={call}
                      pending={isWaiting(call.id)}
                      onComplete={(callId, output) =>
                        onAnswerQuiz?.(callId, output)
                      }
                    />
                  ))}
                </>
              )}
            </MessageContent>
          </Message>
        );
      })}
    </MessageScroller>
  );
}
