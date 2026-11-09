import { useMemo, useRef, useState } from "react";
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
  AnimatedSidebarMenuSub,
  AnimatedSidebarMenuSubButton,
  AnimatedSidebarMenuSubItem,
  AnimatedSidebarRail,
  useAnimatedSidebar,
} from "@/vendor/beui/components/motion/animated-sidebar";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Xmark } from "@gravity-ui/icons";
import { navigationGroups, type NavigationItem } from "@/app/navigation";
import {
  describeLocation,
  flattenNavigation,
  resolveActiveEntry,
} from "@/app/shell/navHelpers";
import { AppStatusFooter } from "@/app/shell/AppStatusFooter";
import { RailFlyout } from "@/app/shell/RailFlyout";

// Rail-state spacing is zeroed out so the icon column reads as one even stack
// instead of five groups each keeping their own padding and gap.
const groupClass =
  "group-data-[state=collapsed]/sidebar:py-0 group-data-[state=collapsed]/sidebar:pb-0";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAnimatedSidebar();
  const collapsed = state === "collapsed";
  const entries = useMemo(() => flattenNavigation(navigationGroups), []);
  const activeEntry = useMemo(
    () => resolveActiveEntry(entries, location.pathname),
    [entries, location.pathname],
  );
  const locationInfo = describeLocation(activeEntry, location.pathname);
  const [expanded, setExpanded] = useState<string | null>(
    activeEntry?.item.children ? activeEntry.item.key : null,
  );
  const [flyoutKey, setFlyoutKey] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement | null>());

  const flyoutItem: NavigationItem | undefined = flyoutKey
    ? navigationGroups
        .flatMap((group) => group.items)
        .find((item) => item.key === flyoutKey)
    : undefined;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0">
      <AnimatedSidebar
        ariaLabel="Morrow Agent 主导航"
        collapsible="icon"
        className="min-h-0"
        panelClassName="h-full border-border"
      >
        <AnimatedSidebarHeader className="md:hidden">
          <div className="flex min-h-11 items-center justify-end px-1">
            <AnimatedSidebarClose className="text-muted-foreground hover:bg-muted">
              <Xmark className="size-4" />
            </AnimatedSidebarClose>
          </div>
        </AnimatedSidebarHeader>

        <AnimatedSidebarContent className="scrollbar-thin px-2 group-data-[state=collapsed]/sidebar:gap-0">
          {navigationGroups.map((group) => (
            <AnimatedSidebarGroup key={group.key} className={groupClass}>
              <AnimatedSidebarGroupLabel className="group-data-[state=collapsed]/sidebar:hidden">
                {group.label}
              </AnimatedSidebarGroupLabel>
              <AnimatedSidebarGroupContent>
                <AnimatedSidebarMenu>
                  {group.items.map((item) => {
                    const childActive = item.children?.some(
                      (child) => location.pathname === child.path,
                    );
                    const selfActive =
                      !item.children &&
                      (item.path === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(item.path));
                    return (
                      <AnimatedSidebarMenuItem
                        key={item.key}
                        ref={(node) => {
                          itemRefs.current.set(item.key, node);
                        }}
                      >
                        <AnimatedSidebarMenuButton
                          icon={<item.icon className="size-4" />}
                          isActive={Boolean(selfActive || childActive)}
                          ariaExpanded={
                            item.children ? expanded === item.key : undefined
                          }
                          onSelect={() => {
                            if (item.children) {
                              // The rail cannot render an inline submenu, so
                              // a group opens the same children as a flyout.
                              if (collapsed) {
                                setFlyoutKey((current) =>
                                  current === item.key ? null : item.key,
                                );
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
                        {item.children ? (
                          <AnimatedSidebarMenuSub open={expanded === item.key}>
                            {item.children.map((child) => (
                              <AnimatedSidebarMenuSubItem key={child.key}>
                                <AnimatedSidebarMenuSubButton
                                  icon={
                                    child.icon ? (
                                      <child.icon className="size-3.5" />
                                    ) : undefined
                                  }
                                  isActive={location.pathname === child.path}
                                  onSelect={() => navigate(child.path)}
                                >
                                  {child.label}
                                </AnimatedSidebarMenuSubButton>
                              </AnimatedSidebarMenuSubItem>
                            ))}
                          </AnimatedSidebarMenuSub>
                        ) : null}
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
          open
          anchor={itemRefs.current.get(flyoutItem.key) ?? null}
          title={flyoutItem.label}
          items={flyoutItem.children}
          activePath={location.pathname}
          onSelect={navigate}
          onClose={() => setFlyoutKey(null)}
        />
      ) : null}

      <AnimatedSidebarInset className="min-h-0">
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
          <span className="truncate text-xs text-muted-foreground">
            {locationInfo.section}
          </span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="truncate text-sm font-medium text-foreground">
            {locationInfo.title}
          </span>
          <AnimatedBadge
            status="neutral"
            size="sm"
            contentKey="skeleton"
            className="ml-auto"
          >
            阶段 0
          </AnimatedBadge>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </AnimatedSidebarInset>
    </div>
  );
}
