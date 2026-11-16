import type { ConversationSummary } from "@/features/lumi/history";

/** One workspace's slice of a history list. */
export interface ConversationGroup {
  /** The workspace id the rows were written under. */
  id: string;
  label: string;
  /** Fuller text for a hover hint, when the label is an abbreviation. */
  hint?: string;
  list: ConversationSummary[];
}

/**
 * Folds a newest-first conversation list into groups, one per workspace.
 *
 * The input order is what orders the output: a `Map` keeps first-seen keys, and
 * the first row of a workspace is its most recent one, so groups come out by
 * activity without a second sort. `firstIds` pins the workspace the user is
 * looking at to the top, which is the one case where recency is the wrong order.
 */
export function groupConversations(
  list: ConversationSummary[],
  labelFor: (workspaceId: string) => string,
  firstIds: string[] = [],
  hintFor?: (workspaceId: string) => string,
): ConversationGroup[] {
  const groups = new Map<string, ConversationGroup>();

  for (const entry of list) {
    const id = entry.workspaceId || "unassigned";
    let group = groups.get(id);
    if (!group) {
      group = { id, label: labelFor(id), hint: hintFor?.(id), list: [] };
      groups.set(id, group);
    }
    group.list.push(entry);
  }

  const rank = (id: string) => {
    const index = firstIds.indexOf(id);
    return index === -1 ? firstIds.length : index;
  };

  // Stable: two unpinned groups keep their recency order.
  return [...groups.values()].sort((a, b) => rank(a.id) - rank(b.id));
}
