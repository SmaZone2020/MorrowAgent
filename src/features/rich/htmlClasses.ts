/**
 * The Tailwind subset a model-authored HTML block may use.
 *
 * Two readers depend on this list: the sanitizer keeps only these classes, and
 * the prompt tells the model which ones exist. They must never drift, so both
 * read this file — the prompt is generated from it rather than kept as a second
 * hand-written copy.
 *
 * It is a real allow-list rather than a prefix check: `bg-red-500` is a valid
 * class but not in the theme, and letting it through would make one reply look
 * like a different product.
 */
export const HTML_CLASS_GROUPS: readonly {
  label: string;
  classes: readonly string[];
}[] = [
  {
    label: "布局",
    classes: [
      "block", "inline-block", "inline", "flex", "inline-flex", "grid", "hidden",
      "flex-row", "flex-col", "flex-wrap", "items-start", "items-center", "items-end",
      "justify-start", "justify-center", "justify-between", "justify-end",
      "gap-1", "gap-2", "gap-3", "gap-4", "gap-6",
      "grid-cols-1", "grid-cols-2", "grid-cols-3",
      "flex-1", "shrink-0", "min-w-0", "w-full", "h-full",
      "relative", "absolute", "overflow-hidden", "overflow-x-auto",
    ],
  },
  {
    label: "间距",
    classes: [
      "mt-1", "mt-2", "mt-3", "mt-4", "mb-1", "mb-2", "mb-3", "mb-4",
      "ml-1", "ml-2", "mr-1", "mr-2", "my-1", "my-2", "my-3",
      "p-1", "p-2", "p-3", "p-4", "px-2", "px-3", "px-4", "py-1", "py-2", "py-3",
    ],
  },
  {
    label: "字号与对齐",
    classes: [
      "text-sm", "text-base", "text-lg", "text-xl",
      "font-normal", "font-medium", "font-semibold", "font-bold",
      "text-center", "text-right", "text-left",
      "leading-6", "leading-7", "leading-relaxed",
      "tabular-nums", "font-mono", "font-serif", "truncate", "whitespace-pre-wrap",
      "uppercase", "tracking-wide",
    ],
  },
  {
    label: "颜色（只用语义色，深浅主题都成立）",
    classes: [
      "bg-background", "bg-card", "bg-muted", "bg-primary", "bg-accent",
      "bg-success/10", "bg-warning/10", "bg-info/10", "bg-destructive/10",
      "bg-muted/50", "bg-muted/60",
      "text-foreground", "text-muted-foreground", "text-primary", "text-accent-foreground",
      "text-success", "text-warning", "text-info", "text-destructive",
      "text-primary-foreground", "text-card",
    ],
  },
  {
    label: "描边与圆角",
    classes: [
      "border", "border-t", "border-b", "border-l-2", "border-l-4",
      "border-border", "border-border/60", "border-border/70",
      "border-success/40", "border-warning/40", "border-info/40", "border-destructive/40",
      "rounded", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-full",
    ],
  },
  {
    label: "效果",
    classes: ["shadow-surface", "opacity-70", "opacity-80"],
  },
];

/** Every class the sanitizer will keep, in declaration order. */
export const HTML_CLASSES: readonly string[] = HTML_CLASS_GROUPS.flatMap(
  (group) => group.classes,
);
