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
  /** Whether a key is available at all. The key itself never enters the webview. */
  ready: boolean;
  /**
   * Where that key came from: one typed on this page, or the builtin provider's
   * key. The page says which, because "已配置" without saying by what is how a
   * learner ends up editing the wrong field.
   */
  source: "search" | "provider" | null;
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
 * OpenAI-compatible endpoint and still pay DeepSeek per search. But they are the
 * same account when both are DeepSeek, so the backend falls back to the builtin
 * provider's key rather than asking for the same string twice; `source` reports
 * which of the two is in force.
 */
export const useSearchKey = create<SearchStore>((set, get) => ({
  ready: false,
  source: null,
  checking: false,
  balance: null,
  error: null,

  hydrate: async () => {
    if (!isTauriRuntime) {
      set({ ready: false, source: null });
      return;
    }
    try {
      const status = await invoke<{
        configured: boolean;
        source: "search" | "provider" | null;
      }>("search_key_status");
      set({ ready: status.configured, source: status.source });
    } catch {
      set({ ready: false, source: null });
    }
  },

  saveKey: async (key) => {
    await invoke("search_save_key", { key });
    set({
      ready: Boolean(key.trim()),
      source: key.trim() ? "search" : null,
      balance: null,
      error: null,
    });
    if (key.trim()) await get().refreshBalance();
  },

  refreshBalance: async () => {
    if (!isTauriRuntime) return;
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
    set({ ready: false, source: null, balance: null, error: null });
    // A provider key may still be there, which is what keeps search working.
    await get().hydrate();
  },
}));

function requireRuntime(): void {
  if (!isTauriRuntime) {
    throw new Error("搜索请求需要桌面应用的后端转发。");
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
