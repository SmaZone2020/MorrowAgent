import { Button } from "@/vendor/beui/components/motion/button";
import { Panel } from "@/components/Panel";
import { InfoHint } from "@/components/InfoHint";
import {
  FONT_OPTIONS,
  SCALE_OPTIONS,
  THEME_OPTIONS,
} from "@/features/appearance/appearance";
import { useAppearance } from "@/features/appearance/useAppearance";

// A segmented row instead of a Select: three to four choices with visible
// labels are faster to compare than a dropdown that hides two of them.
function ChoiceRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={String(option.value)}
            size="sm"
            variant={option.value === value ? "primary" : "secondary"}
            className="text-sm"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function AppearanceSettingsPage() {
  const { appearance, update } = useAppearance();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-5 sm:p-7">
      <Panel
        title="主题"
        action={
          <InfoHint label="深色沿用同一套雾白/岩灰/墨青色系，只把明度反相；跟随系统会随系统设置实时切换。" />
        }
      >
        <ChoiceRow
          label="配色"
          options={THEME_OPTIONS}
          value={appearance.theme}
          onChange={(theme) => update({ theme })}
        />
      </Panel>

      <Panel
        title="字体"
        action={<InfoHint label="只切换界面正文字体；页面标题固定使用思源宋体。" />}
      >
        <ChoiceRow
          label="界面字体"
          options={FONT_OPTIONS}
          value={appearance.font}
          onChange={(font) => update({ font })}
        />
      </Panel>

      <Panel
        title="界面缩放"
        action={
          <InfoHint label="等比放大间距与字号；题目字号另有独立设置，不受这里影响。" />
        }
      >
        <ChoiceRow
          label="缩放比例"
          options={SCALE_OPTIONS}
          value={appearance.scale}
          onChange={(scale) => update({ scale })}
        />
      </Panel>
    </div>
  );
}
