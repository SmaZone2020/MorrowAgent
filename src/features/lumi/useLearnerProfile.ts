import { useEffect } from "react";
import { useKnowledge } from "@/features/workspace/WorkspaceContext";
import { usePreferences } from "@/features/settings/preferencesStore";
import { useGoal } from "@/features/plan/useGoal";
import { loadPointStats } from "@/features/training/attempts";
import { masteryOf, weakestFirst } from "@/features/training/mastery";
import { asTeachingStyle } from "@/features/lumi/teachingStyle";
import { setLearnerProfile } from "@/features/lumi/learnerProfile";
import type { LearnerProfile } from "@/features/lumi/prompts/registry";

/** How many weak points the prompt names; more crowds out the actual question. */
const WEAKEST_LIMIT = 5;

/**
 * Publishes who the learner is, so the prompt can open with it.
 *
 * The numbers come from the same tallies the profile page ranks, so Lumi never
 * disagrees with the page the learner just looked at. A read failure leaves the
 * previous profile in place: an out-of-date weak list is still better than a
 * prompt that pretends it knows nothing.
 */
export function useLearnerProfile() {
  const index = useKnowledge();
  const workspaceId = index.view.workspaceId;
  const { goal } = useGoal(workspaceId);
  const teachingStyle = usePreferences((state) => state.teachingStyle);
  const style = asTeachingStyle(teachingStyle);
  // `goal` is a new object whenever the hook re-reads; the fields are what the
  // prompt actually uses, so they are the dependency rather than the object.
  const { targetScore, examDate, minutesPerDay, note } = goal;

  useEffect(() => {
    let alive = true;

    void loadPointStats(workspaceId)
      .then((rows) => {
        if (!alive) return;
        const byPoint = new Map(rows.map((row) => [row.knowledgePointId, row]));
        const ranked = weakestFirst(
          index.view.points.map((point) => {
            const row = byPoint.get(point.id);
            return masteryOf({
              pointId: point.id,
              attempts: row?.attempts ?? 0,
              correct: row?.correct ?? 0,
              lastAttemptAt: row?.lastAttemptAt ?? 0,
            });
          }),
        ).slice(0, WEAKEST_LIMIT);

        const profile: LearnerProfile = {
          packageName: index.view.name,
          packageVersion: index.view.version,
          goal: {
            targetScore,
            examDate,
            minutesPerDay,
            difficultyFocus: goal.difficultyFocus,
            note,
          },
          weakest: ranked.map((entry) => ({
            id: entry.pointId,
            name: index.pointsById.get(entry.pointId)?.name ?? entry.pointId,
            score: entry.attempts === 0 ? null : entry.score,
          })),
          teachingStyle: style,
        };
        setLearnerProfile(workspaceId, profile);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [
    workspaceId,
    index,
    targetScore,
    examDate,
    minutesPerDay,
    note,
    goal.difficultyFocus,
    style,
  ]);
}
