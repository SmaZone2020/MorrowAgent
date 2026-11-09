import { useEffect, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { listModels, type ModelInfo } from "@/features/settings/aiBridge";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok"; count: number }
  | { status: "error"; message: string };

export function ProviderSettingsPage() {
  const provider = useProviderStatus((state) => state.provider);
  const save = useProviderStatus((state) => state.save);
  const clear = useProviderStatus((state) => state.clear);

  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [saving, setSaving] = useState(false);

  // Fill the form once the encrypted blob has been read at boot.
  useEffect(() => {
    if (!provider) return;
    setBaseUrl(provider.baseUrl);
    setModel(provider.model);
    setApiKey(provider.apiKey);
  }, [provider]);

  const canSave = Boolean(baseUrl.trim() && model.trim() && apiKey.trim());

  const runTest = async () => {
    setTest({ status: "testing" });
    try {
      const list = await listModels({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
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
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        apiKey: apiKey.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      <Panel
        title="AI Provider"
        action={
          <AnimatedBadge
            status={provider ? "success" : "warning"}
            size="sm"
            contentKey={provider ? "configured" : "missing"}
          >
            {provider ? "已配置" : "未接入"}
          </AnimatedBadge>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Base URL"
            value={baseUrl}
            onChange={setBaseUrl}
            placeholder="https://api.example.com/v1"
            spellCheck={false}
            autoComplete="off"
          />
          <Input
            label="模型"
            value={model}
            onChange={setModel}
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
            onChange={setApiKey}
            placeholder="sk-..."
            spellCheck={false}
            autoComplete="off"
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={!baseUrl.trim() || !apiKey.trim() || test.status === "testing"}
              onClick={() => void runTest()}
            >
              {test.status === "testing" ? "测试中" : "测试连接"}
            </Button>
            <Button size="sm" disabled={!canSave || saving} onClick={() => void submit()}>
              {saving ? "保存中" : "保存"}
            </Button>
            {provider ? (
              <Button size="sm" variant="ghost" onClick={() => void clear()}>
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
