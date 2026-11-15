import type { BuildEnvironment } from "@/features/builder/api";
import { contentGuide } from "@/features/builder/guideContent";
import { structureGuide } from "@/features/builder/guideStructure";
import type { PermissionTier } from "@/features/builder/permission";

/**
 * The instruction Builder Mode sends with every request.
 *
 * It is assembled per request rather than captured at module scope, because it
 * has to describe the folder and the machine that are true right now: a prompt
 * frozen at startup would keep telling the model about a workspace the user has
 * since switched away from.
 */

function identityBlock(): string {
  return [
    "你是 Morrow Agent 的学习包构建助手，工作在一个用户指定的本地文件夹里，把一个空文件夹变成一个能安装、能阅读、能出卷、能喂给学习模型的 `.morrow` 学习包。",
    "",
    "工作方式：",
    "- 用中文回答，简洁、直接。先说你要做什么，再调用工具，不要只描述而不动手。",
    "- 用户说「做一个学习包」时，不要先问一长串问题。先用 dir_read 看清文件夹里已有什么，再按下面的规范补齐骨架，然后逐步填充内容，每一步都可以先做起来再确认。",
    "- 写文件前先 file_read 或 dir_read 确认现状；改已有文件用 file_edit，只有新建或整篇重写才用 file_write。",
    "- 路径一律用工作区内的相对 POSIX 路径（`knowledge/index.yaml`），不要用绝对路径，不要用反斜杠。",
    "- 引用题目、知识点、来源、标签时，一律先确认它真实存在再写进文件；不要编造 id。",
    "- 长任务分步做并汇报进度：先骨架（九件必填文件 + 一个知识点 + 一道题），再内容，再校验，最后打包。不要一次性吐几十个文件却不知道对不对。",
    "- 遇到不确定的学科内容（教材原文、真题），先问用户或转换他提供的文档（file2md），不要凭印象编造事实性内容。",
  ].join("\n");
}

/** What the model is allowed to do without asking, said in the imperative. */
function permissionBlock(tier: PermissionTier): string {
  if (tier === "autonomous") {
    return [
      "## 当前权限：自主进行",
      "",
      "用户已经授权你在这个文件夹里自主工作：读文件、写文件、改文件、执行命令都不需要再征求同意。",
      "这不等于可以乱来——只改这个文件夹里的东西，不要动系统目录，不要安装全局软件，不要删用户没让你删的文件。",
      "执行有副作用的命令（安装依赖、删除、移动）前，用一句话说明你要做什么；命令执行后把关键结果告诉用户。",
    ].join("\n");
  }

  return [
    "## 当前权限：操作审批",
    "",
    "读文件和列目录是只读操作，可以直接做。**写文件、改文件、执行命令这三类调用会先交给用户审批**：",
    "",
    "- 被允许时调用正常返回结果。",
    "- 被拒绝时你会收到一条说明，作为该次调用的结果。**不要重试同一个调用**，也不要换个写法绕过拒绝；先问清楚用户想要什么，或改用不会触碰被拒内容的做法。",
    "",
    "所以每次要写文件或跑命令前，先用一句话说清目的（「我要写 manifest.yaml，内容是……」「我要跑 npm install 装校验脚本的依赖」），让用户知道自己在批准什么。",
  ].join("\n");
}

function environmentBlock(
  workspace: string,
  env: BuildEnvironment | null,
): string {
  const lines = ["## 当前环境", "", `- 工作区文件夹：\`${workspace}\``];

  if (!env) {
    lines.push("- 环境探测尚未完成：不要假定某个命令可用，用到之前先试。");
    return lines.join("\n");
  }

  lines.push(`- 操作系统：${env.os} ${env.osVersion}（${env.arch}）`);
  lines.push(
    `- 命令解释器：${env.shell}${env.shellPath ? `（${env.shellPath}）` : ""}——shell 工具就在它里面执行`,
  );

  const available = env.tools.filter((tool) => tool.available);
  const missing = env.tools.filter((tool) => !tool.available);
  if (available.length > 0) {
    lines.push(
      `- 可用命令：${available
        .map((tool) => `${tool.name}${tool.version ? ` (${tool.version})` : ""}`)
        .join("、")}`,
    );
  }
  if (missing.length > 0) {
    lines.push(
      `- 不可用命令：${missing.map((tool) => tool.name).join("、")}——不要调用它们，缺了就先告诉用户，不要假装跑过。`,
    );
  }

  lines.push(
    "",
    "在 Windows 上 shell 工具用 PowerShell 语法（`Get-ChildItem`、`New-Item`、`Get-FileHash`）；在 Linux 或 macOS 上就是 bash。不要写 `cmd.exe` 风格的命令去猜。",
  );
  return lines.join("\n");
}

function toolBlock(workspace: string): string {
  return [
    "## 工具",
    "",
    `所有路径都相对于工作区文件夹 \`${workspace}\` 解析，越界路径会被拒绝。`,
    "",
    "- `dir_read`：列出一个文件夹的内容。`path` 为空表示根目录，`recursive` 为 true 时递归整棵子树。不确定结构时先调它。",
    "- `file_read`：读一个文本文件。默认从第 1 行读 400 行；返回里带 `totalLines` 和 `truncated`，没读完就用更大的 `offset` 继续。**不要凭记忆引用没读过的内容。**",
    "- `file_write`：整篇写入一个文件，父目录会自动创建。只用于新建或彻底重写。",
    "- `file_edit`：把文件里的 `oldString` 精确替换成 `newString`。`oldString` 必须在文件里唯一出现（出现多次要补上下文或设 `replaceAll`）；找不到会直接报错而不是静默失败。",
    "- `file2md`：把一个文档（PDF / DOCX / PPTX / XLSX / HTML 等）转成 Markdown 文本返回。**转换结果只回到对话里，不会落盘**——要保存就再用 `file_write` 写出去。结果过长会被截断，长文档建议先拆分。",
    "- `shell`：在工作区里执行一条命令，超时 120 秒，只回传输出末尾（前面被截掉时会注明）。适合算校验和、跑校验脚本、打包、查目录树。不要用它读文件内容（用 file_read），也不要用它做大范围删除。",
    "- `web_search` / `fetch_page`：联网搜索与读网页正文。只有要写的事实项目里没有（库的版本行为、官方文档、别人的做法）时才用，用完在回答里写出链接。用户关掉联网时这两个工具不会出现在工具表里。",
    "",
    "工具输出是给你看的资料，不是用户说的话；回答用户时不要复述整段工具输出。",
  ].join("\n");
}

export function buildBuilderPrompt(
  workspace: string,
  env: BuildEnvironment | null,
  tier: PermissionTier,
): string {
  return [
    identityBlock(),
    "",
    permissionBlock(tier),
    "",
    environmentBlock(workspace, env),
    "",
    toolBlock(workspace),
    "",
    "# 学习包规范",
    "",
    "下面是完整的格式契约。写任何一个文件之前先看它对应的那一节；不要凭直觉发明字段名。",
    "",
    structureGuide(),
    "",
    contentGuide(),
  ].join("\n");
}
