import { useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { Panel } from "@/components/Panel";
import { InfoHint } from "@/components/InfoHint";
import { usePreferences } from "@/features/settings/preferencesStore";

// Presets instead of a slider: the two axes users actually reason about are
// "steady for derivations" and "loose for brainstorming", and the numeric
// fields stay available for anything in between.
const PRESETS = [
  { label: "严谨", temperature: 0.2, maxTokens: 1024 },
  { label: "平衡", temperature: 0.6, maxTokens: 2048 },
  { label: "发散", temperature: 1, maxTokens: 4096 },
] as const;

export function ModelSettingsPage() {
  const temperature = usePreferences((state) => state.temperature);
  const maxTokens = usePreferences((state) => state.maxTokens);
  const update = usePreferences((state) => state.update);

  // Text state is local so a half-typed "0." does not get clamped mid-edit.
  const [temperatureDraft, setTemperatureDraft] = useState(
    String(temperature),
  );
  const [tokenDraft, setTokenDraft] = useState(String(maxTokens));

  const commitTemperature = () => {
    const value = Number(temperatureDraft);
    if (!Number.isFinite(value) || value < 0 || value > 2) {
      setTemperatureDraft(String(temperature));
      return;
    }
    update({ temperature: value });
    setTemperatureDraft(String(value));
  };

  const commitTokens = () => {
    const value = Math.round(Number(tokenDraft));
    if (!Number.isFinite(value) || value < 64 || value > 16384) {
      setTokenDraft(String(maxTokens));
      return;
    }
    update({ maxTokens: value });
    setTokenDraft(String(value));
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      <Panel
        title="生成参数"
        action={
          <InfoHint label="温度 0–2，越低越稳定，适合公式推导；回复上限 64–16384 tokens。" />
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const active =
                temperature === preset.temperature &&
                maxTokens === preset.maxTokens;
              return (
                <Button
                  key={preset.label}
                  size="sm"
                  variant={active ? "primary" : "secondary"}
                  onClick={() => {
                    update({
                      temperature: preset.temperature,
                      maxTokens: preset.maxTokens,
                    });
                    setTemperatureDraft(String(preset.temperature));
                    setTokenDraft(String(preset.maxTokens));
                  }}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>

          <Input
            label="温度"
            value={temperatureDraft}
            onChange={setTemperatureDraft}
            onBlur={commitTemperature}
            inputMode="decimal"
          />
          <Input
            label="回复上限（tokens）"
            value={tokenDraft}
            onChange={setTokenDraft}
            onBlur={commitTokens}
            inputMode="numeric"
          />
        </div>
      </Panel>
    </div>
  );
}
