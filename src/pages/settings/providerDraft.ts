import type { StoredProviderProfile } from "@/features/settings/providerStore";

/**
 * The half-edited provider list, kept across page changes. API keys are
 * deliberately absent: interface state is a plain file (D-070).
 */
export interface DraftProvider {
  id: string;
  name: string;
  baseUrl: string;
  protocol: NonNullable<StoredProviderProfile["protocol"]>;
  models: string[];
  /** Absent means yes; the editor always writes an explicit value. */
  supportsVision?: boolean;
}

export interface ProviderDraft {
  providers: DraftProvider[];
  activeProviderId: string | null;
  activeModel: string | null;
}

export const newProviderId = () => `provider-${crypto.randomUUID()}`;

export function stripKey(profile: StoredProviderProfile): DraftProvider {
  return {
    id: profile.id,
    name: profile.name,
    baseUrl: profile.baseUrl,
    protocol: profile.protocol ?? "openai-chat",
    models: profile.models,
    supportsVision: profile.supportsVision !== false,
  };
}
