import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { InfoHint } from "@/components/InfoHint";
import { MathText } from "@/components/MathText";
import { ContentFigures } from "@/components/ContentFigure";
import {
  findPoint,
  imagesAt,
  questionsFor,
  type KnowledgePoint,
} from "@/features/knowledge";

const IMPORTANCE: Record<
  string,
  { label: string; status: "danger" | "warning" | "neutral" }
> = {
  critical: { label: "必考", status: "danger" },
  high: { label: "高频", status: "warning" },
  medium: { label: "常考", status: "neutral" },
  low: { label: "了解", status: "neutral" },
};

const DIFFICULTY: Record<string, string> = {
  basic: "基础",
  medium: "中等",
  harder: "较难",
  advanced: "综合",
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
  pointId,
  onOpenPoint,
}: {
  pointId: string | null;
  onOpenPoint: (id: string) => void;
}) {
  const navigate = useNavigate();
  const point: KnowledgePoint | undefined = pointId
    ? findPoint(pointId)
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
  const related = questionsFor(point.id);
  const relatedPoints = point.related
    .map((id) => findPoint(id))
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
          <AnimatedBadge status="neutral" size="sm" contentKey={point.difficulty}>
            {DIFFICULTY[point.difficulty] ?? point.difficulty}
          </AnimatedBadge>
        </div>
        {related.length > 0 ? (
          <div>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => navigate(`/training/drill?point=${point.id}`)}
            >
              练这个知识点
            </Button>
          </div>
        ) : null}
      </header>

      <Section title="概述">
        <MathText className="text-sm leading-7 text-foreground">
          {point.description}
        </MathText>
        <ContentFigures images={imagesAt(point.images, "stem")} />
      </Section>

      {point.objectives.length > 0 ? (
        <Section title="学习目标">
          <ul className="flex flex-col gap-1.5">
            {point.objectives.map((objective) => (
              <li
                key={objective}
                className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"
              >
                <span className="mt-2 size-1 shrink-0 rounded-full bg-accent-foreground/40" />
                <MathText className="min-w-0">{objective}</MathText>
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
                <span className="mt-2 size-1 shrink-0 rounded-full bg-destructive/50" />
                <MathText className="min-w-0">{error}</MathText>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {point.difficultyBasis ? (
        <Section title="难度依据">
          <p className="flex items-start gap-1 text-sm leading-6 text-muted-foreground">
            {point.difficultyBasis}
            <InfoHint label="难度按该知识点所需的前置知识与步骤数标定。" />
          </p>
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
        <p className="text-sm text-muted-foreground">
          {related.length > 0
            ? `这个知识点下有 ${related.length} 道题。`
            : "这个知识点还没有题目。"}
        </p>
      </Section>
    </article>
  );
}
