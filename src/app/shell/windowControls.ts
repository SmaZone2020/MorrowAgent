import { getCurrentWindow } from "@tauri-apps/api/window";

export const isTauriRuntime = "__TAURI_INTERNALS__" in window;

export async function minimizeWindow(): Promise<void> {
  if (!isTauriRuntime) return;
  await getCurrentWindow().minimize();
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (!isTauriRuntime) return;
  await getCurrentWindow().toggleMaximize();
}

export async function closeWindow(): Promise<void> {
  if (!isTauriRuntime) return;
  await getCurrentWindow().close();
}

export async function startWindowDrag(): Promise<void> {
  if (!isTauriRuntime) return;
  await getCurrentWindow().startDragging();
}

export async function readMaximized(): Promise<boolean> {
  if (!isTauriRuntime) return false;
  return getCurrentWindow().isMaximized();
}

// Frameless windows lose native resize borders, so edges and corners get
// explicit hit areas that forward to the OS resize-drag handler.
export type ResizeEdge =
  | "North"
  | "South"
  | "East"
  | "West"
  | "NorthEast"
  | "NorthWest"
  | "SouthEast"
  | "SouthWest";

export async function startWindowResize(direction: ResizeEdge): Promise<void> {
  if (!isTauriRuntime) return;
  await getCurrentWindow().startResizeDragging(direction);
}
