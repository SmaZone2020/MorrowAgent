import { useEffect, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { LumiCharacter } from "@/features/lumi/LumiCharacter";

export function LumiPage() {
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [canSend, setCanSend] = useState(false);

  useEffect(() => {
    composerRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LumiCharacter className="size-44 sm:size-52" />
      </div>

      <div className="shrink-0 rounded-2xl bg-card p-2 shadow-surface">
        <textarea
          ref={composerRef}
          rows={2}
          onChange={(event) => setCanSend(event.target.value.trim().length > 0)}
          placeholder="和 Lumi 说点什么"
          className="max-h-40 min-h-16 w-full resize-none rounded-xl bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-end gap-2 px-1 pb-1">
          <AnimatedBadge status="warning" size="sm" contentKey="no-provider">
            未配置 Provider
          </AnimatedBadge>
          <Button size="sm" variant="ghost" disabled={!canSend}>
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
