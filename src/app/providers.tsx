import { TooltipProvider } from "@/vendor/beui/components/motion/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
