import { useEffect, useMemo } from "react";
import { KnowledgeTree } from "@/features/knowledge/KnowledgeTree";
import { KnowledgeDocument } from "@/features/knowledge/KnowledgeDocument";
import { usePersistedState, useScrollMemory } from "@/features/uiState";
import { chapters, knowledgePoints } from "@/features/knowledge";

/**
 * A documentation view rather than a list of accordions: the tree is the
 * navigation and the right pane is the page, so reading one point does not
 * push everything else down.
 */
export function KnowledgePage() {
  const [query, setQuery] = usePersistedState("knowledge.query", "");
  const [openChapters, setOpenChapters] = usePersistedState<string[]>(
    "knowledge.openChapters",
    [chapters[0]?.id ?? ""].filter(Boolean),
  );
  const [selectedId, setSelectedId] = usePersistedState<string | null>(
    "knowledge.selectedId",
    knowledgePoints[0]?.id ?? null,
  );
  const scrollRef = useScrollMemory<HTMLDivElement>("knowledge.scrollTop");

  const firstMatch = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    for (const chapter of chapters) {
      const hit = chapter.points.find(
        (point) =>
          point.name.toLowerCase().includes(needle) ||
          point.description.toLowerCase().includes(needle),
      );
      if (hit) return hit.id;
    }
    return null;
  }, [query]);

  // Typing a search narrows the tree; jumping the pane to the first hit keeps
  // the two panes from disagreeing about what is being looked at.
  useEffect(() => {
    if (firstMatch) setSelectedId(firstMatch);
  }, [firstMatch, setSelectedId]);

  const toggleChapter = (chapterId: string) =>
    setOpenChapters((ids) =>
      ids.includes(chapterId)
        ? ids.filter((id) => id !== chapterId)
        : [...ids, chapterId],
    );

  const selectPoint = (pointId: string) => {
    setSelectedId(pointId);
    const chapter = chapters.find((entry) =>
      entry.points.some((point) => point.id === pointId),
    );
    if (chapter && !openChapters.includes(chapter.id)) {
      setOpenChapters((ids) => [...ids, chapter.id]);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border p-3 sm:w-72 sm:p-4">
        <KnowledgeTree
          query={query}
          onQueryChange={setQuery}
          selectedId={selectedId}
          onSelect={selectPoint}
          openChapters={openChapters}
          onToggleChapter={toggleChapter}
        />
      </aside>

      <div
        ref={scrollRef}
        className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-3xl">
          <KnowledgeDocument pointId={selectedId} onOpenPoint={selectPoint} />
        </div>
      </div>
    </div>
  );
}
