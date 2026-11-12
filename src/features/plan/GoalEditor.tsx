import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { Checkbox } from "@/vendor/beui/components/motion/checkbox";
import { Modal } from "@/components/Modal";
import { InfoHint } from "@/components/InfoHint";
import { ChoiceTabs } from "@/pages/settings/SettingsBlocks";
import { MINUTES_CHOICES, type StudyGoal } from "@/features/plan/types";
import { DIFFICULTY_BANDS } from "@/features/plan/plan";

/**
 * The goal form, in a modal.
 *
 * On the page these were five controls of five widths stacked above the plan,
 * which made the aim look like the work. The plan is what this page is opened
 * for, so the aim is edited here and only read as a summary outside.
 */
export function GoalEditor({
  open,
  onOpenChange,
  goal,
  bandCounts,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: StudyGoal;
  /** Points per difficulty band, so the focus is chosen with the package in view. */
  bandCounts: Record<string, number>;
  onChange: (patch: Partial<StudyGoal>) => void;
}) {
  const toggleBand = (band: string) =>
    onChange({
      difficultyFocus: goal.difficultyFocus.includes(band)
        ? goal.difficultyFocus.filter((entry) => entry !== band)
        : [...goal.difficultyFocus, band],
    });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="学习目标"
      footer={
        <Button size="sm" className="text-sm" onClick={() => onOpenChange(false)}>
          完成
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="目标分数"
            value={goal.targetScore === null ? "" : String(goal.targetScore)}
            onChange={(value) => {
              const digits = value.replace(/[^\d]/g, "").slice(0, 3);
              onChange({ targetScore: digits ? Math.min(150, Number(digits)) : null });
            }}
            inputMode="numeric"
            placeholder="120"
            classNames={{ field: "rounded-xl", input: "text-sm tabular-nums" }}
          />
          <Input
            label="考试日期"
            type="date"
            value={goal.examDate ?? ""}
            onChange={(value) => onChange({ examDate: value || null })}
            classNames={{ field: "rounded-xl", input: "text-sm" }}
          />
        </div>

        <Field
          label="每天可支配时间"
          hint="决定今天列几条任务：时间越多，列得越长。"
        >
          <ChoiceTabs
            label="每天可支配时间"
            options={MINUTES_CHOICES.map((minutes) => ({
              value: String(minutes),
              label: `${minutes} 分钟`,
            }))}
            value={String(goal.minutesPerDay)}
            onChange={(value) => onChange({ minutesPerDay: Number(value) })}
          />
        </Field>

        <Field
          label="难度侧重"
          hint="只影响计划的取题范围；不选表示不限难度。括号里是这个包里对应难度的知识点数。"
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {DIFFICULTY_BANDS.map((band) => (
              <Checkbox
                key={band.value}
                checked={goal.difficultyFocus.includes(band.value)}
                onCheckedChange={() => toggleBand(band.value)}
                label={`${band.label} ${bandCounts[band.value] ?? 0}`}
                className="text-sm"
              />
            ))}
          </div>
        </Field>

        <Input
          label="备注"
          value={goal.note}
          onChange={(value) => onChange({ note: value.slice(0, 120) })}
          placeholder="例如：先把极限补上"
          classNames={{ field: "rounded-xl", input: "text-sm" }}
        />
      </div>
    </Modal>
  );
}

/** One labelled control; the hint goes to the info glyph, never under the label. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {label}
        {hint ? <InfoHint label={hint} /> : null}
      </span>
      {children}
    </div>
  );
}
