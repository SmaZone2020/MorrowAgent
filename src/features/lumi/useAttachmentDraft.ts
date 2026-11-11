import { useCallback, useMemo, useRef, useState } from "react";
import type { AttachmentUploadItem } from "@/vendor/beui/components/motion/attachment-upload";
import {
  isSupported,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  readAttachment,
  TEXT_EXTENSIONS,
  TEXT_MIMES,
} from "@/features/lumi/attachments";
import { IMAGE_MIMES } from "@/features/lumi/imageResize";
import type { MessageAttachment } from "@/features/lumi/history";

/**
 * What the attachment picker accepts, as an `<input accept>` string.
 *
 * The list mirrors `isSupported`; anything outside it would be read into a
 * request the model cannot use, so the picker and the reader must agree.
 */
export const ATTACHMENT_ACCEPT = [
  ...IMAGE_MIMES,
  "application/pdf",
  ...TEXT_MIMES,
  ...TEXT_EXTENSIONS,
].join(",");

export interface AttachmentDraft {
  /** Rows for the registry's upload workspace, in the order they were added. */
  items: AttachmentUploadItem[];
  /** What the next message will actually carry. */
  attachments: MessageAttachment[];
  /** The last failure, phrased for the user. */
  error: string | null;
  /** True while a file is being parsed, which is not instant for a PDF. */
  reading: boolean;
  /** A file was added: parse it and fill its row in. */
  added: (items: AttachmentUploadItem[], files: File[]) => void;
  /** The list changed: keep the readable copies in step with the rows. */
  sync: (items: AttachmentUploadItem[]) => void;
  /** A failed row was retried: parse the same file again. */
  retry: (item: AttachmentUploadItem) => void;
  /** The picker refused something before it reached us. */
  rejected: (files: File[], reason: "too-large" | "max-files") => void;
  /** Drops everything, after a send or a cancelled edit. */
  clear: () => void;
}

const LIMIT_MB = Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024));

/**
 * The composer's attachments, kept between the picker and the request.
 *
 * The registry's upload workspace owns the rows, so this hook only remembers
 * what each row means: a file that parsed into bytes or text, or a row that
 * failed. Rows and readable copies share their id, which is what lets a removal
 * stay in sync without a second source of truth.
 */
export function useAttachmentDraft(supportsImages: boolean): AttachmentDraft {
  const [items, setItems] = useState<AttachmentUploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  // Parsed files live in a ref: a parse can finish after its row was removed,
  // and the row list is the only authority on what still exists.
  const parsed = useRef(new Map<string, MessageAttachment>());
  // Guards against a parse landing after the draft was cleared by a send.
  const generation = useRef(0);

  const attachments = useMemo(
    () =>
      items.flatMap((item) => {
        const attachment = parsed.current.get(item.id);
        return attachment ? [attachment] : [];
      }),
    [items],
  );

  const patch = useCallback((id: string, next: Partial<AttachmentUploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...next } : item)),
    );
  }, []);

  const drop = useCallback((id: string) => {
    setItems((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const read = useCallback(
    async (
      item: AttachmentUploadItem,
      file: File,
      stamp: number,
    ): Promise<void> => {
      if (!supportsImages && file.type.startsWith("image/")) {
        setError("当前模型不支持图片，请改传文档或截图里的文字");
        drop(item.id);
        return;
      }
      if (!isSupported(file)) {
        setError(`暂不支持 ${file.name}`);
        drop(item.id);
        return;
      }
      try {
        const attachment = await readAttachment(file);
        if (generation.current !== stamp) return;
        parsed.current.set(item.id, attachment);
        patch(item.id, { status: undefined, error: undefined });
      } catch (failure) {
        if (generation.current !== stamp) return;
        patch(item.id, {
          status: "failed",
          error:
            failure instanceof Error ? failure.message : `${file.name} 读取失败`,
        });
      }
    },
    [drop, patch, supportsImages],
  );

  const added = useCallback(
    (added: AttachmentUploadItem[], files: File[]) => {
      setError(null);
      const stamp = generation.current;
      const work = added.map((item, index) => {
        const file = files[index] ?? item.file;
        return file ? read(item, file, stamp) : Promise.resolve();
      });
      if (work.length === 0) return;

      setReading(true);
      void Promise.all(work).finally(() => {
        if (generation.current === stamp) setReading(false);
      });
    },
    [read],
  );

  const sync = useCallback((next: AttachmentUploadItem[]) => {
    // A removal settles after its animation, so the map is pruned here rather
    // than in the remove handler: one place, one truth.
    const live = new Set(next.map((item) => item.id));
    for (const id of parsed.current.keys()) {
      if (!live.has(id)) parsed.current.delete(id);
    }
    setItems(next);
  }, []);

  const retry = useCallback(
    (item: AttachmentUploadItem) => {
      if (!item.file) return;
      setError(null);
      patch(item.id, { status: undefined, error: undefined });
      void read(item, item.file, generation.current);
    },
    [patch, read],
  );

  const rejected = useCallback(
    (_files: File[], reason: "too-large" | "max-files") => {
      setError(
        reason === "max-files"
          ? `一次最多 ${MAX_ATTACHMENTS} 个附件`
          : `文件太大了，单个附件上限 ${LIMIT_MB} MB`,
      );
    },
    [],
  );

  const clear = useCallback(() => {
    generation.current += 1;
    parsed.current.clear();
    setItems([]);
    setError(null);
    setReading(false);
  }, []);

  return {
    items,
    attachments,
    error,
    reading,
    added,
    sync,
    retry,
    rejected,
    clear,
  };
}
