import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Markdown } from "@/features/rich/Markdown";
import { InlineText } from "@/features/rich/InlineText";
import { EmptyState } from "@/components/EmptyState";
import { findPoint, questionsFor } from "@/features/knowledge";
import type { KnowledgeIndex, KnowledgePoint } from "@/features/knowledge";
import { QuestionReference } from "@/features/knowledge/QuestionReference";
import { questionTypeLabel } from "@/features/knowledge/questionTypes";
import { ContentFigures } from "@/components/ContentFigure";
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

/** The relation type as the reader sees it; unknown types are not invented. */
const RELATION_LABEL: Record<string, string> = {
  prerequisite: "前置",
  related: "相关",
  contrasts: "易混",
  extends: "延伸",
  applies: "应用",
};

/**
 * How to read one edge from this point's side.
 *
 * `prerequisite` is directional: an outgoing edge means this point is the
 * earlier one, so the neighbour is what comes next. Saying "前置" there would
 * send the reader backwards.
 */
function relationLabel(type: string, outgoing: boolean): string {
  if (type === "prerequisite") return outgoing ? "后续" : "前置";
  return RELATION_LABEL[type] ?? type;
}

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
        <EmptyState mood="curious" surface="page" title="从左侧目录选择一个知识点" />
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
  // A prerequisite is a different claim from a related point: it is what you
  // have to know first, so it gets its own block above the body rather than a
  // chip beside everything else.
  const prerequisites = point.prerequisites
    .map((id) => findPoint(index, id))
    .filter((entry): entry is KnowledgePoint => Boolean(entry));
  // Relations carry a type ("prerequisite", "related", "contrasts"), which is
  // the only thing that tells a reader whether a neighbour is behind or ahead
  // of them. A prerequisite already listed above is not repeated here.
  const prerequisiteIds = new Set(point.prerequisites);
  const edges = index.view.relations
    .filter((relation) => relation.from === point.id || relation.to === point.id)
    .map((relation) => ({
      relation,
      otherId: relation.from === point.id ? relation.to : relation.from,
      // An edge is outgoing when this point is its source.
      outgoing: relation.from === point.id,
    }))
    .filter(
      (edge) =>
        !prerequisiteIds.has(edge.otherId) && findPoint(index, edge.otherId),
    );

  return (
    <article className="flex select-text flex-col gap-6 px-6 py-7 sm:px-10">
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

      {prerequisites.length > 0 ? (
        <Section title="前置知识">
          <div className="flex flex-wrap gap-2">
            {prerequisites.map((entry) => (
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

      {point.summary ? (
        <Section title="概述">
          <p className="text-sm leading-7 text-foreground">
            <InlineText text={point.summary} />
          </p>
        </Section>
      ) : null}

      {point.body ? (
        // The package ships the body as Markdown with inline LaTeX, so the
        // same renderer the replies use is the right one here too.
        <div className="text-sm leading-7">
          <Markdown source={point.body} />
        </div>
      ) : null}

      {point.images.length > 0 ? (
        <Section title="配图">
          <ContentFigures images={point.images} />
        </Section>
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

      {point.commonErrors.length > 0 ? (
        <Section title="常见错误">
          <ul className="flex flex-col gap-1.5">
            {point.commonErrors.map((error) => (
              <li
                key={error}
                className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"
              >
                <span className="mt-2 size-1 shrink-0 rounded-full bg-destructive/70" />
                <span className="min-w-0">{error}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {relatedPoints.length > 0 ? (
        <Section title="相关知识点">
          <div className="flex flex-wrap gap-2">
            {relatedPoints.map((entry) => {
              // The typed edge says *how* the two are related; a bare name gives
              // the reader no reason to click.
              const edge = edges.find((candidate) => candidate.otherId === entry.id);
              return (
                <Button
                  key={entry.id}
                  size="sm"
                  variant="outline"
                  className="text-sm"
                  onClick={() => onOpenPoint(entry.id)}
                >
                  {entry.name}
                  {edge ? (
                    <span className="text-muted-foreground">
                      {relationLabel(edge.relation.type, edge.outgoing)}
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </div>
        </Section>
      ) : null}

      <Section title="相关题目">
        {related.length > 0 ? (
          // A reference the reader cannot click is just a number. Each question
          // opens in place, so reading a point and checking the problems it is
          // examined with do not need a trip to the drill page.
          <div className="flex flex-wrap gap-2">
            {related.map((question) => (
              <QuestionReference
                key={question.id}
                id={question.id}
                hint={questionTypeLabel(question.questionType)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            mood="thinking"
            title="这个知识点还没有配题"
            size="size-16"
          />
        )}
      </Section>
    </article>
  );
}
