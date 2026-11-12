import { createHashRouter, Navigate } from "react-router-dom";
import { RootLayout } from "@/app/shell/RootLayout";
import { WorkspaceRoute } from "@/app/shell/WorkspaceRoute";
import { LibraryPage } from "@/pages/LibraryPage";
import { WorkspaceDashboardPage } from "@/pages/WorkspaceDashboardPage";
import { LumiPage } from "@/pages/LumiPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SettingsLayout } from "@/pages/settings/SettingsLayout";
import { SettingsOverviewPage } from "@/pages/settings/SettingsOverviewPage";
import { GeneralSettingsPage } from "@/pages/settings/GeneralSettingsPage";
import { AboutSettingsPage } from "@/pages/settings/AboutSettingsPage";
import { ProviderSettingsPage } from "@/pages/settings/ProviderSettingsPage";
import { ModelSettingsPage } from "@/pages/settings/ModelSettingsPage";
import { DataSettingsPage } from "@/pages/settings/DataSettingsPage";
import { KnowledgePage } from "@/pages/KnowledgePage";
import { WrongBookPage } from "@/pages/WrongBookPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { DrillPage } from "@/pages/training/DrillPage";
import { DiagnosticPage } from "@/pages/training/DiagnosticPage";
import { ExamPage } from "@/pages/training/ExamPage";
import { PlanPage } from "@/pages/PlanPage";
import { ReportPage } from "@/pages/ReportPage";

/**
 * Three layers, nested by URL rather than by state:
 *
 *   /                    shelf      — pick a package
 *   /w/:workspaceId/*    workspace  — Lumi, knowledge, drill, records
 *   /settings/*          settings   — owns the whole window
 *
 * A workspace is addressed by id in the path because everything inside it is
 * scoped to that package: two routes on two packages must not share state
 * (MLPS §1.2).
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <LibraryPage /> },
      {
        path: "w/:workspaceId",
        element: <WorkspaceRoute />,
        children: [
          { index: true, element: <WorkspaceDashboardPage /> },
          { path: "lumi", element: <LumiPage /> },
          { path: "knowledge", element: <KnowledgePage /> },
          { path: "plan", element: <PlanPage /> },
          { path: "report", element: <ReportPage /> },
          { path: "drill", element: <DrillPage /> },
          { path: "diagnostic", element: <DiagnosticPage /> },
          { path: "exam", element: <ExamPage /> },
          { path: "wrong-book", element: <WrongBookPage /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
      {
        path: "settings",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <SettingsOverviewPage /> },
          { path: "general", element: <GeneralSettingsPage /> },
          // Appearance folded into preferences; keep old links working.
          {
            path: "appearance",
            element: <Navigate to="/settings/general" replace />,
          },
          { path: "provider", element: <ProviderSettingsPage /> },
          { path: "model", element: <ModelSettingsPage /> },
          { path: "data", element: <DataSettingsPage /> },
          { path: "about", element: <AboutSettingsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
