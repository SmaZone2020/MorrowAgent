import { create } from "zustand";
import {
  clearProvider as clearStoredProvider,
  loadProvider,
  saveProvider as saveStoredProvider,
  type StoredProvider,
} from "@/features/settings/providerStore";
import { readDebugProvider } from "@/features/settings/debugProvider";
import type { Protocol } from "@/features/settings/aiBridge";

export interface ProviderProfile extends StoredProvider {
  protocol: Protocol;
}

interface ProviderStatus {
  /** The stored credential, if the user has saved one. */
  provider: ProviderProfile | null;
  /** Whether Lumi can reach a model right now. */
  configured: boolean;
  /** Read the encrypted blob once at startup. */
  hydrate: () => Promise<void>;
  save: (provider: ProviderProfile) => Promise<void>;
  clear: () => Promise<void>;
}

function debugAsProvider(): ProviderProfile | null {
  const debug = readDebugProvider();
  if (!debug) return null;
  return {
    baseUrl: debug.baseUrl,
    model: debug.model,
    apiKey: debug.apiKey,
    protocol: "openai-chat",
  };
}

// This store is the single answer to "can Lumi reach a model yet", so every
// screen agrees instead of hard-coding a placeholder badge. A saved credential
// wins over the local debug environment, which keeps the debug endpoint from
// shadowing a real configuration during development.
export const useProviderStatus = create<ProviderStatus>((set) => ({
  provider: null,
  configured: Boolean(debugAsProvider()),

  hydrate: async () => {
    try {
      const stored = await loadProvider();
      set({
        provider: stored
          ? { ...stored, protocol: stored.protocol ?? "openai-chat" }
          : null,
        configured: Boolean(stored) || Boolean(debugAsProvider()),
      });
    } catch {
      // A broken blob must not keep the app from booting; treat it as unset.
      set({ provider: null, configured: Boolean(debugAsProvider()) });
    }
  },

  save: async (provider) => {
    await saveStoredProvider(provider);
    set({ provider, configured: true });
  },

  clear: async () => {
    await clearStoredProvider();
    set({ provider: null, configured: Boolean(debugAsProvider()) });
  },
}));

/** The credential to send with a request: stored first, debug env second. */
export function activeProvider(): ProviderProfile | null {
  return useProviderStatus.getState().provider ?? debugAsProvider();
}
