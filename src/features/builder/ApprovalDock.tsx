import { useState } from "react";
import { ChevronDown, Pencil, Plus, Terminal } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import type { ToolCall } from "@/features/settings/aiBridge";
import { parseArguments } from "@/features/lumi/toolArgs";
import { TOOL_LABEL } from "@/features/builder/toolDefs";

/**
 * The approvals one parked turn is waiting on.
 *
 * It floats above the composer rather than sitting in the transcript: the
 * decision is about the next action, not about history, and a card that scrolls
 * away with the conversation is a card the user has to hunt for. Being absolute
 * also means granting permission never shifts the transcript under the reader.
 *
 * Collapsed, it is one line — the count and a chevron. That is deliberate: a
 * build can queue a dozen writes, and a permanent wall of file bodies above the
 * composer would leave no room to type.
 */

/** How much of a file body or a command is shown before the row gets long. */
const PREVIEW_CHARS = 400;

const CALL_ICON: Record<string, typeof Plus> = {
  file_write: Plus,
  file_edit: Pencil,
  shell: Terminal,
};

function truncate(value: string): string {
  const text = value.trim();
  if (text.length <= PREVIEW_CHARS) return text;
  return `${text.slice(0, PREVIEW_CHARS)}\n…（还有 ${text.length - PREVIEW_CHARS} 个字符）`;
}

/**
 * The one line that says what the call will touch.
 *
 * It names the path or the command rather than the tool, because that is the
 * decision: "write manifest.yaml" is something a user can judge, "file_write"
 * is not.
 */
function callSubject(call: ToolCall): string {
  const args = parseArguments(call.arguments);
  if (call.name === "shell") {
    const command = typeof args.command === "string" ? args.command : "";
    return command.split("\n")[0] ?? "";
  }
  const path = typeof args.path === "string" ? args.path : "";
  return path || "（未指定路径）";
}

/** What is being written, or the exact text being replaced. */
function CallDetail({ call }: { call: ToolCall }) {
  const args = parseArguments(call.arguments);

  if (call.name === "shell") {
    const command = typeof args.command === "string" ? args.command : "";
    return (
      <pre className="scrollbar-thin max-h-32 overflow-auto rounded-lg bg-muted/60 p-2 font-mono text-xs whitespace-pre-wrap text-foreground/90">
        {truncate(command)}
      </pre>
    );
  }

  if (call.name === "file_edit") {
    const oldString = typeof args.oldString === "string" ? args.oldString : "";
    const newString = typeof args.newString === "string" ? args.newString : "";
    return (
      <div className="flex flex-col gap-1.5">
        <pre className="scrollbar-thin max-h-24 overflow-auto rounded-lg bg-destructive/10 p-2 font-mono text-xs whitespace-pre-wrap text-foreground/90">
          - {truncate(oldString)}
        </pre>
        <pre className="scrollbar-thin max-h-24 overflow-auto rounded-lg bg-success/10 p-2 font-mono text-xs whitespace-pre-wrap text-foreground/90">
          + {truncate(newString)}
        </pre>
      </div>
    );
  }

  const content = typeof args.content === "string" ? args.content : "";
  if (!content) return null;
  return (
    <pre className="scrollbar-thin max-h-32 overflow-auto rounded-lg bg-muted/60 p-2 font-mono text-xs whitespace-pre-wrap text-foreground/90">
      {truncate(content)}
    </pre>
  );
}

export function ApprovalDock({
  calls,
  onDecide,
}: {
  /** The calls still waiting; the dock is not rendered when this is empty. */
  calls: ToolCall[];
  /** `always` switches the session to the autonomous tier and allows the rest. */
  onDecide: (callId: string, decision: "allow" | "deny" | "always") => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // One expanded row at a time: a dozen open file bodies is not review, it is a
  // wall the user scrolls past to reach the buttons.
  const [openId, setOpenId] = useState<string | null>(null);

  if (calls.length === 0) return null;

  return (
    <div className="absolute inset-x-0 bottom-full z-20 mb-2 flex justify-center px-1">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-surface">
        <div className="flex items-center gap-2 px-3 py-2">
          <AnimatedBadge status="warning" size="sm" contentKey="approval">
            待审批
          </AnimatedBadge>
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
            {calls.length === 1
              ? `${TOOL_LABEL[calls[0]!.name] ?? "操作"}需要你的同意`
              : `${calls.length} 个操作等你同意`}
          </span>
          <Button
            size="sm"
            variant="ghost"
            aria-label={collapsed ? "展开审批" : "收起审批"}
            aria-expanded={!collapsed}
            className="size-7 shrink-0 rounded-full p-0"
            onClick={() => setCollapsed((current) => !current)}
          >
            <ChevronDown
              className={`size-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {collapsed ? null : (
          <>
            <div className="scrollbar-thin flex max-h-[45vh] flex-col gap-1 overflow-y-auto border-t border-border/70 px-2 py-2">
              {calls.map((call) => {
                const Icon = CALL_ICON[call.name] ?? Plus;
                const open = openId === call.id;
                return (
                  <div key={call.id} className="rounded-xl px-1 py-1 hover:bg-muted/40">
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : call.id)}
                        aria-expanded={open}
                        className="flex min-w-0 flex-1 items-baseline gap-2 rounded-md text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {TOOL_LABEL[call.name] ?? "执行操作"}
                        </span>
                        <span className="min-w-0 truncate font-mono text-xs text-foreground/90">
                          {callSubject(call)}
                        </span>
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 px-2 text-sm text-destructive"
                        onClick={() => onDecide(call.id, "deny")}
                      >
                        拒绝
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 shrink-0 px-2.5 text-sm"
                        onClick={() => onDecide(call.id, "allow")}
                      >
                        允许
                      </Button>
                    </div>
                    {open ? (
                      <div className="mt-1.5 pl-5.5">
                        <CallDetail call={call} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 px-3 py-2">
              <span className="mr-auto text-xs text-muted-foreground">
                拒绝会把理由作为工具结果交回给助手。
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-sm"
                onClick={() => onDecide(calls[0]!.id, "always")}
              >
                始终允许
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
