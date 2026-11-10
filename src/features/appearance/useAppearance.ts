import { useEffect } from "react";
import {
  applyAppearance,
  defaultAppearance,
  normalizeAppearance,
  readAppearanceMirror,
  watchSystemTheme,
  writeAppearanceMirror,
  type Appearance,
} from "@/features/appearance/appearance";
import { usePersistedState } from "@/features/uiState";

/** The scope holding the three appearance axes (D-072). */
export const APPEARANCE_SCOPE = "appearance";

/**
 * Appearance lives in interface state, so it follows the same
 * first-frame-from-memory rule as every other persisted scope.
 */
export function useAppearance() {
  // The mirror is only a starting point: the persisted scope replaces it as soon
  // as the file is read, so a stale mirror cannot win over the real setting.
  const [stored, setStored] = usePersistedState<Appearance>(
    APPEARANCE_SCOPE,
    readAppearanceMirror() ?? defaultAppearance,
  );
  // A hand-edited file or an older build may hold a value this version dropped.
  const appearance = normalizeAppearance(stored);

  useEffect(() => {
    applyAppearance(appearance);
    writeAppearanceMirror(appearance);
    // "跟随系统" must repaint when the OS switches, without a reload.
    return watchSystemTheme(appearance.theme, () =>
      applyAppearance({ ...appearance, theme: "system" }),
    );
  }, [appearance]);

  const update = (patch: Partial<Appearance>) =>
    setStored((current) => ({ ...normalizeAppearance(current), ...patch }));

  return { appearance, update };
}

/**
 * Boot-time paint. Called before React mounts so the first frame already has
 * the right palette and root size instead of flashing the default.
 */
export function applyBootAppearance(): void {
  applyAppearance(readAppearanceMirror() ?? defaultAppearance);
}
