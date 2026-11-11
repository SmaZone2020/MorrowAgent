import { useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { ArrowUturnCcwLeft, ListCheck, Pencil, TrashBin } from "@gravity-ui/icons";
import {
  Message,
  MessageBubble,
  MessageBubbleContent,
  MessageContent,
} from "@/vendor/beui/components/agents/message";
import { MessageScroller } from "@/vendor/beui/components/agents/message-scroller";
import { StreamingResponse } from "@/vendor/beui/components/agents/streaming-response";
import { ReasoningText } from "@/vendor/beui/components/agents/loading-states";
import { Markdown } from "@/features/rich/Markdown";
import { LumiMark } from "@/features/lumi/LumiMark";
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

/**
 * A tool result is not something the user said, so it is not a bubble: one
 * quiet line reports that work happened, and the substance lives in the card
 * above it.
 */
function ToolTurnRow({ turn }: { turn: ConversationTurn }) {
  const first = turn.content.split("\n")[0] ?? "";
  return (
    <details className="group/tool text-sm text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-0.5 hover:text-foreground">
        <ListCheck className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{first || "工具已返回"}</span>
      </summary>
      <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-muted/50 p-2 text-sm whitespace-pre-wrap">
        {turn.content}
      </pre>
    </details>
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
      label="与 Lumi 的对话"
      busy={busy}
      followOutput
      navigation="rail"
      navigationLabel="对话导航"
      className="min-h-0 flex-1"
      contentClassName="flex flex-col gap-5 py-2 pr-2"
    >
      {turns.map((turn) =>
        turn.role === "user" ? (
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
          <Message key={turn.id} from="assistant" animateIn>
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center">
              <LumiMark className="size-7 opacity-60" />
            </span>
            <MessageContent>
              <ToolTurnRow turn={turn} />
              <TurnActions onDelete={() => onDelete?.(turn.id)} />
            </MessageContent>
          </Message>
        ) : (
          <Message key={turn.id} from="assistant" animateIn>
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center">
              <LumiMark className="size-7" />
            </span>
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
                      onComplete={(callId, output) => onAnswerQuiz?.(callId, output)}
                    />
                  ))}
                </>
              )}
            </MessageContent>
          </Message>
        ),
      )}
    </MessageScroller>
  );
}
