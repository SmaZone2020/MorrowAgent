import { useNavigate } from "react-router-dom";
import { ChevronRight } from "@gravity-ui/icons";
import { useLibrary } from "@/features/library/store";

/**
 * Header for the workspace layer: `书架 / 包名 / 页面`.
 *
 * The shelf segment is a link, because leaving a package has to be reachable
 * from every page inside it. The shelf layer itself gets no bar: its page
 * already carries the one heading it needs.
 */
export function Breadcrumb({
  workspaceId,
  title,
}: {
  workspaceId: string;
  title: string;
}) {
  const navigate = useNavigate();
  const workspaces = useLibrary((state) => state.workspaces);
  const packageName =
    workspaces.find((entry) => entry.id === workspaceId)?.name ?? "学习包";

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-4">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="shrink-0 rounded-md px-1 py-0.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        书架
      </button>
      <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="max-w-56 truncate text-sm text-muted-foreground">
        {packageName}
      </span>
      <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-sm font-medium text-foreground">
        {title}
      </span>
    </header>
  );
}
