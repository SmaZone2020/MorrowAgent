import { useEffect, useRef } from "react";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { LumiMark } from "@/features/lumi/LumiMark";
import type { ConversationTurn } from "@/features/lumi/conversation";
import { cn } from "@/vendor/beui/lib/utils";

interface MessageListProps {
  turns: ConversationTurn[];
}

export function MessageList({ turns }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // New turns and streamed text both land here, so the end marker is the one
  // thing worth keeping pinned.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin py-2">
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
              {turn.pending ? (
                <AnimatedBadge status="info" size="sm" contentKey="thinking">
                  正在思考
                </AnimatedBadge>
              ) : turn.error ? (
                <p className="text-sm leading-6 text-destructive">{turn.error}</p>
              ) : (
                <p
                  className={cn(
                    "text-sm leading-7 whitespace-pre-wrap text-foreground",
                  )}
                >
                  {turn.content}
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
