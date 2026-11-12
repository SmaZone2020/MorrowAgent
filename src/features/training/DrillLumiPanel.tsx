import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { PromptInput } from "@/vendor/beui/components/agents/prompt-input";
import {
  ArrowRotateLeft,
  ChevronsCollapseUpRight,
  ChevronsExpandUpRight,
} from "@gravity-ui/icons";
import { Modal } from "@/components/Modal";
import { MessageList } from "@/features/lumi/MessageList";
import { LumiMark } from "@/features/lumi/LumiMark";
import { useBoundConversation } from "@/features/lumi/useBoundConversation";
import { useToolContext } from "@/features/lumi/useToolContext";
import { useLearnerProfile } from "@/features/lumi/useLearnerProfile";
import { useDrillConversation } from "@/features/training/drillConversation";
import { usePersistedState } from "@/features/uiState";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";
import { workspaceScope } from "@/features/uiState/scope";
import type { Question } from "@/features/knowledge";

/** What the drill card has recorded for the question on screen. */
export interface AnswerState {
  answered: boolean;
  verdict: "correct" | "wrong" | "revealed" | null;
}

/** Narrow enough for the prompt input to stay usable; wide enough for a graph. */
const MIN_WIDTH = 288;
const DEFAULT_WIDTH = 384;
const MAX_WIDTH = 760;

/** The rail must never push the question card off screen, whatever the window. */
function clampWidth(width: number) {
  const ceiling = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - 240));
  return Math.min(ceiling, Math.max(MIN_WIDTH, Math.round(width)));
}

/**
 * The question on screen, referenced by id instead of pasted in.
 *
 * The rail answers questions about one card, but the whole stem is a screenful
 * of text that the user did not write: seeding the composer with it makes every
 * question look like a long quote. A `@id` reference is short, unambiguous, and
 * resolvable through the `read_question` tool, so the model still sees the real
 * stem without the user having to paste it.
 *
 * The answer state rides along as one short line. Without it the model has to
 * ask "你做了吗" before it can say anything, and with it in the user's own
 * sentence every question would start with a status report instead.
 */
export function questionSeed(
  question: Question,
  state?: AnswerState,
): string {
  const lines = [`关于 @${question.id}`];
  if (state?.answered) {
    const verdict =
      state.verdict === "correct"
        ? "判定为对"
        : state.verdict === "wrong"
          ? "判定为错"
          : "看了答案";
    lines.push(`我已作答，${verdict}。`);
  } else {
    lines.push("我还没作答。");
  }
  lines.push("", "我的问题是：");
  return lines.join("\n");
}

/**
 * Lumi beside the drill card.
 *
 * The rail keeps its own transcript (`useDrillConversation`) so a question
 * asked mid-practice never pushes the user's general study chat away, and the
 * conversation it last held is restored on open like the main Lumi page.
 *
 * Its width is dragged from the left edge and remembered per package; the same
 * transcript can also be lifted into a dialog when the rail is too narrow to
 * read a derivation comfortably.
 */
