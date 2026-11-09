import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { LumiCharacter } from "@/features/lumi/LumiCharacter";
import { greetingFor } from "@/features/lumi/greetings";
import { useProviderStatus } from "@/features/settings/providerStatus";

export function LumiPage() {
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [canSend, setCanSend] = useState(false);
  const [greeting, setGreeting] = useState(() => greetingFor());
  const configured = useProviderStatus((state) => state.configured);

  useEffect(() => {
    composerRef.current?.focus();
  }, []);

  // The slot only changes every few hours, but re-reading it on a slow tick
  // keeps a window that stays open across midnight honest.
  useEffect(() => {
    const timer = window.setInterval(() => setGreeting(greetingFor()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      {/* The character sizes itself from this box; adjust these two classes to
          scale Lumi without touching the engine. */}
      <div className="flex min-h-0 flex-1 -mt-18 flex-col items-center justify-center gap-4">
        <LumiCharacter className="size-28 sm:size-32" />
        <p className="max-w-md text-center text-lg text-muted-foreground">
          {greeting}
        </p>
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
          {/* Without a provider there is nothing to send to, so the banner
              replaces the send button instead of sitting next to a dead one. */}
          {configured ? (
            <Button size="md" className="px-6" disabled={!canSend}>
              发送
            </Button>
          ) : (
            <Link
              to="/settings/provider"
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AnimatedBadge status="warning" contentKey="no-provider">
                去配置 Provider
              </AnimatedBadge>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
