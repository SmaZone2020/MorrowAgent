import { useEffect, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import {
  ArrowUturnCcwLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  TrashBin,
} from "@gravity-ui/icons";
import type { ConversationSummary } from "@/features/lumi/history";

interface ConversationListProps {
  list: ConversationSummary[];
  activeId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (conversationId: string) => void;
  onCreate: () => void;
  onRename: (conversationId: string, title: string) => void;
  onDelete: (conversationId: string) => void;
}

/** "刚刚" / "3 小时前" / "11-08", the precision a history list actually needs. */
export function relativeTime(timestamp: number): string {
  const elapsed = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) return "刚刚";
  if (elapsed < hour) return `${Math.floor(elapsed / minute)} 分钟前`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)} 小时前`;
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)} 天前`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, "0")}`;
}

export function ConversationList({
  list,
  activeId,
  open,
  onToggle,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: ConversationListProps) {
  // Nothing to show and nothing to fold: the transcript takes the whole width.
  // Hiding it also covers the first launch, where the first message creates the
  // first conversation.
  if (list.length === 0) return null;

  return (
    // One container that animates its width, instead of swapping two trees: the
    // transcript slides over rather than jumping when the rail is folded.
    <aside
      className="relative h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none"
      style={{ width: open ? 240 : 52 }}
    >
      <div
        aria-hidden={!open}
        className={`flex h-full w-56 flex-col gap-2 pt-4 pr-3 pl-3 transition-opacity duration-150 sm:pl-5 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="min-w-0 flex-1 justify-center gap-1.5"
            onClick={onCreate}
          >
            <Plus className="size-4" />
            新对话
          </Button>
          <Tooltip content="收起会话历史" side="left">
            <Button
              size="sm"
              variant="ghost"
              aria-label="收起会话历史"
              className="size-8 shrink-0 rounded-lg p-0"
              onClick={onToggle}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </Tooltip>
        </div>

        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {list.map((entry) => (
            <ConversationRow
              key={entry.id}
              entry={entry}
              active={entry.id === activeId}
              onSelect={() => onSelect(entry.id)}
              onRename={(title) => onRename(entry.id, title)}
              onDelete={() => onDelete(entry.id)}
            />
          ))}
        </div>
      </div>

      {/* Folded rail: only the two actions, so the transcript gets the width. */}
      <div
        aria-hidden={open}
        className={`absolute inset-y-0 left-0 flex w-10 flex-col items-center gap-1 pt-4 pl-3 transition-opacity duration-150 sm:pl-5 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <Tooltip content="会话历史" side="right">
          <Button
            size="sm"
            variant="ghost"
            aria-label="展开会话历史"
            className="size-9 rounded-xl p-0"
            onClick={onToggle}
          >
            <ChevronRight className="size-4" />
          </Button>
        </Tooltip>
        <Tooltip content="新对话" side="right">
          <Button
            size="sm"
            variant="ghost"
            aria-label="新对话"
            className="size-9 rounded-xl p-0"
            onClick={onCreate}
          >
            <Plus className="size-4" />
          </Button>
        </Tooltip>
      </div>
    </aside>
  );
}

function ConversationRow({
  entry,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  entry: ConversationSummary;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.title);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(entry.title);
  }, [editing, entry.title]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== entry.title) onRename(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg bg-muted/60 px-2 py-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(entry.title);
              setEditing(false);
            }
          }}
          aria-label="会话标题"
          className="w-full rounded-md bg-card px-1.5 py-1 text-sm text-foreground outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    );
  }

  return (
    <div
      className={`group/row flex items-center gap-1 rounded-lg pr-1 transition-colors ${
        active ? "bg-muted" : "hover:bg-muted/50"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={`w-full truncate text-sm ${
            active ? "font-medium text-foreground" : "text-foreground/85"
          }`}
        >
          {entry.title || "未命名会话"}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {relativeTime(entry.updatedAt)}
        </span>
      </button>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            className="size-7 rounded-md p-0 text-destructive"
            aria-label="确认删除"
            onClick={onDelete}
          >
            <TrashBin className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-7 rounded-md p-0"
            aria-label="取消删除"
            onClick={() => setConfirming(false)}
          >
            <ArrowUturnCcwLeft className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
          <Button
            size="sm"
            variant="ghost"
            className="size-7 rounded-md p-0"
            aria-label="重命名"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-7 rounded-md p-0"
            aria-label="删除会话"
            onClick={() => setConfirming(true)}
          >
            <TrashBin className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
