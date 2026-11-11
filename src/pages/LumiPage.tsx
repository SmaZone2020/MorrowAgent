import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Paperclip } from "@gravity-ui/icons";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { PromptInput } from "@/vendor/beui/components/agents/prompt-input";
import { LumiCharacter } from "@/features/lumi/LumiCharacter";
import { MessageList } from "@/features/lumi/MessageList";
import { ConversationList } from "@/features/lumi/ConversationList";
import { AttachmentTray } from "@/features/lumi/AttachmentPreview";
import {
  isSupported,
  MAX_ATTACHMENTS,
  readAttachment,
} from "@/features/lumi/attachments";
import type { MessageAttachment } from "@/features/lumi/history";
import { useConversation } from "@/features/lumi/conversation";
import { useBoundConversation } from "@/features/lumi/useBoundConversation";
import { useToolContext } from "@/features/lumi/useToolContext";
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
  // Uploads stay in memory only: a base64 photo is not something to write into
  // the interface-state file, and losing an unsent attachment on reload is
  // cheaper than carrying it around.
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const configured = useProviderStatus((state) => state.configured);
  // A text-only model gets no image uploads: the file would be read, stored and
  // then dropped from the request, which is worse than refusing it up front.
  const vision = useProviderStatus((state) => {
    const active = state.providers.find(
      (provider) => provider.id === state.activeProviderId,
    );
    return active?.supportsVision !== false;
  });

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
  const pending = useConversation((state) => state.pending);
  const answerQuiz = useConversation((state) => state.answerQuiz);

  // Publishes the package to the tool layer; tools read live content.
  useToolContext("lumi");

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
    // The rewrite replaces the turn, so it starts from text again; keeping the
    // old files would silently re-send them with a different question.
    setAttachments([]);
    beginEdit(turnId);
  };

  const leaveEdit = () => {
    cancelEdit();
    setDraft("");
    setAttachments([]);
  };

  const submit = (value: string) => {
    const text = value.trim();
    if (!text && attachments.length === 0) return;
    if (!configured || sending || reading) return;
    // A parked quiz owns the turn: sending text now would abandon a tool call
    // with no result, which every provider rejects.
    if (pending) return;
    setDraft("");
    const files = attachments;
    setAttachments([]);
    setAttachError(null);
    void send(text, files);
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setAttachError(null);
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setAttachError(`一次最多 ${MAX_ATTACHMENTS} 个附件`);
      return;
    }

    const picked = [...files].slice(0, room);
    setReading(true);
    try {
      const read: MessageAttachment[] = [];
      for (const file of picked) {
        if (!isSupported(file)) {
          setAttachError(`暂不支持 ${file.name}`);
          continue;
        }
        if (!vision && file.type.startsWith("image/")) {
          setAttachError("当前模型不支持图片，请改传文档或截图里的文字");
          continue;
        }
        try {
          read.push(await readAttachment(file));
        } catch (error) {
          setAttachError(
            error instanceof Error ? error.message : `${file.name} 读取失败`,
          );
        }
      }
      if (read.length > 0) setAttachments((current) => [...current, ...read]);
    } finally {
      setReading(false);
    }
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
            pending={pending}
            onAnswerQuiz={(callId, output) => void answerQuiz(callId, output)}
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
              {attachError ? (
                <p className="text-sm text-destructive">{attachError}</p>
              ) : null}
              <AttachmentTray
                attachments={attachments}
                onRemove={(id) =>
                  setAttachments((current) =>
                    current.filter((attachment) => attachment.id !== id),
                  )
                }
              />
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,.md,.txt,.csv,.json"
                onChange={(event) => {
                  void addFiles(event.target.files);
                  // Clearing lets the same file be picked again after removal.
                  event.target.value = "";
                }}
              />
              <PromptInput
                value={draft}
                onValueChange={setDraft}
                placeholder={
                  pending
                    ? "先完成上面的题目"
                    : editingTurnId
                      ? "修改后发送，将替换后续对话"
                      : "跟 Lumi 说点什么"
                }
                aria-label="跟 Lumi 说点什么"
                minRows={2}
                maxRows={8}
                loading={sending || reading}
                disabled={Boolean(pending)}
                onSubmit={submit}
                onStop={stop}
                className="bg-card shadow-surface"
                leadingAction={
                  <Tooltip
                    content={
                      vision
                        ? "添加图片或文档"
                        : "当前模型不支持图片，只能添加文档"
                    }
                    side="top"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="添加附件"
                      disabled={Boolean(pending) || sending || reading}
                      className="size-8 rounded-full p-0"
                      onClick={() => fileInput.current?.click()}
                    >
                      <Paperclip className="size-4" />
                    </Button>
                  </Tooltip>
                }
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
