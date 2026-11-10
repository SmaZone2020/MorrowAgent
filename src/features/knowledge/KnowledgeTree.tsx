import { useMemo } from "react";
import { ChevronRight, Magnifier } from "@gravity-ui/icons";
import { Input } from "@/vendor/beui/components/motion/input";
import { chapters, questionsFor } from "@/features/knowledge";

/**
 * The knowledge base reads like a book: a chapter tree on the left, one point's
 * document on the right. Chapters fold so a long subject stays scannable, and
 * the tree only shows what the search leaves.
 */
export function KnowledgeTree({
  query,
  onQueryChange,
  selectedId,
  onSelect,
  openChapters,
  onToggleChapter,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  selectedId: string | null;
  onSelect: (pointId: string) => void;
  openChapters: string[];
  onToggleChapter: (chapterId: string) => void;
}) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chapters;
    return chapters
      .map((chapter) => ({
        ...chapter,
        points: chapter.points.filter(
          (point) =>
            point.name.toLowerCase().includes(needle) ||
            point.description.toLowerCase().includes(needle),
        ),
      }))
      .filter((chapter) => chapter.points.length > 0);
  }, [query]);

  // A search result buried in a folded chapter would be invisible, so every
  // chapter opens while a query is active.
  const searching = query.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Input
        value={query}
        onChange={onQueryChange}
        placeholder="搜索知识点"
        leftIcon={<Magnifier className="size-4" />}
        spellCheck={false}
        autoComplete="off"
        classNames={{ field: "h-9" }}
      />

      <nav
        aria-label="知识库目录"
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            没有匹配的知识点。
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((chapter) => {
              const open = searching || openChapters.includes(chapter.id);
              return (
                <li key={chapter.id} className="flex flex-col">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => onToggleChapter(chapter.id)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                        open ? "rotate-90" : ""
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {chapter.name}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {chapter.points.length}
                    </span>
                  </button>

                  {open ? (
                    <ul className="ml-4 flex flex-col gap-0.5 border-l border-border/70 pl-1.5">
                      {chapter.points.map((point) => {
                        const active = point.id === selectedId;
                        return (
                          <li key={point.id}>
                            <button
                              type="button"
                              aria-current={active ? "page" : undefined}
                              onClick={() => onSelect(point.id)}
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                                active
                                  ? "bg-muted font-medium text-foreground"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              }`}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {point.name}
                              </span>
                              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                                {questionsFor(point.id).length}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}
