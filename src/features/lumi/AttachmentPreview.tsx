import { FileText, Xmark } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { formatSize } from "@/features/lumi/attachments";
import type { MessageAttachment } from "@/features/lumi/history";

/**
 * What a turn carried, shown above its text.
 *
 * An image is drawn from the base64 the transcript already holds, so a reload
 * shows the same picture without touching the original file — which may have
 * been moved or deleted since. A document is a row: the model read its text,
 * and the name plus size is all the user needs to recognise it.
 */
export function TurnAttachments({
  attachments,
}: {
  attachments: MessageAttachment[];
}) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((attachment) => attachment.kind === "image");
  const documents = attachments.filter(
    (attachment) => attachment.kind !== "image",
  );

  return (
    <div className="mb-2 flex flex-col gap-2">
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((image) => (
            <img
              key={image.id}
              src={`data:${image.mimeType};base64,${image.data}`}
              alt={image.name}
              className="max-h-56 w-auto max-w-full rounded-xl object-contain"
            />
          ))}
        </div>
      ) : null}
      {documents.map((document) => (
        <span
          key={document.id}
          className="flex w-fit max-w-full items-center gap-2 rounded-lg bg-background/60 px-2.5 py-1.5 text-sm text-foreground"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{document.name}</span>
          <span className="shrink-0 text-muted-foreground">
            {formatSize(document.size)}
          </span>
        </span>
      ))}
    </div>
  );
}

/** The files waiting to be sent with the next message, each removable. */
export function AttachmentTray({
  attachments,
  onRemove,
}: {
  attachments: MessageAttachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <span
          key={attachment.id}
          className="group/attachment flex max-w-64 items-center gap-2 rounded-lg bg-card px-2 py-1.5 text-sm shadow-surface"
        >
          {attachment.kind === "image" ? (
            <img
              src={`data:${attachment.mimeType};base64,${attachment.data}`}
              alt={attachment.name}
              className="size-6 shrink-0 rounded object-cover"
            />
          ) : (
            <FileText className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 truncate">{attachment.name}</span>
          <span className="shrink-0 text-muted-foreground">
            {formatSize(attachment.size)}
          </span>
          <Tooltip content="移除" side="top">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`移除 ${attachment.name}`}
              className="size-6 shrink-0 rounded-full"
              onClick={() => onRemove(attachment.id)}
            >
              <Xmark className="size-3.5" />
            </Button>
          </Tooltip>
        </span>
      ))}
    </div>
  );
}
