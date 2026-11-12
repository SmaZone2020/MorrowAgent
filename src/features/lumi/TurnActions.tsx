import { useEffect, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import {
  ArrowRotateLeft,
  ArrowUturnCcwLeft,
  Copy,
  CopyCheck,
  Pencil,
  TrashBin,
} from "@gravity-ui/icons";

/**
 * Delete (and, for a question, edit) under one message. It stays quiet until
 * the row is hovered or something inside it takes focus, so a long transcript
 * still reads as prose rather than as a wall of controls.
 *
 * Deleting a message cannot be undone — the rows are gone from the database
 * too — so the trash icon only arms the action; a second, explicit press
 * commits it.
 */
export function TurnActions({
  copyText,
  onRetry,
  onEdit,
  onDelete,
}: {
  /** The message's own words; omitted when there is nothing to copy. */
  copyText?: string;
  /** Asks again for the question this message answers. */
  onRetry?: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const copy = async () => {
    if (!copyText) return;
    await navigator.clipboard?.writeText(copyText).catch(() => undefined);
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className={`flex items-center gap-0.5 transition-opacity ${
        confirming
          ? "opacity-100"
          : "opacity-0 group-hover/message:opacity-100 focus-within:opacity-100"
      }`}
    >
      {confirming ? (
        <>
          <Tooltip content="确认删除" side="top">
            <Button
              size="icon"
              variant="ghost"
              aria-label="确认删除"
              className="size-7 rounded-lg text-destructive"
              onClick={onDelete}
            >
              <TrashBin className="size-3.5" />
            </Button>
          </Tooltip>
          <Tooltip content="取消删除" side="top">
            <Button
              size="icon"
              variant="ghost"
              aria-label="取消删除"
              className="size-7 rounded-lg"
              onClick={() => setConfirming(false)}
            >
              <ArrowUturnCcwLeft className="size-3.5" />
            </Button>
          </Tooltip>
        </>
      ) : (
        <>
          {onRetry ? (
            <Tooltip content="重新回答" side="top">
              <Button
                size="icon"
                variant="ghost"
                aria-label="重新回答"
                className="size-7 rounded-lg text-muted-foreground"
                onClick={onRetry}
              >
                <ArrowRotateLeft className="size-3.5" />
              </Button>
            </Tooltip>
          ) : null}
          {copyText ? (
            <Tooltip content={copied ? "已复制" : "复制消息"} side="top">
              <Button
                size="icon"
                variant="ghost"
                aria-label={copied ? "已复制" : "复制消息"}
                className="size-7 rounded-lg text-muted-foreground"
                onClick={() => void copy()}
              >
                {copied ? (
                  <CopyCheck className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </Tooltip>
          ) : null}
          {onEdit ? (
            <Tooltip content="编辑消息" side="top">
              <Button
                size="icon"
                variant="ghost"
                aria-label="编辑消息"
                className="size-7 rounded-lg"
                onClick={onEdit}
              >
                <Pencil className="size-3.5" />
              </Button>
            </Tooltip>
          ) : null}
          <Tooltip content="删除消息" side="top">
            <Button
              size="icon"
              variant="ghost"
              aria-label="删除消息"
              className="size-7 rounded-lg text-muted-foreground hover:text-destructive"
              onClick={() => setConfirming(true)}
            >
              <TrashBin className="size-3.5" />
            </Button>
          </Tooltip>
        </>
      )}
    </div>
  );
}
