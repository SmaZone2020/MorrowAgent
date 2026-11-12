import { create } from "zustand";
import {
  clearProvider as clearStoredProvider,
  loadProvider,
  saveProvider as saveStoredProvider,
  type ProviderBook,
  type StoredProviderProfile,
} from "@/features/settings/providerStore";
import { readDebugProvider } from "@/features/settings/debugProvider";
import type { Protocol } from "@/features/settings/aiBridge";

/** A saved profile with its protocol and vision flag resolved to concrete values. */
export interface ProviderProfile extends StoredProviderProfile {
  protocol: Protocol;
  supportsVision: boolean;
}

/** What a request needs: one endpoint, one key, one model. */
export interface ActiveProviderConfig {
  profileId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  protocol: Protocol;
  /** False when the model cannot read images; uploads are then refused early. */
  supportsVision: boolean;
}

interface ProviderStatus {
  /** Every configured provider, in the order the user added them. */
  providers: ProviderProfile[];
  /** The provider whose model is currently in use. */
  activeProviderId: string | null;
  /** The one model every screen sends requests to (D-076). */
  activeModel: string | null;
  /** Whether Lumi can reach a model right now. */
  configured: boolean;
  hydrate: () => Promise<void>;
  /** Replaces the whole book; the settings page edits it locally, then saves. */
  saveBook: (book: ProviderBook) => Promise<void>;
  clear: () => Promise<void>;
}

function withProtocol(provider: StoredProviderProfile): ProviderProfile {
  return {
    ...provider,
    protocol: provider.protocol ?? "openai-chat",
    supportsVision: provider.supportsVision !== false,
  };
}

function debugProfile(): ProviderProfile | null {
  const debug = readDebugProvider();
  if (!debug) return null;
  return {
    id: "debug",
    name: "本地调试",
    baseUrl: debug.baseUrl,
    apiKey: debug.apiKey,
    protocol: "openai-chat",
    models: [debug.model],
    supportsVision: true,
  };
}

/** Local `.env.local` credentials only count when nothing was saved. */
function debugFallback(): ProviderProfile[] {
  const debug = debugProfile();
  return debug ? [debug] : [];
}

function canReach(
  providers: ProviderProfile[],
  activeProviderId: string | null,
  activeModel: string | null,
): boolean {
  const active = providers.find((provider) => provider.id === activeProviderId);
  return Boolean(active?.apiKey.trim() && active.baseUrl.trim() && activeModel);
}

/**
 * The stored book always has at least the builtin DeepSeek row, so an empty
 * list no longer means "nothing saved". The local `.env.local` credential is
 * therefore a fallback for reachability, not a replacement for the list: the
 * settings page must keep showing the builtin row so its key can be filled in.
 */
function fromBook(book: ProviderBook | null) {
  const providers = book ? book.providers.map(withProtocol) : [];
  const list = providers.length > 0 ? providers : debugFallback();
  const activeProviderId =
    book?.activeProviderId ?? list[0]?.id ?? null;
  const activeModel = book?.activeModel ?? list[0]?.models[0] ?? null;
  return {
    providers: list,
    activeProviderId,
    activeModel,
    configured: canReach(list, activeProviderId, activeModel) || debugProfile() !== null,
  };
}

// This store is the single answer to "can Lumi reach a model yet", so every
// screen agrees instead of hard-coding a placeholder badge. Saved providers win
// over the local debug environment, which keeps the debug endpoint from
// shadowing a real configuration during development.
export const useProviderStatus = create<ProviderStatus>((set) => ({
  ...fromBook(null),

  hydrate: async () => {
    try {
      set(fromBook(await loadProvider()));
    } catch {
      // A broken blob must not keep the app from booting; treat it as unset.
      set(fromBook(null));
    }
  },

  saveBook: async (book) => {
    await saveStoredProvider(book);
    // Trust the backend's normalization rather than the local copy: it is the
    // one that drops dangling ids and falls back to a first model.
    const stored = await loadProvider().catch(() => null);
    set(fromBook(stored ?? book));
  },

  clear: async () => {
    await clearStoredProvider();
    set(fromBook(null));
  },
}));

/**
 * The credential to send with a request: saved book first, debug env second.
 *
 * The book always contains the builtin DeepSeek row now, so "a provider exists"
 * no longer means "a provider is configured". A laptop running against
 * `.env.local` still has that row, empty, and would otherwise lose its debug
 * endpoint the moment the builtin shipped.
 */
export function activeProvider(): ActiveProviderConfig | null {
  const { providers, activeProviderId, activeModel } = useProviderStatus.getState();
  const profile = providers.find((entry) => entry.id === activeProviderId);
  if (profile && activeModel && profile.baseUrl.trim() && profile.apiKey.trim()) {
    return {
      profileId: profile.id,
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
      model: activeModel,
      protocol: profile.protocol,
      supportsVision: profile.supportsVision,
    };
  }
  const debug = debugProfile();
  if (!debug) return null;
  return {
    profileId: debug.id,
    baseUrl: debug.baseUrl,
    apiKey: debug.apiKey,
    model: debug.models[0] ?? "",
    protocol: debug.protocol,
    supportsVision: debug.supportsVision,
  };
}
