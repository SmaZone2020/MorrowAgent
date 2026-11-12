"use client";

import { useEffect, useRef, useState } from "react";
import { Key } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/vendor/beui/components/motion/animated-toast-stack";
import { Modal } from "@/components/Modal";
import { InfoHint } from "@/components/InfoHint";
import { listModels } from "@/features/settings/aiBridge";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { useSearchKey } from "@/features/settings/searchStore";
import { openExternalUrl } from "@/features/rich/openExternal";
import { ChoiceTabs } from "@/pages/settings/SettingsBlocks";
import {
  connectDeepSeekKey,
  readDeepSeekKeyPlan,
  signInDeepSeek,
  type DeepSeekAccount,
} from "@/features/onboarding/deepseekLogin";

const PLATFORM_URL = "https://platform.deepseek.com/api_keys";

/** How the learner hands over a DeepSeek credential. */
type Mode = "login" | "manual";

/**
 * The one step that must succeed before anything else can.
 *
 * Two ways in, because the two audiences are different. Someone who has never
 * opened the platform should not have to learn what an API key is: signing in
 * with the phone number they already used to register lets the backend mint a
 * key named after this app and adopt it for chat and search at once. Someone who
 * already keeps keys should not be forced through a login window to paste one
 * they have in hand.
 *
 * The sign-in itself runs in the platform's own window. Its captcha is verified
 * server-side against the vendor and its risk control decides per attempt which
 * challenge to show; reimplementing that here would mean loading a third-party
 * fingerprinting script into a page of ours, which is a worse trade than one
 * extra window.
 */
