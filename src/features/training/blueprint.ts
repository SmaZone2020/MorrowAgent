import type { Question } from "@/features/knowledge";

/**
 * Choosing the questions for a diagnostic paper (MLPS §11).
 *
 * The spec is explicit that coverage must not be random. So the paper is built
 * in passes: the first pass takes one question per knowledge point, the later
 * passes widen the points that still have room, easiest first. A point with one
 * question therefore appears once even if another point has ten, which is what
 * makes the result a survey rather than a drill.
 */
export interface DiagnosticPlan {
  questions: Question[];
  /** Points the paper actually touches. */
  covered: string[];
  /** Points with no question in the package, so no paper can test them. */
  missing: string[];
}

export interface DiagnosticOptions {
  /** How many questions the paper should hold. */
  limit: number;
  /** Restrict the survey to these points; omit for the whole package. */
  pointIds?: string[];
}

function primaryPoint(question: Question): string {
  return question.knowledgeTags[0] ?? "";
}

/** Easiest first, then by id, so the same package always builds one paper. */
function byDifficulty(a: Question, b: Question): number {
  if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
  return a.id.localeCompare(b.id);
}

export function buildDiagnostic(
  questions: Question[],
  options: DiagnosticOptions,
): DiagnosticPlan {
  const limit = Math.max(0, options.limit);
  const wanted = options.pointIds
    ? new Set(options.pointIds)
    : new Set(questions.map(primaryPoint).filter(Boolean));

  // Questions whose primary point is outside the survey would contribute a
  // coverage claim the paper cannot support.
  const pool = questions
    .filter((question) => wanted.has(primaryPoint(question)))
    .sort(byDifficulty);

  const buckets = new Map<string, Question[]>();
  for (const question of pool) {
    const point = primaryPoint(question);
    const bucket = buckets.get(point) ?? [];
    bucket.push(question);
    buckets.set(point, bucket);
  }

  const picked: Question[] = [];
  const taken = new Set<string>();
  // A stable point order keeps the paper reproducible across launches.
  const order = [...buckets.keys()].sort();

  // Pass one: one question per point, so coverage comes before depth.
  for (const point of order) {
    if (picked.length >= limit) break;
    const [first] = buckets.get(point) ?? [];
    if (!first) continue;
    picked.push(first);
    taken.add(first.id);
  }

  // Later passes: widen points that still have questions left, again in the
  // same stable order so the paper never depends on a hash map's iteration.
  let round = 1;
  while (picked.length < limit) {
    let added = false;
    for (const point of order) {
      if (picked.length >= limit) break;
      const next = buckets.get(point)?.[round];
      if (!next || taken.has(next.id)) continue;
      picked.push(next);
      taken.add(next.id);
      added = true;
    }
    if (!added) break;
    round += 1;
  }

  const covered = [...new Set(picked.map(primaryPoint))].sort();
  const missing = [...wanted].filter((point) => !buckets.has(point)).sort();

  return { questions: picked, covered, missing };
}
