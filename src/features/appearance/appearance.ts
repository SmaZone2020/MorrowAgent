/**
 * Appearance is applied straight to the document element: the three axes are
 * one attribute each, so the CSS owns the palette and the app only names a
 * choice (D-071 ~ D-074).
 */
export type ThemeMode = "light" | "dark" | "system";
export type InterfaceFont = "sans" | "serif" | "mono";
export type UiScale = 0.9 | 1 | 1.1 | 1.25;

export interface Appearance {
  theme: ThemeMode;
  font: InterfaceFont;
  scale: UiScale;
}

export const defaultAppearance: Appearance = {
  theme: "system",
  font: "sans",
  scale: 1,
};

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
];

export const FONT_OPTIONS: { value: InterfaceFont; label: string }[] = [
  { value: "sans", label: "无衬线" },
  { value: "serif", label: "宋体" },
  { value: "mono", label: "等宽" },
];

export const SCALE_OPTIONS: { value: UiScale; label: string }[] = [
  { value: 0.9, label: "紧凑 90%" },
  { value: 1, label: "标准 100%" },
  { value: 1.1, label: "宽松 110%" },
  { value: 1.25, label: "特大 125%" },
];

const THEMES = new Set<string>(THEME_OPTIONS.map((option) => option.value));
const FONTS = new Set<string>(FONT_OPTIONS.map((option) => option.value));

/** Coerces a stored blob; unknown values fall back one axis at a time. */
export function normalizeAppearance(raw: unknown): Appearance {
  if (!raw || typeof raw !== "object") return defaultAppearance;
  const value = raw as Partial<Record<keyof Appearance, unknown>>;
  return {
    theme: THEMES.has(String(value.theme))
      ? (value.theme as ThemeMode)
      : defaultAppearance.theme,
    font: FONTS.has(String(value.font))
      ? (value.font as InterfaceFont)
      : defaultAppearance.font,
    scale: SCALE_OPTIONS.some((option) => option.value === value.scale)
      ? (value.scale as UiScale)
      : defaultAppearance.scale,
  };
}

const BASE_FONT_SIZE = 16;
const MIRROR_KEY = "morrow:appearance";
const darkQuery = "(prefers-color-scheme: dark)";

function resolvedTheme(theme: ThemeMode): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia(darkQuery).matches ? "dark" : "light";
}

/** Paints one appearance choice. Idempotent, so a re-render is harmless. */
export function applyAppearance(appearance: Appearance): void {
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme(appearance.theme);
  root.dataset.font = appearance.font;
  // Tailwind sizes are rem-based, so the root size is the whole zoom.
  root.style.fontSize = `${BASE_FONT_SIZE * appearance.scale}px`;
}

/**
 * The pre-paint hint. Interface state lives in `ui-state.json`, which is read
 * asynchronously, so a copy is mirrored here to avoid a light flash on boot.
 */
export function readAppearanceMirror(): Appearance | null {
  try {
    const raw = window.localStorage.getItem(MIRROR_KEY);
    if (!raw) return null;
    return normalizeAppearance(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeAppearanceMirror(appearance: Appearance): void {
  try {
    window.localStorage.setItem(MIRROR_KEY, JSON.stringify(appearance));
  } catch {
    // A blocked storage only costs the flash-free boot, not the setting.
  }
}

/** Applies the system theme live while the user is on "跟随系统". */
export function watchSystemTheme(
  theme: ThemeMode,
  onChange: () => void,
): () => void {
  if (theme !== "system") return () => undefined;
  const query = window.matchMedia(darkQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
