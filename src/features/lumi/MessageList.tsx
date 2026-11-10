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
import type { ConversationTurn } from "@/features/lumi/conversation";

interface MessageListProps {
  turns: ConversationTurn[];
  onRetry?: () => void;
}

// Phrased as work in progress rather than a spinner label: the reply really is
// the model reading the question and drafting an answer.
const THINKING_PHRASES = ["正在读题", "在理清思路", "正在组织表述", "马上就好"];

export function MessageList({ turns, onRetry }: MessageListProps) {
  const busy = turns.at(-1)?.pending === true;

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
              <MessageBubble variant="soft">
                <MessageBubbleContent className="whitespace-pre-wrap">
                  {turn.content}
                </MessageBubbleContent>
              </MessageBubble>
            </MessageContent>
          </Message>
        ) : (
          <Message key={turn.id} from="assistant" animateIn>
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center">
              <LumiMark className="size-7" />
            </span>
            <MessageContent>
              {turn.error ? (
                <MessageBubble variant="danger">
                  <MessageBubbleContent>{turn.error}</MessageBubbleContent>
                </MessageBubble>
              ) : turn.pending && !turn.content ? (
                <ReasoningText
                  phrases={THINKING_PHRASES}
                  variant="cascade"
                  interval={2200}
                  className="py-1"
                />
              ) : (
                <StreamingResponse
                  status={turn.pending ? "streaming" : "complete"}
                  copyText={turn.content}
                  onRetry={onRetry}
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
              )}
            </MessageContent>
          </Message>
        ),
      )}
    </MessageScroller>
  );
}
