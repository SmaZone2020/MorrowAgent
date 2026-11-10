import { useEffect, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import {
  activeProvider,
  useProviderStatus,
} from "@/features/settings/providerStatus";
import {
  listModels,
  type ModelInfo,
  type Protocol,
} from "@/features/settings/aiBridge";
import { usePersistedState } from "@/features/uiState";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok"; count: number }
  | { status: "error"; message: string };

/**
 * The half-typed form, kept across page changes. The API key is deliberately
 * absent: it is a secret, and interface state is a plain file (D-070).
 */
interface ProviderDraft {
  baseUrl: string;
  model: string;
  protocol: Protocol;
}

// The protocol decides the URL path and the auth header, so it is a first-class
// choice rather than something inferred from the base URL.
const PROTOCOLS: { value: Protocol; label: string }[] = [
  { value: "openai-chat", label: "Chat Completions" },
  { value: "openai-responses", label: "Responses" },
  { value: "anthropic", label: "Anthropic" },
];

export function ProviderSettingsPage() {
  const provider = useProviderStatus((state) => state.provider);
  const configured = useProviderStatus((state) => state.configured);
  const save = useProviderStatus((state) => state.save);
  const clear = useProviderStatus((state) => state.clear);

  // A draft only exists while the form differs from what is stored; saving or
  // clearing drops it, so the saved values show through again.
  const [draft, setDraft] = usePersistedState<ProviderDraft | null>(
    "settings.provider.draft",
    null,
  );

  // Mirror the credential that requests actually use, so a debug-only setup
  // shows its values here instead of an empty form that looks unconfigured.
  const stored = provider ?? activeProvider() ?? null;
  const form: ProviderDraft = draft ?? {
    baseUrl: stored?.baseUrl ?? "",
    model: stored?.model ?? "",
    protocol: stored?.protocol ?? "openai-chat",
  };

  const [apiKey, setApiKey] = useState(stored?.apiKey ?? "");
  const keyTouched = useRef(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [saving, setSaving] = useState(false);

  // Fill the key once the encrypted blob has been read at boot, unless the user
  // already started typing one.
  useEffect(() => {
    if (!provider || keyTouched.current) return;
    setApiKey(provider.apiKey);
  }, [provider]);

  // Functional update: two inputs changed in one tick must both land, and the
  // first draft is built from the stored values rather than an empty form.
  const patch = (next: Partial<ProviderDraft>) =>
    setDraft((current) => ({ ...(current ?? form), ...next }));

  const canSave = Boolean(form.baseUrl.trim() && form.model.trim() && apiKey.trim());

  const runTest = async () => {
    setTest({ status: "testing" });
    try {
      const list = await listModels({
        baseUrl: form.baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: form.model.trim(),
        protocol: form.protocol,
      });
      setModels(list);
      setTest({ status: "ok", count: list.length });
    } catch (error) {
      setTest({
        status: "error",
        message: error instanceof Error ? error.message : "连接失败",
      });
    }
  };

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await save({
        baseUrl: form.baseUrl.trim(),
        model: form.model.trim(),
        apiKey: apiKey.trim(),
        protocol: form.protocol,
      });
      // The draft is now the stored value, so keeping it would only pin a copy
      // that can drift from the real credential.
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const forget = async () => {
    await clear();
    setDraft(null);
    setApiKey("");
    keyTouched.current = false;
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      <Panel
        title="AI Provider"
        action={
          <AnimatedBadge
            status={configured ? "success" : "warning"}
            size="sm"
            contentKey={configured ? "configured" : "missing"}
          >
            {configured ? "已配置" : "未接入"}
          </AnimatedBadge>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {PROTOCOLS.map((entry) => (
              <Button
                key={entry.value}
                size="sm"
                variant={form.protocol === entry.value ? "primary" : "secondary"}
                onClick={() => patch({ protocol: entry.value })}
              >
                {entry.label}
              </Button>
            ))}
          </div>

          <Input
            label="Base URL"
            value={form.baseUrl}
            onChange={(value) => patch({ baseUrl: value })}
            placeholder="https://api.example.com/v1"
            spellCheck={false}
            autoComplete="off"
          />
          <Input
            label="模型"
            value={form.model}
            onChange={(value) => patch({ model: value })}
            placeholder="deepseek-v4.1-flash"
            spellCheck={false}
            autoComplete="off"
            list="provider-models"
          />
          <datalist id="provider-models">
            {models.map((entry) => (
              <option key={entry.id} value={entry.id} />
            ))}
          </datalist>
          <Input
            label="API Key"
            type="password"
            value={apiKey}
            onChange={(value) => {
              keyTouched.current = true;
              setApiKey(value);
            }}
            placeholder="sk-..."
            spellCheck={false}
            autoComplete="off"
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={
                !form.baseUrl.trim() ||
                !apiKey.trim() ||
                test.status === "testing"
              }
              onClick={() => void runTest()}
            >
              {test.status === "testing" ? "测试中" : "测试连接"}
            </Button>
            <Button
              size="sm"
              disabled={!canSave || saving}
              onClick={() => void submit()}
            >
              {saving ? "保存中" : "保存"}
            </Button>
            {provider ? (
              <Button size="sm" variant="ghost" onClick={() => void forget()}>
                清除
              </Button>
            ) : null}
            {test.status === "ok" ? (
              <span className="text-xs text-muted-foreground">
                连接正常，返回 {test.count} 个模型
              </span>
            ) : null}
          </div>
          {test.status === "error" ? (
            <p className="text-xs leading-5 text-destructive">{test.message}</p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
