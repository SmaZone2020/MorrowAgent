// Applied after every beUI sync so local adaptations survive a re-download.
// Each patch asserts on its anchor text: if the upstream component changes,
// the sync fails loudly instead of silently dropping the behaviour.

function replaceOnce(source, anchor, replacement, label) {
  const index = source.indexOf(anchor);
  if (index === -1) throw new Error(`beUI patch anchor missing: ${label}`);
  if (source.indexOf(anchor, index + 1) !== -1) {
    throw new Error(`beUI patch anchor is not unique: ${label}`);
  }
  return source.slice(0, index) + replacement + source.slice(index + anchor.length);
}

const SIDEBAR_TOOLTIP_IMPORT = `import { SharedLayoutBg } from "@/vendor/beui/components/motion/shared-layout-bg";`;

const SIDEBAR_STATE_ANCHOR = `  const textLabel = typeof children === "string" ? children : undefined;

  const select = (`;

const SIDEBAR_STATE_PATCH = `  const textLabel = typeof children === "string" ? children : undefined;
  // The icon rail hides every label, so the same label doubles as a tooltip.
  // Anchoring needs the rendered element, hence the local ref.
  const anchorRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const tooltipOpen = panel.collapsed && hovered && Boolean(textLabel);

  const select = (`;

const SIDEBAR_TAIL_ANCHOR = `  const interactiveClassName = cn(
    "relative flex min-h-9 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-xl px-3 text-left text-sm font-medium outline-none",
    "text-muted-foreground transition-colors hover:text-foreground",
    "focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring",
    isActive && "text-foreground",
    disabled && "cursor-not-allowed opacity-40",
    className,
  );

  return href ? (
    <motion.a
      href={href}
      target={target}
      rel={
        rel ??
        (target === "_blank" ? "noreferrer noopener" : undefined)
      }
      aria-current={isActive ? "page" : undefined}
      aria-expanded={ariaExpanded}
      aria-disabled={disabled || undefined}
      aria-label={panel.collapsed ? textLabel : undefined}
      title={panel.collapsed ? textLabel : undefined}
      tabIndex={disabled ? -1 : undefined}
      onClick={select}
      whileTap={context.reduce || disabled ? undefined : { scale: 0.98 }}
      transition={SPRING_PRESS}
      className={interactiveClassName}
    >
      {content}
    </motion.a>
  ) : (
    <motion.button
      type="button"
      disabled={disabled}
      aria-current={isActive ? "page" : undefined}
      aria-expanded={ariaExpanded}
      aria-label={panel.collapsed ? textLabel : undefined}
      title={panel.collapsed ? textLabel : undefined}
      onClick={select}
      whileTap={context.reduce || disabled ? undefined : { scale: 0.98 }}
      transition={SPRING_PRESS}
      className={interactiveClassName}
    >
      {content}
    </motion.button>
  );
}`;

const SIDEBAR_TAIL_PATCH = `  const interactiveClassName = cn(
    "relative flex min-h-9 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-xl px-3 text-left text-sm font-medium outline-none",
    "text-muted-foreground transition-colors hover:text-foreground",
    "focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring",
    isActive && "text-foreground",
    disabled && "cursor-not-allowed opacity-40",
    // In the rail the row collapses into a single circular icon target: zero
    // gap (a leftover gap would push the icon off centre) and a square box
    // rounded into a circle, so the hit area reads as a round button.
    panel.collapsed &&
      "mx-auto size-9 min-h-0 flex-none justify-center gap-0 rounded-full px-0",
    className,
  );

  const hoverHandlers = {
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
  };

  // Rendering the label through Tooltip replaces the native title attribute,
  // so the rail shows one consistent surface instead of two.
  const labelTooltip = textLabel ? (
    <Tooltip
      open={tooltipOpen}
      anchorRef={anchorRef}
      side="right"
      sideOffset={10}
      content={textLabel}
    />
  ) : null;

  const sharedProps = {
    "aria-label": panel.collapsed ? textLabel : undefined,
    onClick: select,
    whileTap: context.reduce || disabled ? undefined : { scale: 0.98 },
    transition: SPRING_PRESS,
    className: interactiveClassName,
    ...hoverHandlers,
  };

  return href ? (
    <>
      <motion.a
        ref={anchorRef}
        href={href}
        target={target}
        rel={
          rel ??
          (target === "_blank" ? "noreferrer noopener" : undefined)
        }
        aria-current={isActive ? "page" : undefined}
        aria-expanded={ariaExpanded}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        {...sharedProps}
      >
        {content}
      </motion.a>
      {labelTooltip}
    </>
  ) : (
    <>
      <motion.button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-current={isActive ? "page" : undefined}
        aria-expanded={ariaExpanded}
        {...sharedProps}
      >
        {content}
      </motion.button>
      {labelTooltip}
    </>
  );
}`;

