/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Provider endpoint used only for local debugging. */
  readonly VITE_AI_BASE_URL?: string;
  /** Endpoint that lists available model ids, when the provider exposes one. */
  readonly VITE_AI_MODEL_CATALOG_URL?: string;
  readonly VITE_AI_MODEL?: string;
  readonly VITE_AI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
