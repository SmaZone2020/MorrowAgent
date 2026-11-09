import { createHashRouter, Navigate } from "react-router-dom";
import { RootLayout } from "@/app/shell/RootLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { LumiPage } from "@/pages/LumiPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SettingsLayout } from "@/pages/settings/SettingsLayout";
import { SettingsOverviewPage } from "@/pages/settings/SettingsOverviewPage";
import { ProviderSettingsPage } from "@/pages/settings/ProviderSettingsPage";
import { ModelSettingsPage } from "@/pages/settings/ModelSettingsPage";
import { DataSettingsPage } from "@/pages/settings/DataSettingsPage";
import { KnowledgePage } from "@/pages/KnowledgePage";
import { DrillPage } from "@/pages/training/DrillPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "lumi", element: <LumiPage /> },
      { path: "learning", element: <Navigate to="/learning/goal" replace /> },
      { path: "learning/goal", element: <PlaceholderPage /> },
      { path: "learning/plan", element: <PlaceholderPage /> },
      { path: "learning/profile", element: <PlaceholderPage /> },
      { path: "learning/report", element: <PlaceholderPage /> },
      { path: "training", element: <Navigate to="/training/assessment" replace /> },
      { path: "training/assessment", element: <PlaceholderPage /> },
      { path: "training/drill", element: <DrillPage /> },
      { path: "training/mock", element: <PlaceholderPage /> },
      { path: "wrong-book", element: <PlaceholderPage /> },
      { path: "knowledge", element: <KnowledgePage /> },
      {
        path: "settings",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <SettingsOverviewPage /> },
          { path: "provider", element: <ProviderSettingsPage /> },
          { path: "model", element: <ModelSettingsPage /> },
          { path: "data", element: <DataSettingsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
