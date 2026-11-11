import type { ToolDef } from "@/features/settings/aiBridge";
import {
  LEVEL_LABEL,
  levelOf,
  masteryOf,
  weakestFirst,
} from "@/features/training/mastery";

/**
 * Tools the model may call, and how this client answers them.
 *
 * Most tools here are pure reads over the installed package: the model asks a
 * question, the answer comes from the knowledge base, and nothing is invented.
 * The one write is `ask_questions`, which does not answer itself — it suspends
 * the turn until the user has actually worked through the questions.
 */
export interface ToolContext {
  workspaceId: string;
  /** Every knowledge point in the package, in authored order. */
  points: { id: string; name: string; summary: string }[];
  /** Point metadata by id. */
  findPoint: (pointId: string) => { name: string; summary: string } | undefined;
  questionsForPoint: (pointId: string) => {
    id: string;
    content: string;
    questionType: string;
    answer: string;
    /** 1–5, as the package declares it. */
    difficulty: number;
  }[];
  /** Per-point tallies, keyed by knowledge point id. */
  stats: Map<string, { attempts: number; correct: number; lastAttemptAt: number }>;
  /** Wrong-book rows, newest first. */
  wrong: { questionId: string; knowledgePointId: string; createdAt: number }[];
}

export type ToolOutcome =
  | { status: "ok"; output: string }
  /** The turn is paused until the user answers. */
  | { status: "pending"; output: string }
  | { status: "error"; output: string };

export interface ToolHandler {
  definition: ToolDef;
  run: (args: Record<string, unknown>, context: ToolContext) => ToolOutcome;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function count(value: unknown, fallback: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.round(parsed)));
}

/** Reads a tool's arguments without trusting their shape. */
export function parseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * `ask_questions` does not produce an answer on its own: it hands the questions
 * to the conversation, and the user's submission becomes the tool result. That
 * is why its handler is a placeholder — the loop detects it by name.
 */
export const QUIZ_TOOL = "ask_questions";

