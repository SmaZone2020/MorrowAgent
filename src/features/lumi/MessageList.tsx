import { useEffect, useRef } from "react";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { LumiMark } from "@/features/lumi/LumiMark";
import type { ConversationTurn } from "@/features/lumi/conversation";

interface MessageListProps {
  turns: ConversationTurn[];
}

export function MessageList({ turns }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = turns.at(-1)?.id;
  const lastLength = turns.at(-1)?.content.length ?? 0;

  // Follow the tail as tokens arrive, not just when a turn is added.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [lastId, lastLength]);

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2">
      {turns.map((turn) =>
        turn.role === "user" ? (
          <div key={turn.id} className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap text-foreground">
              {turn.content}
            </p>
          </div>
        ) : (
          <div key={turn.id} className="flex items-start gap-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <LumiMark className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              {turn.error ? (
                <p className="text-sm leading-6 text-destructive">{turn.error}</p>
              ) : turn.pending && !turn.content ? (
                <AnimatedBadge status="info" size="sm" contentKey="thinking">
                  正在思考
                </AnimatedBadge>
              ) : (
                <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">
                  {turn.content}
                  {turn.pending ? (
                    <span
                      aria-hidden="true"
                      className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-foreground align-middle"
                    />
                  ) : null}
                </p>
              )}
            </div>
          </div>
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}
