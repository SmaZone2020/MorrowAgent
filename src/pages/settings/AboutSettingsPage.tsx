import {
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
} from "@/pages/settings/SettingsBlocks";

const APP_VERSION = "0.1.0";
const STAGE = "阶段 0 · 垂直切片";

const facts = [
  { label: "版本", value: APP_VERSION },
  { label: "阶段", value: STAGE },
  { label: "运行时", value: "Tauri 2 · React 19" },
  { label: "界面", value: "BeUI · Gravity Icons" },
  {
    label: "本地数据",
    value: "SQLite + 加密凭证",
    hint: "学习记录与凭证都留在本机，不上传任何自建服务。",
  },
];

export function AboutSettingsPage() {
  return (
    <SettingsPageShell title="关于">
      <SettingsGroup title="Morrow Agent">
        {facts.map((fact) => (
          <SettingsRow
            key={fact.label}
            title={fact.label}
            hint={fact.hint}
            control={
              <span className="text-sm text-muted-foreground">{fact.value}</span>
            }
          />
        ))}
      </SettingsGroup>
    </SettingsPageShell>
  );
}
