import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Button } from "@/vendor/beui/components/motion/button";
import { PromptInput } from "@/vendor/beui/components/agents/prompt-input";
import { LumiCharacter } from "@/features/lumi/LumiCharacter";
import { MessageList } from "@/features/lumi/MessageList";
import { ConversationList } from "@/features/lumi/ConversationList";
import { useConversation } from "@/features/lumi/conversation";
import { useBoundConversation } from "@/features/lumi/useBoundConversation";
import { greetingFor } from "@/features/lumi/greetings";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { usePersistedState } from "@/features/uiState/usePersistedState";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";
import { workspaceScope } from "@/features/uiState/scope";

export function LumiPage() {
  // Binds the shared store to this package before anything is read, so a
  // transcript from another workspace never flashes on the way in.
  useBoundConversation(useConversation);

  const workspaceId = useWorkspaceId();
  const [greeting, setGreeting] = useState(() => greetingFor());
  const [draft, setDraft] = usePersistedState(
    workspaceScope(workspaceId, "lumi.draft"),
    "",
  );
  const [listOpen, setListOpen] = usePersistedState(
    workspaceScope(workspaceId, "lumi.listOpen"),
    true,
  );
  const configured = useProviderStatus((state) => state.configured);

  const conversationId = useConversation((state) => state.conversationId);
  const turns = useConversation((state) => state.turns);
  const sending = useConversation((state) => state.sending);
  const list = useConversation((state) => state.list);
  const openConversation = useConversation((state) => state.openConversation);
  const startNew = useConversation((state) => state.startNew);
  const rename = useConversation((state) => state.rename);
  const remove = useConversation((state) => state.remove);
  const send = useConversation((state) => state.send);
  const stop = useConversation((state) => state.stop);
  const regenerate = useConversation((state) => state.regenerate);
  const deleteTurn = useConversation((state) => state.deleteTurn);
  const beginEdit = useConversation((state) => state.beginEdit);
  const cancelEdit = useConversation((state) => state.cancelEdit);
  const editingTurnId = useConversation((state) => state.editingTurnId);

  const empty = turns.length === 0;

  // The greeting names a slice of the day, so it only has to change when that
  // slice does; a minute tick is the cheapest way to catch the boundary.
  useEffect(() => {
    const tick = setInterval(() => setGreeting(greetingFor()), 60_000);
    return () => clearInterval(tick);
  }, []);

  // Picking "edit" loads that question back into the composer; sending it then
  // replaces the question and everything after it.
  const startEdit = (turnId: string) => {
    if (sending) return;
    const target = turns.find((turn) => turn.id === turnId);
    if (!target) return;
    setDraft(target.content);
    beginEdit(turnId);
  };

  const leaveEdit = () => {
    cancelEdit();
    setDraft("");
  };

  const submit = (value: string) => {
    const text = value.trim();
    if (!text || !configured || sending) return;
    setDraft("");
    void send(text);
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      <ConversationList
        list={list}
        activeId={conversationId}
        open={listOpen}
        onToggle={() => setListOpen((value) => !value)}
        onSelect={(id) => void openConversation(id)}
        onCreate={() => {
          setDraft("");
          void startNew();
        }}
        onRename={(id, title) => void rename(id, title)}
        onDelete={(id) => void remove(id)}
      />

      <div className="mx-auto flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-5 sm:p-7">
        {empty ? (
          <div className="-mt-18 flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
            <LumiCharacter className="size-28 sm:size-32" />
            <p className="max-w-md text-center text-lg text-muted-foreground">
              {greeting}
            </p>
          </div>
        ) : (
          <MessageList
            turns={turns}
            onRetry={() => void regenerate()}
            onDelete={(turnId) => {
              if (turnId === editingTurnId) leaveEdit();
              deleteTurn(turnId);
            }}
            onEdit={startEdit}
            editingTurnId={editingTurnId}
          />
        )}

        <div className="shrink-0">
          {/* Without a provider there is nothing to send to, so the banner
              replaces the composer instead of sitting above a dead one. */}
          {configured ? (
            <div className="flex flex-col gap-2">
              {editingTurnId ? (
                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-sm"
                    onClick={leaveEdit}
                  >
                    取消编辑
                  </Button>
                </div>
              ) : null}
              <PromptInput
                value={draft}
                onValueChange={setDraft}
                placeholder={
                  editingTurnId ? "修改后发送，将替换后续对话" : "跟 Lumi 说点什么"
                }
                aria-label="跟 Lumi 说点什么"
                minRows={2}
                maxRows={8}
                loading={sending}
                onSubmit={submit}
                onStop={stop}
                className="bg-card shadow-surface"
              />
            </div>
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
    </div>
  );
}
