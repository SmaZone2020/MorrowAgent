import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { EmptyState } from "@/components/EmptyState";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { useLibrary } from "@/features/library/store";
import { indexKnowledge, toKnowledgeView } from "@/features/knowledge/view";
import type { KnowledgeIndex } from "@/features/knowledge/view";

const WorkspaceContext = createContext<KnowledgeIndex | null>(null);

/**
 * Loads one workspace's package and hands every page below it an indexed view.
 *
 * Pages must not read content themselves: the same package has to answer for
 * the knowledge tree, the drill, the wrong book and the profile, and four
 * independent loads would drift apart the moment one of them refreshed.
 */
export function WorkspaceProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const open = useLibrary((state) => state.open);
  const hydrate = useLibrary((state) => state.hydrate);
  const loaded = useLibrary((state) => state.loaded);
  const content = useLibrary((state) => state.content);
  const contentFor = useLibrary((state) => state.contentFor);
  const contentError = useLibrary((state) => state.contentError);
  const workspaces = useLibrary((state) => state.workspaces);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) void hydrate();
  }, [hydrate, loaded]);

  useEffect(() => {
    void open(workspaceId);
  }, [open, workspaceId]);

  const ready = contentFor === workspaceId && content;
  const view = useMemo(
    () => (ready ? toKnowledgeView(workspaceId, ready) : null),
    [ready, workspaceId],
  );
  const index = useMemo(() => (view ? indexKnowledge(view) : null), [view]);

  if (index) {
    return (
      <WorkspaceContext.Provider value={index}>
        {children}
      </WorkspaceContext.Provider>
    );
  }

  const workspace = workspaces.find((entry) => entry.id === workspaceId);
  const missing = loaded && !workspace;

  // The browser preview has neither packages nor a database, so a workspace URL
  // there is expected to fail; say that instead of blaming the package.
  const reason = !isTauriRuntime
    ? "浏览器预览中没有学习包，请在桌面应用里打开"
    : (contentError ?? (missing ? "没有找到这个学习包" : null));

  return (
    <div className="grid h-full place-items-center p-8">
      {reason ? (
        <EmptyState
          mood="confused"
          surface="page"
          title={reason}
          action={
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => navigate("/")}
            >
              回到书架
            </Button>
          }
        />
      ) : (
        <EmptyState mood="thinking" surface="page" title="正在读取学习包" />
      )}
    </div>
  );
}

/** The active package, already indexed by point, chapter and question. */
export function useKnowledge(): KnowledgeIndex {
  const index = useContext(WorkspaceContext);
  if (!index) {
    throw new Error("useKnowledge must be used inside WorkspaceProvider");
  }
  return index;
}

/** The workspace id the current route belongs to. */
export function useWorkspaceId(): string {
  return useKnowledge().view.workspaceId;
}
