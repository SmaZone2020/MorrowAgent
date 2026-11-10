import { TooltipProvider } from "@/vendor/beui/components/motion/tooltip";
import { LinkGuardProvider } from "@/features/rich/LinkGuard";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      {/* Links in model output always leave the app, so the confirmation is
          mounted once here instead of per message. */}
      <LinkGuardProvider>{children}</LinkGuardProvider>
    </TooltipProvider>
  );
}
