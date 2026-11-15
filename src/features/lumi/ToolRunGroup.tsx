import { useState } from "react";
import { ChevronDown, Wrench } from "@gravity-ui/icons";
import { AgentDisclosure } from "@/vendor/beui/components/agents/agent-disclosure";
import {
  ToolResult,
  ToolResultOutput,
} from "@/vendor/beui/components/agents/tool-result";
import type { ConversationTurn } from "@/features/lumi/conversationTurn";

/**
 * Consecutive tool results, shown as one line.
 *
 * A build that reads forty files is not forty facts the reader wants: the rows
 * repeat the same title and push the reply off screen. The run folds into one
 * sentence — what was used, and how many times — and the rows stay one click
 * away, because "which file did it read" is a real question.
 */

/** How each tool reads in the result row's title slot. */
export type ToolLabels = Record<string, string>;

export function toolTitle(name: string, labels: ToolLabels): string {
  return labels[name] ?? "工具调用";
}

/** 「A、B和C」，与正文里的顿号一致。 */
function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join("、")}和${labels.at(-1)}`;
}

/** A tool result is not something the user said, so it is not a bubble. */
export function ToolTurnRow({
  turn,
  name,
  labels,
}: {
  turn: ConversationTurn;
  name: string;
  labels: ToolLabels;
}) {
  return (
    <ToolResult
      tool={name}
      title={toolTitle(name, labels)}
      status="success"
      kind="custom"
      className="text-foreground"
      // Folded by default: the output is evidence, not the answer. It stays one
      // click away because "which file did it read" is a real question.
      defaultOpen={false}
      // No actions of its own: the message row above owns them, and a second
      // trash icon here would delete half a tool round.
    >
      <ToolResultOutput language="text">{turn.content}</ToolResultOutput>
    </ToolResult>
  );
}

export function ToolRunGroup({
  turns,
  names,
  labels,
}: {
  /** The result rows of the run, in order. */
  turns: ConversationTurn[];
  /** Tool names by call id; a result row only knows itself by id. */
  names: Record<string, string>;
  labels: ToolLabels;
}) {
  const [open, setOpen] = useState(false);
  const distinct = [
    ...new Set(turns.map((turn) => toolTitle(names[turn.toolCallId!] ?? "", labels))),
  ];

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="group flex min-h-9 w-full items-center gap-2 rounded-md py-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="grid size-4 shrink-0 place-items-center text-muted-foreground"
        >
          <Wrench className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="text-muted-foreground">使用了 </span>
          <span className="font-medium text-foreground/90">
            {turns.length} 个{" "}
          </span>
          <span className="font-medium text-foreground/90">
            {joinLabels(distinct)}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AgentDisclosure open={open}>
        <div className="flex flex-col gap-0.5 pt-1">
          {turns.map((turn) => (
            <ToolTurnRow
              key={turn.id}
              turn={turn}
              name={names[turn.toolCallId!] ?? ""}
              labels={labels}
            />
          ))}
        </div>
      </AgentDisclosure>
    </div>
  );
}
