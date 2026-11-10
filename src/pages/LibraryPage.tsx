import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { PackageBook, EmptyShelf } from "@/features/library/PackageBook";
import { ImportDialog } from "@/features/library/ImportDialog";
import { PackageSheet } from "@/features/library/PackageSheet";
import {
  lastWorkspaceId,
  rememberWorkspace,
  useLibrary,
  useShelfFilter,
} from "@/features/library/store";
import type { Workspace } from "@/features/library/api";
import { workspacePath } from "@/app/navigation";

/**
 * Level 0: the shelf.
 *
 * Starting the app lands here and nowhere else. A learning package is a
 * separate workspace with its own transcript, wrong book and profile, so the
 * first decision is which package to open — not which module (MLPS §1.2).
 */
export function LibraryPage() {
  const navigate = useNavigate();
  const workspaces = useLibrary((state) => state.workspaces);
  const loaded = useLibrary((state) => state.loaded);
  const hydrate = useLibrary((state) => state.hydrate);
  const [filter] = useShelfFilter();
  const [importing, setImporting] = useState(false);
  const [details, setDetails] = useState<Workspace | null>(null);
  const recentId = useMemo(() => lastWorkspaceId(), [workspaces]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const visible = useMemo(() => {
    if (filter === "active") return workspaces.filter((entry) => !entry.orphaned);
    return workspaces;
  }, [filter, workspaces]);

  const enter = (workspace: Workspace) => {
    if (workspace.orphaned) {
      setDetails(workspace);
      return;
    }
    rememberWorkspace(workspace.id);
    navigate(workspacePath(workspace.id, "/lumi"));
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-5 sm:p-7">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="Siyuan min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          书架
        </h1>
        <Button
          size="sm"
          className="text-sm"
          onClick={() => setImporting(true)}
        >
          <Plus className="size-4" />
          导入学习包
        </Button>
      </header>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">正在读取书架</p>
      ) : visible.length === 0 ? (
        <EmptyShelf onImport={() => setImporting(true)} />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((workspace) => (
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
