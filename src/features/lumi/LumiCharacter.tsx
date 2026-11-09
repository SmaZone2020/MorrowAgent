import { useEffect, useRef } from "react";
import {
  createLumiEngine,
  readLumiStates,
  type LumiEngine,
} from "@/features/lumi/engine";
import { cn } from "@/vendor/beui/lib/utils";

/** Shape pairs Lumi alternates between while idling. */
const SHAPES = ["blob", "pebble"] as const;

/** Lumi reads as near-black ink rather than the app's blue-grey foreground. */
const LUMI_INK = "#1a1c1e";

/** Idle reactions cycle every 5s, per the Lumi empty-state brief. */
const REACTION_INTERVAL = 5000;

export function LumiCharacter({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pokeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = "100%";
    svg.style.height = "100%";
    stage.appendChild(svg);

    const states = readLumiStates("Lifecycle", "Reactions");
    const pool = states.length > 0 ? states : ["idle"];

    let engine: LumiEngine | null = null;
    let timer = 0;
    let shapeIndex = 0;

    const play = () => {
      if (!engine) return;
      const next = pool[Math.floor(Math.random() * pool.length)] ?? "idle";
      engine.setState(next, { resetEyes: false });
    };

    try {
      engine = createLumiEngine(svg, {
        shape: SHAPES[shapeIndex],
        color: "black",
        scheme: "light",
        mode: "hold",
        state: "idle",
        loginWrap: true,
        followPointer: true,
      });
      engine.setInk(LUMI_INK);
      engine.setEyeColor("var(--card)");

      pokeRef.current = () => {
        if (!engine) return;
        play();
        engine.bounceOnce();
      };

      // Alternate silhouettes alongside the reaction cadence so the body and
      // the expression never change on the same beat.
      timer = window.setInterval(() => {
        play();
        if (Math.random() < 0.55) {
          shapeIndex = (shapeIndex + 1) % SHAPES.length;
          engine?.setShape(SHAPES[shapeIndex]!);
        }
      }, REACTION_INTERVAL);
    } catch (error) {
      console.error(error);
    }

    return () => {
      window.clearInterval(timer);
      engine?.destroy();
      svg.remove();
      pokeRef.current = () => {};
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="和 Lumi 打个招呼"
      onClick={() => pokeRef.current()}
      className={cn(
        "block cursor-pointer rounded-full outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div ref={stageRef} aria-hidden="true" className="size-full" />
    </button>
  );
}
