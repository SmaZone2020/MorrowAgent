import { Display, Moon, Sun } from "@gravity-ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/vendor/beui/components/motion/select";
import {
  ChoiceTabs,
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
  type ChoiceOption,
} from "@/pages/settings/SettingsBlocks";
import { PercentStepper } from "@/components/PercentStepper";
import {
  clampScale,
  FONT_OPTIONS,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  type InterfaceFont,
  type ThemeMode,
} from "@/features/appearance/appearance";
import { useAppearance } from "@/features/appearance/useAppearance";
import { usePreferences } from "@/features/settings/preferencesStore";

const QUESTION_SCALE_MIN = 0.8;
const QUESTION_SCALE_MAX = 1.6;

const THEME_CHOICES: ChoiceOption<ThemeMode>[] = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Display },
];

// Appearance is not a separate destination: theme, font and zoom are preferences
// like any other, so they live on this page instead of behind another click.
export function GeneralSettingsPage() {
  const { appearance, update: updateAppearance } = useAppearance();
  const questionScale = usePreferences((state) => state.questionScale);
  const updatePreferences = usePreferences((state) => state.update);

  return (
    <SettingsPageShell title="首选项">
      <SettingsGroup title="外观">
        <SettingsRow
          title="配色主题"
          hint="深色沿用同一色系反相；跟随系统会随系统设置实时切换。"
          control={
            <ChoiceTabs
              label="配色主题"
              iconOnly
              options={THEME_CHOICES}
              value={appearance.theme}
              onChange={(theme) => updateAppearance({ theme })}
            />
          }
        />
        <SettingsRow
          title="界面字体"
          hint="只切换界面正文字体；页面标题固定使用思源宋体。"
          control={
            <Select
              value={appearance.font}
              onValueChange={(font) =>
                updateAppearance({ font: font as InterfaceFont })
              }
              className="w-40"
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="选择字体" />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <SettingsRow
          title="界面缩放"
          hint={`等比缩放间距与字号，可填 ${UI_SCALE_MIN * 100}%–${UI_SCALE_MAX * 100}%。`}
          control={
            <PercentStepper
              label="界面缩放"
              value={Math.round(appearance.scale * 100)}
              min={Math.round(UI_SCALE_MIN * 100)}
              max={Math.round(UI_SCALE_MAX * 100)}
              step={5}
              onChange={(percent) =>
                updateAppearance({ scale: clampScale(percent / 100) })
              }
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup title="训练">
        <SettingsRow
          title="题目字号"
          hint="只影响题目与解析正文；界面缩放影响整个应用。"
          control={
            <PercentStepper
              label="题目字号"
              value={Math.round(questionScale * 100)}
              min={Math.round(QUESTION_SCALE_MIN * 100)}
              max={Math.round(QUESTION_SCALE_MAX * 100)}
              step={10}
              onChange={(percent) =>
                updatePreferences({ questionScale: percent / 100 })
              }
            />
          }
        />
      </SettingsGroup>
    </SettingsPageShell>
  );
}
