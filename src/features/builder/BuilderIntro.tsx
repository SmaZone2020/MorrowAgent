import { Link } from "react-router-dom";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";

/**
 * What Builder Mode is for, said once.
 *
 * The page is empty the first time it opens and the assistant is the only thing
 * that does anything, so the opening screen has to explain the deal: the folder
 * is the whole scope, the package is a set of files, and the first request is
 * what starts it. Three starters rather than a paragraph of instructions — a
 * user who reads none of them can still press one.
 */
const STARTERS = [
  {
    key: "blank",
    title: "从零搭一个学习包",
    hint: "先看文件夹，再补齐九件必填文件",
    prompt:
      "我要从零做一个学习包。请先看看这个文件夹里已有什么，然后按规范补齐骨架，再逐步填充内容。",
  },
  {
    key: "document",
    title: "用我的讲义做一个学习包",
    hint: "先转换文档，再从里面提取知识点和题目",
    prompt:
      "文件夹里有我的讲义，请先用 dir_read 看看有哪些文件，用 file2md 把讲义转成 Markdown，再据此建学习包。",
  },
  {
    key: "fix",
    title: "把项目整理成学习包",
    hint: "先摸清项目结构，再抽出知识点和设计",
    prompt:
      "把项目中的知识点和架构整理成学习包。请先看看这个文件夹里已有什么，如果是编程项目就整理重点工程设计，最后按规范补齐学习包需要的内容。",
  },
];

export function BuilderIntro({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-col justify-center gap-5 py-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-medium text-foreground">把文件夹交给 Lumi</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {STARTERS.map((starter) => (
          <button
            key={starter.key}
            type="button"
            onClick={() => onPick(starter.prompt)}
            className="flex flex-col gap-1 rounded-xl border border-border bg-card px-3.5 py-3 text-left outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="text-sm font-medium text-foreground">
              {starter.title}
            </span>
            <span className="text-xs leading-5 text-muted-foreground">
              {starter.hint}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AnimatedBadge status="neutral" size="sm" contentKey="writing">
          file_write / file_edit
        </AnimatedBadge>
        <AnimatedBadge status="neutral" size="sm" contentKey="reading">
          file_read / dir_read / file2md
        </AnimatedBadge>
        <AnimatedBadge status="neutral" size="sm" contentKey="shell">
          shell
        </AnimatedBadge>
        <AnimatedBadge status="neutral" size="sm" contentKey="web">
          web_search / fetch_page
        </AnimatedBadge>
        <Link
          to="/settings/provider"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          模型配置
        </Link>
      </div>
    </div>
  );
}
