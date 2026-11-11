import { useEffect, useRef } from "react";
import { createLumiEngine, type LumiEngine } from "@/features/lumi/engine";
import { cn } from "@/vendor/beui/lib/utils";

// Matches LumiCharacter: the body is ink, the eyes are the surface it stands on.
const LUMI_INK = "var(--lumi-ink, #1a1c1e)";

const SURFACE_EYE: Record<EmptySurface, string> = {
  page: "var(--background)",
  card: "var(--card)",
};

export type EmptySurface = "page" | "card";

/**
 * A Lumi that holds one expression instead of cycling through reactions.
 *
 * Empty pages get a face so the blank area has a voice; a mood that keeps
 * changing on its own would pull attention away from the single line of text
 * the page is making. `state` is the engine's own vocabulary ("confused",
 * "curious", "thinking"…), so no separate mood table has to be maintained.
 */
export function LumiMood({
  state = "curious",
  surface = "card",
  className,
}: {
  state?: string;
  surface?: EmptySurface;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = "100%";
    svg.style.height = "100%";
    stage.appendChild(svg);

    let engine: LumiEngine | null = null;
    try {
      engine = createLumiEngine(svg, {
        shape: "blob",
        color: "black",
        scheme: "light",
        mode: "hold",
        state,
        loginWrap: true,
        followPointer: true,
      });
      engine.setInk(LUMI_INK);
      engine.setEyeColor(SURFACE_EYE[surface]);
    } catch (error) {
      console.error(error);
    }

    return () => {
      engine?.destroy();
      svg.remove();
    };
  }, [state, surface]);

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
    />
  );
}
