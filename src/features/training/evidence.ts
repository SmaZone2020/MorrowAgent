import type { Mastery } from "@/features/training/mastery";

/**
 * How much the app trusts what it says about a point.
 *
 * This is deliberately a layer beside `masteryOf`, not a term inside it: the
 * score is arithmetic over the tallies and must not move when the learner
 * disagrees. What changes is how the row is read and where it ranks.
 */
export const EVIDENCE_STATES = [
  "observed",
  "hypothesized",
  "verified",
  "user_corrected",
] as const;

export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export interface PointEvidence {
  pointId: string;
  state: EvidenceState;
  note: string;
  updatedAt: number;
}

export const EVIDENCE_LABEL: Record<EvidenceState, string> = {
  observed: "实测",
  hypothesized: "推测",
  verified: "已确认",
  user_corrected: "已由你修正",
};

/** A corrected judgement is the strongest signal, so it is never demoted. */
export const EVIDENCE_STATUS: Record<
  EvidenceState,
  "neutral" | "info" | "success" | "warning"
> = {
  observed: "info",
  hypothesized: "warning",
  verified: "success",
  user_corrected: "neutral",
};

export function asEvidenceState(value: string): EvidenceState | null {
  return (EVIDENCE_STATES as readonly string[]).includes(value)
    ? (value as EvidenceState)
    : null;
}

/** The states a learner can assert from the profile; the rest are inferred. */
export const LEARNER_STATES: EvidenceState[] = ["user_corrected", "verified"];

/**
 * The ranking `weakestFirst` would give, with corrections folded in.
 *
 * `masteries` is expected in the caller's own order (`weakestFirst`); this only
 * moves the points the learner has corrected to the end. The arithmetic is
 * untouched — what changed is that the learner overruled it, so the row should
 * stop being the first thing the page asks them to study.
 */
export function rankWithEvidence(
  masteries: Mastery[],
  evidence: Map<string, PointEvidence>,
): Mastery[] {
  const corrected: Mastery[] = [];
  const rest: Mastery[] = [];
  for (const entry of masteries) {
    const state = evidence.get(entry.pointId)?.state;
    if (state === "user_corrected") corrected.push(entry);
    else rest.push(entry);
  }
  return [...rest, ...corrected];
}
