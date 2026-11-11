import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { InfoHint } from "@/components/InfoHint";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { findPoint } from "@/features/knowledge";
import { useScrollMemory } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";
import { loadPointStats, type PointStats } from "@/features/training/attempts";
import {
  coverageOf,
  LEVEL_LABEL,
  levelOf,
  masteryOf,
  weakestFirst,
  type Mastery,
  type MasteryLevel,
} from "@/features/training/mastery";
import { workspacePath } from "@/app/navigation";

const LEVEL_STATUS: Record<
  MasteryLevel,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  untouched: "neutral",
  learning: "warning",
  familiar: "info",
  solid: "success",
};

/**
 * The profile reports what the answers actually say.
 *
 * A point with no attempts is listed as untested rather than omitted: the gap
 * is the most useful thing this page can show, so the list starts from the
 * weakest and an unknown ranks first.
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

  const tallies = useMemo(() => {
    const byPoint = new Map(stats.map((row) => [row.knowledgePointId, row]));
    // Every point in the package appears once, so a never-tested point is
    // visible as a gap instead of silently missing from the ranking.
    return index.view.points.map((point) => {
      const row = byPoint.get(point.id);
      return masteryOf({
        pointId: point.id,
        attempts: row?.attempts ?? 0,
        correct: row?.correct ?? 0,
        lastAttemptAt: row?.lastAttemptAt ?? 0,
      });
    });
  }, [index, stats]);

  const ranked = useMemo(() => weakestFirst(tallies), [tallies]);
  const coverage = coverageOf(tallies, index.view.points.length);
  const tested = tallies.filter((entry) => entry.attempts > 0).length;

  return (
    <div
      ref={scrollRef}
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7"
    >
      <Panel
        title="掌握度"
        action={
          isTauriRuntime ? (
            <AnimatedBadge
              status={tested > 0 ? "info" : "neutral"}
              size="sm"
              contentKey={`${tested}-${index.view.points.length}`}
            >
              {tested} / {index.view.points.length}
            </AnimatedBadge>
          ) : null
        }
      >
        {!isTauriRuntime ? (
          <EmptyState mood="thinking" title="浏览器预览中不读取本地作答记录" />
        ) : !loaded ? (
          <p className="py-4 text-sm text-muted-foreground">读取中</p>
        ) : index.view.points.length === 0 ? (
          <EmptyState mood="confused" title="这个学习包暂无知识点" />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              已测 {coverage}%
              <InfoHint label="答对比例经过平滑处理，作答次数越多越可信；未测的知识点排在前面。" />
            </p>
            <ul className="flex flex-col">
              {ranked.map((entry) => (
                <MasteryRow
                  key={entry.pointId}
                  mastery={entry}
                  name={findPoint(index, entry.pointId)?.name ?? entry.pointId}
                  onPractice={() =>
                    navigate(
                      `${workspacePath(workspaceId, "/drill")}?point=${entry.pointId}`,
                    )
                  }
                />
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}

function MasteryRow({
  mastery,
  name,
  onPractice,
}: {
  mastery: Mastery;
  name: string;
  onPractice: () => void;
}) {
  const level = levelOf(mastery);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 py-2.5 first:pt-0 last:border-0 last:pb-0">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {name}
      </span>
      <span className="text-sm tabular-nums text-muted-foreground">
        作答 {mastery.attempts} · 正确 {mastery.correct}
      </span>
      <AnimatedBadge
        status={LEVEL_STATUS[level]}
        size="sm"
        contentKey={`${mastery.pointId}-${level}`}
        className="shrink-0"
      >
        {level === "untouched" ? LEVEL_LABEL[level] : `${mastery.score}%`}
      </AnimatedBadge>
      <Button
        size="sm"
        variant="ghost"
        className="text-sm"
        onClick={onPractice}
      >
        练习
      </Button>
    </li>
  );
}
