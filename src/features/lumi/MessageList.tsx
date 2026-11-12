import { useState } from "react";
import { ChevronDown, CircleExclamation } from "@gravity-ui/icons";
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
import { AgentDisclosure } from "@/vendor/beui/components/agents/agent-disclosure";
import {
  ToolResult,
  ToolResultOutput,
} from "@/vendor/beui/components/agents/tool-result";
import { Markdown } from "@/features/rich/Markdown";
import { LumiMark } from "@/features/lumi/LumiMark";
import { TurnAttachments } from "@/features/lumi/AttachmentPreview";
import { QuizTurn, isQuizCall } from "@/features/lumi/QuizTurn";
import { TurnActions } from "@/features/lumi/TurnActions";
import { TextWithReferences } from "@/features/knowledge/QuestionReference";
import {
  callNames,
  deletionScope,
  groupTurns,
  type MessageGroup,
} from "@/features/lumi/messageGroups";
import type { ConversationTurn } from "@/features/lumi/conversation";
import type { PendingQuiz } from "@/features/lumi/conversationCore";

interface MessageListProps {
  turns: ConversationTurn[];
  onRetry?: () => void;
  /** Drops one message, which is every turn it was assembled from. */
  onDelete?: (turnIds: string[]) => void;
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

/** How each tool reads in the result row's title slot. */
const TOOL_LABEL: Record<string, string> = {
  search_knowledge: "检索知识点",
  get_mastery: "查看掌握度",
  read_question: "读取题目",
  list_wrong_questions: "查看错题本",
};

/**
 * The chain of thought behind one answer.
 *
 * Folded by default: the point of thinking is the answer, and a wall of
 * deliberation above it would push the reply off screen. It stays one click
 * away because "how did you get that" is a real question, and it is exactly
 * what a learner asks when an answer looks wrong.
 */
function ReasoningPanel({
  text,
  pending,
}: {
  text: string;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-fit items-center gap-1 rounded-lg py-0.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
        {pending ? "正在思考" : "思考过程"}
      </button>
      <AgentDisclosure open={open}>
        <p className="mb-1 mt-1 whitespace-pre-wrap border-l-2 border-border pl-3 text-sm leading-6 text-muted-foreground">
          {text}
        </p>
      </AgentDisclosure>
    </div>
  );
}

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
      className="text-foreground"
      // No actions of its own: the message row above owns them, and a second
      // trash icon here would delete half a tool round.
    >
      <ToolResultOutput language="text">{turn.content}</ToolResultOutput>
    </ToolResult>
  );
}

