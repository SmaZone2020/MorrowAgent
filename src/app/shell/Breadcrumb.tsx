import { Link } from "react-router-dom";
import { House } from "@gravity-ui/icons";
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/vendor/beui/components/motion/breadcrumb";
import { workspacePath } from "@/app/navigation";
import { BreadcrumbActionsSlot } from "@/app/shell/breadcrumbActions";
import { useLibrary } from "@/features/library/store";

/**
 * Header for the workspace layer: `书架 / 包名 / 页面`.
 *
 * The trail is the registry's breadcrumb rather than three spans, because it
 * brings the entering/leaving animation and the overflow panel with it. Both
 * ancestors are links: leaving a package, or jumping back to its own home, has
 * to be reachable from every page inside it.
 *
 * On the package's home page the third segment would repeat the second, so the
 * trail collapses to `书架 / 包名` and the package becomes the current page.
 */
export function Breadcrumb({
  workspaceId,
  title,
  atHome = false,
}: {
  workspaceId: string;
  title: string;
  /** True on the package dashboard, where the package name is the page. */
  atHome?: boolean;
}) {
  const workspaces = useLibrary((state) => state.workspaces);
  const packageName =
    workspaces.find((entry) => entry.id === workspaceId)?.name ?? "学习包";
  const home = workspacePath(workspaceId, "");

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
      <div className="flex min-w-0 flex-1 items-center">
        <BreadcrumbRoot labels={{ label: "当前位置" }}>
          <BreadcrumbList>
            <BreadcrumbItem key="shelf">
              <BreadcrumbLink
                render={(props) => <Link {...props} to="/" />}
                className="text-sm"
              >
                <House aria-hidden="true" />
                书架
              </BreadcrumbLink>
            </BreadcrumbItem>

            {atHome ? (
              <BreadcrumbItem key="package">
                <BreadcrumbSeparator />
                <BreadcrumbPage className="max-w-72 text-sm">
                  <span className="truncate">{packageName}</span>
                </BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              <>
                <BreadcrumbItem key="package">
                  <BreadcrumbSeparator />
                  <BreadcrumbLink
                    render={(props) => <Link {...props} to={home} />}
                    className="max-w-56 text-sm"
                  >
                    <span className="truncate">{packageName}</span>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem key="page">
                  <BreadcrumbSeparator />
                  <BreadcrumbPage className="max-w-72 text-sm">
                    <span className="truncate">{title}</span>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </BreadcrumbRoot>
      </div>

      <BreadcrumbActionsSlot />
    </header>
  );
}
