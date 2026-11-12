import type { ToolHandler } from "@/features/lumi/tools";
import { count, text } from "@/features/lumi/toolArgs";
import { fetchPage, searchWeb } from "@/features/settings/searchStore";
import { isTauriRuntime } from "@/app/shell/windowControls";

/** Enough of a page for one answer; a whole site would bury the transcript. */
const MAX_PAGE_CHARS = 6000;

function clip(value: string, limit: number): string {
  const text = value.trim();
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

/**
 * Web search, on DeepSeek's own index.
 *
 * The results are formatted for a model rather than a reader: one hit per line,
 * url first, because the next call is usually `fetch_page` with that url. The
 * tool answers with an explanation when the key is missing, so a conversation
 * degrades to "先配置搜索" instead of failing the turn.
 */
export const webSearchTool: ToolHandler = {
  definition: {
    name: "web_search",
    description:
      "联网搜索。教材没讲、学生问到最新或教材外的东西时用它，返回标题、链接与摘要。需要正文再对链接调用 fetch_page。",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "搜索关键词，最多 128 字。" },
        limit: { type: "number", description: "返回条数，默认 5，最多 10。" },
      },
    },
  },
  run: async (args) => {
    const query = text(args.query);
    if (!query) return { status: "error", output: "query 不能为空。" };
    if (!isTauriRuntime) {
      return { status: "error", output: "联网搜索只在桌面应用里可用。" };
    }

    try {
      const hits = await searchWeb(query, { count: count(args.limit, 5, 10) });
      if (hits.length === 0) {
        return { status: "ok", output: `没有搜到「${query}」的结果。` };
      }
      return {
        status: "ok",
        output: hits
          .map((hit, index) => {
            const meta = [hit.siteName, hit.date].filter(Boolean).join(" · ");
            const body = hit.summary || hit.snippet;
            return [
              `${index + 1}. ${hit.title || hit.url}`,
              hit.url,
              meta ? `   ${meta}` : "",
              body ? `   ${clip(body, 300)}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n"),
      };
    } catch (error) {
      return {
        status: "error",
        output: `搜索失败：${error instanceof Error ? error.message : String(error)}。可以在「设置 → 搜索与请求」里检查密钥。`,
      };
    }
  },
};

/**
 * Reads one page as text.
 *
 * A url from the model is untrusted input: only http(s) ever reaches the
 * backend, and only the opening part of a long page is kept, because a reply
 * that quotes six thousand words of a wiki has stopped being a reply.
 */
export const fetchPageTool: ToolHandler = {
  definition: {
    name: "fetch_page",
    description:
      "读取一个网页的正文（纯文本，超长会截断）。通常先用 web_search 拿到链接，再对它调用本工具。",
    parameters: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", description: "http(s) 链接。" },
      },
    },
  },
  run: async (args) => {
    const url = text(args.url);
    if (!url) return { status: "error", output: "url 不能为空。" };
    if (!/^https?:\/\//i.test(url)) {
      return { status: "error", output: "只能读取 http(s) 链接。" };
    }
    if (!isTauriRuntime) {
      return { status: "error", output: "读取网页只在桌面应用里可用。" };
    }

    try {
      const page = await fetchPage(url);
      const body = page.content.trim();
      if (!body) {
        return { status: "ok", output: `${page.url} 没有可读的正文。` };
      }
      return {
        status: "ok",
        output: [
          page.title ? `${page.title}` : "",
          page.url,
          clip(body, MAX_PAGE_CHARS),
        ]
          .filter(Boolean)
          .join("\n"),
      };
    } catch (error) {
      return {
        status: "error",
        output: `读取失败：${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