const SIDEBAR_SUBMENU_ANCHOR = `    // A submenu cannot render in the icon rail, so opening one from there
    // leaves its children unreachable — a pointer can still fall back to the
    // rail or the shortcut, a finger has nothing. Selecting a group unfolds
    // the panel that is about to hold it.
    if (ariaExpanded !== undefined && panel.collapsed && !context.isMobile) {
      context.setOpen(true);
    }
  };`;

const SIDEBAR_SUBMENU_PATCH = `    // In the rail the host renders the group's children as an anchored
    // flyout instead, so selecting a group must not unfold the panel.
  };`;

const SIDEBAR_CHEVRON_ANCHOR = `      {ariaExpanded !== undefined ? (
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{
            opacity: panel.collapsed ? 0 : 1,
            rotate: ariaExpanded ? 90 : 0,
            x: panel.collapsed ? 4 : 0,
          }}`;

const SIDEBAR_CHEVRON_PATCH = `      {ariaExpanded !== undefined && !panel.collapsed ? (
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{
            opacity: 1,
            rotate: ariaExpanded ? 90 : 0,
            x: 0,
          }}`;

// A `flex-1` label still claims the row in the rail, which pushes the icon off
// centre even though the text is invisible. Collapsing the box to zero keeps
// the icon centred without dropping the element mid-transition.
const SIDEBAR_LABEL_ANCHOR = `        className={cn(
          "relative z-10 min-w-0 flex-1 truncate",
          panel.collapsed && "pointer-events-none",
        )}`;

const SIDEBAR_LABEL_PATCH = `        className={cn(
          "relative z-10 min-w-0 flex-1 truncate",
          panel.collapsed && "pointer-events-none max-w-0 flex-none",
        )}`;

function patchAnimatedSidebar(source) {
  let out = replaceOnce(
    source,
    SIDEBAR_TOOLTIP_IMPORT,
    `${SIDEBAR_TOOLTIP_IMPORT}
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";`,
    "animated-sidebar tooltip import",
  );
  out = replaceOnce(
    out,
    SIDEBAR_STATE_ANCHOR,
    SIDEBAR_STATE_PATCH,
    "animated-sidebar collapsed tooltip state",
  );
  out = replaceOnce(
    out,
    SIDEBAR_SUBMENU_ANCHOR,
    SIDEBAR_SUBMENU_PATCH,
    "animated-sidebar rail submenu select",
  );
  out = replaceOnce(
    out,
    SIDEBAR_CHEVRON_ANCHOR,
    SIDEBAR_CHEVRON_PATCH,
    "animated-sidebar rail chevron",
  );
  out = replaceOnce(
    out,
    SIDEBAR_LABEL_ANCHOR,
    SIDEBAR_LABEL_PATCH,
    "animated-sidebar rail label box",
  );
  out = replaceOnce(
    out,
    SIDEBAR_TAIL_ANCHOR,
    SIDEBAR_TAIL_PATCH,
    "animated-sidebar rail button tail",
  );
  return out;
}

const BADGE_ANCHOR = `  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",`;

const BADGE_PATCH = `  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",`;

// Morrow never collects a thumbs up/down on a reply, but the transcript does
// need a way to drop one. The feedback props stay in the interface so the
// component keeps its upstream shape; only the rendered row changes.
const STREAM_IMPORT_ANCHOR = `import {
  Check,
  ChevronDown,
  Copy,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";`;

const STREAM_IMPORT_PATCH = `import { Check, ChevronDown, Copy, RotateCcw, Trash2 } from "lucide-react";`;

const STREAM_PROPS_ANCHOR = `  onRetry?: () => void;
  /** Optional sources shown as a compact footer disclosure after streaming. */`;

const STREAM_PROPS_PATCH = `  onRetry?: () => void;
  /** Drops the whole reply from the transcript. */
  onDelete?: () => void;
  /** Optional sources shown as a compact footer disclosure after streaming. */`;

const STREAM_DESTRUCTURE_ANCHOR = `  onRetry,
  sources = [],`;

const STREAM_DESTRUCTURE_PATCH = `  onRetry,
  onDelete,
  sources = [],`;

const STREAM_VISIBILITY_ANCHOR = `    showActions && !streaming && (canCopy || onRetry || complete || hasSources);`;

const STREAM_VISIBILITY_PATCH = `    showActions && !streaming && (canCopy || onRetry || onDelete || hasSources);`;

const STREAM_MESSAGES_ANCHOR = `export const streamingResponseMessages = {
  copy: "Copy response",
  copied: "Copied",
  retry: "Retry response",
  helpful: "Helpful",
  notHelpful: "Not helpful",
  source: "{count} source",
  sources: "{count} sources",
};`;

const STREAM_MESSAGES_PATCH = `export const streamingResponseMessages = {
  copy: "复制",
  copied: "已复制",
  retry: "重新回答",
  helpful: "有帮助",
  notHelpful: "没帮助",
  source: "{count} 条来源",
  sources: "{count} 条来源",
};`;

