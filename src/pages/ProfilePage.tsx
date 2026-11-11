import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { findPoint } from "@/features/knowledge";
import { useScrollMemory } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";
import { loadPointStats, type PointStats } from "@/features/training/attempts";
import { workspacePath } from "@/app/navigation";

/**
 * The profile shows evidence, not a verdict. Mastery scoring is still an open
 * product question, so this page reports raw attempt tallies per point and
 * says so; inventing a 0-100 number here would make a guess look measured.
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const [stats, setStats] = useState<PointStats[]>([]);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useScrollMemory<HTMLDivElement>(
    workspaceScope(workspaceId, "profile.scrollTop"),
  );

  useEffect(() => {
    setLoaded(false);
    void loadPointStats(workspaceId).then((rows) => {
      setStats(rows);
      setLoaded(true);
    });
  }, [workspaceId]);

  return (
    <div
      ref={scrollRef}
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7"
    >
      <Panel
        title="知识点作答"
        action={
          isTauriRuntime ? (
            <AnimatedBadge
              status={stats.length > 0 ? "info" : "neutral"}
              size="sm"
              contentKey={stats.length}
            >
              {stats.length} 个
            </AnimatedBadge>
          ) : null
        }
      >
        {!isTauriRuntime ? (
          <EmptyState mood="thinking" title="浏览器预览中不读取本地作答记录" />
        ) : !loaded ? (
          <p className="py-4 text-sm text-muted-foreground">读取中</p>
        ) : stats.length === 0 ? (
          <EmptyState
            mood="curious"
            title="还没有作答记录"
            action={
              <Button
                size="sm"
                variant="secondary"
                className="text-sm"
                onClick={() => navigate(workspacePath(workspaceId, "/drill"))}
              >
                去专项训练
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col">
            {stats.map((entry) => {
              const point = findPoint(index, entry.knowledgePointId);
              const accuracy = Math.round(
                (entry.correct / entry.attempts) * 100,
              );
              return (
                <li
                  key={entry.knowledgePointId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 py-2.5 first:pt-0 last:border-0 last:pb-0"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {point?.name ?? entry.knowledgePointId}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    作答 {entry.attempts} · 正确 {entry.correct}
                  </span>
                  <AnimatedBadge
                    status={
                      accuracy >= 80
                        ? "success"
                        : accuracy >= 50
                          ? "warning"
                          : "danger"
                    }
                    size="sm"
                    contentKey={`${entry.knowledgePointId}-${accuracy}`}
                    className="shrink-0"
                  >
                    {accuracy}%
                  </AnimatedBadge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-sm"
                    onClick={() =>
                      navigate(
                        `${workspacePath(workspaceId, "/drill")}?point=${entry.knowledgePointId}`,
                      )
                    }
                  >
                    练习
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
