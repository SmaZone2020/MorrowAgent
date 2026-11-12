import { create } from "zustand";
import {
  defaultPreferences,
  loadPreferences,
  savePreferences,
  type Preferences,
} from "@/features/settings/preferences";

interface PreferencesState extends Preferences {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Preferences>) => void;
}

// Generation settings live in one store so the settings page and the request
// path never disagree about what is actually being sent.
export const usePreferences = create<PreferencesState>((set, get) => ({
  ...defaultPreferences,
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await loadPreferences();
      set({ ...stored, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  update: (patch) => {
    const next = {
      temperature: get().temperature,
      maxTokens: get().maxTokens,
      questionScale: get().questionScale,
      persona: get().persona,
      teachingStyle: get().teachingStyle,
      nickname: get().nickname,
      birthday: get().birthday,
      thinking: get().thinking,
      lumiDot: get().lumiDot,
      lumiToast: get().lumiToast,
      ...patch,
    };
    set(next);
    // Persisting is fire-and-forget: the slider must stay responsive.
    void savePreferences(next).catch(() => undefined);
  },
}));
