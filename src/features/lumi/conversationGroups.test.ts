import { describe, expect, it } from "vitest";
import { groupConversations } from "@/features/lumi/conversationGroups";
import type { ConversationSummary } from "@/features/lumi/history";

function row(id: string, workspaceId: string, updatedAt: number): ConversationSummary {
  return { id, workspaceId, title: id, updatedAt };
}

const list = [
  row("a2", "w-a", 300),
  row("b1", "w-b", 200),
  row("a1", "w-a", 100),
  row("c1", "w-c", 50),
];

describe("groupConversations", () => {
  it("folds a newest-first list into one group per workspace", () => {
    const groups = groupConversations(list, (id) => id.toUpperCase());

    expect(groups.map((group) => group.id)).toEqual(["w-a", "w-b", "w-c"]);
    expect(groups[0]!.list.map((entry) => entry.id)).toEqual(["a2", "a1"]);
    // Labels come from the caller, which is what lets a hash print a folder.
    expect(groups[1]!.label).toBe("W-B");
  });

  it("keeps the group the user is looking at first", () => {
    const groups = groupConversations(list, (id) => id, ["w-c"]);

    expect(groups[0]!.id).toBe("w-c");
    // The rest keep recency order rather than folding into one run.
    expect(groups.slice(1).map((group) => group.id)).toEqual(["w-a", "w-b"]);
  });

  it("puts rows written before workspaces existed in their own group", () => {
    const groups = groupConversations([row("x", "", 1)], (id) => id);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.id).toBe("unassigned");
  });

  it("returns nothing for an empty history", () => {
    expect(groupConversations([], (id) => id)).toEqual([]);
  });
});
