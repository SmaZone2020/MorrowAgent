import logo from "@/assets/logo.png";
import { SquircleWrapper } from "@/components/SquircleWrapper";
import {
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
} from "@/pages/settings/SettingsBlocks";

const APP_VERSION = "0.1.0";

const facts = [
  { label: "版本", value: APP_VERSION },
  { label: "运行时", value: "Tauri 2 · React 19" },
  { label: "界面", value: "BeUI · Gravity Icons" },
];

/**
 * About is an identity page, not a changelog: the mark, then the three facts a
 * user might need when filing a bug. Nothing here is a subtitle under a title —
 * the rows are label/value pairs, which is what a settings list already is.
 */
export function AboutSettingsPage() {
  return (
    <SettingsPageShell title="关于">
      <div className="flex justify-center py-2">
        <SquircleWrapper className="w-64 p-4">
          <img src={logo} alt="Morrow Agent" className="w-full" />
        </SquircleWrapper>
      </div>
      <SettingsGroup title="Morrow Agent">
        {facts.map((fact) => (
          <SettingsRow
            key={fact.label}
            title={fact.label}
            control={
              <span className="text-sm text-muted-foreground">{fact.value}</span>
            }
          />
        ))}
      </SettingsGroup>
    </SettingsPageShell>
  );
}
