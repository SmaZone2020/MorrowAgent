import { useNavigate } from "react-router-dom";
import { Calendar, Target } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { workspacePath } from "@/app/navigation";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";
import { daysUntil } from "@/features/plan/calendar";
import { useGoal } from "@/features/plan/useGoal";

/**
 * One line on the dashboard: the deadline, the target, and the way to change
 * them. A learner who has not set a goal sees nothing rather than an empty
 * prompt — the plan page is reachable from the sidebar, and a dashboard is not
 * the place to nag.
 */
export function GoalSummary() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const { goal, hasGoal, loaded } = useGoal(workspaceId);

  if (!loaded || !hasGoal) return null;

  const left = daysUntil(goal.examDate);
  const pieces: string[] = [];
  if (left !== null) {
    pieces.push(left < 0 ? `考试已过 ${-left} 天` : `距考试 ${left} 天`);
  }
  if (goal.targetScore !== null) pieces.push(`目标 ${goal.targetScore} 分`);
  if (pieces.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Calendar className="size-4" />
        {pieces.join(" · ")}
      </span>
      {goal.note ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <Target className="size-4" />
          <span className="truncate">{goal.note}</span>
        </span>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        className="text-sm"
        onClick={() => navigate(workspacePath(workspaceId, "/plan"))}
      >
        调整
      </Button>
    </div>
  );
}
