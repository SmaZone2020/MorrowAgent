import { create } from "zustand";
import {
  clearProvider as clearStoredProvider,
  loadProvider,
  saveProvider as saveStoredProvider,
  type StoredProvider,
} from "@/features/settings/providerStore";
import { readDebugProvider } from "@/features/settings/debugProvider";

interface ProviderStatus {
  /** The stored credential, if the user has saved one. */
  provider: StoredProvider | null;
  /** Whether Lumi can reach a model right now. */
  configured: boolean;
  /** Read the encrypted blob once at startup. */
  hydrate: () => Promise<void>;
  save: (provider: StoredProvider) => Promise<void>;
  clear: () => Promise<void>;
}

function debugAsProvider(): StoredProvider | null {
  const debug = readDebugProvider();
  if (!debug) return null;
  return {
    baseUrl: debug.baseUrl,
    model: debug.model,
    apiKey: debug.apiKey,
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
        provider: stored,
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
export function activeProvider(): StoredProvider | null {
  return useProviderStatus.getState().provider ?? debugAsProvider();
}
