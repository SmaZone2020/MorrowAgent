import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Magnifier } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { MathText } from "@/components/MathText";
import {
  chapters,
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

const FALLBACK_BADGE = { label: "了解", status: "neutral" as const };

function PointRow({ point }: { point: KnowledgePoint }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const badge = IMPORTANCE[point.examImportance] ?? FALLBACK_BADGE;
  const related = questionsFor(point.id).length;

  return (
    <li className="border-b border-border/60 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {point.name}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {related} 题
        </span>
        <AnimatedBadge
          status={badge.status}
          size="sm"
          contentKey={`${point.id}-${point.examImportance}`}
          className="shrink-0"
        >
          {badge.label}
        </AnimatedBadge>
      </button>

      {open ? (
        <div className="flex flex-col gap-2 px-1 pb-3">
          <MathText className="text-sm leading-6 text-muted-foreground">
            {point.description}
          </MathText>
          {point.objectives.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {point.objectives.map((objective) => (
                <li
                  key={objective}
                  className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"
                >
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent-foreground/40" />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {related > 0 ? (
            <div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(`/training/drill?point=${point.id}`)}
              >
                练这个知识点
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function KnowledgePage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chapters;
    return chapters
      .map((chapter) => ({
        ...chapter,
        points: chapter.points.filter(
          (point) =>
            point.name.toLowerCase().includes(needle) ||
            point.description.toLowerCase().includes(needle),
        ),
      }))
      .filter((chapter) => chapter.points.length > 0);
  }, [query]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      <Input
        value={query}
        onChange={setQuery}
        placeholder="搜索知识点"
        leftIcon={<Magnifier className="size-4" />}
        spellCheck={false}
        autoComplete="off"
      />

      {filtered.length === 0 ? (
        <Panel title="知识库">
          <p className="py-4 text-sm text-muted-foreground">没有匹配的知识点。</p>
        </Panel>
      ) : (
        filtered.map((chapter) => (
          <Panel
            key={chapter.id}
            title={chapter.name}
            action={
              <AnimatedBadge
                status="neutral"
                size="sm"
                contentKey={`${chapter.id}-${chapter.version}`}
              >
                v{chapter.version}
              </AnimatedBadge>
            }
          >
            <ul className="flex flex-col">
              {chapter.points.map((point) => (
                <PointRow key={point.id} point={point} />
              ))}
            </ul>
          </Panel>
        ))
      )}
    </div>
  );
}
