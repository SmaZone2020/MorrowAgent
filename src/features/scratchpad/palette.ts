/**
 * The pen colours.
 *
 * `value` is what a stroke stores: an empty string means "whatever the
 * foreground token is right now", so ink drawn on the default nib stays
 * readable after a theme switch. The rest are fixed hues picked to sit on both
 * the light and the dark card without glowing.
 */
export interface InkColor {
  id: string;
  label: string;
  /** Stored on the stroke; empty = follow the theme foreground. */
  value: string;
  /** Swatch fill. Differs from `value` only for the theme-following entry. */
  swatch: string;
}

export const INK_COLORS: InkColor[] = [
  { id: "ink", label: "墨黑", value: "", swatch: "var(--foreground)" },
  { id: "red", label: "朱红", value: "#c0564a", swatch: "#c0564a" },
  { id: "amber", label: "赭黄", value: "#c98a3f", swatch: "#c98a3f" },
  { id: "green", label: "松绿", value: "#4f8a63", swatch: "#4f8a63" },
  { id: "blue", label: "靛蓝", value: "#4a6fa5", swatch: "#4a6fa5" },
  { id: "violet", label: "青紫", value: "#7b62a8", swatch: "#7b62a8" },
];

export const DEFAULT_INK_COLOR = "";

/** Swatch for a stored value, so a trigger can show the current nib. */
export function swatchOf(value: string): string {
  return INK_COLORS.find((entry) => entry.value === value)?.swatch ?? value;
}

/** Label for a stored value, used as the accessible name of the trigger. */
export function labelOf(value: string): string {
  return INK_COLORS.find((entry) => entry.value === value)?.label ?? "墨色";
}

/**
 * The fill a stroke is painted with. A stroke drawn on the default nib carries
 * no colour and follows the current foreground token, so ink recorded in one
 * theme stays readable in the other.
 */
export function strokeColor(
  stored: string | undefined,
  themeInk: string,
): string {
  return stored || themeInk;
}
