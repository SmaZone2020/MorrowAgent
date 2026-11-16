import { useEffect, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import {
  ArrowUturnCcwLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  TrashBin,
} from "@gravity-ui/icons";
import type { ConversationSummary } from "@/features/lumi/history";
import type { ConversationGroup } from "@/features/lumi/conversationGroups";
import { usePersistedState } from "@/features/uiState/usePersistedState";
import { appScope } from "@/features/uiState/scope";

interface ConversationListProps {
  list: ConversationSummary[];
  /**
   * Groups to render. Omitted, the list is one unlabeled run — a package's own
   * page shows a single workspace, so its rail has nothing to group by.
   */
  groups?: ConversationGroup[];
  activeId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (conversationId: string) => void;
  onCreate: () => void;
  onRename: (conversationId: string, title: string) => void;
  onDelete: (conversationId: string) => void;
  /**
   * Whether to print when each conversation was last used. The build rail
   * leaves it off: grouped by folder, the order already says what is recent,
   * and the timestamp was costing a third of the title's width.
   */
  showTime?: boolean;
  /**
   * When set, only rows from this workspace can be opened; the rest are shown
   * but disabled. A conversation belongs to the folder it was started in, so
   * opening another folder's transcript would silently change what the page
   * works on — the user has to switch folders first.
   */
  openableWorkspaceId?: string;
  /** Said on a disabled row's title, e.g. which folder it belongs to. */
  disabledHint?: string;
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
  groups,
  activeId,
  open,
  onToggle,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  showTime = true,
  openableWorkspaceId,
  disabledHint = "切换到该工作区后才能打开",
}: ConversationListProps) {
  // Which groups are folded. Kept across surfaces and reloads: a user who
  // folded an old project does not want it open again on the next launch.
  const [folded, setFolded] = usePersistedState<string[]>(
    appScope("history.foldedGroups"),
    [],
  );

  // Nothing to show and nothing to fold: the transcript takes the whole width.
  // Hiding it also covers the first launch, where the first message creates the
  // first conversation.
  if (list.length === 0) return null;

  const sections: ConversationGroup[] =
    groups ?? [{ id: "", label: "", list }];

  const toggleGroup = (id: string) =>
    setFolded((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );

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
            aria-label="收起会话历史"
            className="size-8 shrink-0 rounded-lg p-0"
            onClick={onToggle}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="min-w-0 flex-1 justify-center rounded-lg gap-1.5"
            onClick={onCreate}
          >
            <Plus className="size-4" />
            新对话
          </Button>
        </div>

        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {sections.map((section) => {
            const labeled = section.label !== "";
            // The transcript on screen is in here, so the group it lives in is
            // never folded away: that would hide the row the user is reading.
            const holdsActive = section.list.some((entry) => entry.id === activeId);
            const collapsed =
              labeled && !holdsActive && folded.includes(section.id);

            return (
              <section key={section.id || "all"} className="flex flex-col gap-0.5">
                {labeled ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.id)}
                    aria-expanded={!collapsed}
                    // The header prints the leaf name only; the path is one
                    // hover away for two projects that share a name.
                    title={section.hint || section.label}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1.5 text-left text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronDown
                      className={`size-3.5 shrink-0 transition-transform duration-150 ${
                        collapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    <span className="shrink-0 tabular-nums opacity-70">
                      {section.list.length}
                    </span>
                  </button>
                ) : null}

                {collapsed
                  ? null
                  : section.list.map((entry) => (
                      <ConversationRow
                        key={entry.id}
                        entry={entry}
                        active={entry.id === activeId}
                        showTime={showTime ?? !labeled}
                        // Deletion is always allowed: it drops a row, it does
                        // not bind this page to another folder's transcript.
                        locked={
                          openableWorkspaceId !== undefined &&
                          entry.workspaceId !== openableWorkspaceId
                        }
                        disabledHint={disabledHint}
                        onSelect={() => onSelect(entry.id)}
                        onRename={(title) => onRename(entry.id, title)}
                        onDelete={() => onDelete(entry.id)}
                      />
                    ))}
              </section>
            );
          })}
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
  showTime,
  locked,
  disabledHint,
  onSelect,
  onRename,
  onDelete,
}: {
  entry: ConversationSummary;
  active: boolean;
  showTime: boolean;
  locked: boolean;
  disabledHint: string;
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
      <div className="rounded-lg bg-muted px-2 py-1.5">
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
    // The actions are an overlay rather than a sibling: a hidden button must
    // not hold width, or every title would be truncated for a control that is
    // only there on hover. They sit on the row's own colour, so the title does
    // not show through while they fade in.
    <div
      className={`group/row relative flex items-center rounded-lg transition-colors ${
        active ? "bg-muted" : "hover:bg-muted"
      }`}
    >
      <button
        type="button"
        onClick={locked ? undefined : onSelect}
        aria-current={active ? "true" : undefined}
        aria-disabled={locked || undefined}
        title={locked ? disabledHint : showTime ? undefined : entry.title}
        // A locked row still reads as a conversation — the user needs to see
        // it exists to know to switch folders. It is only muted, not hidden.
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2 pr-2 pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          locked ? "cursor-default" : ""
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            locked
              ? "text-muted-foreground/70"
              : active
                ? "font-medium text-foreground"
                : "text-foreground/85"
          }`}
        >
          {entry.title || "未命名会话"}
        </span>
        {showTime ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {relativeTime(entry.updatedAt)}
          </span>
        ) : null}
      </button>

      {confirming ? (
        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 bg-linear-to-l from-muted from-70% to-transparent pr-1 pl-5">
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
        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 bg-linear-to-l from-muted from-70% to-transparent pr-1 pl-5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
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