export const TOOLS: ToolHandler[] = [
  {
    definition: {
      name: QUIZ_TOOL,
      description:
        "给学生出题并等待作答。调用后本轮结束，学生会看到题卡；学生提交后你才会收到每题的对错与作答内容。一次可以做 1–8 题，题型可混排（单选、多选、填空、画板）。",
      parameters: {
        type: "object",
        required: ["componentId", "questions"],
        properties: {
          componentId: {
            type: "string",
            description: "本次题组的唯一标识，字母数字与下划线，例如 set_2024_03。",
          },
          title: { type: "string", description: "题组标题，例如「导数定义 · 3 题」。" },
          questions: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
              type: "object",
              required: ["id", "type", "stem"],
              properties: {
                id: { type: "string", description: "组内唯一，例如 q1。" },
                type: {
                  type: "string",
                  enum: ["single_choice", "multiple_choice", "fill_blank", "board"],
                },
                stem: { type: "string", description: "题干，数学用 $...$。" },
                options: {
                  type: "array",
                  description: "选择/多选题必填。",
                  items: {
                    type: "object",
                    required: ["key", "content", "correct"],
                    properties: {
                      key: { type: "string", description: "选项标识，如 A。" },
                      content: { type: "string" },
                      correct: { type: "boolean" },
                      explanation: {
                        type: "string",
                        description: "该选项为什么对，或错在哪一步。",
                      },
                    },
                  },
                },
                answer: {
                  type: "array",
                  items: { type: "string" },
                  description: "选择题填选项 key；填空题填标准答案文本。",
                },
                explanation: { type: "string", description: "整体解析。" },
                knowledgePoints: {
                  type: "array",
                  items: { type: "string" },
                  description: "关联知识点 ID，尽量使用知识库里已有的。",
                },
                difficulty: { type: "number", description: "1–5。" },
              },
            },
          },
        },
      },
    },
    run: () => ({
      status: "error",
      output: "ask_questions 由前端挂起，不应走到这里。",
    }),
  },
  {
    definition: {
      name: "search_knowledge",
      description:
        "按关键词检索学习包里的知识点，返回 id、名称与摘要。需要引用知识点时先调用它拿到真实 id。",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "关键词，例如 导数 定义 极限。" },
          limit: { type: "number", description: "返回条数，默认 5，最多 15。" },
        },
      },
    },
    run: (args, context) => {
      const query = text(args.query).toLowerCase();
      if (!query) return { status: "error", output: "query 不能为空。" };
      const limit = count(args.limit, 5, 15);
      const terms = query.split(/\s+/).filter(Boolean);
      const matches = context.points
        .filter((point) => {
          const haystack = `${point.name} ${point.summary}`.toLowerCase();
          return terms.every((term) => haystack.includes(term));
        })
        .slice(0, limit);
      if (matches.length === 0) {
        return { status: "ok", output: `没有匹配「${args.query}」的知识点。` };
      }
      return {
        status: "ok",
        output: matches
          .map((entry) => `${entry.id}｜${entry.name}｜${entry.summary}`)
          .join("\n"),
      };
    },
  },
  {
    definition: {
      name: "get_mastery",
      description:
        "查询学生在某个知识点上的真实作答记录，或不做参数时给出最薄弱的几个知识点。用它决定讲什么、练什么，不要凭印象猜学生水平。",
      parameters: {
        type: "object",
        properties: {
          knowledgePointId: { type: "string", description: "留空则返回薄弱点排行。" },
          limit: { type: "number", description: "排行条数，默认 5。" },
        },
      },
    },
    run: (args, context) => {
      const pointId = text(args.knowledgePointId);
      if (pointId) {
        const stats = context.stats.get(pointId);
        const point = context.findPoint(pointId);
        if (!stats) {
          return {
            status: "ok",
            output: `${pointId}${point ? `（${point.name}）` : ""}：还没有作答记录，掌握度未知。`,
          };
        }
        const mastery = masteryOf({
          pointId,
          attempts: stats.attempts,
          correct: stats.correct,
          lastAttemptAt: stats.lastAttemptAt,
        });
        return {
          status: "ok",
          output: `${pointId}${point ? `（${point.name}）` : ""}：作答 ${mastery.attempts} 次，正确 ${mastery.correct} 次，掌握度 ${mastery.score}%（${LEVEL_LABEL[levelOf(mastery)]}，置信度 ${Math.round(mastery.confidence * 100)}%）。`,
        };
      }

      const limit = count(args.limit, 5, 20);
      // Every point joins the ranking, not just the answered ones: a point with
      // no attempt is the biggest unknown, and the model should offer to test
      // it rather than assume the student is fine there.
      const ranked = weakestFirst(
        context.points.map((point) => {
          const stats = context.stats.get(point.id);
          return masteryOf({
            pointId: point.id,
            attempts: stats?.attempts ?? 0,
            correct: stats?.correct ?? 0,
            lastAttemptAt: stats?.lastAttemptAt ?? 0,
          });
        }),
      ).slice(0, limit);
      if (ranked.every((entry) => entry.attempts === 0)) {
        return {
          status: "ok",
          output: "还没有任何作答记录。可以建议先做一份诊断卷，或针对上面列出的知识点出几道题试试。",
        };
      }
      return {
        status: "ok",
        output: ranked
          .map((entry) => {
            const name = context.findPoint(entry.pointId)?.name ?? entry.pointId;
            return entry.attempts === 0
              ? `${entry.pointId}｜${name}｜未测`
              : `${entry.pointId}｜${name}｜${entry.score}%（${entry.attempts} 次，${LEVEL_LABEL[levelOf(entry)]}）`;
          })
          .join("\n"),
      };
    },
  },
  {
    definition: {
      name: "list_wrong_questions",
      description: "列出错题本里最近做错的题，包含题目原文与对应知识点，用于有针对性地补讲或重做。",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "返回条数，默认 5，最多 20。" },
        },
      },
    },
    run: (args, context) => {
      const limit = count(args.limit, 5, 20);
      const rows = context.wrong.slice(0, limit);
      if (rows.length === 0) return { status: "ok", output: "错题本是空的。" };
      return {
        status: "ok",
        output: rows
          .map((row) => {
            const [question] = context.questionsForPoint(row.knowledgePointId).filter(
              (entry) => entry.id === row.questionId,
            );
            return `${row.questionId}｜${question ? question.content : "（题源已更新）"}｜知识点 ${row.knowledgePointId}`;
          })
          .join("\n"),
      };
    },
  },
];

export function findTool(name: string): ToolHandler | undefined {
  return TOOLS.find((tool) => tool.definition.name === name);
}

/** The definitions sent with every request that offers tools. */
export const TOOL_DEFS: ToolDef[] = TOOLS.map((tool) => tool.definition);