export function ProviderQuickSetup({
  onReady,
}: {
  onReady: (ready: boolean) => void;
}) {
  const providers = useProviderStatus((state) => state.providers);
  const activeProviderId = useProviderStatus((state) => state.activeProviderId);
  const activeModel = useProviderStatus((state) => state.activeModel);
  const configured = useProviderStatus((state) => state.configured);
  const saveBook = useProviderStatus((state) => state.saveBook);

  const target =
    providers.find((provider) => provider.builtin) ??
    providers.find((provider) => provider.id === activeProviderId) ??
    null;

  const [mode, setMode] = useState<Mode>("login");
  const [key, setKey] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<DeepSeekAccount | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ready = useRef(onReady);
  ready.current = onReady;

  const { toasts, showToast, updateToast, dismissToast } =
    useAnimatedToastStack({
      defaultDuration: 3600,
      limit: 3,
    });

  useEffect(() => {
    if (seeded || !target) return;
    if (target.apiKey) setKey(target.apiKey);
    setSeeded(true);
  }, [seeded, target]);

  useEffect(() => {
    if (configured) ready.current(true);
  }, [configured]);

  if (!target) {
    return (
      <AnimatedBadge status="loading" size="sm" contentKey="providers">
        正在读取供应商
      </AnimatedBadge>
    );
  }

  /**
   * The backend wrote the new key into the encrypted blobs itself, so the only
   * thing left is to re-read both stores: the provider book decides which model
   * answers, the search key decides whether Lumi can look things up.
   */
  const adopt = async (models: number, replaced: boolean) => {
    await useProviderStatus.getState().hydrate();
    const search = useSearchKey.getState();
    await search.hydrate();
    void search.refreshBalance();
    ready.current(true);
    return {
      status: "success" as const,
      title: replaced ? "已替换旧 Key 并连接" : "已连接 DeepSeek",
      description:
        models > 0 ? `已载入 ${models} 个模型。` : "Key 已保存，可在设置里拉取模型。",
    };
  };

  /**
   * `toastId` lets the sign-in flow reuse the toast it already opened instead
   * of stacking a second one a moment later: the learner is watching one line
   * of progress, not two.
   */
  const mint = async (replace: boolean, toastId?: string) => {
    setBusy(true);
    const id =
      toastId ??
      showToast({
        status: "loading",
        title: "正在创建 API Key",
        description: "在 DeepSeek 账号下新建一把名为 Morrow Agent 的 Key…",
        duration: 0,
      });

    updateToast(id, {
      status: "loading",
      title: "正在创建 API Key",
      description: "在 DeepSeek 账号下新建一把名为 Morrow Agent 的 Key…",
      duration: 0,
    });

    try {
      const result = await connectDeepSeekKey(replace);
      updateToast(id, await adopt(result.models.length, result.replaced));
    } catch (cause) {
      updateToast(id, {
        status: "error",
        title: "创建 Key 失败",
        description: cause instanceof Error ? cause.message : String(cause),
        duration: 6000,
      });
    } finally {
      setBusy(false);
    }
  };

  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    const toastId = showToast({
      status: "loading",
      title: "等待登录",
      description: "在弹出的窗口里用手机号完成验证。",
      duration: 0,
    });

    try {
      const who = await signInDeepSeek();
      setAccount(who);
      updateToast(toastId, {
        status: "loading",
        title: "已登录",
        description: "正在检查账号下已有的 Key…",
        duration: 0,
      });

      const plan = await readDeepSeekKeyPlan();
      if (plan.exists) {
        dismissToast(toastId);
        setBusy(false);
        setConfirmOpen(true);
        return;
      }

      await mint(false, toastId);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      // Closing the sign-in window is a decision, not a failure.
      if (message.includes("已取消")) {
        dismissToast(toastId);
      } else {
        updateToast(toastId, {
          status: "error",
          title: "登录失败",
          description: message,
          duration: 6000,
        });
      }
      setBusy(false);
    }
  };

  const save = async () => {
    const trimmed = key.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    const toastId = showToast({
      status: "loading",
      title: "正在验证 API Key",
      description: "保存凭据并拉取模型列表…",
      duration: 0,
    });

    try {
      await saveBook({
        providers: providers.map((provider) =>
          provider.id === target.id ? { ...provider, apiKey: trimmed } : provider,
        ),
        activeProviderId: target.id,
        activeModel,
      });
    } catch (cause) {
      updateToast(toastId, {
        status: "error",
        title: "保存失败",
        description: cause instanceof Error ? cause.message : "保存失败",
        duration: 5000,
      });
      setBusy(false);
      return;
    }

    try {
      const models = (
        await listModels({
          baseUrl: target.baseUrl,
          apiKey: trimmed,
          model: "",
          protocol: target.protocol,
        })
      )
        .map((entry) => entry.id)
        .filter(Boolean);

      if (models.length === 0) {
        updateToast(toastId, {
          status: "error",
          title: "Key 已保存，但没有可用模型",
          description: "检查这把 Key 是否有可用额度。",
          duration: 5000,
        });
        setBusy(false);
        return;
      }

      await saveBook({
        providers: providers.map((provider) =>
          provider.id === target.id
            ? { ...provider, apiKey: trimmed, models }
            : provider,
        ),
        activeProviderId: target.id,
        activeModel: models[0] ?? null,
      });

      updateToast(toastId, {
        status: "success",
        title: "连接成功",
        description: `已载入 ${models.length} 个模型。`,
      });
      ready.current(true);
    } catch (cause) {
      updateToast(toastId, {
        status: "error",
        title: "Key 已保存，但拉取模型失败",
        description: cause instanceof Error ? cause.message : "请检查网络",
        duration: 5000,
      });
    } finally {
      setBusy(false);
    }
  };

  const label = account?.mobile || account?.email || "";

  return (
    <>
      <div className="flex flex-col gap-4">
        <ChoiceTabs
          label="连接方式"
          value={mode}
          onChange={(next) => setMode(next)}
          options={[
            { value: "login", label: "官方账号登录" },
            { value: "manual", label: "填写 APIKey" },
          ]}
        />

        {mode === "login" ? (
          <div className="flex flex-col gap-3">
              <Button
                className="w-full rounded-xl text-sm"
                disabled={busy}
                onClick={() => void signIn()}
              >
                <Key className="size-4" />
                {busy ? "处理中" : label ? "重新登录并创建 Key" : "登录 DeepSeek"}
              </Button>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm leading-6 text-muted-foreground">
                Key 名为「Morrow Agent」，之后可以在开放平台单独删除。
              </p>
              <InfoHint label="登录窗口是 DeepSeek 官方页面，手机号、验证码和密钥都在它的服务器上处理，Morrow 只接收登录结果用来创建 Key。" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                type="password"
                value={key}
                onChange={(value) => {
                  setKey(value);
                  if (!configured) ready.current(false);
                }}
                placeholder={`${target.name} API KEY`}
                spellCheck={false}
                autoComplete="off"
                className="min-w-0 flex-1"
                classNames={{ field: "rounded-xl" }}
              />
              <Button
                className="mb-0 shrink-0 rounded-xl text-sm"
                variant="outline"
                disabled={busy || !key.trim()}
                onClick={() => void save()}
              >
                {busy ? "连接中" : "测试连接"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground hover:underline"
                onClick={() => void openExternalUrl(PLATFORM_URL)}
              >
                开放平台
              </Button>
              <InfoHint label="稍后可以在设置里换成别的供应商" />
            </div>
          </div>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="账号里已有同名 Key"
        width="sm"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => setConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="text-sm"
              onClick={() => {
                setConfirmOpen(false);
                void mint(true);
              }}
            >
              删除并重建
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-foreground">
          这个账号下已经有一把叫「Morrow Agent」的 Key。继续会先删掉它，再用新 Key 替换 ——
          旧 Key 会立即失效，任何还在用它的地方都会断开。
        </p>
      </Modal>

      <AnimatedToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        position="bottom-right"
        placement="fixed"
        maxVisible={3}
      />
    </>
  );
}
