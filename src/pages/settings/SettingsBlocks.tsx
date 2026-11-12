import type { ComponentType, ReactNode, SVGProps } from "react";
import { InfoHint } from "@/components/InfoHint";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/vendor/beui/components/motion/tabs";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";

/** The wide page frame: big serif title, then groups with generous spacing. */
export function SettingsPageShell({
  title,
  action,
  children,
}: {
  title: string;
  /** Sits beside the title, for page-level actions like "add". */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8 sm:px-10 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="Siyuan text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** A titled card whose rows are separated by hairlines, like a form sheet. */
export function SettingsGroup({
  title,
  children,
}: {
  /** Omit when the page title already names the group. */
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      {title ? (
        <h2 className="font-serif text-[15px] font-semibold text-foreground">
          {title}
        </h2>
      ) : null}
      <div className="flex flex-col divide-y divide-border/70 rounded-2xl border border-border/70 bg-card shadow-surface">
        {children}
      </div>
    </section>
  );
}

/**
 * One setting: what it is on the left, the control on the right. Anything that
 * needs explaining goes into an INFO button beside the title, never into a
 * line of prose under it.
 */
export function SettingsRow({
  title,
  hint,
  control,
}: {
  title: string;
  hint?: string;
  control?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {hint ? <InfoHint label={hint} /> : null}
      </div>
      {control ? <div className="flex shrink-0 items-center gap-2">{control}</div> : null}
    </div>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * A single-choice row drawn with the library's Tabs, so the chosen pill slides
 * between options instead of blinking from one button style to another. With
 * `iconOnly` the labels move into tooltips, which keeps a three-way choice to
 * three square targets.
 */
export function ChoiceTabs<T extends string>({
  options,
  value,
  onChange,
  iconOnly = false,
  label,
}: {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (next: T) => void;
  iconOnly?: boolean;
  label: string;
}) {
  if (iconOnly) {
    return (
      <div role="group" aria-label={label} className="flex items-center gap-1">
        {options.map((option) => {
          const Icon = option.icon;
          const selected = option.value === value;
          return (
            <Tooltip key={option.value} content={option.label} side="top">
              <Button
                aria-pressed={selected}
                aria-label={option.label}
                variant={selected ? "secondary" : "ghost"}
                size="sm"
                className={`size-8 p-0 ${selected ? "text-foreground" : ""}`}
                onClick={() => onChange(option.value)}
              >
                {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
              </Button>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as T)}
      variant="pill"
    >
      <TabsList aria-label={label} className="bg-muted p-0.5">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <TabsTrigger
              key={option.value}
              value={option.value}
              icon={Icon ? <Icon className="size-4" /> : undefined}
              className="px-3 py-1"
            >
              {option.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

