/**
 * Debug-only provider profile. Values come from `.env.local` so the testing
 * endpoint and key never live in the repo; when a real encrypted credential
 * store lands, this file becomes the fallback for local development only.
 */
export interface DebugProviderConfig {
  baseUrl: string;
  modelCatalogUrl: string;
  model: string;
  apiKey: string;
}

export function readDebugProvider(): DebugProviderConfig | null {
  const baseUrl = import.meta.env.VITE_AI_BASE_URL?.trim();
  const apiKey = import.meta.env.VITE_AI_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    modelCatalogUrl:
      import.meta.env.VITE_AI_MODEL_CATALOG_URL?.trim() ||
      `${baseUrl.replace(/\/+$/, "")}/models`,
    model: import.meta.env.VITE_AI_MODEL?.trim() || "deepseek-v4.1-flash",
    apiKey,
  };
}

/** True when a local debug credential is present, so UI can stop saying "未接入". */
export function hasDebugProvider(): boolean {
  return readDebugProvider() !== null;
}
