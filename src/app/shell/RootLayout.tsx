import { useEffect } from "react";
import { AppShell } from "@/app/shell/AppShell";
import { AppProviders } from "@/app/providers";
import { TitleBar } from "@/app/shell/TitleBar";
import { ResizeHandles } from "@/app/shell/ResizeHandles";
import { AnimatedSidebarProvider } from "@/vendor/beui/components/motion/animated-sidebar";
import { useProviderStatus } from "@/features/settings/providerStatus";

// The sidebar provider wraps the title bar too, because the sidebar toggle now
// lives there and reads its open state from the provider.
export function RootLayout() {
  const hydrate = useProviderStatus((state) => state.hydrate);

  // One read of the encrypted credential blob at boot; every screen after that
  // subscribes to the same store.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <AppProviders>
      <AnimatedSidebarProvider className="h-svh flex-col overflow-hidden">
        <TitleBar />
        <div className="min-h-0 flex-1">
          <AppShell />
        </div>
      </AnimatedSidebarProvider>
      <ResizeHandles />
    </AppProviders>
  );
}
