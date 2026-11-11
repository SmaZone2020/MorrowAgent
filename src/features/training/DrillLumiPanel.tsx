import { useEffect, useMemo } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { PromptInput } from "@/vendor/beui/components/agents/prompt-input";
import { ArrowRotateLeft } from "@gravity-ui/icons";
import { MessageList } from "@/features/lumi/MessageList";
import { LumiMark } from "@/features/lumi/LumiMark";
import { useBoundConversation } from "@/features/lumi/useBoundConversation";
import { useToolContext } from "@/features/lumi/useToolContext";
import { useDrillConversation } from "@/features/training/drillConversation";
import { usePersistedState } from "@/features/uiState";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";
import { workspaceScope } from "@/features/uiState/scope";
import type { Question } from "@/features/knowledge";

/**
 * The question on screen, referenced by id instead of pasted in.
 *
 * The rail answers questions about one card, but the whole stem is a screenful
 * of text that the user did not write: seeding the composer with it makes every
 * question look like a long quote. A `@id` reference is short, unambiguous, and
 * resolvable through the `read_question` tool, so the model still sees the real
 * stem without the user having to paste it.
 */
function questionSeed(question: Question): string {
  return [`关于 @${question.id}`, "", "我的问题是："].join("\n");
}

/**
 * Lumi beside the drill card.
 *
 * The rail keeps its own transcript (`useDrillConversation`) so a question
 * asked mid-practice never pushes the user's general study chat away, and the
 * conversation it last held is restored on open like the main Lumi page.
 */
export function DrillLumiPanel({ question }: { question?: Question }) {
  useBoundConversation(useDrillConversation);
  // The rail's composer carries only `@<id>`, so the model needs the package
  // readable here too — otherwise it would answer from the id alone.
  useToolContext("drill");

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

  const seed = useMemo(
    () => (question ? questionSeed(question) : ""),
    [question],
  );

  // A fresh rail with nothing typed yet starts from the current card, so the
  // user can ask "why?" without pasting the stem themselves.
  useEffect(() => {
    if (!listLoaded || turns.length > 0 || draft) return;
    if (seed) setDraft(seed);
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
    cancelEdit();
    void startNew();
  };

  return (
    <div className="flex h-[min(34rem,68vh)] w-[min(24rem,38vw)] flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-surface">
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
            }}
          >
            取消编辑
          </Button>
        ) : (
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

      {/* A flex column, not a bare `flex-1`: the scroller sizes itself with
          `h-full`, which needs a parent that actually gives it a height. Without
          the flex context the rail grows to fit the transcript and never
          scrolls. */}
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
        placeholder={editingTurnId ? "修改后发送，将替换后续对话" : "问 Lumi 这道题"}
        aria-label="问 Lumi 这道题"
        minRows={2}
        maxRows={6}
        loading={sending}
        onSubmit={submit}
        onStop={stop}
        className="bg-background"
      />
    </div>
  );
}
