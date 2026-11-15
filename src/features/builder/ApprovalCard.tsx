import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/vendor/beui/components/motion/card";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Pencil, Plus, Terminal } from "@gravity-ui/icons";
import type { ToolCall } from "@/features/settings/aiBridge";
import { parseArguments } from "@/features/lumi/toolArgs";
import { TOOL_LABEL } from "@/features/builder/toolDefs";

/** How much of a file body or a command is shown before the card gets long. */
const PREVIEW_CHARS = 600;

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
  const path = typeof args.path === "string" ? args.path : "";
  if (call.name === "shell") {
    const command = typeof args.command === "string" ? args.command : "";
    return command.split("\n")[0] ?? "";
  }
  return path || "（未指定路径）";
}

/** The body: what is being written, or the exact text being replaced. */
function CallDetail({ call }: { call: ToolCall }) {
  const args = parseArguments(call.arguments);

  if (call.name === "shell") {
    const command = typeof args.command === "string" ? args.command : "";
    return (
      <pre className="scrollbar-thin max-h-52 overflow-auto rounded-xl bg-muted/60 p-3 font-mono text-sm whitespace-pre-wrap text-foreground/90">
        {truncate(command)}
      </pre>
    );
  }

  if (call.name === "file_edit") {
    const oldString = typeof args.oldString === "string" ? args.oldString : "";
    const newString = typeof args.newString === "string" ? args.newString : "";
    return (
      <div className="flex flex-col gap-2">
        <pre className="scrollbar-thin max-h-40 overflow-auto rounded-xl bg-destructive/10 p-3 font-mono text-sm whitespace-pre-wrap text-foreground/90">
          - {truncate(oldString)}
        </pre>
        <pre className="scrollbar-thin max-h-40 overflow-auto rounded-xl bg-success/10 p-3 font-mono text-sm whitespace-pre-wrap text-foreground/90">
          + {truncate(newString)}
        </pre>
      </div>
    );
  }

  const content = typeof args.content === "string" ? args.content : "";
  if (!content) {
    return <p className="text-sm text-muted-foreground">没有正文。</p>;
  }
  return (
    <pre className="scrollbar-thin max-h-52 overflow-auto rounded-xl bg-muted/60 p-3 font-mono text-sm whitespace-pre-wrap text-foreground/90">
      {truncate(content)}
    </pre>
  );
}

/**
 * The approval one write or command needs.
 *
 * Three answers, because there are three intents: do it, do not do it, and stop
 * asking. The third is not a per-call checkbox but a switch to the other
 * permission tier — a user who wants this write to go through unquestioned
 * wants the next forty to go through too, and a card that only remembered this
 * one call would ask again on the very next file.
 */
export function ApprovalCard({
  call,
  onDecide,
}: {
  call: ToolCall;
  /** `always` switches the session to the autonomous tier and allows. */
  onDecide: (decision: "allow" | "deny" | "always") => void;
}) {
  const Icon = CALL_ICON[call.name] ?? Plus;
  const label = TOOL_LABEL[call.name] ?? "执行操作";

  return (
    <Card variant="outlined" className="my-2 w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          {label}需要你的同意
        </CardTitle>
        <CardAction>
          <AnimatedBadge status="warning" size="sm" contentKey="approval">
            待审批
          </AnimatedBadge>
        </CardAction>
        <CardDescription className="break-all">
          {callSubject(call)}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <CallDetail call={call} />
      </CardContent>

      <CardFooter className="flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-sm text-destructive"
          onClick={() => onDecide("deny")}
        >
          拒绝
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="text-sm"
          onClick={() => onDecide("always")}
        >
          始终允许
        </Button>
        <Button
          size="sm"
          variant="primary"
          className="text-sm"
          onClick={() => onDecide("allow")}
        >
          允许
        </Button>
      </CardFooter>
    </Card>
  );
}
