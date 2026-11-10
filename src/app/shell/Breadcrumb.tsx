import { useLibrary } from "@/features/library/store";
import type { ShellLayer } from "@/app/shell/navHelpers";

/**
 * Content header for the non-settings layers.
 *
 * The shelf is one level, so it shows a single name. A workspace puts the
 * package name first: inside it, "知识库" alone does not say which package's
 * knowledge base the reader is looking at.
 */
export function Breadcrumb({
  layer,
  section,
  title,
}: {
  layer: ShellLayer;
  section: string;
  title: string;
}) {
  const workspaces = useLibrary((state) => state.workspaces);
  const packageName =
    layer.kind === "workspace"
      ? workspaces.find((entry) => entry.id === layer.workspaceId)?.name
      : undefined;

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
      {packageName ? (
        <>
          <span className="max-w-56 truncate text-sm text-muted-foreground">
            {packageName}
          </span>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="truncate text-sm font-medium text-foreground">
            {title}
          </span>
        </>
      ) : (
        <>
          <span className="truncate text-sm text-muted-foreground">
            {section}
          </span>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="truncate text-sm font-medium text-foreground">
            {title}
          </span>
        </>
      )}
    </header>
  );
}
