import { useEffect } from "react";
import { AppShell } from "@/app/shell/AppShell";
import { AppProviders } from "@/app/providers";
import { TitleBar } from "@/app/shell/TitleBar";
import { ResizeHandles } from "@/app/shell/ResizeHandles";
import { AnimatedSidebarProvider } from "@/vendor/beui/components/motion/animated-sidebar";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { usePreferences } from "@/features/settings/preferencesStore";
import { useAppearance } from "@/features/appearance/useAppearance";
import { usePersistedState } from "@/features/uiState/usePersistedState";
import { flushUiState, loadUiState } from "@/features/uiState/store";

// The sidebar provider wraps the title bar too, because the sidebar toggle now
// lives there and reads its open state from the provider.
export function RootLayout() {
  const hydrate = useProviderStatus((state) => state.hydrate);
  const hydratePreferences = usePreferences((state) => state.hydrate);
  // A collapsed rail is a deliberate layout choice, so it outlives the session.
  const [sidebarOpen, setSidebarOpen] = usePersistedState(
    "sidebar.open",
    true,
  );
  // Mounted here, not in settings: appearance has to stay applied on every page.
  useAppearance();

  // One read of the encrypted credential blob at boot; every screen after that
  // subscribes to the same store.
  useEffect(() => {
    void hydrate();
    void hydratePreferences();
    // Interface state is read once here so pages mount with their stored value
    // already in memory instead of flashing a default first.
    void loadUiState();
  }, [hydrate, hydratePreferences]);

  // The debounced writer must not lose the last change when the window closes.
  useEffect(() => {
    const onHide = () => flushUiState();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      flushUiState();
    };
  }, []);

  return (
    <AppProviders>
      <AnimatedSidebarProvider
        className="h-svh flex-col overflow-hidden"
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      >
        <TitleBar />
        <div className="min-h-0 flex-1">
          <AppShell />
        </div>
      </AnimatedSidebarProvider>
      <ResizeHandles />
    </AppProviders>
  );
}
