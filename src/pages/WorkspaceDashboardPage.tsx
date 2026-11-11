import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  LayoutHeaderCells,
  ListCheck,
  Target,
} from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { InfoHint } from "@/components/InfoHint";
import { EmptyState } from "@/components/EmptyState";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { workspacePath } from "@/app/navigation";
import { useLibrary } from "@/features/library/store";
import { useCover } from "@/features/library/useCover";
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
} from "@/features/training/mastery";
import { DiagnosticInvite } from "@/features/training/DiagnosticInvite";

/**
 * The landing page of one package: what is inside it, and where the reader left
 * off. Every other page answers a single question (ask Lumi, read a point,
 * practise, review), so this one is the place that answers "what is this".
 *
 * It is also the package's home: the breadcrumb's package segment returns here,
 * which is why the page repeats the name and cover the shelf showed.
 */
export function WorkspaceDashboardPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const workspace = useLibrary((state) =>
    state.workspaces.find((entry) => entry.id === workspaceId),
  );
  const cover = useCover(workspace ?? null);
  const [stats, setStats] = useState<PointStats[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const scrollRef = useScrollMemory<HTMLDivElement>(
    workspaceScope(workspaceId, "dashboard.scrollTop"),
  );

  useEffect(() => {
    setStatsLoaded(false);
    void loadPointStats(workspaceId).then((rows) => {
      setStats(rows);
      setStatsLoaded(true);
    });
  }, [workspaceId]);

  const tallies = useMemo(() => {
    const byPoint = new Map(stats.map((row) => [row.knowledgePointId, row]));
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

  const { view } = index;
  const coverage = coverageOf(tallies, view.points.length);
  const tested = tallies.filter((entry) => entry.attempts > 0).length;
  const weakest = useMemo(
    () => weakestFirst(tallies).filter((entry) => entry.attempts === 0).slice(0, 3),
    [tallies],
  );
  const accent = view.accent ?? workspace?.accent ?? "#2f6f5e";
  const drill = workspacePath(workspaceId, "/drill");

  return (
    <div
      ref={scrollRef}
      className="scrollbar-thin mx-auto flex w-full max-w-5xl flex-col gap-4 p-5 sm:p-7"
    >
      <section className="flex flex-col gap-4 sm:flex-row">
        {/* `self-start` matters: the row stretches its children by default, and
            a stretched box ignores `aspect-[3/4]`, so the cover would be cropped
            left and right by `object-cover` instead of keeping its proportions. */}
        <div
          className="relative aspect-[3/4] w-34 shrink-0 self-start overflow-hidden rounded-r-xl rounded-l-sm border border-border/70 shadow-surface"
          style={cover ? undefined : { background: accent }}
        >
          {cover ? (
            <img src={cover} alt="" className="size-full object-cover" />
          ) : null}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-black/25"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="Siyuan text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {view.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <AnimatedBadge
                status="neutral"
                size="sm"
                contentKey={view.version}
              >
                v{view.version}
              </AnimatedBadge>
              {view.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {view.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {view.description}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="text-sm"
              onClick={() => navigate(workspacePath(workspaceId, "/lumi"))}
            >
              问 Lumi
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => navigate(workspacePath(workspaceId, "/diagnostic"))}
            >
              诊断测评
            </Button>
          </div>
        </div>

        {/* The notice column is a standing slot, not a one-off card: the
            diagnostic invite is today's only entry, but nudges Lumi derives
            from the record (weak spots, long silences) belong here too. */}
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-80">
          <DiagnosticInvite />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<BookOpen className="size-4" />}
          label="章节"
          value={view.stats.chapters}
        />
        <StatTile
          icon={<LayoutHeaderCells className="size-4" />}
          label="知识点"
          value={view.stats.points}
        />
        <StatTile
          icon={<ListCheck className="size-4" />}
          label="题目"
          value={view.stats.questions}
        />
        <StatTile
          icon={<Target className="size-4" />}
          label="关联"
          value={view.stats.relations}
        />
      </div>

      <Panel
        title="学习进度"
        action={
          <AnimatedBadge
            status={tested > 0 ? "info" : "neutral"}
            size="sm"
            contentKey={`${tested}-${view.points.length}`}
          >
            {tested} / {view.points.length}
          </AnimatedBadge>
        }
      >
        {!isTauriRuntime ? (
          <EmptyState mood="thinking" title="浏览器预览中不读取本地作答记录" />
        ) : !statsLoaded ? (
          <p className="py-3 text-sm text-muted-foreground">读取中</p>
        ) : view.points.length === 0 ? (
          <EmptyState mood="confused" title="这个学习包暂无知识点" />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${coverage}%` }}
                />
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                已测 {coverage}%
              </span>
              <InfoHint label="答对比例经过平滑处理，作答次数越多越可信；未测的知识点排在前面。" />
            </div>

            {weakest.length > 0 ? (
              <ul className="flex flex-col">
                {weakest.map((entry) => {
                  const point = index.pointsById.get(entry.pointId);
                  return (
                    <li
                      key={entry.pointId}
                      className="flex items-center gap-2 border-b border-border/60 py-2 first:pt-0 last:border-0 last:pb-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {point?.name ?? entry.pointId}
                      </span>
                      <AnimatedBadge
                        status="neutral"
                        size="sm"
                        contentKey={entry.pointId}
                      >
                        {LEVEL_LABEL[levelOf(entry)]}
                      </AnimatedBadge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-sm"
                        onClick={() =>
                          navigate(`${drill}?point=${entry.pointId}`)
                        }
                      >
                        练习
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                每个知识点都已测过，去知识画像看薄弱项。
              </p>
            )}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="内容目录">
          {view.chapters.length === 0 ? (
            <EmptyState mood="confused" title="这个学习包暂无章节" />
          ) : (
            <ol className="flex flex-col">
              {view.chapters.slice(0, 6).map((chapter) => (
                <li
                  key={chapter.id}
                  className="flex items-center gap-2 border-b border-border/60 py-2 first:pt-0 last:border-0 last:pb-0"
                >
                  <span className="w-5 shrink-0 text-sm tabular-nums text-muted-foreground">
                    {chapter.order}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {chapter.name}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {chapter.pointIds.length} 点
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="资料来源">
          {view.sources.length === 0 ? (
            <EmptyState mood="thinking" title="这个学习包没有登记来源" />
          ) : (
            <ul className="flex flex-col">
              {view.sources.slice(0, 6).map((source) => (
                <li
                  key={source.id}
                  className="flex items-center gap-2 border-b border-border/60 py-2 first:pt-0 last:border-0 last:pb-0"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {source.title}
                  </span>
                  <AnimatedBadge
                    status={source.license === "local_only" ? "warning" : "neutral"}
                    size="sm"
                    contentKey={source.license}
                  >
                    {source.license === "local_only" ? "仅本机" : source.license}
                  </AnimatedBadge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="继续">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Shortcut
            icon={<GraduationCap className="size-4" />}
            label="专项训练"
            onClick={() => navigate(drill)}
          />
          <Shortcut
            icon={<ListCheck className="size-4" />}
            label="错题本"
            onClick={() => navigate(workspacePath(workspaceId, "/wrong-book"))}
          />
          <Shortcut
            icon={<BookOpen className="size-4" />}
            label="知识库"
            onClick={() => navigate(workspacePath(workspaceId, "/knowledge"))}
          />
          <Shortcut
            icon={<Target className="size-4" />}
            label="知识画像"
            onClick={() => navigate(workspacePath(workspaceId, "/profile"))}
          />
        </div>
      </Panel>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function Shortcut({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="secondary"
      className="h-auto justify-start gap-2 py-2.5 text-sm"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}
