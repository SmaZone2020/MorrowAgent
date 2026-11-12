import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Paperclip } from "@gravity-ui/icons";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { AttachmentUpload } from "@/vendor/beui/components/motion/attachment-upload";
import { PromptInput } from "@/vendor/beui/components/agents/prompt-input";
import { LumiCharacter } from "@/features/lumi/LumiCharacter";
import { MessageList } from "@/features/lumi/MessageList";
import { ConversationList } from "@/features/lumi/ConversationList";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS } from "@/features/lumi/attachments";
import {
  ATTACHMENT_ACCEPT,
  useAttachmentDraft,
} from "@/features/lumi/useAttachmentDraft";
import { useConversation } from "@/features/lumi/conversation";
import { useBoundConversation } from "@/features/lumi/useBoundConversation";
import { setLumiOnScreen, useLumiActivity } from "@/features/lumi/activity";
import { greetingFor } from "@/features/lumi/greetings";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { usePreferences } from "@/features/settings/preferencesStore";
import { supportsThinking } from "@/features/settings/thinking";
import { ThinkingControl } from "@/features/lumi/ThinkingControl";
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
  const configured = useProviderStatus((state) => state.configured);
  // A text-only model gets no image uploads: the file would be read, stored and
  // then dropped from the request, which is worse than refusing it up front.
  const vision = useProviderStatus((state) => {
    const active = state.providers.find(
      (provider) => provider.id === state.activeProviderId,
    );
    return active?.supportsVision !== false;
  });
  // Only the builtin DeepSeek endpoint understands the thinking field, so the
  // switch is not offered for the other providers at all.
  const thinkingAvailable = useProviderStatus((state) => {
    const active = state.providers.find(
      (provider) => provider.id === state.activeProviderId,
    );
    return active ? supportsThinking(active) : false;
  });
  const thinking = usePreferences((state) => state.thinking);
  const updatePreferences = usePreferences((state) => state.update);
  const draftAttachments = useAttachmentDraft(vision);
  const attachments = draftAttachments.attachments;
  // The picker is a panel above the composer, not a permanent band: it opens
  // from the paperclip and stays open while it holds rows, so a send leaves the
  // composer compact again.
  const [pickerOpen, setPickerOpen] = useState(false);
  const showPicker = pickerOpen || draftAttachments.items.length > 0;

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
  const deleteTurns = useConversation((state) => state.deleteTurns);
  const beginEdit = useConversation((state) => state.beginEdit);
  const cancelEdit = useConversation((state) => state.cancelEdit);
  const editingTurnId = useConversation((state) => state.editingTurnId);
  const pending = useConversation((state) => state.pending);
  const answerQuiz = useConversation((state) => state.answerQuiz);

  // The package and the learner block are published by the workspace shell, so
  // a reply keeps its tools after this page unmounts.

  // A reply that finishes while this page is open is already visible here, so
  // it is not announced; the count is what the activity store checks.
  useEffect(() => {
    setLumiOnScreen(workspaceId, true);
    useLumiActivity.getState().clearUnread(workspaceId);
    return () => setLumiOnScreen(workspaceId, false);
  }, [workspaceId]);

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
    draftAttachments.clear();
    beginEdit(turnId);
  };

  const leaveEdit = () => {
    cancelEdit();
    setDraft("");
    draftAttachments.clear();
    setPickerOpen(false);
  };

  const submit = (value: string) => {
    const text = value.trim();
    if (!text && attachments.length === 0) return;
    if (!configured || sending || draftAttachments.reading) return;
    // A parked quiz owns the turn: sending text now would abandon a tool call
    // with no result, which every provider rejects.
    if (pending) return;
    setDraft("");
    const files = attachments;
    draftAttachments.clear();
    setPickerOpen(false);
    void send(text, files);
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
            onDelete={(turnIds) => {
              if (editingTurnId && turnIds.includes(editingTurnId)) leaveEdit();
              deleteTurns(turnIds);
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
              {draftAttachments.error ? (
                <p className="text-sm text-destructive">{draftAttachments.error}</p>
              ) : null}
              {/* The registry's upload workspace is the whole picker: it owns
                  the drop target, the rows, the per-file retry and the image
                  preview, so nothing here is a hand-rolled file input. */}
              {showPicker ? (
                <AttachmentUpload
                  value={draftAttachments.items}
                  onValueChange={draftAttachments.sync}
                  onFilesAdded={draftAttachments.added}
                  onFilesRejected={draftAttachments.rejected}
                  onRetry={draftAttachments.retry}
                  accept={ATTACHMENT_ACCEPT}
                  multiple
                  maxFiles={MAX_ATTACHMENTS}
                  maxFileSize={MAX_ATTACHMENT_BYTES}
                  disabled={Boolean(pending) || sending}
                  title="拖入文件，或点击选择"
                  description={
                    vision
                      ? "图片、PDF 与文本，单个不超过 24 MB"
                      : "当前模型不支持图片，只能传 PDF 或文本"
                  }
                  attachmentsLabel="待发送"
                  // The rows sit right under the drop bar, not in the registry's
                  // own section spacing, which assumes a page of its own.
                  className="[&>section]:mt-2"
                  labels={{
                    input: "选择附件",
                    attachments: "待发送",
                    removeAttachment: "移除附件",
                    remove: "移除 {name}",
                    retryUpload: "重试",
                    retry: "重试 {name}",
                    clickToPreview: "点击预览",
                    preview: "预览 {name}",
                    closePreview: "关闭预览",
                    limitTitle: "附件已满",
                    limitDescription: "已添加 {count} / {max} 个附件",
                  }}
                  classNames={{
                    // One compact bar instead of the registry's big drop card:
                    // this sits above a composer, not on a page of its own. The
                    // icon is the second child; the first is the dashed border.
                    dropzone:
                      "min-h-0 flex-row flex-wrap items-center justify-start gap-x-3 px-4 py-2 text-left [&>span]:my-0 [&>span:nth-child(2)]:mb-0 [&>span:nth-child(2)]:size-8 [&>span:nth-child(2)]:rounded-xl [&>span:last-child]:text-sm",
                    list: "mt-2 space-y-1.5",
                  }}
                />
              ) : null}
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
                loading={sending || draftAttachments.reading}
                disabled={Boolean(pending)}
                onSubmit={submit}
                onStop={stop}
                className="bg-card shadow-surface"
                leadingAction={
                  <div className="flex items-center gap-1">
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
                        aria-pressed={pickerOpen}
                        disabled={Boolean(pending) || sending || draftAttachments.reading}
                        className="size-8 rounded-full p-0"
                        onClick={() => setPickerOpen((open) => !open)}
                      >
                        <Paperclip className="size-4" />
                      </Button>
                    </Tooltip>
                    {thinkingAvailable ? (
                      <ThinkingControl
                        value={thinking}
                        disabled={sending}
                        onChange={(level) => updatePreferences({ thinking: level })}
                      />
                    ) : null}
                  </div>
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
