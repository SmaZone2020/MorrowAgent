import { Navigate } from "react-router-dom";

// Settings used to open on an overview list; with a permanent left rail that
// list would be a second navigation for the same six sections.
export function SettingsOverviewPage() {
  return <Navigate to="/settings/general" replace />;
}
