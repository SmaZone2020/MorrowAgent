import { useEffect, useRef, useState } from "react";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
} from "@/pages/settings/SettingsBlocks";
import { ProviderRow } from "@/pages/settings/ProviderRow";
import { ProviderCreateDialog } from "@/pages/settings/ProviderCreateDialog";
import { ProviderEditDialog } from "@/pages/settings/ProviderEditDialog";
import type { TestState } from "@/pages/settings/ProviderEditor";
import {
  newProviderId,
  stripKey,
  type DraftProvider,
  type ProviderDraft,
} from "@/pages/settings/providerDraft";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { listModels } from "@/features/settings/aiBridge";
import type { StoredProviderProfile } from "@/features/settings/providerStore";
import { usePersistedState } from "@/features/uiState";

/** How long an edit rests before it is written to the encrypted store. */
const AUTOSAVE_MS = 600;

export function ProviderSettingsPage() {
  const providers = useProviderStatus((state) => state.providers);
  const activeProviderId = useProviderStatus((state) => state.activeProviderId);
  const activeModel = useProviderStatus((state) => state.activeModel);
  const saveBook = useProviderStatus((state) => state.saveBook);

  const [draft, setDraft] = usePersistedState<ProviderDraft | null>(
    "settings.providers.draft",
    null,
  );
  // Keys live only in memory; they are re-seeded from the encrypted store.
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [creating, setCreating] = useState(false);
  // Which provider card is unfolded. Without a dialog component, editing is an
  // inline expansion of the same row rather than a modal.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

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
  const editing = profiles.find((entry) => entry.id === editingId) ?? null;

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

  const createProvider = (values: {
    name: string;
    baseUrl: string;
    apiKey: string;
    protocol: NonNullable<StoredProviderProfile["protocol"]>;
  }) => {
    const id = newProviderId();
    setCreating(false);
    setKeys((current) => ({ ...current, [id]: values.apiKey }));
    setDraft((current) => {
      const source = current ?? storedDraft;
      return {
        ...source,
        providers: [
          ...source.providers,
          {
            id,
            name: values.name || `供应商 ${source.providers.length + 1}`,
            baseUrl: values.baseUrl,
            protocol: values.protocol,
            models: [],
          },
        ],
        // The first provider has nothing to be active against yet.
        activeProviderId: source.activeProviderId ?? id,
      };
    });
  };

  const removeProvider = (id: string) => {
    setEditingId((current) => (current === id ? null : current));
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

  // With no save button, every edit settles into the store on its own. The
  // draft is the trigger: it is null until the first change.
  const pending = useRef<ProviderDraft | null>(null);
  pending.current = draft;
  const keySnapshot = useRef(keys);
  keySnapshot.current = keys;
  // Guards against re-saving the same book, which would otherwise write on
  // every mount and fight the backend's normalization.
  const lastSaved = useRef("");

  useEffect(() => {
    if (!draft) return;
    // A stored provider whose key has not been seeded yet would be saved with an
    // empty key, wiping the credential. Draft-only providers have no stored key
    // to protect, so they save right away.
    const seeded = (id: string) =>
      keys[id] !== undefined || !providers.some((profile) => profile.id === id);
    if (!draft.providers.every((entry) => seeded(entry.id))) return;

    const signature = JSON.stringify({
      draft,
      keys: draft.providers.map((entry) => keys[entry.id] ?? ""),
    });
    if (signature === lastSaved.current) return;

    const timer = window.setTimeout(async () => {
      const snapshot = pending.current;
      if (!snapshot) return;
      lastSaved.current = signature;
      setSaving(true);
      setSaveError(false);
      try {
        await saveBook({
          providers: snapshot.providers.map((entry) => ({
            ...entry,
            baseUrl: entry.baseUrl.trim(),
            name: entry.name.trim() || "未命名供应商",
            apiKey: (keySnapshot.current[entry.id] ?? "").trim(),
          })),
          activeProviderId: snapshot.activeProviderId,
          activeModel: snapshot.activeModel,
        });
      } catch {
        // A failed write must be visible; the next edit retries.
        lastSaved.current = "";
        setSaveError(true);
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, keys, saveBook]);

  return (
    <SettingsPageShell
      title="AI 供应商"
      action={
        <Button
          size="sm"
          variant="secondary"
          className="text-sm"
          onClick={() => setCreating(true)}
        >
          <Plus className="size-4" />
          添加供应商
        </Button>
      }
    >
      <SettingsGroup>
        {profiles.length === 0 ? (
          <SettingsRow
            title="还没有供应商"
            hint="添加供应商后先拉取模型，再在列表里选择要用的模型；改动会自动保存。"
            control={
              <Button
                size="sm"
                variant="secondary"
                className="text-sm"
                onClick={() => setCreating(true)}
              >
                添加供应商
              </Button>
            }
          />
        ) : (
          profiles.map((profile) => (
            <ProviderRow
              key={profile.id}
              profile={profile}
              activeModel={base.activeModel}
              isActiveProvider={profile.id === base.activeProviderId}
              onEdit={() => setEditingId(profile.id)}
            />
          ))
        )}
      </SettingsGroup>

      {saveError || saving ? (
        <p
          className={`text-sm ${saveError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {saveError ? "保存失败，改动会在下次编辑时重试。" : "正在保存…"}
        </p>
      ) : null}

      {creating ? (
        <ProviderCreateDialog
          onCancel={() => setCreating(false)}
          onCreate={createProvider}
        />
      ) : null}

      {editing ? (
        <ProviderEditDialog
          profile={editing}
          activeModel={base.activeModel}
          isActiveProvider={editing.id === base.activeProviderId}
          test={tests[editing.id] ?? { status: "idle" }}
          busy={saving}
          canRemove={profiles.length > 1}
          onClose={() => setEditingId(null)}
          onChange={(patch) => patchProvider(editing.id, patch)}
          onFetchModels={() => void fetchModels(editing)}
          onUseModel={(model) => useModel(editing.id, model)}
          onRemove={() => removeProvider(editing.id)}
        />
      ) : null}
    </SettingsPageShell>
  );
}