const STREAM_FEEDBACK_ANCHOR = `              {complete ? (
                <>
                  <ResponseAction
                    label={t("helpful")}
                    active={currentFeedback === "up"}
                    onClick={() => setFeedback("up")}
                  >
                    <ThumbsUp className="size-3.5" />
                  </ResponseAction>
                  <ResponseAction
                    label={t("notHelpful")}
                    active={currentFeedback === "down"}
                    onClick={() => setFeedback("down")}
                  >
                    <ThumbsDown className="size-3.5" />
                  </ResponseAction>
                </>
              ) : null}`;

const STREAM_FEEDBACK_PATCH = `              {onDelete ? (
                <ResponseAction label="删除消息" onClick={onDelete}>
                  <Trash2 className="size-3.5" />
                </ResponseAction>
              ) : null}`;

function patchStreamingResponse(source) {
  let out = replaceOnce(
    source,
    STREAM_IMPORT_ANCHOR,
    STREAM_IMPORT_PATCH,
    "streaming-response icon import",
  );
  out = replaceOnce(
    out,
    STREAM_PROPS_ANCHOR,
    STREAM_PROPS_PATCH,
    "streaming-response delete prop",
  );
  out = replaceOnce(
    out,
    STREAM_DESTRUCTURE_ANCHOR,
    STREAM_DESTRUCTURE_PATCH,
    "streaming-response delete binding",
  );
  out = replaceOnce(
    out,
    STREAM_VISIBILITY_ANCHOR,
    STREAM_VISIBILITY_PATCH,
    "streaming-response action visibility",
  );
  out = replaceOnce(
    out,
    STREAM_FEEDBACK_ANCHOR,
    STREAM_FEEDBACK_PATCH,
    "streaming-response feedback row",
  );
  // Upstream moved the action labels into a message table, so the Chinese copy
  // lives there now instead of on each call site.
  return replaceOnce(
    out,
    STREAM_MESSAGES_ANCHOR,
    STREAM_MESSAGES_PATCH,
    "streaming-response labels",
  );
}

// The palette is light-only and hue-free, so status colours follow the project
// tokens instead of beUI's emerald/amber scale.
const BADGE_SPINNER_ANCHOR = `                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-flex"
                >
                  <Icon className={ICON_CLASS[size]} />
                </motion.span>`;

const BADGE_SPINNER_PATCH = `                <span className="inline-flex animate-spin">
                  <Icon className={ICON_CLASS[size]} />
                </span>`;

function patchAnimatedBadge(source) {
  const patched = replaceOnce(
    source,
    BADGE_ANCHOR,
    BADGE_PATCH,
    "animated-badge status palette",
  );
  return replaceOnce(
    patched,
    BADGE_SPINNER_ANCHOR,
    BADGE_SPINNER_PATCH,
    "animated-badge spinner",
  );
}

// The toast is the one surface that reports work which happens outside the
// page the learner is looking at, so it has to speak the app's scale and its
// status colours: beUI's emerald reads as a different product, and its 12px
// body text is the size the project reserves for nothing.
const TOAST_STATUS_ANCHOR = `  success: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",`;

const TOAST_STATUS_PATCH = `  success: "text-success bg-success/10",`;

const TOAST_DESCRIPTION_ANCHOR = `                      "mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground",`;

const TOAST_DESCRIPTION_PATCH = `                      "mt-0.5 line-clamp-2 text-sm leading-5 text-muted-foreground",`;

const TOAST_ACTION_ANCHOR = `                    "mt-2 inline-flex h-7 items-center rounded-full bg-muted/80 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted",`;

const TOAST_ACTION_PATCH = `                    "mt-2 inline-flex h-8 items-center rounded-full bg-muted/80 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted",`;

const TOAST_MESSAGES_ANCHOR = `export const animatedToastStackMessages = {
  dismiss: "Dismiss toast",
};`;

const TOAST_MESSAGES_PATCH = `export const animatedToastStackMessages = {
  dismiss: "关闭提示",
};`;

function patchAnimatedToastStack(source) {
  let out = replaceOnce(
    source,
    TOAST_STATUS_ANCHOR,
    TOAST_STATUS_PATCH,
    "animated-toast-stack success palette",
  );
  out = replaceOnce(
    out,
    TOAST_DESCRIPTION_ANCHOR,
    TOAST_DESCRIPTION_PATCH,
    "animated-toast-stack description size",
  );
  out = replaceOnce(
    out,
    TOAST_ACTION_ANCHOR,
    TOAST_ACTION_PATCH,
    "animated-toast-stack action size",
  );
  return replaceOnce(
    out,
    TOAST_MESSAGES_ANCHOR,
    TOAST_MESSAGES_PATCH,
    "animated-toast-stack labels",
  );
}

const patches = {
  "components/motion/animated-sidebar.tsx": patchAnimatedSidebar,
  "components/motion/animated-badge.tsx": patchAnimatedBadge,
  "components/agents/streaming-response.tsx": patchStreamingResponse,
  "components/motion/animated-toast-stack.tsx": patchAnimatedToastStack,
};

export function applyBeuiPatches(relativePath, source) {
  const patch = patches[relativePath];
  return patch ? patch(source) : source;
}
