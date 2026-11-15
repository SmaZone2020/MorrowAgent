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
import { TurnActions } from "@/features/lumi/TurnActions";
import { ApprovalCard } from "@/features/builder/ApprovalCard";
import { TOOL_LABEL } from "@/features/builder/toolDefs";
import {
  callNames,
  deletionScope,
  groupTurns,
  type MessageGroup,
} from "@/features/lumi/messageGroups";
import type { ConversationTurn } from "@/features/lumi/conversationTurn";
import type { PendingTurn } from "@/features/lumi/conversationCore";

const BUILDING_PHRASES = [
  "正在看文件夹",
  "在写文件",
  "正在校验",
  "快好了",
];

/** Builder Mode's mark: a hammer, not Lumi's face. */
function BuilderMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M14.5 3.5 20.5 9.5l-2.2 2.2-6-6z" />
      <path d="M12.3 5.7 6.4 11.6a2 2 0 0 0 0 2.8l1.2 1.2a2 2 0 0 0 2.8 0l5.9-5.9" />
      <path d="M6.5 17.5 3.5 20.5" />
    </svg>
  );
}

function ReasoningPanel({ text, pending }: { text: string; pending: boolean }) {
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
        <p className="mt-1 mb-1 border-l-2 border-border pl-3 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
          {text}
        </p>
      </AgentDisclosure>
    </div>
  );
}

function ToolTurnRow({ turn, name }: { turn: ConversationTurn; name: string }) {
  return (
    <ToolResult
      tool={name}
      title={TOOL_LABEL[name] ?? "工具调用"}
      status="success"
      kind="custom"
      className="text-foreground"
    >
      <ToolResultOutput language="text">{turn.content}</ToolResultOutput>
    </ToolResult>
  );
}

/**
 * The prose and cards one assistant message is made of.
 *
 * The calls that still need approval render as cards; the ones that already ran
 * render as result rows. A call that was parked keeps its card after the turn
 * resumes, so the transcript still shows what the user agreed to.
 */
function AssistantBody({
  group,
  names,
  awaiting,
  onDecide,
}: {
  group: MessageGroup;
  names: Record<string, string>;
  awaiting: (callId: string) => boolean;
  onDecide: (callId: string, decision: "allow" | "deny" | "always") => void;
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
              <MessageBubbleContent className="text-base">
                {turn.error}
              </MessageBubbleContent>
            </MessageBubble>
          );
        }
        if (turn.pending && !turn.content) {
          return (
            <div key={turn.id} className="flex flex-col gap-1">
              {turn.reasoning ? (
                <ReasoningPanel text={turn.reasoning} pending />
              ) : (
                <ReasoningText
                  phrases={BUILDING_PHRASES}
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
            {turn.toolCalls
              ?.filter((call) => awaiting(call.id))
              .map((call) => (
                <ApprovalCard
                  key={call.id}
                  call={call}
                  onDecide={(decision) => onDecide(call.id, decision)}
                />
              ))}
          </div>
        );
      })}
    </>
  );
}

export function BuilderMessages({
  turns,
  pending,
  onDecide,
  onRetry,
  onDelete,
}: {
  turns: ConversationTurn[];
  pending: PendingTurn | null;
  onDecide: (callId: string, decision: "allow" | "deny" | "always") => void;
  onRetry: () => void;
  onDelete: (turnIds: string[]) => void;
}) {
  const groups = groupTurns(turns);
  const names = callNames(turns);
  const busy = turns.at(-1)?.pending === true;
  const awaiting = (callId: string) =>
    pending !== null && pending.kind === "approve" && pending.results[callId] === undefined;

  return (
    <MessageScroller
      data-selectable
      label="与构建助手的对话"
      busy={busy}
      followOutput
      navigation="rail"
      navigationLabel="对话导航"
      className="min-h-0 flex-1"
      contentClassName="flex flex-col gap-5 py-2 pr-2"
    >
      {groups.map((group, index) => {
        const continuesRun =
          group.role === "assistant" && groups[index - 1]?.role === "assistant";
        const mark = continuesRun ? (
          <MessageAvatar placeholder />
        ) : (
          <MessageAvatar className="bg-muted text-muted-foreground">
            <BuilderMark className="size-4" />
          </MessageAvatar>
        );

        if (group.role === "user") {
          const turn = group.turns[0]!;
          return (
            <Message key={group.anchorId} from="user" animateIn>
              <MessageContent>
                <MessageBubble variant="soft">
                  <MessageBubbleContent className="text-base whitespace-pre-wrap">
                    {turn.content}
                  </MessageBubbleContent>
                </MessageBubble>
                <TurnActions
                  copyText={group.text || undefined}
                  onDelete={() => onDelete(deletionScope(turns, group))}
                />
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
                    phrases={BUILDING_PHRASES}
                    variant="cascade"
                    interval={2200}
                    className="py-1"
                  />
                )
              ) : (
                <AssistantBody
                  group={group}
                  names={names}
                  awaiting={awaiting}
                  onDecide={onDecide}
                />
              )}
              {group.pending ? null : (
                <TurnActions
                  copyText={group.text || undefined}
                  onRetry={index === groups.length - 1 ? onRetry : undefined}
                  onDelete={() => onDelete(deletionScope(turns, group))}
                />
              )}
            </MessageContent>
          </Message>
        );
      })}
    </MessageScroller>
  );
}
