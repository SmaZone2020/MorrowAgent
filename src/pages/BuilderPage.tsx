import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sliders } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { PromptInput } from "@/vendor/beui/components/agents/prompt-input";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Modal } from "@/components/Modal";
import { ConversationList } from "@/features/lumi/ConversationList";
import { BuilderMessages } from "@/features/builder/BuilderMessages";
import { BuilderIntro } from "@/features/builder/BuilderIntro";
import {
  EnvironmentSummary,
  FolderSlot,
  TierChoices,
  folderName,
  pickFolder,
} from "@/features/builder/WorkspacePanel";
import { BUILDER_WORKSPACE, useBuilderConversation } from "@/features/builder/conversation";
import { writeBoard } from "@/features/builder/board";
import {
  isPermissionTier,
  TIERS,
  type PermissionTier,
} from "@/features/builder/permission";
import { useBuildEnvironment } from "@/features/builder/useEnvironment";
import { usePersistedState } from "@/features/uiState";
import { appScope } from "@/features/uiState/scope";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { usePreferences } from "@/features/settings/preferencesStore";
import { supportsThinking } from "@/features/settings/thinking";
import { useSearchKey } from "@/features/settings/searchStore";
import { ThinkingControl } from "@/features/lumi/ThinkingControl";
import { SearchControl } from "@/features/lumi/SearchControl";

/**
 * Builder Mode: authoring a `.morrow` learning package in a local folder.
 *
 * The page is a console, not a chat. Everything it shows — the folder, the
 * permission tier, the tools on this machine — is a fact about where the
 * assistant will be allowed to work, and none of it can be inferred from the
 * transcript. That is why the setup screen comes before the composer: a first
 * message sent with no folder would only produce a refusal.
 *
 * It has no rail and no workspace: a build is not part of an installed package,
 * so it lives on the shelf layer at `/builder` and binds the conversation store
 * to the fixed `builder` workspace itself.
 */
