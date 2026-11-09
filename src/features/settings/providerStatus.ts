import { create } from "zustand";
import { hasDebugProvider } from "@/features/settings/debugProvider";

interface ProviderStatus {
  /** Whether a usable provider credential exists. */
  configured: boolean;
  setConfigured: (configured: boolean) => void;
}

// Until the encrypted credential store lands this is the single place that
// answers "can Lumi reach a model yet", so every entry point agrees instead of
// hard-coding a placeholder badge in each screen. A local `.env.local` debug
// credential counts, which is what makes the debug endpoint usable at all.
export const useProviderStatus = create<ProviderStatus>((set) => ({
  configured: hasDebugProvider(),
  setConfigured: (configured) => set({ configured }),
}));
