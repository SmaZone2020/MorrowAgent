import { useState } from "react";
import { Input } from "@/vendor/beui/components/motion/input";
import {
  ChoiceTabs,
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
} from "@/pages/settings/SettingsBlocks";
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

  const activePreset = PRESETS.find(
    (preset) =>
      preset.temperature === temperature && preset.maxTokens === maxTokens,
  );

  return (
    <SettingsPageShell title="生成参数">
      <SettingsGroup title="预设">
        <SettingsRow
          title="回复风格"
          hint="温度 0–2，越低越稳定，适合公式推导；回复上限 64–16384 tokens。"
          control={
            <ChoiceTabs
              label="回复风格预设"
              options={PRESETS.map((preset) => ({
                value: preset.label,
                label: preset.label,
              }))}
              value={activePreset?.label ?? ""}
              onChange={(label) => {
                const preset = PRESETS.find((entry) => entry.label === label);
                if (!preset) return;
                update({
                  temperature: preset.temperature,
                  maxTokens: preset.maxTokens,
                });
                setTemperatureDraft(String(preset.temperature));
                setTokenDraft(String(preset.maxTokens));
              }}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup title="数值">
        <SettingsRow
          title="温度"
          control={
            <Input
              value={temperatureDraft}
              onChange={setTemperatureDraft}
              onBlur={commitTemperature}
              inputMode="decimal"
              aria-label="温度"
              className="w-24"
              classNames={{
                field: "h-8 rounded-lg",
                input: "pl-2 pr-2 text-right text-sm tabular-nums",
              }}
            />
          }
        />
        <SettingsRow
          title="回复上限"
          hint="单位是 tokens，超出会被截断。"
          control={
            <Input
              value={tokenDraft}
              onChange={setTokenDraft}
              onBlur={commitTokens}
              inputMode="numeric"
              aria-label="回复上限 tokens"
              className="w-28"
              classNames={{
                field: "h-8 rounded-lg",
                input: "pl-2 pr-2 text-right text-sm tabular-nums",
              }}
            />
          }
        />
      </SettingsGroup>
    </SettingsPageShell>
  );
}
