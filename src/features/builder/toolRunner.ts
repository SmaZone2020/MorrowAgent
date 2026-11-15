import type { ToolCall } from "@/features/settings/aiBridge";
import {
  convertDocument,
  editFile,
  listDirectory,
  readFile,
  runShell as shellCommand,
  writeFile,
} from "@/features/builder/api";
import { requireFolder } from "@/features/builder/board";
import {
  DIR_READ,
  FETCH_PAGE,
  FILE2MD,
  FILE_EDIT,
  FILE_READ,
  FILE_WRITE,
  SHELL,
  WEB_SEARCH,
} from "@/features/builder/toolDefs";
import { runFetchPage, runWebSearch } from "@/features/lumi/searchTool";
import { count, parseArguments, text } from "@/features/lumi/toolArgs";

/**
 * Runs one builder tool and turns the result into prose the model can read.
 *
 * The Rust commands return structured data, but a tool result is a string on
 * the wire: a JSON blob would waste tokens on braces and keys the model already
 * knows. So each handler formats its own answer, and says plainly when something
 * was cut off and how to continue.
 */

/** Files larger than this are described, not inlined, for a directory walk. */
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function runDirRead(args: Record<string, unknown>): Promise<string> {
  const workspace = requireFolder();
  const path = text(args.path);
  const recursive = args.recursive === true || args.recursive === "true";
  const listing = await listDirectory(workspace, path, recursive);

  if (listing.entries.length === 0) {
    return `${listing.path} 是空文件夹。`;
  }

  const lines = listing.entries.map((entry) =>
    entry.directory
      ? `${entry.path}/`
      : `${entry.path}（${humanSize(entry.size)}）`,
  );
  const header = `${listing.path} 共 ${listing.entries.length} 项：`;
  const tail = listing.truncated
    ? "\n（条目过多，已截断；请缩小 path 范围或关闭 recursive 分批查看）"
    : "";
  return `${header}\n${lines.join("\n")}${tail}`;
}

async function runFileRead(args: Record<string, unknown>): Promise<string> {
  const workspace = requireFolder();
  const path = text(args.path);
  if (!path) return "path 不能为空。";

  const offset = count(args.offset, 1, 1_000_000);
  const limit = count(args.limit, 400, 2000);
  const slice = await readFile(workspace, path, offset, limit);

  const range =
    slice.totalLines === 0
      ? "文件是空的"
      : `第 ${slice.startLine}–${slice.startLine + slice.content.split("\n").length - 1} 行，共 ${slice.totalLines} 行`;
  const note = slice.truncated
    ? `\n\n（还有内容未显示。继续读请调用 file_read，path 不变，offset 设为 ${slice.startLine + slice.content.split("\n").length}）`
    : "";
  return `${slice.path}（${range}）：\n\n${slice.content}${note}`;
}

async function runFileWrite(args: Record<string, unknown>): Promise<string> {
  const workspace = requireFolder();
  const path = text(args.path);
  if (!path) return "path 不能为空。";
  const content = typeof args.content === "string" ? args.content : "";
  if (!content) return "content 不能为空；要创建空文件请至少写入一个换行或占位内容。";
  return writeFile(workspace, path, content);
}

async function runFileEdit(args: Record<string, unknown>): Promise<string> {
  const workspace = requireFolder();
  const path = text(args.path);
  if (!path) return "path 不能为空。";
  const oldString = typeof args.oldString === "string" ? args.oldString : "";
  const newString = typeof args.newString === "string" ? args.newString : "";
  const replaceAll = args.replaceAll === true || args.replaceAll === "true";
  return editFile(workspace, path, oldString, newString, replaceAll);
}

async function runFile2Md(args: Record<string, unknown>): Promise<string> {
  const workspace = requireFolder();
  const path = text(args.path);
  if (!path) return "path 不能为空。";

  const document = await convertDocument(workspace, path);
  const title = document.title ? `标题：${document.title}\n` : "";
  const note = document.truncated
    ? "\n\n（转换结果过长已截断。需要后面的内容请先用 shell 拆分文档，或只转换需要的部分。）"
    : "";
  return `${document.path}\n${title}\n${document.markdown}${note}`;
}

async function runShellTool(args: Record<string, unknown>): Promise<string> {
  const workspace = requireFolder();
  const command = text(args.command);
  if (!command) return "command 不能为空。";

  const result = await shellCommand(workspace, command);
  const parts = [`$ ${command}`];
  if (result.stdout.trim()) parts.push(result.stdout.trimEnd());
  if (result.stderr.trim()) parts.push(`[stderr]\n${result.stderr.trimEnd()}`);
  if (result.timedOut) parts.push("[超过 120 秒被终止]");
  if (result.code !== null) parts.push(`[退出码 ${result.code}]`);
  else parts.push("[进程未能启动]");
  return parts.join("\n");
}


/**
 * Answers one tool call.
 *
 * An error is returned as text rather than thrown: the model can read "this
 * path does not exist" and pick another one, whereas a thrown error ends the
 * whole turn over a single mistyped name.
 */
export async function runBuilderTool(call: ToolCall): Promise<string> {
  const args = parseArguments(call.arguments);
  try {
    switch (call.name) {
      case DIR_READ:
        return await runDirRead(args);
      case FILE_READ:
        return await runFileRead(args);
      case FILE_WRITE:
        return await runFileWrite(args);
      case FILE_EDIT:
        return await runFileEdit(args);
      case FILE2MD:
        return await runFile2Md(args);
      case SHELL:
        return await runShellTool(args);
      case WEB_SEARCH:
        return (await runWebSearch(args)).output;
      case FETCH_PAGE:
        return (await runFetchPage(args)).output;
      default:
        return `未知工具：${call.name}`;
    }
  } catch (error) {
    return `工具执行失败：${error instanceof Error ? error.message : String(error)}`;
  }
}
