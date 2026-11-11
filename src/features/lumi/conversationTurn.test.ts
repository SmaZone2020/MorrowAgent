import { describe, expect, it } from "vitest";
import {
  decodeTurn,
  encodeTurn,
  shouldPersist,
  toHistory,
  turnContent,
  type ConversationTurn,
} from "@/features/lumi/conversationTurn";

const user = (id: string, content: string): ConversationTurn => ({
  id,
  role: "user",
  content,
});

const toolCall = { id: "call_1", name: "ask_questions", arguments: "{}" };

/** The columns the transcript table actually stores beside the text. */
const row = (id: string, role: "user" | "assistant", content: string) => ({
  id,
  conversationId: "c1",
  role,
  content,
  createdAt: 0,
  attachments: [],
});

describe("encodeTurn / decodeTurn", () => {
  it("writes a plain turn verbatim, so the database stays greppable", () => {
    expect(encodeTurn(user("t1", "你好"))).toBe("你好");
    expect(decodeTurn(row("t1", "user", "你好"))).toEqual(user("t1", "你好"));
  });

  it("keeps the tool calls of an assistant turn across a reload", () => {
    const turn: ConversationTurn = {
      id: "t2",
      role: "assistant",
      content: "做几道题",
      toolCalls: [toolCall],
    };
    const restored = decodeTurn(row("t2", "assistant", encodeTurn(turn)));
    expect(restored.content).toBe("做几道题");
    expect(restored.toolCalls).toEqual([toolCall]);
  });

  it("survives a damaged marker instead of losing the turn", () => {
    const restored = decodeTurn(row("t3", "assistant", "\u0000morrow{not json"));
    expect(restored.content).toBe("\u0000morrow{not json");
  });

  it("persists a tool turn that carries no prose", () => {
    expect(
      shouldPersist({ id: "t4", role: "assistant", content: "", toolCalls: [toolCall] }),
    ).toBe(true);
    expect(shouldPersist({ id: "t5", role: "assistant", content: "" })).toBe(false);
  });
});

describe("toHistory", () => {
  it("pairs an answered call with its result", () => {
    const turns: ConversationTurn[] = [
      user("t1", "出题"),
      { id: "t2", role: "assistant", content: "好", toolCalls: [toolCall] },
      { id: "t3", role: "assistant", content: "全对", toolCallId: "call_1" },
    ];
    const history = toHistory(turns, "");
    expect(history.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "tool",
    ]);
    expect(history[1]?.toolCalls).toEqual([toolCall]);
    expect(history[2]?.toolCallId).toBe("call_1");
  });

  it("degrades an unanswered call to plain text, which is what keeps a provider happy", () => {
    const turns: ConversationTurn[] = [
      user("t1", "出题"),
      { id: "t2", role: "assistant", content: "好", toolCalls: [toolCall] },
    ];
    const history = toHistory(turns, "");
    expect(history).toHaveLength(2);
    expect(history[1]?.toolCalls).toBeUndefined();
    expect(history[1]?.content).toBe("好");
  });

  it("degrades a turn whose second call never came back", () => {
    const second = { id: "call_2", name: "ask_questions", arguments: "{}" };
    const turns: ConversationTurn[] = [
      { id: "t1", role: "assistant", content: "两组", toolCalls: [toolCall, second] },
      { id: "t2", role: "assistant", content: "答完", toolCallId: "call_1" },
    ];
    const history = toHistory(turns, "");
    expect(history[0]?.toolCalls).toBeUndefined();
  });

  it("skips the turn currently being streamed", () => {
    const turns: ConversationTurn[] = [
      user("t1", "在吗"),
      { id: "t2", role: "assistant", content: "", pending: true },
    ];
    expect(toHistory(turns, "t2")).toHaveLength(1);
  });

  it("drops a failed turn", () => {
    const turns: ConversationTurn[] = [
      user("t1", "在吗"),
      { id: "t2", role: "assistant", content: "x", error: "超时" },
    ];
    expect(toHistory(turns, "")).toHaveLength(1);
  });
});

describe("attachments", () => {
  const image = {
    id: "a1",
    kind: "image" as const,
    name: "page.png",
    mimeType: "image/png",
    size: 10,
    data: "aGVsbG8=",
    text: "",
  };
  const document = {
    id: "a2",
    kind: "document" as const,
    name: "notes.md",
    mimeType: "text/markdown",
    size: 20,
    data: "",
    text: "导数定义",
  };

  it("sends an image as parts so a vision model can see it", () => {
    const body = turnContent({ ...user("t1", "这题怎么做"), attachments: [image] });
    expect(Array.isArray(body)).toBe(true);
    const parts = body as { type: string; text?: string }[];
    expect(parts[0]).toEqual({ type: "text", text: "这题怎么做" });
    expect(parts[1]).toMatchObject({ type: "image", mimeType: "image/png" });
  });

  it("inlines a document as text, so a text-only model still gets it", () => {
    const body = turnContent({ ...user("t1", "看下笔记"), attachments: [document] });
    expect(typeof body).toBe("string");
    expect(body).toContain('<document name="notes.md">');
    expect(body).toContain("导数定义");
  });

  it("keeps the question when the pictures are dropped for a retry", () => {
    const turns = [user("t1", "这题怎么做")];
    turns[0]!.attachments = [image, document];
    const history = toHistory(turns, "", { dropImages: true });
    expect(typeof history[0]?.content).toBe("string");
    expect(history[0]?.content).toContain("这题怎么做");
    expect(history[0]?.content).toContain("导数定义");
  });

  it("round trips attachments and the degradation note", () => {
    const turn: ConversationTurn = {
      ...user("t1", "这题怎么做"),
      attachments: [image],
      note: "这个模型不支持图片",
    };
    const restored = decodeTurn(row("t1", "user", encodeTurn(turn)));
    expect(restored.attachments).toEqual([image]);
    expect(restored.note).toBe("这个模型不支持图片");
  });

  it("persists an upload that carries no words", () => {
    expect(shouldPersist({ ...user("t1", ""), attachments: [image] })).toBe(true);
  });
});
