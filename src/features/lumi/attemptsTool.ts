import type { ToolHandler } from "@/features/lumi/tools";
import { count } from "@/features/lumi/toolArgs";
import { describeInk } from "@/features/scratchpad/inkSummary";
import { errorTypeLabel } from "@/features/training/errorTypes";

function ago(at: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - at) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}

/**
 * The recent attempt log.
 *
 * This is how Lumi answers "我最近错在哪" without the answers being written into
 * the transcript: every submission is a database row, and the tool reads the
 * rows on demand. Keeping it out of the transcript matters — the conversation
 * is the learner's own words, and auto-inserted attempts would drown it.
 */
export const recentAttemptsTool: ToolHandler = {
  definition: {
    name: "get_recent_attempts",
    description:
      "读取学生最近的作答记录（对错、答案、错误类型、草稿量），按时间倒序。学生问「我最近错在哪」「刚才那题」时先调用它，不要凭印象回答。",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "返回条数，默认 10，最多 20。" },
        onlyWrong: {
          type: "boolean",
          description: "只看做错的，默认 false。",
        },
      },
    },
  },
  run: (args, context) => {
    const limit = count(args.limit, 10, 20);
    const onlyWrong = args.onlyWrong === true;
    const now = Date.now();
    const rows = context.recent
      .filter((row) => !onlyWrong || !row.correct)
      .slice(0, limit);

    if (rows.length === 0) {
      return {
        status: "ok",
        output: onlyWrong ? "最近没有做错的题。" : "还没有作答记录。",
      };
    }

    return {
      status: "ok",
      output: rows
        .map((row) => {
          const point = context.findPoint(row.knowledgePointId)?.name;
          const verdict = row.correct ? "正确" : "错误";
          const parts = [
            `${row.questionId}｜${verdict}｜${ago(row.at, now)}`,
            point ? `知识点：${point}` : "",
            `学生答案：${row.answer || "（空）"}`,
            row.errorType ? `错误类型：${errorTypeLabel(row.errorType)}` : "",
            describeInk(row.inkSummary),
          ].filter(Boolean);
          return parts.join("｜");
        })
        .join("\n"),
    };
  },
};
