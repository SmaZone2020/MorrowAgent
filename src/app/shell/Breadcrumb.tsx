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
import { useLibrary } from "@/features/library/store";

/**
 * Header for the workspace layer: `书架 / 包名 / 页面`.
 *
 * The trail is the registry's breadcrumb rather than three spans, because it
 * brings the entering/leaving animation and the overflow panel with it. Both
 * ancestors are links: leaving a package, or jumping back to its own home, has
 * to be reachable from every page inside it. Only the last segment is the
 * current page, so `aria-current` is unambiguous.
 */
export function Breadcrumb({
  workspaceId,
  title,
}: {
  workspaceId: string;
  title: string;
}) {
  const workspaces = useLibrary((state) => state.workspaces);
  const packageName =
    workspaces.find((entry) => entry.id === workspaceId)?.name ?? "学习包";

  return (
    <header className="flex h-11 shrink-0 items-center border-b border-border px-3">
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
          <BreadcrumbItem key="package">
            <BreadcrumbSeparator />
            <BreadcrumbLink
              render={(props) => (
                <Link {...props} to={`/w/${workspaceId}`} />
              )}
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
        </BreadcrumbList>
      </BreadcrumbRoot>
    </header>
  );
}
