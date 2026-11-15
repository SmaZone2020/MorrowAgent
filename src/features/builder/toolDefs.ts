import type { ToolDef } from "@/features/settings/aiBridge";

/**
 * The tool surface Builder Mode offers.
 *
 * These are not the package's teaching tools: a builder reads and writes files
 * and runs commands. The definitions live here, apart from the handlers, so the
 * prompt and the UI can talk about the same set without importing the Rust
 * bridge.
 */

export const FILE_READ = "file_read";
export const FILE_WRITE = "file_write";
export const FILE_EDIT = "file_edit";
export const DIR_READ = "dir_read";
export const FILE2MD = "file2md";
export const SHELL = "shell";
export const WEB_SEARCH = "web_search";
export const FETCH_PAGE = "fetch_page";
export const INSTALL_PACKAGE = "install_package";

export const BUILDER_TOOL_NAMES = [
  DIR_READ,
  FILE_READ,
  FILE_WRITE,
  FILE_EDIT,
  FILE2MD,
  SHELL,
  INSTALL_PACKAGE,
  WEB_SEARCH,
  FETCH_PAGE,
];

/** How a call reads in the transcript and in the approval card. */
export const TOOL_LABEL: Record<string, string> = {
  [DIR_READ]: "查看文件夹",
  [FILE_READ]: "读取文件",
  [FILE_WRITE]: "写入文件",
  [FILE_EDIT]: "修改文件",
  [FILE2MD]: "转换文档",
  [SHELL]: "执行命令",
  [INSTALL_PACKAGE]: "导入学习包",
  [WEB_SEARCH]: "联网搜索",
  [FETCH_PAGE]: "读取网页",
};

export const BUILDER_TOOL_DEFS: ToolDef[] = [
  {
    name: DIR_READ,
    description:
      "列出一个文件夹里的条目（文件与子文件夹）。path 为空表示工作区根目录；recursive 为 true 时递归整棵子树（最多 500 条）。不确定项目结构时先调用它。",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "工作区内的相对路径，例如 knowledge/concepts；留空表示根目录。",
        },
        recursive: {
          type: "boolean",
          description: "是否递归列出所有层级，默认 false。",
        },
      },
    },
  },
  {
    name: FILE_READ,
    description:
      "读取一个文本文件的内容。默认从第 1 行开始读 400 行；返回 startLine、totalLines 与 truncated，没读完就用更大的 offset 继续读。写文件或改文件之前先读，不要凭记忆改。",
    parameters: {
      type: "object",
      required: ["path"],
      properties: {
        path: { type: "string", description: "工作区内的相对路径。" },
        offset: { type: "number", description: "起始行号，从 1 开始，默认 1。" },
        limit: { type: "number", description: "读取行数，默认 400，最多 2000。" },
      },
    },
  },
  {
    name: FILE_WRITE,
    description:
      "把内容整篇写入一个文件，父目录会自动创建。只用于新建文件或彻底重写整个文件；改已有文件的局部内容请用 file_edit，避免覆盖掉别处的内容。",
    parameters: {
      type: "object",
      required: ["path", "content"],
      properties: {
        path: { type: "string", description: "工作区内的相对路径，例如 manifest.yaml。" },
        content: { type: "string", description: "文件的完整内容。" },
      },
    },
  },
  {
    name: FILE_EDIT,
    description:
      "把文件里的 oldString 精确替换成 newString。oldString 必须在文件中唯一出现；出现多次时要么补足上下文，要么把 replaceAll 设为 true。找不到会报错，不会静默失败。",
    parameters: {
      type: "object",
      required: ["path", "oldString", "newString"],
      properties: {
        path: { type: "string", description: "工作区内的相对路径。" },
        oldString: { type: "string", description: "要被替换的原文，必须精确匹配。" },
        newString: { type: "string", description: "替换后的文本。" },
        replaceAll: {
          type: "boolean",
          description: "为 true 时替换所有出现的位置，默认 false。",
        },
      },
    },
  },
  {
    name: FILE2MD,
    description:
      "把一个文档转换为 Markdown 文本（支持 PDF、DOCX、PPTX、XLSX、HTML、纯文本等）。结果只作为工具结果返回，不会写入磁盘；要保留就再用 file_write 写出去。超长内容会被截断。",
    parameters: {
      type: "object",
      required: ["path"],
      properties: {
        path: { type: "string", description: "文档在工作区内的相对路径。" },
      },
    },
  },
  {
    name: SHELL,
    description:
      "在工作区文件夹里执行一条命令（Windows 用 PowerShell，其他平台用 bash），最长 120 秒，只返回输出末尾 16KB。用于算哈希、跑校验或打包脚本、查看目录树；不要用它读取文件内容，也不要做大范围删除。",
    parameters: {
      type: "object",
      required: ["command"],
      properties: {
        command: { type: "string", description: "要执行的完整命令行。" },
      },
    },
  },
  {
    name: INSTALL_PACKAGE,
    description:
      "把建好的学习包导入书架。工具会把文件夹重新打包成 `.morrow`，并跑一遍和手动导入完全相同的校验（文件清单、SHA-256、内容与引用）。校验不通过时返回逐条失败原因，不会安装；通过则出现在书架里。整包内容都写完之后再调用，中途调用只会拿到缺失文件清单。",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "学习包所在的子文件夹（工作区内的相对路径）。留空表示整个工作区就是包的根目录，即 manifest.yaml 就在根下。",
        },
      },
    },
  },
  {
    name: WEB_SEARCH,    description:
      "联网搜索，返回标题、链接与摘要。只有写某个知识点需要教材之外的事实（版本差异、官方文档、别人的做法）时才用；项目里已有的信息不要联网查。",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "搜索关键词，最多 128 字。" },
        limit: { type: "number", description: "返回条数，默认 5，最多 10。" },
      },
    },
  },
  {
    name: FETCH_PAGE,
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
];
