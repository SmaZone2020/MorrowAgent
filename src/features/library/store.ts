import { create } from "zustand";
import {
  listWorkspaces,
  touchWorkspace,
  workspaceContent,
  type PackageContent,
  type Workspace,
} from "@/features/library/api";
import { readScope, writeScope, usePersistedState } from "@/features/uiState";

/**
 * The shelf and the active workspace.
 *
 * Loading is deliberately split: the shelf needs only the workspace rows, but a
 * workspace page needs the whole package. Keeping them separate means the shelf
 * paints immediately after a cold start while the content arrives behind it.
 */
interface LibraryState {
  workspaces: Workspace[];
  loaded: boolean;
  hydrating: boolean;
  error: string | null;

  activeId: string | null;
  content: PackageContent | null;
  contentFor: string | null;
  contentError: string | null;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  open: (workspaceId: string) => Promise<void>;
  close: () => void;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  workspaces: [],
  loaded: false,
  hydrating: false,
  error: null,

  activeId: null,
  content: null,
  contentFor: null,
  contentError: null,

  hydrate: async () => {
    if (get().hydrating || get().loaded) return;
    set({ hydrating: true });
    const workspaces = await listWorkspaces();
    set({ workspaces, loaded: true, hydrating: false });
  },

  refresh: async () => {
    const workspaces = await listWorkspaces();
    set({ workspaces, loaded: true });
  },

  open: async (workspaceId) => {
    // Keep the previously loaded content on screen while the next one loads:
    // a page that blanks to a spinner on every switch feels broken.
    set({ activeId: workspaceId, contentError: null });
    if (get().contentFor === workspaceId && get().content) return;

    const content = await workspaceContent(workspaceId);
    if (get().activeId !== workspaceId) return;

    if (!content) {
      set({
        content: null,
        contentFor: workspaceId,
        contentError: "学习包内容已不可用，可能已被移除。",
      });
      await get().refresh();
      return;
    }

    set({ content, contentFor: workspaceId });
    void touchWorkspace(workspaceId);
  },

  close: () => set({ activeId: null }),
}));

/** Which workspace the user was last inside, restored on the next launch. */
export function rememberWorkspace(workspaceId: string | null) {
  writeScope("library:lastWorkspaceId", workspaceId);
}

export function lastWorkspaceId(): string | null {
  return readScope<string | null>("library:lastWorkspaceId", null);
}

/**
 * Shelf filters live in the library scope, not inside a workspace: they
 * describe how the whole shelf is being viewed.
 */
export function useShelfFilter() {
  return usePersistedState<string>("library:filter", "all");
}
