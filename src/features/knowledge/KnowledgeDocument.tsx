import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Markdown } from "@/features/rich/Markdown";
import { findPoint, questionsFor } from "@/features/knowledge";
import type { KnowledgeIndex, KnowledgePoint } from "@/features/knowledge";
import { workspacePath } from "@/app/navigation";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";

const IMPORTANCE: Record<
  string,
  { label: string; status: "danger" | "warning" | "neutral" }
> = {
  critical: { label: "必考", status: "danger" },
  high: { label: "高频", status: "warning" },
  medium: { label: "常考", status: "neutral" },
  low: { label: "了解", status: "neutral" },
};

/** The package stores 1–5; the label is a reading aid, not a score. */
const DIFFICULTY: Record<number, string> = {
  1: "入门",
  2: "基础",
  3: "中等",
  4: "较难",
  5: "综合",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-serif text-sm font-semibold text-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The reading pane: one knowledge point rendered as a short document. */
export function KnowledgeDocument({
  index,
  pointId,
  onOpenPoint,
}: {
  index: KnowledgeIndex;
  pointId: string | null;
  onOpenPoint: (id: string) => void;
}) {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const point: KnowledgePoint | undefined = pointId
    ? findPoint(index, pointId)
    : undefined;

  if (!point) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          从左侧目录选择一个知识点。
        </p>
      </div>
    );
  }

  const badge = IMPORTANCE[point.examImportance] ?? {
    label: "了解",
    status: "neutral" as const,
  };
  const related = questionsFor(index, point.id);
  const relatedPoints = point.related
    .map((id) => findPoint(index, id))
    .filter((entry): entry is KnowledgePoint => Boolean(entry));

  return (
    <article className="flex flex-col gap-6 px-6 py-7 sm:px-10">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="Siyuan text-2xl font-semibold tracking-tight text-foreground">
            {point.name}
          </h1>
          <AnimatedBadge
            status={badge.status}
            size="sm"
            contentKey={`${point.id}-${point.examImportance}`}
          >
            {badge.label}
          </AnimatedBadge>
          <AnimatedBadge
            status="neutral"
            size="sm"
            contentKey={`${point.id}-d${point.difficulty}`}
          >
            {DIFFICULTY[point.difficulty] ?? `难度 ${point.difficulty}`}
          </AnimatedBadge>
        </div>
        {related.length > 0 ? (
          <div>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() =>
                navigate(
                  `${workspacePath(workspaceId, "/drill")}?point=${point.id}`,
                )
              }
            >
              练这个知识点
            </Button>
          </div>
        ) : null}
      </header>

      {point.summary ? (
        <Section title="概述">
          <p className="text-sm leading-7 text-foreground">{point.summary}</p>
        </Section>
      ) : null}

      {point.body ? (
        // The package ships the body as Markdown with inline LaTeX, so the
        // same renderer the replies use is the right one here too.
        <div className="text-sm leading-7">
          <Markdown source={point.body} />
        </div>
      ) : null}

      {point.objectives.length > 0 ? (
        <Section title="学习目标">
          <ul className="flex flex-col gap-1.5">
            {point.objectives.map((objective) => (
              <li
                key={objective}
                className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"
              >
                <span className="mt-2 size-1 shrink-0 rounded-full bg-accent-foreground/40" />
                <span className="min-w-0">{objective}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {relatedPoints.length > 0 ? (
        <Section title="相关知识点">
          <div className="flex flex-wrap gap-2">
            {relatedPoints.map((entry) => (
              <Button
                key={entry.id}
                size="sm"
                variant="outline"
                className="text-sm"
                onClick={() => onOpenPoint(entry.id)}
              >
                {entry.name}
              </Button>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="相关题目">
        <AnimatedBadge
          status={related.length > 0 ? "info" : "neutral"}
          size="sm"
          contentKey={related.length}
        >
          {related.length > 0 ? `${related.length} 道` : "暂无题目"}
        </AnimatedBadge>
      </Section>
    </article>
  );
}
