// Reaction vocabulary for Lumi. Each entry is a short pose the character
// blends into and out of; nothing is keyframed, so any two reactions can run
// back to back without resetting.
export interface Reaction {
  readonly id: string;
  readonly duration: number;
  /** Hold the pose at full strength instead of peaking mid-way. */
  readonly hold?: boolean;
  readonly eyeWidth?: number;
  readonly eyeHeight?: number;
  /** 0 flattens the eye into a line, 1 is the resting lid. */
  readonly lidTop?: number;
  readonly lidBottom?: number;
  readonly gazeX?: number;
  readonly gazeY?: number;
  readonly tilt?: number;
  readonly squash?: number;
  readonly hop?: number;
  readonly shapeChance?: number;
}

export const REACTIONS: readonly Reaction[] = [
  { id: "curious", duration: 1500, eyeHeight: 1.12, gazeY: -0.55, tilt: -4, shapeChance: 0.5 },
  { id: "happy", duration: 1500, lidBottom: 0.16, lidTop: 1.15, hop: -9, squash: 0.96 },
  { id: "surprised", duration: 1200, eyeWidth: 1.24, eyeHeight: 1.3, hop: -11, squash: 1.06 },
  { id: "sleepy", duration: 2600, hold: true, lidTop: 0.08, lidBottom: 0.08, tilt: 7, gazeY: 0.5 },
  { id: "proud", duration: 1900, eyeHeight: 0.7, gazeY: -0.4, hop: -5, tilt: -3 },
  { id: "shy", duration: 1800, gazeX: -0.75, tilt: 6, eyeHeight: 0.86, shapeChance: 0.4 },
  { id: "excited", duration: 1300, hop: -13, squash: 1.05, eyeWidth: 1.08, shapeChance: 0.6 },
  { id: "confused", duration: 1700, gazeX: 0.65, tilt: -6, eyeWidth: 0.9, eyeHeight: 0.94 },
  { id: "playful", duration: 1400, tilt: 9, hop: -7, shapeChance: 0.5 },
  { id: "bored", duration: 2200, hold: true, eyeHeight: 0.78, gazeY: 0.35, tilt: 3 },
] as const;

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

/** Strength of a reaction at normalised progress `p` (0..1). */
export function envelope(p: number, hold: boolean) {
  if (hold) {
    return smoothstep(Math.min(p / 0.22, (1 - p) / 0.22));
  }
  return Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, p))), 0.8);
}

export function pickReaction(exclude?: string) {
  const pool = exclude ? REACTIONS.filter((item) => item.id !== exclude) : REACTIONS;
  return pool[Math.floor(Math.random() * pool.length)] ?? REACTIONS[0]!;
}

export const REACTION_INTERVAL = 5000;
export const SHAPE_MORPH_MS = 900;
