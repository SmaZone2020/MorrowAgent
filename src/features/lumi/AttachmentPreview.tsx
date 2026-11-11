import { FileText } from "@gravity-ui/icons";
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
