import { create } from "zustand";
import { currentProfile } from "@/features/lumi/learnerProfile";

/**
 * One finished reply the learner has not seen yet.
 *
 * It doubles as the toast payload: the notice list is what the global toast host
 * reads, so a reply that finishes off-screen produces both the rail dot and, if
 * the learner asked for them, a toast.
 */
export interface LumiNotice {
  id: string;
  workspaceId: string;
  /** The package the reply belongs to, so the toast can name it. */
  packageName: string;
}

/**
 * Which workspace's Lumi page is on screen right now.
 *
 * A counter rather than a flag because React runs mount effects twice in
 * development: two registrations and one cleanup must not leave the page
 * considered hidden. `agentLoop` reads this from outside React, which is why it
 * is a module map instead of component state.
 */
const onScreen = new Map<string, number>();

export function setLumiOnScreen(workspaceId: string, visible: boolean) {
  const current = onScreen.get(workspaceId) ?? 0;
  const next = visible ? current + 1 : Math.max(0, current - 1);
  if (next === 0) onScreen.delete(workspaceId);
  else onScreen.set(workspaceId, next);
}

export function isLumiOnScreen(workspaceId: string): boolean {
  return (onScreen.get(workspaceId) ?? 0) > 0;
}

interface LumiActivityState {
  /** Packages with a reply the learner has not looked at. */
  unread: Record<string, true>;
  /** Newest last, capped by the store. */
  notices: LumiNotice[];
  clearUnread: (workspaceId: string) => void;
  dismissNotice: (id: string) => void;
  /** Test seam: forgets everything, including who is on screen. */
  reset: () => void;
}

/** Older notices are only interesting until the learner reads one. */
const NOTICE_LIMIT = 3;

export const useLumiActivity = create<LumiActivityState>((set) => ({
  unread: {},
  notices: [],

  clearUnread: (workspaceId) =>
    set((state) => {
      if (!state.unread[workspaceId]) return state;
      const unread = { ...state.unread };
      delete unread[workspaceId];
      return { unread };
    }),

  dismissNotice: (id) =>
    set((state) => ({
      notices: state.notices.filter((notice) => notice.id !== id),
    })),

  reset: () => {
    onScreen.clear();
    set({ unread: {}, notices: [] });
  },
}));

let noticeSeed = 0;

/** Which of the two announcements the learner asked for. */
export interface ReplyNotifyOptions {
  /** Mark the rail entry. */
  dot: boolean;
  /** Raise a toast as well. */
  toast: boolean;
}

/**
 * Called once a reply has finished, from the conversation store.
 *
 * A reply the learner is watching needs no announcement; one that finished while
 * they were reading the knowledge base does, because the answer they asked for
 * is now sitting on a page they are not looking at. Both signals are separate
 * preferences: a dot is quiet and always appropriate, a toast interrupts and is
 * not.
 *
 * The switches arrive as an argument rather than being read here: this module is
 * imported by the conversation store, which must stay free of the preferences
 * store's window-bound imports so it can be tested.
 */
export function noteReplySettled(
  workspaceId: string | null,
  options: ReplyNotifyOptions,
) {
  if (!workspaceId) return;
  if (isLumiOnScreen(workspaceId)) return;

  const packageName = currentProfile(workspaceId).packageName;
  const notice: LumiNotice = {
    id: `lumi-reply-${Date.now()}-${noticeSeed++}`,
    workspaceId,
    packageName,
  };

  useLumiActivity.setState((state) => ({
    unread: options.dot
      ? { ...state.unread, [workspaceId]: true }
      : state.unread,
    notices: options.toast
      ? [...state.notices, notice].slice(-NOTICE_LIMIT)
      : state.notices,
  }));
}
