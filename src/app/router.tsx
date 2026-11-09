import { createHashRouter, Navigate } from "react-router-dom";
import { RootLayout } from "@/app/shell/RootLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { LumiPage } from "@/pages/LumiPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

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
      { path: "training/drill", element: <PlaceholderPage /> },
      { path: "training/mock", element: <PlaceholderPage /> },
      { path: "wrong-book", element: <PlaceholderPage /> },
      { path: "knowledge", element: <PlaceholderPage /> },
      { path: "settings", element: <Navigate to="/settings/provider" replace /> },
      { path: "settings/provider", element: <PlaceholderPage /> },
      { path: "settings/model", element: <PlaceholderPage /> },
      { path: "settings/data", element: <PlaceholderPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
