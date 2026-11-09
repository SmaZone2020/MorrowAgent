// Vendored character engine (see engine/README.md). The scripts are plain
// browser IIFEs that register themselves on `window`, so they must be imported
// for their side effects and in this exact order.
import "./geometry-data.js";
import "./math.js";
import "./tables.js";
import "./pose.js";
import "./tricks.js";
import "./fx.js";
import "./eyes.js";
import "./character.js";

export interface LumiEngineOptions {
  shape?: string;
  color?: string;
  scheme?: "light" | "dark";
  mode?: "onboarding" | "hold";
  state?: string;
  loginWrap?: boolean;
  followPointer?: boolean;
  emphasis?: boolean;
  paused?: boolean;
  reduceMotion?: boolean;
  sizePx?: number;
  eyeColor?: string | null;
}

export interface LumiEngineSnapshot {
  state: string;
  shape: string;
  color: string;
}

export interface LumiEngine {
  snapshot(): LumiEngineSnapshot;
  setState(name: string, options?: { resetEyes?: boolean }): void;
  setShape(name: string): void;
  setMode(mode: "onboarding" | "hold"): void;
  setPaused(paused: boolean): void;
  setFollowPointer(enabled: boolean): void;
  setEmphasis(enabled: boolean): void;
  setInk(color: string | null): void;
  setEyeColor(color: string | null): void;
  spinOnce(turns?: number): void;
  bounceOnce(): void;
  burstOnce(): void;
  destroy(): void;
}

interface EngineMeta {
  groups: Array<{ label: string; states: string[] }>;
}

declare global {
  interface Window {
    GrokCharacter?: new (svg: SVGSVGElement, options?: LumiEngineOptions) => LumiEngine;
    GROK_META?: EngineMeta;
  }
}

export function createLumiEngine(
  svg: SVGSVGElement,
  options: LumiEngineOptions,
): LumiEngine {
  const Character = window.GrokCharacter;
  if (!Character) {
    throw new Error("Lumi engine failed to load");
  }
  return new Character(svg, options);
}

/** State vocabulary the engine already ships with, grouped by lifecycle stage. */
export function readLumiStates(...labels: string[]): string[] {
  const groups = window.GROK_META?.groups ?? [];
  return labels.flatMap(
    (label) => groups.find((group) => group.label === label)?.states ?? [],
  );
}
