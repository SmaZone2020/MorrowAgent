import { describe, expect, it } from "vitest";
import {
  callNames,
  deletionScope,
  groupTurns,
} from "@/features/lumi/messageGroups";
import type { ConversationTurn } from "@/features/lumi/conversationTurn";

const user = (id: string, content: string): ConversationTurn => ({
  id,
  role: "user",
  content,
});

const reply = (id: string, content: string): ConversationTurn => ({
  id,
  role: "assistant",
  content,
});

const call = { id: "call_1", name: "search_knowledge", arguments: "{}" };

/** One turn that asked for a tool, the result, and the answer it wrote after. */
const round: ConversationTurn[] = [
  user("u1", "导数是什么"),
  { id: "a1", role: "assistant", content: "我查一下", toolCalls: [call] },
  { id: "a2", role: "assistant", content: "查到了", toolCallId: "call_1" },
  reply("a3", "导数是变化率"),
];

describe("groupTurns", () => {
  it("folds one tool round into a single assistant message", () => {
    const groups = groupTurns(round);
    expect(groups.map((group) => group.role)).toEqual(["user", "assistant"]);
    expect(groups[1]?.turns.map((turn) => turn.id)).toEqual(["a1", "a2", "a3"]);
    expect(groups[1]?.anchorId).toBe("a1");
  });

  it("copies the prose and leaves the tool output out", () => {
    const groups = groupTurns(round);
    expect(groups[1]?.text).toBe("我查一下\n\n导数是变化率");
  });

  it("keeps separate replies apart", () => {
    const groups = groupTurns([
      user("u1", "在吗"),
      reply("a1", "在"),
      user("u2", "再来"),
      reply("a2", "好"),
    ]);
    expect(groups.map((group) => group.anchorId)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("marks the message pending while any of its turns is", () => {
    const groups = groupTurns([
      user("u1", "在吗"),
      { id: "a1", role: "assistant", content: "在", toolCalls: [call] },
      { id: "a2", role: "assistant", content: "", pending: true },
    ]);
    expect(groups[1]?.pending).toBe(true);
    expect(groups[1]?.text).toBe("在");
  });
});

describe("deletionScope", () => {
  it("takes the whole round when the question is deleted", () => {
    const groups = groupTurns(round);
    expect(deletionScope(round, groups[0]!).sort()).toEqual(["a1", "a2", "a3", "u1"]);
  });

  it("deletes only the answer when the answer is deleted", () => {
    const groups = groupTurns(round);
    expect(deletionScope(round, groups[1]!)).toEqual(["a1", "a2", "a3"]);
  });

  it("stops at the next question", () => {
    const turns = [
      user("u1", "第一问"),
      reply("a1", "答一"),
      user("u2", "第二问"),
      reply("a2", "答二"),
    ];
    const groups = groupTurns(turns);
    expect(deletionScope(turns, groups[0]!).sort()).toEqual(["a1", "u1"]);
  });
});

describe("callNames", () => {
  it("finds the name of a call the result row only knows by id", () => {
    expect(callNames(round)).toEqual({ call_1: "search_knowledge" });
  });
});
