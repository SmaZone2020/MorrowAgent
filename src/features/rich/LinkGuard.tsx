import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { ArrowUpRightFromSquare } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { Modal } from "@/components/Modal";
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
      <LinkConfirmDialog
        open={pending !== null}
        host={pending?.host ?? ""}
        href={pending?.href ?? ""}
        failed={failed}
        onCancel={close}
        onConfirm={() => void confirm()}
      />
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
    <Tooltip content={href} side="top">
      <button
        type="button"
        onClick={() => open?.(href)}
        className="inline cursor-pointer text-left text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
      >
        {children}
        <ArrowUpRightFromSquare
          aria-hidden="true"
          className="ml-0.5 inline size-3 align-baseline text-muted-foreground"
        />
      </button>
    </Tooltip>
  );
}

function LinkConfirmDialog({
  open,
  href,
  host,
  failed,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  href: string;
  host: string;
  failed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title="即将离开 Morrow Agent"
      footer={
        <>
          <Button size="sm" variant="ghost" className="text-sm" onClick={onCancel}>
            取消
          </Button>
          <Button size="sm" className="text-sm" onClick={onConfirm}>
            访问
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
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
    </Modal>
  );
}
