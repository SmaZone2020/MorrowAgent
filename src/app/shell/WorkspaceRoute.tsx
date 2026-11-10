import { Navigate, Outlet, useParams } from "react-router-dom";
import { WorkspaceProvider } from "@/features/workspace/WorkspaceContext";

/**
 * The workspace layer's shell.
 *
 * It reads the id out of the URL and loads that one package, so a page below
 * never has to know how content is fetched. Mounting the provider here (rather
 * than per page) means switching from Lumi to the knowledge base reuses the
 * same loaded package instead of streaming it in twice.
 */
export function WorkspaceRoute() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  // A workspace URL without an id cannot describe any package.
  if (!workspaceId) return <Navigate to="/" replace />;

  return (
    <WorkspaceProvider workspaceId={workspaceId}>
      <Outlet />
    </WorkspaceProvider>
  );
}
