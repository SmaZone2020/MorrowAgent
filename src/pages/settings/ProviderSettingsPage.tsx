import { useEffect, useRef, useState } from "react";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  SettingsGroup,
  SettingsPageShell,
} from "@/pages/settings/SettingsBlocks";
import { EmptyState } from "@/components/EmptyState";
import { ProviderRow } from "@/pages/settings/ProviderRow";
import { ProviderCreateDialog } from "@/pages/settings/ProviderCreateDialog";
import { ProviderEditDialog } from "@/pages/settings/ProviderEditDialog";
import type { TestState } from "@/pages/settings/ProviderEditor";
import {
  newProviderId,
  stripKey,
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
  // Nothing is written until a key has been touched or a field has changed, so
  // merely opening the page must not rewrite the blob.
  const touched = useRef(false);

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
  // A draft written before the builtin existed lacks it, and the builtin cannot
  // be deleted, so a draft without it is always stale: using the stored list in
  // that case is what brings DeepSeek back instead of hiding it behind an old
  // remembered draft.
  const draftIsStale =
    draft !== null &&
    providers.some(
      (provider) =>
        provider.builtin === true &&
        !draft.providers.some((entry) => entry.id === provider.id),
    );
  const base = draft && !draftIsStale ? draft : storedDraft;
  const profiles: StoredProviderProfile[] = base.providers.map((entry) => ({
    ...entry,
    apiKey: keys[entry.id] ?? "",
  }));
  const editing = profiles.find((entry) => entry.id === editingId) ?? null;

  // The key is not part of the remembered draft — interface state is a plain
  // file and a credential must not sit in it — so a change to it has to take
  // the same route as the rest: update the in-memory copy and let the autosave
  // below read from it.
  const patchProvider = (id: string, patch: Partial<StoredProviderProfile>) => {
    touched.current = true;
    const { apiKey, ...rest } = patch;
    if (apiKey !== undefined) {
      setKeys((current) => ({ ...current, [id]: apiKey }));
    }
    // A key-only edit still has to save: it is the most common edit there is.
    if (Object.keys(rest).length === 0) {
      setDraft((current) => (current && !draftIsStale ? current : storedDraft));
      return;
    }

    setDraft((current) => {
      const source = current && !draftIsStale ? current : storedDraft;
      return {
        ...source,
        providers: source.providers.map((entry) => {
          if (entry.id !== id) return entry;
          if (!entry.builtin) return { ...entry, ...rest };
          // The builtin's identity is fixed; only its key, models and vision
          // flag are the user's. The backend enforces the same rule, this just
          // keeps the draft from displaying a change that would be undone.
          const {
            name: _name,
            baseUrl: _baseUrl,
            protocol: _protocol,
            ...editable
          } = rest;
          return { ...entry, ...editable };
        }),
      };
    });
  };

  const createProvider = (values: {
    name: string;
    baseUrl: string;
    apiKey: string;
    protocol: NonNullable<StoredProviderProfile["protocol"]>;
  }) => {
    const id = newProviderId();
    touched.current = true;
    setCreating(false);
    setKeys((current) => ({ ...current, [id]: values.apiKey }));
    setDraft((current) => {
      const source = current && !draftIsStale ? current : storedDraft;
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
            supportsVision: true,
            builtin: false,
          },
        ],
        // A provider added by hand never steals the role from an existing one.
        activeProviderId: source.activeProviderId ?? id,
      };
    });
  };

  const removeProvider = (id: string) => {
    const target = profiles.find((entry) => entry.id === id);
    // The builtin row is not the user's to remove: Lumi needs an endpoint to
    // answer at all, and re-adding DeepSeek by hand would lose the thinking
    // switch and the balance read.
    if (target?.builtin) return;
    touched.current = true;
    setEditingId((current) => (current === id ? null : current));
    setDraft((current) => {
      const source = current && !draftIsStale ? current : storedDraft;
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
    touched.current = true;
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
        const source = current && !draftIsStale ? current : storedDraft;
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
      const source = current && !draftIsStale ? current : storedDraft;
      return { ...source, activeProviderId: providerId, activeModel: model };
    });

  // Enabling a provider is one decision, not two: the row has to end up both
  // selected and pointed at a model it actually lists, or the app would sit on
  // "configured" with nothing to send.
  const activateProvider = (profile: StoredProviderProfile) => {
    touched.current = true;
    setDraft((current) => {
      const source = current && !draftIsStale ? current : storedDraft;
      const keepsModel =
        source.activeProviderId === profile.id &&
        profile.models.includes(source.activeModel ?? "");
      return {
        ...source,
        activeProviderId: profile.id,
        activeModel: keepsModel
          ? source.activeModel
          : (profile.models[0] ?? null),
      };
    });
  };

  // With no save button, every edit settles into the store on its own. The
  // draft is the trigger for most of them; a key edit is the exception, because
  // the key never enters the draft, so it makes `keys` the trigger too.
  const pending = useRef<ProviderDraft | null>(null);
  // The draft actually on screen: a stale remembered one is not what the user
  // is editing, and saving it would resurrect the provider list it describes.
  const effectiveDraft: ProviderDraft | null = draftIsStale ? storedDraft : draft;
  pending.current = effectiveDraft;
  const keySnapshot = useRef(keys);
  keySnapshot.current = keys;
  // Guards against re-saving the same book, which would otherwise write on
  // every mount and fight the backend's normalization.
  const lastSaved = useRef("");

  useEffect(() => {
    if (!effectiveDraft) return;
    if (!touched.current) return;
    // A stored provider whose key has not been seeded yet would be saved with an
    // empty key, wiping the credential. Draft-only providers have no stored key
    // to protect, so they save right away.
    const seeded = (id: string) =>
      keys[id] !== undefined || !providers.some((profile) => profile.id === id);
    if (!effectiveDraft.providers.every((entry) => seeded(entry.id))) return;

    const signature = JSON.stringify({
      draft: effectiveDraft,
      keys: effectiveDraft.providers.map((entry) => keys[entry.id] ?? ""),
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
  }, [effectiveDraft, keys, providers, saveBook]);

  return (
    <SettingsPageShell
      title="AI 供应商"
      action={
        <Button
          size="sm"
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
          <EmptyState
            mood="curious"
            title="还没有供应商"
            action={
              <Button
                size="sm"
                className="text-sm"
                onClick={() => setCreating(true)}
              >
                <Plus className="size-4" />
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
              onActivate={() => activateProvider(profile)}
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
