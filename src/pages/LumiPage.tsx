import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { LumiCharacter } from "@/features/lumi/LumiCharacter";
import { MessageList } from "@/features/lumi/MessageList";
import { useConversation } from "@/features/lumi/conversation";
import { greetingFor } from "@/features/lumi/greetings";
import { useProviderStatus } from "@/features/settings/providerStatus";

export function LumiPage() {
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  // The greeting is recomputed on submit rather than on a timer: an empty page
  // that sits open all evening does not need a midnight update more than it
  // needs to not re-render every minute.
  const [greeting] = useState(() => greetingFor());
  const configured = useProviderStatus((state) => state.configured);
  const turns = useConversation((state) => state.turns);
  const sending = useConversation((state) => state.sending);
  const send = useConversation((state) => state.send);
  const empty = turns.length === 0;

  const submit = () => {
    const text = draft.trim();
    if (!text || !configured || sending) return;
    setDraft("");
    void send(text);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      {empty ? (
        <div className="flex min-h-0 flex-1 -mt-18 flex-col items-center justify-center gap-4">
          <LumiCharacter className="size-28 sm:size-32" />
          <p className="max-w-md text-center text-lg text-muted-foreground">
            {greeting}
          </p>
        </div>
      ) : (
        <MessageList turns={turns} />
      )}

      <div className="shrink-0 rounded-2xl bg-card p-2 shadow-surface">
        <textarea
          ref={composerRef}
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="和 Lumi 说点什么"
          className="max-h-40 min-h-16 w-full resize-none rounded-xl bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-end gap-2 px-1 pb-1">
          {/* Without a provider there is nothing to send to, so the banner
              replaces the send button instead of sitting next to a dead one. */}
          {configured ? (
            <Button
              size="md"
              className="px-6"
              disabled={!draft.trim() || sending}
              onClick={submit}
            >
              {sending ? "思考中" : "发送"}
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
