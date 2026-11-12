import { Display, Moon, Sun } from "@gravity-ui/icons";
import { Input } from "@/vendor/beui/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/vendor/beui/components/motion/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/vendor/beui/components/motion/tabs";
import {
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
} from "@/pages/settings/SettingsBlocks";
import { PercentStepper } from "@/components/PercentStepper";
import {
  applyAppearance,
  clampScale,
  FONT_OPTIONS,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  type InterfaceFont,
  type ThemeMode,
} from "@/features/appearance/appearance";
import { useAppearance } from "@/features/appearance/useAppearance";
import { useThemeReveal } from "@/features/appearance/useThemeReveal";
import { usePreferences } from "@/features/settings/preferencesStore";
import { ageFrom } from "@/features/settings/birthday";

const QUESTION_SCALE_MIN = 0.8;
const QUESTION_SCALE_MAX = 1.6;

const THEME_CHOICES: {
  value: ThemeMode;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Display },
];

// Appearance is not a separate destination: theme, font and zoom are preferences
// like any other, so they live on this page instead of behind another click.
export function GeneralSettingsPage() {
  const { appearance, update: updateAppearance } = useAppearance();
  const reveal = useThemeReveal();
  const questionScale = usePreferences((state) => state.questionScale);
  const nickname = usePreferences((state) => state.nickname);
  const birthday = usePreferences((state) => state.birthday);
  const updatePreferences = usePreferences((state) => state.update);
  const age = ageFrom(birthday);

  // The palette has to be on the document before the view transition snapshots
  // it, so the paint happens inside the callback and the store write follows.
  const setTheme = (theme: ThemeMode) => {
    reveal(() => {
      applyAppearance({ ...appearance, theme });
      updateAppearance({ theme });
    });
  };

  return (
    <SettingsPageShell title="首选项">
      <SettingsGroup title="外观">
        <SettingsRow
          title="配色主题"
          hint="深色沿用同一色系反相；跟随系统会随系统设置实时切换。"
          control={
            <Tabs
              value={appearance.theme}
              onValueChange={(theme) => setTheme(theme as ThemeMode)}
              variant="pill"
            >
              <TabsList aria-label="配色主题" className="bg-card p-0.5">
                {THEME_CHOICES.map((choice) => (
                  <TabsTrigger
                    key={choice.value}
                    value={choice.value}
                    aria-label={choice.label}
                    title={choice.label}
                    // The icon is the child rather than the `icon` prop: that
                    // slot adds the gap a label would need, which would leave a
                    // lone glyph sitting off-centre in the pill.
                    className="px-3 py-1.5"
                  >
                    <choice.icon className="size-4" />
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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

      <SettingsGroup title="关于你">
        <SettingsRow
          title="Lumi 怎么称呼你"
          hint="会出现在 Lumi 的回复里；留空就用「你」。"
          control={
            <Input
              value={nickname}
              onChange={(value) => updatePreferences({ nickname: value.slice(0, 24) })}
              placeholder="留空"
              aria-label="Lumi 怎么称呼你"
              className="w-44"
              classNames={{
                field: "h-8 rounded-lg",
                input: "text-sm",
              }}
            />
          }
        />
        <SettingsRow
          title="出生日期"
          hint={
            age === null
              ? "选填。只用来判断该用什么例子和语气，不会用来算倒计时。"
              : `选填。只用来判断该用什么例子和语气，目前按 ${age} 岁理解。`
          }
          control={
            <Input
              type="date"
              value={birthday}
              onChange={(value) => updatePreferences({ birthday: value })}
              aria-label="出生日期"
              className="w-44"
              classNames={{
                field: "h-8 rounded-lg",
                input: "text-sm tabular-nums",
              }}
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
