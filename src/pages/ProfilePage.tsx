import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, Pencil } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { InfoHint } from "@/components/InfoHint";
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
import {
  EVIDENCE_LABEL,
  EVIDENCE_STATUS,
  rankWithEvidence,
  type PointEvidence,
} from "@/features/training/evidence";
import { useEvidence } from "@/features/training/useEvidence";
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
 * weakest and an unknown ranks first. A judgement the learner has corrected
 * keeps its numbers but drops to the end of the list — the page should not keep
 * asking them to study something they say they know.
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const [stats, setStats] = useState<PointStats[]>([]);
  const [loaded, setLoaded] = useState(false);
  const evidence = useEvidence(workspaceId);
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

  const ranked = useMemo(
    () => rankWithEvidence(weakestFirst(tallies), evidence.byPoint),
    [tallies, evidence.byPoint],
  );
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
          <AnimatedBadge
            status={tested > 0 ? "info" : "neutral"}
            size="sm"
            contentKey={`${tested}-${index.view.points.length}`}
          >
            {tested} / {index.view.points.length}
          </AnimatedBadge>
        }
      >
        {!loaded ? (
          <p className="py-4 text-sm text-muted-foreground">读取中</p>
        ) : index.view.points.length === 0 ? (
          <EmptyState mood="confused" title="这个学习包暂无知识点" />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              已测 {coverage}%
              <InfoHint label="答对比例经过平滑处理，作答次数越多越可信；未测的知识点排在前面。判断不对时可以自己改正，改正后这一条会排到最后。" />
            </p>
            <ul className="flex flex-col">
              {ranked.map((entry) => (
                <MasteryRow
                  key={entry.pointId}
                  mastery={entry}
                  name={findPoint(index, entry.pointId)?.name ?? entry.pointId}
                  evidence={evidence.byPoint.get(entry.pointId)}
                  onPractice={() =>
                    navigate(
                      `${workspacePath(workspaceId, "/drill")}?point=${entry.pointId}`,
                    )
                  }
                  onCorrect={() =>
                    void evidence.mark(entry.pointId, "user_corrected")
                  }
                  onConfirm={() => void evidence.mark(entry.pointId, "verified")}
                  onUndo={() => void evidence.unmark(entry.pointId)}
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
  evidence,
  onPractice,
  onCorrect,
  onConfirm,
  onUndo,
}: {
  mastery: Mastery;
  name: string;
  evidence: PointEvidence | undefined;
  onPractice: () => void;
  onCorrect: () => void;
  onConfirm: () => void;
  onUndo: () => void;
}) {
  const level = levelOf(mastery);
  const corrected = evidence?.state === "user_corrected";

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 py-2.5 first:pt-0 last:border-0 last:pb-0">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {name}
      </span>
      <span className="text-sm tabular-nums text-muted-foreground">
        作答 {mastery.attempts} · 正确 {mastery.correct}
      </span>
      {evidence ? (
        <AnimatedBadge
          status={EVIDENCE_STATUS[evidence.state]}
          size="sm"
          contentKey={`${mastery.pointId}-${evidence.state}`}
          className="shrink-0"
        >
          {EVIDENCE_LABEL[evidence.state]}
        </AnimatedBadge>
      ) : null}
      <AnimatedBadge
        status={corrected ? "neutral" : LEVEL_STATUS[level]}
        size="sm"
        contentKey={`${mastery.pointId}-${level}`}
        className="shrink-0"
      >
        {level === "untouched" ? LEVEL_LABEL[level] : `${mastery.score}%`}
      </AnimatedBadge>
      {corrected ? (
        <Tooltip content="撤回改正，让掌握度重新参与排序">
          <Button
            size="sm"
            variant="ghost"
            className="text-sm"
            onClick={onUndo}
          >
            撤回
          </Button>
        </Tooltip>
      ) : (
        <>
          <Tooltip content="把这个知识点标记为已确认">
            <Button
              size="sm"
              variant="ghost"
              className="size-8 rounded-full p-0"
              aria-label="标记为已确认"
              onClick={onConfirm}
            >
              <CircleCheck className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip content="我的判断不对，我知道这个知识点">
            <Button
              size="sm"
              variant="ghost"
              className="size-8 rounded-full p-0"
              aria-label="这个判断不对"
              onClick={onCorrect}
            >
              <Pencil className="size-4" />
            </Button>
          </Tooltip>
        </>
      )}
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
