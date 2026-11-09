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

/** Lumi switches action on its own every 15s; a click restarts that clock. */
const ACTION_INTERVAL = 15000;

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

    // Only the Reactions group is in play: Lifecycle poses (sleeping, working…)
    // read as app state, not as Lumi's mood on an empty page.
    const states = readLumiStates("Reactions");
    const pool = states.length > 0 ? states : ["idle"];
    const others = pool.filter((state) => state !== "angry");

    let engine: LumiEngine | null = null;
    let timer = 0;
    let shapeIndex = 0;
    let current = "idle";

    const pickOther = () => {
      // Never repeat the pose that is already playing, so a click always reads
      // as a fresh reaction even when the random draw lands twice.
      const options =
        others.length > 1 ? others.filter((state) => state !== current) : others;
      return options[Math.floor(Math.random() * options.length)] ?? "happy";
    };

    const swapShape = () => {
      shapeIndex = (shapeIndex + 1) % SHAPES.length;
      engine?.setShape(SHAPES[shapeIndex]!);
    };

    const play = (next: string, changeShape: boolean) => {
      if (!engine) return;
      current = next;
      engine.setState(next, { resetEyes: false });
      if (changeShape) swapShape();
    };

    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        play(pickOther(), true);
        schedule(ACTION_INTERVAL);
      }, delay);
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

      // Poking Lumi is a coin flip: half the time it sulks, otherwise it
      // switches to any other reaction. No body flourish on top — the state
      // change alone carries the response.
      pokeRef.current = () => {
        play(Math.random() < 0.5 ? "angry" : pickOther(), Math.random() < 0.5);
        schedule(ACTION_INTERVAL);
      };

      schedule(ACTION_INTERVAL);
    } catch (error) {
      console.error(error);
    }

    return () => {
      window.clearTimeout(timer);
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
