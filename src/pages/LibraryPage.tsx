import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gear, Plus } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { settingsPath, workspacePath } from "@/app/navigation";
import { PackageBook, EmptyShelf } from "@/features/library/PackageBook";
import { ImportDialog } from "@/features/library/ImportDialog";
import { PackageSheet } from "@/features/library/PackageSheet";
import {
  lastWorkspaceId,
  rememberWorkspace,
  useLibrary,
} from "@/features/library/store";
import type { Workspace } from "@/features/library/api";
import { usePersistedState, useScrollMemory } from "@/features/uiState";
import { appScope, shelfScope } from "@/features/uiState/scope";

/**
 * Level 0: the shelf.
 *
 * Starting the app lands here and nowhere else. A learning package is a
 * separate workspace with its own transcript, wrong book and profile, so the
 * first decision is which package to open — not which module (MLPS §1.2).
 * The page is the whole window: no rail, one row of actions, settings in the
 * bottom-left corner.
 */
export function LibraryPage() {
  const navigate = useNavigate();
  const workspaces = useLibrary((state) => state.workspaces);
  const loaded = useLibrary((state) => state.loaded);
  const hydrate = useLibrary((state) => state.hydrate);
  const [importing, setImporting] = useState(false);
  const [details, setDetails] = useState<Workspace | null>(null);
  const recentId = useMemo(() => lastWorkspaceId(), [workspaces]);
  const scrollRef = useScrollMemory<HTMLDivElement>(shelfScope("scrollTop"));

  // The wizard is offered once, and it is a page rather than a modal over this
  // one: a first run should not have the empty shelf flashing behind it. `done`
  // is written on finish and on skip alike, because a learner who closed it has
  // answered. Waiting for the shelf to load keeps a returning user with a slow
  // disk from being sent to setup by a first frame with no rows.
  const [done] = usePersistedState(appScope("onboarding.done"), false);
  const [offered, setOffered] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loaded || offered) return;
    if (!done && workspaces.length === 0) navigate("/onboarding", { replace: true });
    setOffered(true);
  }, [done, loaded, navigate, offered, workspaces.length]);

  const enter = (workspace: Workspace) => {
    if (workspace.orphaned) {
      setDetails(workspace);
      return;
    }
    rememberWorkspace(workspace.id);
    navigate(workspacePath(workspace.id, "/lumi"));
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <header className="flex shrink-0 items-center gap-3 px-5 pt-5 sm:px-7 sm:pt-7">
        <h1 className="Siyuan min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          书架
        </h1>
        <Tooltip content="导入学习包" side="bottom">
          <Button
            size="sm"
            variant="primary"
            aria-label="导入学习包"
            className="size-8 shrink-0 rounded-full p-0"
            onClick={() => setImporting(true)}
          >
            <Plus className="size-4" />
          </Button>
        </Tooltip>
      </header>

      <div
        ref={scrollRef}
        className="scrollbar-thin mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6"
      >
        {!loaded ? (
          <p className="text-sm text-muted-foreground">正在读取书架</p>
        ) : workspaces.length === 0 ? (
          // Vertically centred with a small downward bias: an empty shelf reads
          // as a place, not as a message stuck under the heading.
          <div className="flex min-h-full flex-col justify-center pt-16">
            <EmptyShelf />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {workspaces.map((workspace) => (
              <PackageBook
                key={workspace.id}
                workspace={workspace}
                recent={workspace.id === recentId}
                onOpen={() => enter(workspace)}
                onDetails={() => setDetails(workspace)}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="flex shrink-0 items-center px-5 pb-4 sm:px-7">
        <Tooltip content="设置" side="top">
          <Button
            size="sm"
            variant="ghost"
            aria-label="设置"
            className="size-8 shrink-0 rounded-full p-0"
            onClick={() => navigate(settingsPath)}
          >
            <Gear className="size-4" />
          </Button>
        </Tooltip>
      </footer>

      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        onInstalled={() => setImporting(false)}
      />

      <PackageSheet
        workspace={details}
        onOpenChange={(open) => {
          if (!open) setDetails(null);
        }}
      />
    </div>
  );
}
