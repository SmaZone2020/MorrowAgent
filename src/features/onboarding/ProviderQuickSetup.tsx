"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/vendor/beui/components/motion/animated-toast-stack";
import { listModels } from "@/features/settings/aiBridge";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { openExternalUrl } from "@/features/rich/openExternal";
import { InfoHint } from "@/components/InfoHint";

const PLATFORM_URL = "https://platform.deepseek.com/api_keys";

export function ProviderQuickSetup({
  onReady,
  onOpenSettings,
}: {
  onReady: (ready: boolean) => void;
  onOpenSettings: () => void;
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

  const [key, setKey] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [checking, setChecking] = useState(false);
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

  const save = async () => {
    const trimmed = key.trim();
    if (!trimmed || checking) return;

    setChecking(true);
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
      setChecking(false);
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
        setChecking(false);
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
      setChecking(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <Input
            label={`${target.name} API Key`}
            type="password"
            value={key}
            onChange={(value) => {
              setKey(value);
              if (!configured) ready.current(false);
            }}
            placeholder="sk-..."
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1"
            classNames={{ field: "rounded-xl" }}
          />
          <Button
            size="sm"
            className="mb-1.5 shrink-0 text-sm"
            disabled={checking || !key.trim()}
            onClick={() => void save()}
          >
            {checking ? "连接中" : "保存并连接"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-auto p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground hover:underline"
            onClick={() => void openExternalUrl(PLATFORM_URL)}
          >
            DeepSeek 开放平台
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-auto p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground hover:underline"
            onClick={onOpenSettings}
          >
            添加自定义供应商
          </Button>
          <InfoHint label="稍后可以在设置里换成别的供应商" />
        </div>
      </div>

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