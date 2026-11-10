import { useEffect, useMemo } from "react";
import { KnowledgeTree } from "@/features/knowledge/KnowledgeTree";
import { KnowledgeDocument } from "@/features/knowledge/KnowledgeDocument";
import { usePersistedState, useScrollMemory } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import { useKnowledge, useWorkspaceId } from "@/features/workspace/WorkspaceContext";
import { pointsOfChapter } from "@/features/knowledge";

/**
 * A documentation view rather than a list of accordions: the tree is the
 * navigation and the right pane is the page, so reading one point does not
 * push everything else down.
 *
 * The reading position, search and fold state are per package: the same point
 * id does not exist in two packages, and a query typed in one is not a query
 * about the other.
 */
export function KnowledgePage() {
  const index = useKnowledge();
  const workspaceId = useWorkspaceId();
  const { chapters } = index.view;

  const [query, setQuery] = usePersistedState(
    workspaceScope(workspaceId, "knowledge.query"),
    "",
  );
  const [openChapters, setOpenChapters] = usePersistedState<string[]>(
    workspaceScope(workspaceId, "knowledge.openChapters"),
    [chapters[0]?.id ?? ""].filter(Boolean),
  );
  const [selectedId, setSelectedId] = usePersistedState<string | null>(
    workspaceScope(workspaceId, "knowledge.selectedId"),
    index.view.points[0]?.id ?? null,
  );
  const scrollRef = useScrollMemory<HTMLDivElement>(
    workspaceScope(workspaceId, "knowledge.scrollTop"),
  );

  const firstMatch = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    for (const chapter of chapters) {
      const hit = pointsOfChapter(index, chapter.id).find(
        (point) =>
          point.name.toLowerCase().includes(needle) ||
          point.summary.toLowerCase().includes(needle),
      );
      if (hit) return hit.id;
    }
    return null;
  }, [chapters, index, query]);

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
      entry.pointIds.includes(pointId),
    );
    if (chapter && !openChapters.includes(chapter.id)) {
      setOpenChapters((ids) => [...ids, chapter.id]);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border p-3 sm:w-72 sm:p-4">
        <KnowledgeTree
          index={index}
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
          <KnowledgeDocument
            index={index}
            pointId={selectedId}
            onOpenPoint={selectPoint}
          />
        </div>
      </div>
    </div>
  );
}
