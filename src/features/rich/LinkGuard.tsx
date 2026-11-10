import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowUpRightFromSquare } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { hostOf, openExternalUrl } from "@/features/rich/openExternal";

interface PendingLink {
  href: string;
  host: string;
}

const LinkGuardContext = createContext<((href: string) => void) | null>(null);

/**
 * Every link in a reply leaves the app, so each one is confirmed first. A
 * tutoring answer can quote any URL, and the user should see where it goes
 * before a browser window appears.
 */
export function LinkGuardProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingLink | null>(null);
  const [failed, setFailed] = useState(false);

  const open = useCallback((href: string) => {
    setFailed(false);
    setPending({ href, host: hostOf(href) });
  }, []);

  const close = useCallback(() => {
    setPending(null);
    setFailed(false);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    const opened = await openExternalUrl(pending.href);
    if (opened) {
      setPending(null);
      setFailed(false);
      return;
    }
    setFailed(true);
  }, [pending]);

  return (
    <LinkGuardContext.Provider value={open}>
      {children}
      {pending ? (
        <LinkConfirmDialog
          host={pending.host}
          href={pending.href}
          failed={failed}
          onCancel={close}
          onConfirm={() => void confirm()}
        />
      ) : null}
    </LinkGuardContext.Provider>
  );
}

/** A link outside the app: same affordance everywhere, so it reads as one. */
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const open = useContext(LinkGuardContext);
  return (
    <button
      type="button"
      title={href}
      onClick={() => open?.(href)}
      className="inline cursor-pointer text-left text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
    >
      {children}
      <ArrowUpRightFromSquare
        aria-hidden="true"
        className="ml-0.5 inline size-3 align-baseline text-muted-foreground"
      />
    </button>
  );
}

function LinkConfirmDialog({
  href,
  host,
  failed,
  onCancel,
  onConfirm,
}: {
  href: string;
  host: string;
  failed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onCancel]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-3 p-5">
          <h2
            id="link-confirm-title"
            className="text-base font-semibold text-foreground"
          >
            即将离开 Morrow Agent
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            这个链接指向外部网站{" "}
            <span className="font-medium text-foreground">{host}</span>
            ，不是官方页面。打开前请确认来源可信，不要在其中输入账号、密码或个人信息。
          </p>
          <p className="truncate rounded-xl bg-muted/60 px-3 py-2 font-mono text-sm text-muted-foreground">
            {href}
          </p>
          {failed ? (
            <p className="text-sm text-destructive">
              无法调起系统浏览器，请复制链接后手动打开。
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-border/70 px-5 py-3">
          <Button size="sm" variant="ghost" className="text-sm" onClick={onCancel}>
            取消
          </Button>
          <Button size="sm" className="text-sm" onClick={onConfirm}>
            访问
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