/** The prose and cards one assistant message is made of, in order. */
function AssistantBody({
  group,
  names,
  isWaiting,
  onAnswerQuiz,
}: {
  group: MessageGroup;
  names: Record<string, string>;
  isWaiting: (callId: string) => boolean;
  onAnswerQuiz?: (callId: string, output: string) => void;
}) {
  return (
    <>
      {group.turns.map((turn) => {
        if (turn.toolCallId) {
          return (
            <ToolTurnRow
              key={turn.id}
              turn={turn}
              name={names[turn.toolCallId] ?? ""}
            />
          );
        }
        if (turn.error) {
          return (
            <MessageBubble key={turn.id} variant="danger">
              <MessageBubbleContent className="text-[1.25rem]">
                {turn.error}
              </MessageBubbleContent>
            </MessageBubble>
          );
        }
        // A reply that has not written anything yet: the model is reading the
        // tool results, which is still work in progress rather than silence.
        // While it is thinking, the reasoning itself is the progress report.
        if (turn.pending && !turn.content) {
          return (
            <div key={turn.id} className="flex flex-col gap-1">
              {turn.reasoning ? (
                <ReasoningPanel text={turn.reasoning} pending />
              ) : (
                <ReasoningText
                  phrases={THINKING_PHRASES}
                  variant="cascade"
                  interval={2200}
                  className="py-1"
                />
              )}
            </div>
          );
        }
        return (
          <div key={turn.id} className="flex w-full flex-col gap-1.5">
            {turn.note ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CircleExclamation className="size-3.5 shrink-0" />
                {turn.note}
              </p>
            ) : null}
            {turn.reasoning ? (
              <ReasoningPanel text={turn.reasoning} pending={turn.pending === true} />
            ) : null}
            {turn.content ? (
              <StreamingResponse
                status={turn.pending ? "streaming" : "complete"}
                announce={false}
                className="w-full"
                contentClassName="text-foreground"
                // Actions belong to the message, not to the paragraph: one set
                // of copy/retry/delete sits under the whole round.
                showActions={false}
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
            {/* A quiz arrives as a tool call, so its card sits under the prose
                that introduced it and survives the next reply. */}
            {turn.toolCalls?.filter(isQuizCall).map((call) => (
              <QuizTurn
                key={call.id}
                call={call}
                pending={isWaiting(call.id)}
                onComplete={(callId, output) => onAnswerQuiz?.(callId, output)}
              />
            ))}
          </div>
        );
      })}
    </>
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
  const groups = groupTurns(turns);
  const names = callNames(turns);
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
      {groups.map((group, index) => {
        // One avatar per run of assistant messages. A reply is one speaker even
        // when the model asked for tools in the middle of it.
        const continuesRun =
          group.role === "assistant" && groups[index - 1]?.role === "assistant";
        const mark = continuesRun ? (
          <MessageAvatar placeholder />
        ) : (
          <MessageAvatar className="bg-transparent">
            <LumiMark className="scale-220" />
          </MessageAvatar>
        );

        if (group.role === "user") {
          const turn = group.turns[0]!;
          return (
            <Message key={group.anchorId} from="user" animateIn>
              <MessageContent>
                <MessageBubble
                  variant="soft"
                  // The composer holds this text while it is being rewritten, so
                  // the bubble marks which question the draft will replace.
                  className={
                    editingTurnId === turn.id ? "ring-2 ring-ring/50 " : undefined
                  }
                >
                  <TurnAttachments attachments={turn.attachments ?? []} />
                  <MessageBubbleContent className="whitespace-pre-wrap text-base">
                    <TextWithReferences text={turn.content} />
                  </MessageBubbleContent>
                </MessageBubble>
                {editingTurnId === turn.id ? null : (
                  <TurnActions
                    copyText={group.text || undefined}
                    onEdit={onEdit ? () => onEdit(turn.id) : undefined}
                    onDelete={() => onDelete?.(deletionScope(turns, group))}
                  />
                )}
              </MessageContent>
            </Message>
          );
        }

        const thinking =
          group.pending &&
          !group.text &&
          !group.turns.some((turn) => turn.toolCallId);
        const liveReasoning = group.turns.find((turn) => turn.reasoning)?.reasoning;

        return (
          <Message
            key={group.anchorId}
            from="assistant"
            animateIn
            className={continuesRun ? "-mt-2" : undefined}
          >
            {mark}
            <MessageContent>
              {thinking ? (
                liveReasoning ? (
                  <ReasoningPanel text={liveReasoning} pending />
                ) : (
                  <ReasoningText
                    phrases={THINKING_PHRASES}
                    variant="cascade"
                    interval={2200}
                    className="py-1"
                  />
                )
              ) : (
                <AssistantBody
                  group={group}
                  names={names}
                  isWaiting={isWaiting}
                  onAnswerQuiz={onAnswerQuiz}
                />
              )}
              {group.pending ? null : (
                <TurnActions
                  copyText={group.text || undefined}
                  // Retry asks again for the last question, so only the newest
                  // answer can offer it.
                  onRetry={index === groups.length - 1 ? onRetry : undefined}
                  onDelete={() => onDelete?.(deletionScope(turns, group))}
                />
              )}
            </MessageContent>
          </Message>
        );
      })}
    </MessageScroller>
  );
}
