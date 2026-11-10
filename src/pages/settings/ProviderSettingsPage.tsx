import { useEffect, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { InfoHint } from "@/components/InfoHint";
import { ProviderEditor, type TestState } from "@/pages/settings/ProviderEditor";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { listModels } from "@/features/settings/aiBridge";
import type { StoredProviderProfile } from "@/features/settings/providerStore";
import { usePersistedState } from "@/features/uiState";

/**
 * The half-edited provider list, kept across page changes. API keys are
 * deliberately absent: interface state is a plain file (D-070).
 */
interface DraftProvider {
  id: string;
  name: string;
  baseUrl: string;
  protocol: NonNullable<StoredProviderProfile["protocol"]>;
  models: string[];
}

interface ProviderDraft {
  providers: DraftProvider[];
  activeProviderId: string | null;
  activeModel: string | null;
}

const newId = () => `provider-${crypto.randomUUID()}`;

function stripKey(profile: StoredProviderProfile): DraftProvider {
  return {
    id: profile.id,
    name: profile.name,
    baseUrl: profile.baseUrl,
    protocol: profile.protocol ?? "openai-chat",
    models: profile.models,
  };
}

export function ProviderSettingsPage() {
  const providers = useProviderStatus((state) => state.providers);
  const activeProviderId = useProviderStatus((state) => state.activeProviderId);
  const activeModel = useProviderStatus((state) => state.activeModel);
  const configured = useProviderStatus((state) => state.configured);
  const saveBook = useProviderStatus((state) => state.saveBook);
  const clear = useProviderStatus((state) => state.clear);

  const [draft, setDraft] = usePersistedState<ProviderDraft | null>(
    "settings.providers.draft",
    null,
  );
  // Keys live only in memory; they are re-seeded from the encrypted store.
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setKeys((current) => {
      let changed = false;
      const next = { ...current };
      for (const profile of providers) {
        if (next[profile.id] === undefined) {
          next[profile.id] = profile.apiKey;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [providers]);

  const storedDraft: ProviderDraft = {
    providers: providers.map(stripKey),
    activeProviderId,
    activeModel,
  };
  const base = draft ?? storedDraft;
  const profiles: StoredProviderProfile[] = base.providers.map((entry) => ({
    ...entry,
    apiKey: keys[entry.id] ?? "",
  }));

  const patchProvider = (id: string, patch: Partial<DraftProvider>) =>
    setDraft((current) => {
      const source = current ?? storedDraft;
      return {
        ...source,
        providers: source.providers.map((entry) =>
          entry.id === id ? { ...entry, ...patch } : entry,
        ),
      };
    });

  const addProvider = () => {
    const id = newId();
    setKeys((current) => ({ ...current, [id]: "" }));
    setDraft((current) => {
      const source = current ?? storedDraft;
      return {
        ...source,
        providers: [
          ...source.providers,
          {
            id,
            name: `供应商 ${source.providers.length + 1}`,
            baseUrl: "",
            protocol: "openai-chat",
            models: [],
          },
        ],
      };
    });
  };

  const removeProvider = (id: string) => {
    setDraft((current) => {
      const source = current ?? storedDraft;
      const remaining = source.providers.filter((entry) => entry.id !== id);
      // Removing the active provider must hand the role to a survivor, or the
      // app would sit on "configured" with nothing behind it.
      const stillActive = source.activeProviderId !== id;
      const nextActive = stillActive
        ? source.activeProviderId
        : remaining[0]?.id ?? null;
      const nextModel = stillActive
        ? source.activeModel
        : remaining[0]?.models[0] ?? null;
      return {
        providers: remaining,
        activeProviderId: nextActive,
        activeModel: nextModel,
      };
    });
  };

  const setTest = (id: string, next: TestState) =>
    setTests((current) => ({ ...current, [id]: next }));

  const fetchModels = async (profile: StoredProviderProfile) => {
    setTest(profile.id, { status: "testing" });
    try {
      const list = await listModels({
        baseUrl: profile.baseUrl.trim(),
        apiKey: profile.apiKey.trim(),
        model: "",
        protocol: profile.protocol ?? "openai-chat",
      });
      const models = list.map((entry) => entry.id).filter(Boolean);
      setTest(profile.id, { status: "ok", count: models.length });
      // A failed fetch leaves the saved list alone; a successful one replaces it
      // so a removed model cannot linger in the picker.
      setDraft((current) => {
        const source = current ?? storedDraft;
        return {
          ...source,
          providers: source.providers.map((entry) =>
            entry.id === profile.id ? { ...entry, models } : entry,
          ),
          activeProviderId: source.activeProviderId,
          activeModel:
            source.activeProviderId === profile.id &&
            models.length > 0 &&
            !models.includes(source.activeModel ?? "")
              ? models[0] ?? null
              : source.activeModel,
        };
      });
    } catch (error) {
      setTest(profile.id, {
        status: "error",
        message: error instanceof Error ? error.message : "拉取失败",
      });
    }
  };

  const useModel = (providerId: string, model: string) =>
    setDraft((current) => {
      const source = current ?? storedDraft;
      return { ...source, activeProviderId: providerId, activeModel: model };
    });

  const submit = async () => {
    setSaving(true);
    try {
      await saveBook({
        providers: profiles.map((entry) => ({
          ...entry,
          baseUrl: entry.baseUrl.trim(),
          name: entry.name.trim() || "未命名供应商",
          apiKey: (keys[entry.id] ?? "").trim(),
        })),
        activeProviderId: base.activeProviderId,
        activeModel: base.activeModel,
      });
      // The draft now equals the stored book, so keeping it would only pin a
      // copy that can drift from the real credential.
      setDraft(null);
      setTests({});
    } finally {
      setSaving(false);
    }
  };

  const forgetAll = async () => {
    await clear();
    setDraft(null);
    setKeys({});
    setTests({});
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-5 sm:p-7">
      <Panel
        title="AI 供应商"
        action={
          <div className="flex items-center gap-2">
            <InfoHint label="每个供应商保存自己的地址、密钥和模型列表；同一时间只有一个模型在用。" />
            <AnimatedBadge
              status={configured ? "success" : "warning"}
              size="sm"
              contentKey={configured ? "configured" : "missing"}
            >
              {configured ? "已配置" : "未接入"}
            </AnimatedBadge>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              还没有供应商，先添加一个。
            </p>
          ) : (
            profiles.map((profile) => (
              <ProviderEditor
                key={profile.id}
                profile={profile}
                activeModel={base.activeModel}
                isActiveProvider={profile.id === base.activeProviderId}
                test={tests[profile.id] ?? { status: "idle" }}
                busy={saving}
                canRemove={profiles.length > 1}
                onChange={(patch) => patchProvider(profile.id, patch)}
                onFetchModels={() => void fetchModels(profile)}
                onUseModel={(model) => useModel(profile.id, model)}
                onRemove={() => removeProvider(profile.id)}
              />
            ))
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="secondary" className="text-sm" onClick={addProvider}>
              添加供应商
            </Button>
            <Button
              size="sm"
              className="text-sm"
              disabled={saving || profiles.length === 0}
              onClick={() => void submit()}
            >
              {saving ? "保存中" : "保存"}
            </Button>
            {providers.length > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-sm"
                onClick={() => void forgetAll()}
              >
                清除全部
              </Button>
            ) : null}
          </div>
        </div>
      </Panel>
    </div>
  );
}
