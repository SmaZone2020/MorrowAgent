import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarRail,
  useAnimatedSidebar,
} from "@/vendor/beui/components/motion/animated-sidebar";
import { Xmark } from "@gravity-ui/icons";
import type { NavigationItem } from "@/app/navigation";
import {
  describeLocation,
  flattenNavigation,
  isItemActive,
  navigationFor,
  resolveActiveEntry,
  resolveShellLayer,
} from "@/app/shell/navHelpers";
import { Breadcrumb } from "@/app/shell/Breadcrumb";
import { PackageSwitcher } from "@/app/shell/PackageSwitcher";
import { AppStatusFooter } from "@/app/shell/AppStatusFooter";
import { RailFlyout } from "@/app/shell/RailFlyout";
import { usePersistedState } from "@/features/uiState/usePersistedState";
import { appScope } from "@/features/uiState/scope";

// Rail-state spacing is zeroed out so the icon column reads as one even stack
// instead of five groups each keeping their own padding and gap. Horizontal
// padding also has to go, otherwise the circular icon target overflows the rail.
const groupClass =
  "group-data-[state=collapsed]/sidebar:px-0 group-data-[state=collapsed]/sidebar:py-0 group-data-[state=collapsed]/sidebar:pb-0";

/**
 * The shelf and settings are single pages: they own the whole window and carry
 * their own navigation, so only the workspace layer gets a rail. A package has
 * to be chosen before Lumi, the knowledge base or any record means anything
 * (MLPS §1.2).
 */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const layer = useMemo(
    () => resolveShellLayer(location.pathname),
    [location.pathname],
  );
  const { state } = useAnimatedSidebar();
  const collapsed = state === "collapsed";
  const groups = useMemo(() => navigationFor(layer), [layer]);
  const entries = useMemo(() => flattenNavigation(groups), [groups]);
  const activeEntry = useMemo(
    () => resolveActiveEntry(entries, location.pathname),
    [entries, location.pathname],
  );
  const description = describeLocation(activeEntry);
  const [expanded, setExpanded] = usePersistedState<string | null>(
    appScope("sidebar.expanded"),
    activeEntry?.item.children ? activeEntry.item.key : null,
  );
  // The key is kept after closing so the flyout can animate out with its real
  // contents still mounted; only `flyoutOpen` controls visibility.
  const [flyoutKey, setFlyoutKey] = useState<string | null>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const itemRefs = useRef(new Map<string, HTMLLIElement | null>());

  const flyoutItem: NavigationItem | undefined = flyoutKey
    ? groups.flatMap((group) => group.items).find((item) => item.key === flyoutKey)
    : undefined;

  // Going back to the wide sidebar puts the children inline again, so a rail
  // flyout left open would be a second copy of the same menu.
  useEffect(() => {
    if (!collapsed) setFlyoutOpen(false);
  }, [collapsed]);

  if (layer.kind !== "workspace") {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0">
      <AnimatedSidebar
        ariaLabel="Morrow Agent 主导航"
        collapsible="icon"
        className="min-h-0"
        panelClassName="h-full border-border"
      >
        <AnimatedSidebarHeader className="gap-1 px-2 pt-2 pb-1 group-data-[state=collapsed]/sidebar:px-2 group-data-[state=collapsed]/sidebar:hidden">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <PackageSwitcher workspaceId={layer.workspaceId} />
            </div>
            <AnimatedSidebarClose className="text-muted-foreground hover:bg-muted md:hidden">
              <Xmark className="size-4" />
            </AnimatedSidebarClose>
          </div>
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent className="scrollbar-thin px-2 group-data-[state=collapsed]/sidebar:gap-[4px]">
          {groups.map((group) => (
            <AnimatedSidebarGroup key={group.key} className={groupClass}>
              <AnimatedSidebarGroupLabel className="group-data-[state=collapsed]/sidebar:hidden text-sm">
                {group.label}
              </AnimatedSidebarGroupLabel>
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu className="group-data-[state=collapsed]/sidebar:gap-[4px]">
                  {group.items.map((item) => {
                    const childActive = item.children?.some(
                      (child) => location.pathname === child.path,
                    );
                    const selfActive = !item.children && isItemActive(item, location.pathname);
                    return (
                      <AnimatedSidebarMenuItem
                        key={item.key}
                        ref={(node) => {
                          itemRefs.current.set(item.key, node);
                        }}
                      >
                        <AnimatedSidebarMenuButton
                          icon={<item.icon className="size-5" />}
                          isActive={Boolean(selfActive || childActive)}
                          ariaExpanded={
                            item.children ? expanded === item.key : undefined
                          }
                          onSelect={() => {
                            if (item.children) {
                              // The rail cannot render an inline submenu, so
                              // a group opens the same children as a flyout.
                              if (collapsed) {
                                if (flyoutKey === item.key && flyoutOpen) {
                                  setFlyoutOpen(false);
                                  return;
                                }
                                setFlyoutKey(item.key);
                                setFlyoutOpen(true);
                                return;
                              }
                              setExpanded((current) =>
                                current === item.key ? null : item.key,
                              );
                              return;
                            }
                            navigate(item.path);
                          }}
                        >
                          {item.label}
                        </AnimatedSidebarMenuButton>
                      </AnimatedSidebarMenuItem>
                    );
                  })}
                </AnimatedSidebarMenu>
              </AnimatedSidebarGroupContent>
            </AnimatedSidebarGroup>
          ))}
        </AnimatedSidebarContent>

        <AnimatedSidebarFooter className="border-t border-border group-data-[state=collapsed]/sidebar:px-2">
          <AppStatusFooter />
        </AnimatedSidebarFooter>

        <AnimatedSidebarRail />
      </AnimatedSidebar>

      {flyoutItem?.children ? (
        <RailFlyout
          open={flyoutOpen}
          anchor={itemRefs.current.get(flyoutItem.key) ?? null}
          title={flyoutItem.label}
          items={flyoutItem.children}
          activePath={location.pathname}
          onSelect={navigate}
          onClose={() => setFlyoutOpen(false)}
        />
      ) : null}

      <AnimatedSidebarInset className="min-h-0">
        <Breadcrumb
          workspaceId={layer.workspaceId}
          title={description.title}
          atHome={activeEntry?.item.home === true}
        />

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </AnimatedSidebarInset>
    </div>
  );
}
