import { Fragment, useState } from "react";
import { FileText } from "@gravity-ui/icons";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { Modal } from "@/components/Modal";
import { QuestionPreview } from "@/features/knowledge/QuestionPreview";
import {
  referenceLabel,
  splitReferences,
} from "@/features/knowledge/reference";
import { useKnowledgeOptional } from "@/features/workspace/WorkspaceContext";

/**
 * `@calculus.limit.q.000001` as a chip.
 *
 * The full id is unreadable in a sentence, so the chip shows the question
 * number and the tooltip says which question it is. Clicking opens the
 * question itself: a reference is a pointer, and the reader wants to see the
 * problem rather than a longer id.
 */
export function QuestionReference({ id }: { id: string }) {
  const index = useKnowledgeOptional();
  const question = index?.questionsById.get(id);
  const [open, setOpen] = useState(false);

  // Only a question the package actually ships becomes a chip. An id that does
  // not resolve — a typo, a question dropped by an update, or no package at all
  // — is left as the text the author wrote: no dead badge, no empty modal.
  if (!question) return <>@{id}</>;

  return (
    <>
      <Tooltip content={id} side="top">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mx-0.5 inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 align-baseline text-[0.92em] font-medium text-foreground outline-none transition-colors hover:border-border-strong hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileText aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate tabular-nums">{referenceLabel(id)}</span>
        </button>
      </Tooltip>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`题目 ${referenceLabel(id)}`}
        width="lg"
        bodyClassName="max-h-[75vh]"
      >
        <QuestionPreview question={question} />
      </Modal>
    </>
  );
}

/**
 * Plain text with its question references as chips.
 *
 * A user turn is what they typed, not Markdown: turning `*5*` into italics
 * would rewrite their words. Only the `@id` runs are lifted out, so a message
 * that cites a question can be opened from either side of the conversation.
 */
export function TextWithReferences({ text }: { text: string }) {
  return (
    <>
      {splitReferences(text).map((segment, index) =>
        segment.kind === "reference" ? (
          <QuestionReference key={index} id={segment.id} />
        ) : (
          <Fragment key={index}>{segment.value}</Fragment>
        ),
      )}
    </>
  );
}
