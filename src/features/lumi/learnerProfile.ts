import type { LearnerProfile } from "@/features/lumi/prompts/registry";
import { EMPTY_PROFILE } from "@/features/lumi/prompts/registry";

/**
 * What the model is told about the learner, keyed by package.
 *
 * A conversation store is created at module scope, so it cannot read React
 * context. The page publishes the profile here when it mounts or when the goal
 * or the tallies change, and the loop reads it while building a request. It is
 * per package for the same reason every other read is (MLPS §1.2).
 */
const profiles = new Map<string, LearnerProfile>();

export function setLearnerProfile(workspaceId: string, profile: LearnerProfile) {
  profiles.set(workspaceId, profile);
}

export function currentProfile(workspaceId: string | null): LearnerProfile {
  if (!workspaceId) return EMPTY_PROFILE;
  return profiles.get(workspaceId) ?? EMPTY_PROFILE;
}
