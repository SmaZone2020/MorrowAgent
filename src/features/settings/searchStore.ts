import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

/** One web hit, flattened from the search endpoint's own field names. */
export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
  summary?: string;
  content?: string;
  siteName?: string;
  date?: string;
  authority?: number;
  rerankScore?: number;
}

export interface SearchResult {
  results: SearchHit[];
}

export interface FetchedPage {
  url: string;
  title: string;
  content: string;
}

export interface BalanceInfo {
  currency: string;
  totalBalance: string;
  grantedBalance: string;
  toppedUpBalance: string;
}

export interface AccountBalance {
  isAvailable: boolean;
  balanceInfos: BalanceInfo[];
}

interface SearchStore {
  /** Whether a key is stored. The key itself never enters the webview twice. */
  ready: boolean;
  /** Only while the settings page is open, to prove the key works. */
  checking: boolean;
  balance: AccountBalance | null;
  error: string | null;
  hydrate: () => Promise<void>;
  saveKey: (key: string) => Promise<void>;
  /** Re-reads the stored key, which is what the balance row displays. */
  refreshBalance: () => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * The DeepSeek search credential, kept apart from the chat providers.
 *
 * Chat and search are separate purchases: a learner can run Lumi on any
 * OpenAI-compatible endpoint and still pay DeepSeek per search. One flag is all
 * the UI needs — `ready` — because the backend reads the key itself.
 */
export const useSearchKey = create<SearchStore>((set, get) => ({
  ready: false,
  checking: false,
  balance: null,
  error: null,

  hydrate: async () => {
    if (!isTauriRuntime) {
      set({ ready: false });
      return;
    }
    try {
      const key = await invoke<string | null>("search_load_key");
      set({ ready: Boolean(key) });
    } catch {
      set({ ready: false });
    }
  },

  saveKey: async (key) => {
    await invoke("search_save_key", { key });
    set({ ready: Boolean(key.trim()), balance: null, error: null });
    if (key.trim()) await get().refreshBalance();
  },

  refreshBalance: async () => {
    if (!isTauriRuntime || !get().ready) return;
    set({ checking: true, error: null });
    try {
      const balance = await invoke<AccountBalance>("deepseek_balance");
      set({ balance, checking: false });
    } catch (error) {
      set({
        balance: null,
        checking: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  clear: async () => {
    await invoke("search_save_key", { key: "" });
    set({ ready: false, balance: null, error: null });
  },
}));

function requireRuntime(): void {
  if (!isTauriRuntime) {
    throw new Error("搜索由 Tauri 后端转发，浏览器预览中不可用。");
  }
}

/** A web search. Non-UI callers (the Lumi tool) go through here. */
export async function searchWeb(
  query: string,
  options: { count?: number; needContent?: boolean } = {},
): Promise<SearchHit[]> {
  requireRuntime();
  const result = await invoke<SearchResult>("search_web", {
    request: {
      query,
      count: options.count,
      needContent: options.needContent,
    },
  });
  return result.results;
}

/** One page as cleaned text, which is what the model actually reads. */
export async function fetchPage(url: string): Promise<FetchedPage> {
  requireRuntime();
  return invoke<FetchedPage>("fetch_page", { request: { url } });
}
