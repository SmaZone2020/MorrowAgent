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

// The palette is light-only and hue-free, so status colours follow the project
// tokens instead of beUI's emerald/amber scale.
function patchAnimatedBadge(source) {
  return replaceOnce(source, BADGE_ANCHOR, BADGE_PATCH, "animated-badge status palette");
}

const patches = {
  "components/motion/animated-sidebar.tsx": patchAnimatedSidebar,
  "components/motion/animated-badge.tsx": patchAnimatedBadge,
};

export function applyBeuiPatches(relativePath, source) {
  const patch = patches[relativePath];
  return patch ? patch(source) : source;
}
