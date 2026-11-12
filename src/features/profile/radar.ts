import type { KnowledgeChapter, KnowledgePoint } from "@/features/knowledge";
import type { Mastery } from "@/features/training/mastery";

/** How many chapters the radar can show before the axes stop being readable. */
export const RADAR_AXES = 8;

export interface RadarAxis {
  chapterId: string;
  /** Shortened for the axis label; the full name stays in the tooltip. */
  label: string;
  name: string;
  /** 0–100, the mean of the chapter's points. */
  value: number;
  /** Points with at least one attempt; 0 means the axis is a guess. */
  tested: number;
  total: number;
}

/**
 * The chapters worth drawing.
 *
 * A radar with thirteen axes is a starburst, not a chart, so the axes are the
 * chapters the exam weighs most: critical first, then high, then the rest in
 * authored order. That is also the order a learner should fix them in.
 */
export function pickChapters(
  chapters: KnowledgeChapter[],
  points: KnowledgePoint[],
  limit = RADAR_AXES,
): KnowledgeChapter[] {
  const importance = new Map(points.map((point) => [point.id, point.examImportance]));
  const weight = (chapter: KnowledgeChapter) => {
    let critical = 0;
    let high = 0;
    for (const id of chapter.pointIds) {
      const level = importance.get(id);
      if (level === "critical") critical += 1;
      else if (level === "high") high += 1;
    }
    return critical * 2 + high;
  };

  return chapters
    .map((chapter, index) => ({ chapter, index, weight: weight(chapter) }))
    // Ties keep the package's own order, so the chart is stable between reads.
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.chapter);
}

/** An axis label has to fit in the ring without overlapping its neighbour. */
export function shortLabel(name: string): string {
  // Chapter titles usually carry an ordinal prefix ("第二章", "一、"); it is
  // noise on a radar, so it is dropped before the length cut.
  const stripped = name
    .replace(/^第[一二三四五六七八九十百\d]+[章节、.．\s]+/, "")
    .replace(/^[一二三四五六七八九十]+[、.．]\s*/, "");
  const base = stripped || name;
  return base.length <= 6 ? base : `${base.slice(0, 6)}…`;
}

/**
 * One axis per chapter: the mean mastery of its points.
 *
 * A never-tested point contributes zero rather than being skipped. Skipping it
 * would make an untouched chapter look strong — the chapter with the most
 * unknowns would score highest — which is exactly backwards.
 */
export function chapterAxes(
  chapters: KnowledgeChapter[],
  masteries: Mastery[],
  points: KnowledgePoint[],
  limit = RADAR_AXES,
): RadarAxis[] {
  const byPoint = new Map(masteries.map((entry) => [entry.pointId, entry]));
  const known = new Set(points.map((point) => point.id));

  return pickChapters(chapters, points, limit)
    .map((chapter) => {
      // The denominator is the chapter's real size, not the number of points
      // that happen to have a tally: an unanswered point is a zero, and leaving
      // it out would raise the average of the chapters with the most gaps.
      const ids = chapter.pointIds.filter((id) => known.has(id));
      const total = ids.length;
      const tested = ids.filter((id) => (byPoint.get(id)?.attempts ?? 0) > 0).length;
      const value =
        total === 0
          ? 0
          : Math.round(
              ids.reduce((sum, id) => sum + (byPoint.get(id)?.score ?? 0), 0) /
                total,
            );
      return {
        chapterId: chapter.id,
        label: shortLabel(chapter.name),
        name: chapter.name,
        value,
        tested,
        total,
      };
    })
    .filter((axis) => axis.total > 0);
}
