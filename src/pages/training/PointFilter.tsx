import { useMemo } from "react";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectGroup,
  MultiSelectInput,
  MultiSelectItem,
  MultiSelectLabel,
  MultiSelectList,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/vendor/beui/components/motion/multi-select";
import type { KnowledgeIndex } from "@/features/knowledge";

/**
 * How many points may be selected at once.
 *
 * The field has to stay one line in the breadcrumb bar, and a chip per point is
 * what makes it grow. Three is also the honest limit of the feature: filtering
 * the drill by four or more points is the same reading as "all questions", and
 * picking that many is a sign the filter was not the tool being looked for.
 */
const MAX_POINTS = 3;

/**
 * The drill's knowledge-point filter, drawn as beUI's multi-select.
 *
 * It used to be one ghost button per point; with 72 of them that wrapped into a
 * wall of chips taller than the question card. A multi-select keeps the same
 * freedom — any number of points, or none for everything — inside one field:
 * typing narrows by name and the list is grouped the way the knowledge base is.
 *
 * The cap is enforced on the list rather than on the field, so the reason is
 * visible at the moment a fourth point is wanted: once three are chosen, the
 * remaining rows are disabled and the list says why.
 */
export function PointFilter({
  index,
  selected,
  onChange,
}: {
  index: KnowledgeIndex;
  /** The filtered point ids; empty means every question. */
  selected: string[];
  onChange: (pointIds: string[]) => void;
}) {
  // An id from a link into a repacked package may no longer exist; dropping it
  // keeps the field from showing a chip with no label.
  const validSelected = useMemo(
    () => selected.filter((id) => index.pointsById.has(id)),
    [index, selected],
  );

  const groups = useMemo(() => {
    const claimed = new Set<string>();
    const chapters = index.view.chapters.map((chapter) => {
      const points = chapter.pointIds.flatMap((id) => {
        claimed.add(id);
        const point = index.pointsById.get(id);
        return point ? [point] : [];
      });
      return { id: chapter.id, name: chapter.name, points };
    });
    // Points outside every chapter still need a group to live in.
    const loose = index.view.points.filter((point) => !claimed.has(point.id));
    if (loose.length > 0) {
      chapters.push({ id: "__loose", name: "其他", points: loose });
    }
    return chapters;
  }, [index]);

  const full = validSelected.length >= MAX_POINTS;

  return (
    <MultiSelect
      value={validSelected}
      onValueChange={onChange}
      labels={{
        valuePlaceholder: "全部题目",
        removeValue: "移除 {label}",
        inputLabel: "按知识点筛选",
        inputPlaceholder: "搜索知识点…",
        listLabel: "知识点",
        empty: "没有匹配的知识点",
      }}
    >
      {/* One line, always: the row is `nowrap` and each chip may shrink, so a
          third long name truncates instead of pushing the input onto a second
          line and the bar taller. */}
      <MultiSelectTrigger className="min-h-8 w-80 min-w-0 overflow-hidden rounded-lg py-0.5 [&>div]:flex-nowrap">
        <MultiSelectValue
          placeholder="全部题目"
          chipClassName="min-w-0 text-sm"
        />
        <MultiSelectInput
          aria-label="按知识点筛选"
          placeholder="全部题目"
          className="h-6"
        />
      </MultiSelectTrigger>

      <MultiSelectContent className="rounded-2xl">
        <MultiSelectList ariaLabel="知识点" className="max-h-80 p-1.5">
          <MultiSelectEmpty>没有匹配的知识点</MultiSelectEmpty>
          {groups.map((group) => (
            <MultiSelectGroup key={group.id}>
              <MultiSelectLabel>{group.name}</MultiSelectLabel>
              {group.points.map((point) => (
                <MultiSelectItem
                  key={point.id}
                  value={point.id}
                  textValue={point.name}
                  // Already chosen rows stay enabled so they can be removed;
                  // only adding a fourth is refused.
                  disabled={full && !validSelected.includes(point.id)}
                  className="py-1.5"
                >
                  <span className="truncate text-sm">{point.name}</span>
                </MultiSelectItem>
              ))}
            </MultiSelectGroup>
          ))}
        </MultiSelectList>
        {full ? (
          <p className="border-t border-border/60 px-3 py-2 text-sm text-muted-foreground">
            最多同时筛选 {MAX_POINTS} 个知识点，先移除一个再选。
          </p>
        ) : null}
      </MultiSelectContent>
    </MultiSelect>
  );
}
