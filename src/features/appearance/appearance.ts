/**
 * Appearance is applied straight to the document element: the three axes are
 * one attribute each, so the CSS owns the palette and the app only names a
 * choice (D-071 ~ D-074).
 */
export type ThemeMode = "light" | "dark" | "system";
export type InterfaceFont = "system" | "sans" | "serif" | "mono";
/** Root font scale as a fraction; 1 = 100%. */
export type UiScale = number;

export const UI_SCALE_MIN = 0.8;
export const UI_SCALE_MAX = 1.5;

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
  { value: "system", label: "系统字体" },
  { value: "sans", label: "无衬线" },
  { value: "serif", label: "宋体" },
  { value: "mono", label: "等宽" },
];

/** One-tap stops; any value in range can still be typed. */
export const SCALE_PRESETS = [0.9, 1, 1.1, 1.25];

const THEMES = new Set<string>(THEME_OPTIONS.map((option) => option.value));
const FONTS = new Set<string>(FONT_OPTIONS.map((option) => option.value));

/** Keeps a typed percentage inside the supported band. */
export function clampScale(scale: number): UiScale {
  if (!Number.isFinite(scale)) return defaultAppearance.scale;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, scale));
}

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
    scale:
      typeof value.scale === "number"
        ? clampScale(value.scale)
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
  root.style.fontSize = `${BASE_FONT_SIZE * clampScale(appearance.scale)}px`;
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
