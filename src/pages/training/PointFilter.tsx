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
 * The drill's knowledge-point filter, drawn as beUI's multi-select.
 *
 * It used to be one ghost button per point; with 72 of them that wrapped into a
 * wall of chips taller than the question card. A multi-select keeps the same
 * freedom — any number of points, or none for everything — inside one field:
 * chosen points become removable tokens, typing narrows by name, and the list is
 * grouped the way the knowledge base is.
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
  // keeps the field from showing a token with no label.
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
      <MultiSelectTrigger className="min-h-9 w-full max-w-md py-1">
        <MultiSelectValue placeholder="全部题目" chipClassName="text-sm" />
        <MultiSelectInput aria-label="按知识点筛选" className="h-7" />
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
                  className="py-1.5"
                >
                  <span className="truncate text-sm">{point.name}</span>
                </MultiSelectItem>
              ))}
            </MultiSelectGroup>
          ))}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  );
}