export function DrillLumiPanel({
  question,
  answerState,
}: {
  question?: Question;
  /** What the card on screen has recorded, so the seed can say so. */
  answerState?: AnswerState;
}) {
  useBoundConversation(useDrillConversation);
  // The rail's composer carries only `@<id>`, so the model needs the package
  // readable here too — otherwise it would answer from the id alone.
  useToolContext("drill");
  useLearnerProfile();

  const workspaceId = useWorkspaceId();
  const turns = useDrillConversation((state) => state.turns);
  const sending = useDrillConversation((state) => state.sending);
  const listLoaded = useDrillConversation((state) => state.listLoaded);
  const send = useDrillConversation((state) => state.send);
  const stop = useDrillConversation((state) => state.stop);
  const regenerate = useDrillConversation((state) => state.regenerate);
  const startNew = useDrillConversation((state) => state.startNew);
  const deleteTurn = useDrillConversation((state) => state.deleteTurn);
  const beginEdit = useDrillConversation((state) => state.beginEdit);
  const cancelEdit = useDrillConversation((state) => state.cancelEdit);
  const editingTurnId = useDrillConversation((state) => state.editingTurnId);

  const [draft, setDraft] = usePersistedState(
    workspaceScope(workspaceId, "drill.lumi.draft"),
    "",
  );
  const [storedWidth, setStoredWidth] = usePersistedState(
    workspaceScope(workspaceId, "drill.lumi.width"),
    DEFAULT_WIDTH,
  );
  // Dragging writes to local state and commits once on release: the ui-state
  // store notifies every subscriber, and a drag is a hundred pointer events.
  const [width, setWidth] = useState(() => clampWidth(storedWidth));
  const [expanded, setExpanded] = useState(false);
  const drag = useRef<{ x: number; width: number } | null>(null);

  const seed = useMemo(
    () => (question ? questionSeed(question, answerState) : ""),
    [question, answerState],
  );
  // The seed changes when the card's verdict does. A draft that is still just
  // the old seed is refreshed with it; a draft the user has edited is left
  // alone, because answering a question must never overwrite what they typed.
  const lastSeedRef = useRef(seed);

  useEffect(() => {
    if (!listLoaded) return;
    const previous = lastSeedRef.current;
    lastSeedRef.current = seed;
    if (!seed || turns.length > 0) return;
    if (draft && draft !== previous) return;
    setDraft(seed);
  }, [draft, listLoaded, seed, setDraft, turns.length]);

  const submit = (value: string) => {
    const text = value.trim();
    if (!text || sending) return;
    setDraft("");
    void send(text);
  };

  const startEdit = (turnId: string) => {
    const target = turns.find((turn) => turn.id === turnId);
    if (!target || sending) return;
    setDraft(target.content);
    beginEdit(turnId);
  };

  const clear = () => {
    setDraft(seed);
    lastSeedRef.current = seed;
    cancelEdit();
    void startNew();
  };

  const onResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width };
  };

  const onResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    // The handle is on the left edge of a right-hand rail, so moving left grows.
    setWidth(clampWidth(drag.current.width + (drag.current.x - event.clientX)));
  };

  const onResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setStoredWidth(width);
  };

  // One transcript element, rendered in exactly one place at a time: mounting
  // it twice would give the scroller two live copies of every turn and two
  // composers bound to the same draft.
  const body = (
    <>
      {/* A flex column, not a bare `flex-1`: the scroller sizes itself with
          `h-full`, which needs a parent that actually gives it a height. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {turns.length > 0 ? (
          <MessageList
            turns={turns}
            onRetry={() => void regenerate()}
            onDelete={(turnId) => {
              if (turnId === editingTurnId) cancelEdit();
              deleteTurn(turnId);
            }}
            onEdit={startEdit}
            editingTurnId={editingTurnId}
          />
        ) : null}
      </div>
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        placeholder={
          editingTurnId ? "修改后发送，将替换后续对话" : "问 Lumi 这道题"
        }
        aria-label="问 Lumi 这道题"
        minRows={2}
        maxRows={6}
        loading={sending}
        onSubmit={submit}
        onStop={stop}
        className="bg-background"
      />
    </>
  );

  if (expanded) {
    return (
      <Modal
        open
        onOpenChange={(next) => {
          if (!next) setExpanded(false);
        }}
        title="Lumi"
        heading={
          <span className="flex items-center gap-2">
            <LumiMark className="size-5" />
            Lumi
          </span>
        }
        width="xl"
        bodyClassName="h-[68vh]"
        footer={
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-sm"
              onClick={clear}
            >
              <ArrowRotateLeft className="size-4" />
              清除上下文
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => setExpanded(false)}
            >
              <ChevronsCollapseUpRight className="size-4" />
              收起
            </Button>
          </>
        }
      >
        <div className="flex h-full flex-col gap-2">{body}</div>
      </Modal>
    );
  }

  return (
    <div
      className="relative flex h-[min(34rem,68vh)] flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-surface"
      style={{ width }}
    >
      {/* A six-pixel grab strip straddling the border, so the pointer does not
          have to land exactly on a one-pixel line. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="调整 Lumi 面板宽度"
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
        className="group absolute inset-y-2 -left-1.5 w-3 cursor-col-resize touch-none"
      >
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-border/0 transition-colors group-hover:bg-border" />
      </div>

      <div className="flex items-center gap-2">
        <LumiMark className="size-6" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          Lumi
        </span>
        {editingTurnId ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-sm"
            onClick={() => {
              cancelEdit();
              setDraft(seed);
              lastSeedRef.current = seed;
            }}
          >
            取消编辑
          </Button>
        ) : null}
        <Tooltip content="放大" side="left">
          <Button
            size="sm"
            variant="ghost"
            aria-label="放大对话"
            className="size-8 rounded-lg p-0"
            onClick={() => setExpanded(true)}
          >
            <ChevronsExpandUpRight className="size-4" />
          </Button>
        </Tooltip>
        {editingTurnId ? null : (
          <Tooltip content="清除上下文" side="left">
            <Button
              size="sm"
              variant="ghost"
              aria-label="清除上下文"
              className="size-8 rounded-lg p-0"
              onClick={clear}
            >
              <ArrowRotateLeft className="size-4" />
            </Button>
          </Tooltip>
        )}
      </div>

      {body}
    </div>
  );
}
