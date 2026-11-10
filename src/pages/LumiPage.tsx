import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { PromptInput } from "@/vendor/beui/components/agents/prompt-input";
import { LumiCharacter } from "@/features/lumi/LumiCharacter";
import { MessageList } from "@/features/lumi/MessageList";
import { useConversation } from "@/features/lumi/conversation";
import { greetingFor } from "@/features/lumi/greetings";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { useEffect } from "react";

export function LumiPage() {
  const [greeting, setGreeting] = useState(() => greetingFor());
  const configured = useProviderStatus((state) => state.configured);
  const conversationId = useConversation((state) => state.conversationId);
  const turns = useConversation((state) => state.turns);
  const sending = useConversation((state) => state.sending);
  const send = useConversation((state) => state.send);
  const stop = useConversation((state) => state.stop);
  const hydrate = useConversation((state) => state.hydrate);
  const reset = useConversation((state) => state.reset);
  const empty = turns.length === 0;

  // Pick up the last conversation once, then leave the store alone: a reload
  // mid-conversation should not look like a fresh page.
  useEffect(() => {
    if (!conversationId) void hydrate();
  }, [conversationId, hydrate]);

  // The greeting names a slice of the day, so it only has to change when that
  // slice does; a minute tick is the cheapest way to catch the boundary.
  useEffect(() => {
    const tick = setInterval(() => setGreeting(greetingFor()), 60_000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      {empty ? (
        <div className="-mt-18 flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
          <LumiCharacter className="size-28 sm:size-32" />
          <p className="max-w-md text-center text-lg text-muted-foreground">
            {greeting}
          </p>
        </div>
      ) : (
        <MessageList turns={turns} onRetry={reset} />
      )}

      <div className="shrink-0">
        {/* Without a provider there is nothing to send to, so the banner
            replaces the composer instead of sitting above a dead one. */}
        {configured ? (
          <PromptInput
            placeholder="和 Lumi 说点什么"
            aria-label="和 Lumi 说点什么"
            minRows={1}
            maxRows={8}
            loading={sending}
            onSubmit={(value) => void send(value)}
            onStop={stop}
            leadingAction={
              empty ? null : (
                <button
                  type="button"
                  onClick={reset}
                  disabled={sending}
                  className="ml-1 inline-flex h-8 items-center rounded-xl px-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  新对话
                </button>
              )
            }
            className="bg-card shadow-surface"
          />
        ) : (
          <div className="flex justify-end rounded-2xl bg-card p-2 shadow-surface">
            <Link
              to="/settings/provider"
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AnimatedBadge status="warning" contentKey="no-provider">
                去配置 Provider
              </AnimatedBadge>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