export function BuilderPage() {
  const navigate = useNavigate();
  const [folder, setFolder] = usePersistedState(appScope("builder.folder"), "");
  const [storedTier, setStoredTier] = usePersistedState<string>(
    appScope("builder.tier"),
    "approve",
  );
  const tier: PermissionTier = isPermissionTier(storedTier) ? storedTier : "approve";
  const [draft, setDraft] = usePersistedState(appScope("builder.draft"), "");
  const [listOpen, setListOpen] = usePersistedState(
    appScope("builder.listOpen"),
    true,
  );
  const [setupOpen, setSetupOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const probe = useBuildEnvironment(folder);
  const configured = useProviderStatus((state) => state.configured);
  // Only the builtin DeepSeek endpoint understands the thinking field, so the
  // switch is offered on the same terms here as on the Lumi page.
  const thinkingAvailable = useProviderStatus((state) => {
    const active = state.providers.find(
      (provider) => provider.id === state.activeProviderId,
    );
    return active ? supportsThinking(active) : false;
  });
  const thinking = usePreferences((state) => state.thinking);
  const webSearch = usePreferences((state) => state.webSearch);
  const updatePreferences = usePreferences((state) => state.update);
  const searchReady = useSearchKey((state) => state.ready);
  const hydrateSearch = useSearchKey((state) => state.hydrate);

  useEffect(() => {
    void hydrateSearch();
  }, [hydrateSearch]);

  const conversationId = useBuilderConversation((state) => state.conversationId);
  const turns = useBuilderConversation((state) => state.turns);
  const sending = useBuilderConversation((state) => state.sending);
  const list = useBuilderConversation((state) => state.list);
  const pending = useBuilderConversation((state) => state.pending);
  const bindWorkspace = useBuilderConversation((state) => state.bindWorkspace);
  const hydrate = useBuilderConversation((state) => state.hydrate);
  const listLoaded = useBuilderConversation((state) => state.listLoaded);
  const bound = useBuilderConversation((state) => state.workspaceId);
  const openConversation = useBuilderConversation((state) => state.openConversation);
  const startNew = useBuilderConversation((state) => state.startNew);
  const rename = useBuilderConversation((state) => state.rename);
  const remove = useBuilderConversation((state) => state.remove);
  const send = useBuilderConversation((state) => state.send);
  const stop = useBuilderConversation((state) => state.stop);
  const regenerate = useBuilderConversation((state) => state.regenerate);
  const deleteTurns = useBuilderConversation((state) => state.deleteTurns);
  const approveCall = useBuilderConversation((state) => state.approveCall);

  // Bound by hand rather than through `useBoundConversation`: that hook reads
  // the package id from the workspace shell, and this page is not inside one.
  useEffect(() => {
    bindWorkspace(BUILDER_WORKSPACE);
  }, [bindWorkspace]);

  useEffect(() => {
    if (bound === BUILDER_WORKSPACE && !listLoaded) void hydrate();
  }, [bound, hydrate, listLoaded]);

  // The board is what the loop and the tool handlers read while a request is in
  // flight, so it has to be written on every change, not only before a send.
  useEffect(() => {
    writeBoard({ folder, tier, env: probe.env });
  }, [folder, tier, probe.env]);

  const chooseFolder = async () => {
    setPicking(true);
    try {
      const picked = await pickFolder();
      if (picked) setFolder(picked);
    } finally {
      setPicking(false);
    }
  };

  const changeTier = (next: PermissionTier) => {
    // Written before the state update: the gate reads the board synchronously
    // when the next round asks what may run.
    writeBoard({ tier: next });
    setStoredTier(next);
  };

  /**
   * One decision from an approval card.
   *
   * `always` is a gesture, not a checkbox: it switches the session's tier and
   * then lets through the calls that were parked in the same turn under the old
   * one, because they were only waiting for a permission this decision granted.
   * A turn parks on all-or-nothing, so the last answer is the one that resumes
   * the request — hence the loop rather than a single call.
   */
  const decide = (callId: string, decision: "allow" | "deny" | "always") => {
    if (decision !== "always") {
      void approveCall(callId, decision !== "deny");
      return;
    }

    changeTier("autonomous");
    const parked = useBuilderConversation.getState().pending;
    const waiting = (parked?.calls ?? []).filter(
      (call) => parked?.results[call.id] === undefined,
    );

    void (async () => {
      for (const call of waiting) await approveCall(call.id, true);
    })();
  };

  const submit = (value: string) => {
    const text = value.trim();
    if (!text || !configured || sending || pending || !folder) return;
    setDraft("");
    void send(text);
  };

  const starter = (prompt: string) => {
    if (!folder || sending || pending) return;
    setDraft("");
    void send(prompt);
  };

  if (!folder) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <BuilderHeader onBack={() => navigate("/")} />
        <div className="scrollbar-thin mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col justify-center gap-6 overflow-y-auto px-5 py-8 sm:px-7">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              选择工作区文件夹
            </h1>
          </div>

          <FolderSlot folder={folder} busy={picking} onPick={() => void chooseFolder()} />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">权限</p>
            <TierChoices tier={tier} onChange={changeTier} />
          </div>

        </div>
      </div>
    );
  }

  const empty = turns.length === 0;
  const tierLabel = TIERS.find((item) => item.id === tier)?.label ?? "操作审批";

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

      <div className="mx-auto flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-5 sm:p-7">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Tooltip content="返回书架" side="bottom">
            <Button
              size="sm"
              variant="ghost"
              aria-label="返回书架"
              className="size-8 shrink-0 rounded-full p-0"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Tooltip>

          <Tooltip content={folder} side="bottom">
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-sm text-foreground outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 max-w-[16rem] truncate">
                {folderName(folder)}
              </span>
              <Sliders className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </Tooltip>

          <AnimatedBadge
            status={tier === "autonomous" ? "warning" : "neutral"}
            size="sm"
            contentKey={tier}
          >
            {tierLabel}
          </AnimatedBadge>

          <span className="ml-auto text-xs text-muted-foreground">
            {probe.probing ? "正在探测环境…" : probe.env ? `${probe.env.shell} · ${probe.env.os}` : ""}
          </span>
        </div>

        {empty ? (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <BuilderIntro onPick={starter} />
          </div>
        ) : (
          <BuilderMessages
            turns={turns}
            pending={pending}
            onDecide={decide}
            onRetry={() => void regenerate()}
            onDelete={deleteTurns}
          />
        )}

        <div className="shrink-0">
          {configured ? (
            <PromptInput
              value={draft}
              onValueChange={setDraft}
              placeholder={
                pending?.kind === "approve"
                  ? "先处理上面的审批卡片"
                  : "说说你想做的学习包"
              }
              aria-label="跟构建助手说话"
              minRows={2}
              maxRows={8}
              loading={sending}
              disabled={Boolean(pending)}
              onSubmit={submit}
              onStop={stop}
              className="bg-card shadow-surface"
              leadingAction={
                <div className="flex items-center gap-1">
                  {thinkingAvailable ? (
                    <ThinkingControl
                      value={thinking}
                      disabled={sending}
                      onChange={(level) => updatePreferences({ thinking: level })}
                    />
                  ) : null}
                  <SearchControl
                    enabled={webSearch}
                    ready={searchReady}
                    disabled={sending}
                    onChange={(enabled) => updatePreferences({ webSearch: enabled })}
                  />
                </div>
              }
            />
          ) : (
            <div className="flex justify-end rounded-2xl bg-card p-2 shadow-surface">
              <Button size="sm" variant="secondary" className="text-sm" onClick={() => navigate("/settings/provider")}>
                去配置 Provider
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={setupOpen}
        onOpenChange={setSetupOpen}
        title="工作区与权限"
        width="md"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">工作区文件夹</p>
            <FolderSlot
              folder={folder}
              busy={picking}
              onPick={() => void chooseFolder()}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              换一个文件夹不会清空对话，但接下来的文件操作都会落在新文件夹里。
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">权限</p>
            <TierChoices tier={tier} onChange={changeTier} />
          </div>

          <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
            <p className="text-sm font-medium text-foreground">这台机器</p>
            <EnvironmentSummary
              env={probe.env}
              probing={probe.probing}
              error={probe.error}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** The header the setup gate keeps, so the way back never disappears. */
function BuilderHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-3 px-5 pt-5 sm:px-7 sm:pt-7">
      <Tooltip content="返回书架" side="bottom">
        <Button
          size="sm"
          variant="ghost"
          aria-label="返回书架"
          className="size-8 shrink-0 rounded-full p-0"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
        </Button>
      </Tooltip>
      <h1 className="min-w-0 Siyuan flex-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        构建学习包
      </h1>
      <AnimatedBadge status="neutral" size="sm" contentKey="builder">
        构建模式
      </AnimatedBadge>
    </header>
  );
}
