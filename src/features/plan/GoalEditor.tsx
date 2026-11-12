import { Button } from "@/vendor/beui/components/motion/button";
import { Modal } from "@/components/Modal";
import { GoalFields } from "@/features/plan/GoalFields";
import type { StudyGoal } from "@/features/plan/types";

/**
 * The goal form, in a modal.
 *
 * On the page these were five controls of five widths stacked above the plan,
 * which made the aim look like the work. The plan is what this page is opened
 * for, so the aim is edited here and only read as a summary outside.
 */
export function GoalEditor({
  open,
  onOpenChange,
  goal,
  bandCounts,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: StudyGoal;
  /** Points per difficulty band, so the focus is chosen with the package in view. */
  bandCounts: Record<string, number>;
  onChange: (patch: Partial<StudyGoal>) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="学习目标"
      footer={
        <Button size="sm" className="text-sm" onClick={() => onOpenChange(false)}>
          完成
        </Button>
      }
    >
      <GoalFields goal={goal} bandCounts={bandCounts} onChange={onChange} />
    </Modal>
  );
}
