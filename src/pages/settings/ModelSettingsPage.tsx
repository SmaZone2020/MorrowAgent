import { Check } from "@gravity-ui/icons";
import {
  ChoiceTabs,
  SettingsGroup,
  SettingsPageShell,
} from "@/pages/settings/SettingsBlocks";
import { cn } from "@/vendor/beui/lib/utils";
import { usePreferences } from "@/features/settings/preferencesStore";
import { PersonaPicker } from "@/features/lumi/PersonaPicker";
import { asPersona } from "@/features/lumi/persona";
import {
  asTeachingStyle,
  TEACHING_STYLES,
  TEACHING_STYLE_LABEL,
} from "@/features/lumi/teachingStyle";
import { REPLY_LENGTHS } from "@/features/settings/replyLength";

/**
 * Which Lumi the learner talks to, how it teaches, and how long its answers run.
 *
 * This page used to expose temperature and a token ceiling. Both are real
 * controls and neither is a decision a learner can make: nobody knows what 0.6
 * means, and a count of tokens is a fact about billing rather than about study.
 * They are still stored, still sent, and still tuned — but by presets that
 * describe the outcome instead of the parameter.
 *
 * Everything here is app-wide. A tutor whose voice and method changed with every
 * package would feel like a different tutor, so only the learning goal follows
 * the book.
 */
export function ModelSettingsPage() {
  const persona = usePreferences((state) => state.persona);
  const teachingStyle = usePreferences((state) => state.teachingStyle);
  const maxTokens = usePreferences((state) => state.maxTokens);
  const update = usePreferences((state) => state.update);
  const active = REPLY_LENGTHS.find((entry) => entry.maxTokens === maxTokens);

  return (
    <SettingsPageShell title="Lumi 风格">
      <SettingsGroup title="性格">
        <div className="p-3">
          <PersonaPicker
            value={asPersona(persona)}
            onChange={(next) => update({ persona: next })}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title="讲解方式">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            影响 Lumi 先讲还是先问，不改变模型与题目难度。
          </p>
          <ChoiceTabs
            label="讲解方式"
            options={TEACHING_STYLES.map((entry) => ({
              value: entry,
              label: TEACHING_STYLE_LABEL[entry],
            }))}
            value={asTeachingStyle(teachingStyle)}
            onChange={(next) => update({ teachingStyle: next })}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title="回答长度">
        <div className="grid gap-2 p-3 sm:grid-cols-3">
          {REPLY_LENGTHS.map((entry) => {
            const selected = active?.value === entry.value;
            return (
              <button
                key={entry.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() =>
                  update({
                    maxTokens: entry.maxTokens,
                    temperature: entry.temperature,
                  })
                }
                className={cn(
                  "relative flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-foreground/25 bg-muted"
                    : "border-border/70 hover:bg-muted/50",
                )}
              >
                <span className="text-sm font-medium text-foreground">
                  {entry.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {entry.detail}
                </span>
                {selected ? (
                  <Check
                    aria-hidden="true"
                    className="absolute top-2 right-2 size-4 text-foreground"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </SettingsGroup>
    </SettingsPageShell>
  );
}
