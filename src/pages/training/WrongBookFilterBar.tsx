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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/vendor/beui/components/motion/select";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  ERROR_TYPES,
  ERROR_TYPE_LABEL,
  errorTypeLabel,
} from "@/features/training/errorTypes";
import {
  TIME_RANGES,
  TIME_RANGE_LABEL,
  isFiltering,
  type TimeRange,
  type WrongBookFilter,
} from "@/features/training/wrongBookFilter";
import type { KnowledgeIndex } from "@/features/knowledge";

/**
 * The wrong book's filter bar.
 *
 * The point picker only offers points that actually have a wrong answer: a
 * filter whose every option is empty is worse than no filter. The error type is
 * a plain select rather than a multi-select because the useful question is
 * usually "which kind of mistake am I repeating", not a union of five.
 */
export function WrongBookFilterBar({
  index,
  attempts,
  filter,
  onChange,
}: {
  index: KnowledgeIndex;
  /** The unfiltered list, which is what the point options come from. */
  attempts: { knowledgePointId: string }[];
  filter: WrongBookFilter;
  onChange: (next: WrongBookFilter) => void;
}) {
  const groups = useMemo(() => {
    const present = new Set(
      attempts.map((attempt) => attempt.knowledgePointId).filter(Boolean),
    );
    const claimed = new Set<string>();
    const chapters = index.view.chapters.map((chapter) => {
      const points = chapter.pointIds.flatMap((id) => {
        claimed.add(id);
        const point = index.pointsById.get(id);
        return point && present.has(id) ? [point] : [];
      });
      return { id: chapter.id, name: chapter.name, points };
    });
    const loose = index.view.points.filter(
      (point) => !claimed.has(point.id) && present.has(point.id),
    );
    if (loose.length > 0) {
      chapters.push({ id: "__loose", name: "其他", points: loose });
    }
    // A chapter with nothing wrong in it is dropped entirely; an empty heading
    // in the picker reads as a bug.
    return chapters.filter((chapter) => chapter.points.length > 0);
  }, [attempts, index]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelect
        value={filter.pointIds}
        onValueChange={(pointIds) => onChange({ ...filter, pointIds })}
        labels={{
          valuePlaceholder: "全部知识点",
          removeValue: "移除 {label}",
          inputLabel: "按知识点筛选",
          inputPlaceholder: "搜索知识点…",
          listLabel: "知识点",
          empty: "没有匹配的知识点",
        }}
      >
        <MultiSelectTrigger className="min-h-9 w-full max-w-xs py-1">
          <MultiSelectValue placeholder="全部知识点" chipClassName="text-sm" />
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

      <Select
        value={filter.errorType === null ? "any" : filter.errorType || "none"}
        onValueChange={(value) =>
          onChange({
            ...filter,
            errorType: value === "any" ? null : value === "none" ? "" : value,
          })
        }
      >
        <SelectTrigger className="w-40 rounded-xl py-1.5 text-sm">
          <span className="truncate text-foreground">
            {filter.errorType === null
              ? "全部错误类型"
              : errorTypeLabel(filter.errorType)}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">全部错误类型</SelectItem>
          {ERROR_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {ERROR_TYPE_LABEL[type]}
            </SelectItem>
          ))}
          {/* Unclassified is a real answer to "why did I miss this", so it is
              filterable rather than hidden among the named reasons. */}
          <SelectItem value="none">未标注原因</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filter.range}
        onValueChange={(value) =>
          onChange({ ...filter, range: value as TimeRange })
        }
      >
        <SelectTrigger className="w-32 rounded-xl py-1.5 text-sm">
          <span className="text-foreground">{TIME_RANGE_LABEL[filter.range]}</span>
        </SelectTrigger>
        <SelectContent>
          {TIME_RANGES.map((range) => (
            <SelectItem key={range} value={range}>
              {TIME_RANGE_LABEL[range]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isFiltering(filter) ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-sm"
          onClick={() =>
            onChange({ pointIds: [], errorType: null, range: "all" })
          }
        >
          清除筛选
        </Button>
      ) : null}
    </div>
  );
}
