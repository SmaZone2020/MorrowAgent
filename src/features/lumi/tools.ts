import type { ToolDef } from "@/features/settings/aiBridge";
import {
  LEVEL_LABEL,
  levelOf,
  masteryOf,
  weakestFirst,
} from "@/features/training/mastery";
import { count, text } from "@/features/lumi/toolArgs";
import { quizTool } from "@/features/lumi/quizTool";
import { recentAttemptsTool } from "@/features/lumi/attemptsTool";
import {
  fetchPageTool,
  webSearchTool,
} from "@/features/lumi/searchTool";
import type { RecentAttempt } from "@/features/training/attemptCache";

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
  /**
   * Every knowledge point in the package, in authored order. `searchText` is
   * the name, summary and body with the Markdown stripped, so a keyword from
   * the middle of a lesson still finds its point.
   */
  points: { id: string; name: string; summary: string; searchText: string }[];
  /** Point metadata by id. */
  findPoint: (pointId: string) => { name: string; summary: string } | undefined;
  /**
   * The full teaching text of a point. `search_knowledge` only sees names and
   * summaries, so this is how the model reads the textbook it is supposed to be
   * teaching from. `body` is already truncated to a readable size.
   */
  readPoint: (pointId: string) =>
    | {
        name: string;
        summary: string;
        body: string;
        objectives: string[];
        prerequisites: string[];
      }
    | undefined;
  /** One question by id, for resolving `@<id>` references. */
  findQuestion: (questionId: string) =>
    | {
        id: string;
        content: string;
        questionType: string;
        options: { key: string; content: string }[];
        difficulty: number;
        knowledgeTags: string[];
      }
    | undefined;
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
  /** Every recent attempt, newest first, right and wrong. */
  recent: RecentAttempt[];
}

export type ToolOutcome =
  | { status: "ok"; output: string }
  /** The turn is paused until the user answers. */
  | { status: "pending"; output: string }
  | { status: "error"; output: string };

export interface ToolHandler {
  definition: ToolDef;
  /**
   * Resolves one call. A tool that reads the package answers immediately; one
   * that goes over the network returns a promise, and the loop awaits it.
   */
  run: (
    args: Record<string, unknown>,
    context: ToolContext,
  ) => ToolOutcome | Promise<ToolOutcome>;
}

const SEARCH: ToolHandler = {
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
        const haystack = point.searchText.toLowerCase();
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
};

const MASTERY: ToolHandler = {
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
};

const READ_POINT: ToolHandler = {
  definition: {
    name: "read_point",
    description:
      "按知识点 ID 读取教材正文、学习目标与前置知识。要按教材讲某个知识点、或引用正文里的定义与例题时先调用它；search_knowledge 只给摘要，讲不了细节。",
    parameters: {
      type: "object",
      required: ["pointId"],
      properties: {
        pointId: {
          type: "string",
          description: "知识点 ID，例如 calculus.book.ch02.derivative-concept。",
        },
      },
    },
  },
  run: (args, context) => {
    const pointId = text(args.pointId).replace(/^@/, "");
    if (!pointId) return { status: "error", output: "pointId 不能为空。" };
    const point = context.readPoint(pointId);
    if (!point) return { status: "ok", output: `没有找到知识点 ${pointId}。` };
    const header = [
      `${pointId}｜${point.name}`,
      point.summary ? `摘要：${point.summary}` : "",
      point.objectives.length > 0
        ? `学习目标：\n${point.objectives.map((line) => `- ${line}`).join("\n")}`
        : "",
      point.prerequisites.length > 0
        ? `前置知识：${point.prerequisites.join("、")}`
        : "",
    ].filter(Boolean);
    return {
      status: "ok",
      output: `${header.join("\n")}\n\n${point.body}`,
    };
  },
};

const READ_QUESTION: ToolHandler = {
  definition: {
    name: "read_question",
    description:
      "按题目 ID 读取题目原文、选项、题型与关联知识点。用户在消息里用 @题目ID 引用某道题时，先用它拿到题干，再作答；不要凭空猜测题目内容。",
    parameters: {
      type: "object",
      required: ["questionId"],
      properties: {
        questionId: {
          type: "string",
          description: "题目 ID，例如 calculus.book.ch01.function.q.000001。",
        },
      },
    },
  },
  run: (args, context) => {
    const questionId = text(args.questionId).replace(/^@/, "");
    if (!questionId) return { status: "error", output: "questionId 不能为空。" };
    const question = context.findQuestion(questionId);
    if (!question) {
      return { status: "ok", output: `没有找到题目 ${questionId}。` };
    }
    const options = question.options
      .map((option) => `${option.key}. ${option.content}`)
      .join("\n");
    return {
      status: "ok",
      output: [
        `${question.id}｜${question.questionType}｜难度 ${question.difficulty}`,
        question.content,
        options,
        question.knowledgeTags.length > 0
          ? `知识点：${question.knowledgeTags.join("、")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },
};

const WRONG_LIST: ToolHandler = {
  definition: {
    name: "list_wrong_questions",
    description:
      "列出错题本里最近做错的题，包含题目原文与对应知识点，用于有针对性地补讲或重做。",
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
          const [question] = context
            .questionsForPoint(row.knowledgePointId)
            .filter((entry) => entry.id === row.questionId);
          return `${row.questionId}｜${question ? question.content : "（题源已更新）"}｜知识点 ${row.knowledgePointId}`;
        })
        .join("\n"),
    };
  },
};

export const TOOLS: ToolHandler[] = [
  quizTool,
  SEARCH,
  MASTERY,
  READ_POINT,
  READ_QUESTION,
  WRONG_LIST,
  recentAttemptsTool,
  webSearchTool,
  fetchPageTool,
];

export function findTool(name: string): ToolHandler | undefined {
  return TOOLS.find((tool) => tool.definition.name === name);
}

/** Every tool name, for a surface that offers the full set. */
export const ALL_TOOL_NAMES = TOOLS.map((tool) => tool.definition.name);

/**
 * The definitions to send with a request. A surface lists only what it can
 * actually resolve: the drill rail has the package loaded, but it has no
 * business posing questions, so it gets a narrower set than the Lumi page.
 */
export function toolDefs(names: string[]): ToolDef[] {
  return TOOLS.filter((tool) => names.includes(tool.definition.name)).map(
    (tool) => tool.definition,
  );
}

export { QUIZ_TOOL } from "@/features/lumi/quizTool";
export { parseArguments } from "@/features/lumi/toolArgs";
