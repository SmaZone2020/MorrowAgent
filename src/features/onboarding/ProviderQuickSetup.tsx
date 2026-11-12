import { useEffect, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { listModels } from "@/features/settings/aiBridge";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { openExternalUrl } from "@/features/rich/openExternal";

const PLATFORM_URL = "https://platform.deepseek.com/api_keys";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "done"; models: number }
  | { kind: "failed"; reason: string };

/**
 * The first-run shortcut for the one provider most learners have.
 *
 * The settings page is the full editor — several providers, three protocols, a
 * model picker. Onboarding does not need any of that: the builtin DeepSeek row
 * already exists with its endpoint and models, so the only missing piece is the
 * key. Asking for it here means a first launch ends with Lumi actually able to
 * answer, instead of ending on a link to somewhere else.
 *
 * Saving also fetches the model list once. That fetch is the proof the key
 * works, so it is what unlocks 「下一步」; a key that saves but cannot list
 * models is still kept and reported, because an exhausted balance reads the
 * same as a wrong key from here.
 */
export function ProviderQuickSetup({
  onReady,
  onOpenSettings,
}: {
  /** Called when the key is proven to work, or when one was already stored. */
  onReady: (ready: boolean) => void;
  /** The full editor, for anything this shortcut does not cover. */
  onOpenSettings: () => void;
}) {
  const providers = useProviderStatus((state) => state.providers);
  const activeProviderId = useProviderStatus((state) => state.activeProviderId);
  const activeModel = useProviderStatus((state) => state.activeModel);
  const configured = useProviderStatus((state) => state.configured);
  const saveBook = useProviderStatus((state) => state.saveBook);

  // The builtin first, always: a first run is the moment the shipped provider
  // exists for. Falling back to the active row keeps the step usable in a build
  // that has no builtin (the `.env.local` debug endpoint, for instance).
  const target =
    providers.find((provider) => provider.builtin) ??
    providers.find((provider) => provider.id === activeProviderId) ??
    null;

  const [key, setKey] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const ready = useRef(onReady);
  ready.current = onReady;

  // The stored key arrives with the boot read, which may finish after this
  // step mounts. Seeding once keeps a later store update from overwriting what
  // the learner is typing.
  useEffect(() => {
    if (seeded || !target) return;
    if (target.apiKey) setKey(target.apiKey);
    setSeeded(true);
  }, [seeded, target]);

  // An already-working provider needs no proof: the step is satisfied on entry.
  useEffect(() => {
    if (configured) ready.current(true);
  }, [configured]);

  if (!target) {
    // The builtin row is written on the first provider read, which can land
    // after this step mounts. An empty body would read as a broken step.
    return (
      <AnimatedBadge status="loading" size="sm" contentKey="providers">
        正在读取供应商
      </AnimatedBadge>
    );
  }

  const save = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setStatus({ kind: "saving" });
    try {
      // The key is written first so a failed model fetch still leaves the
      // learner with a saved credential rather than a lost one.
      await saveBook({
        providers: providers.map((provider) =>
          provider.id === target.id ? { ...provider, apiKey: trimmed } : provider,
        ),
        activeProviderId: target.id,
        activeModel,
      });
    } catch (cause) {
      setStatus({
        kind: "failed",
        reason: cause instanceof Error ? cause.message : "保存失败",
      });
      return;
    }

    // Fetching the list is the check that the key actually works: a wrong key
    // fails here, which is why 「下一步」 waits for this.
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
        setStatus({
          kind: "failed",
          reason: "Key 已保存，但没有读到任何模型：检查这把 Key 是否有可用额度。",
        });
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
      setStatus({ kind: "done", models: models.length });
      ready.current(true);
    } catch (cause) {
      setStatus({
        kind: "failed",
        reason: `Key 已保存，但拉取模型失败：${
          cause instanceof Error ? cause.message : "请检查网络"
        }`,
      });
    }
  };

  const checking = status.kind === "saving";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <Input
          label={`${target.name} API Key`}
          type="password"
          value={key}
          onChange={(value) => {
            setKey(value);
            setStatus({ kind: "idle" });
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

      {status.kind === "done" ? (
        <AnimatedBadge status="success" size="sm" contentKey="saved">
          {status.models > 0
            ? `已连接，读到 ${status.models} 个模型`
            : "Key 已保存，可以直接使用"}
        </AnimatedBadge>
      ) : null}
      {status.kind === "failed" ? (
        <p className="text-sm leading-6 text-destructive">{status.reason}</p>
      ) : null}

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
      </div>
    </div>
  );
}
