import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { applyBootAppearance } from "@/features/appearance/useAppearance";
import "@/styles/globals.css";

// Painted before the first React render, so the window never flashes the
// default palette on the way to the stored one.
applyBootAppearance();

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root is missing from index.html");
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
