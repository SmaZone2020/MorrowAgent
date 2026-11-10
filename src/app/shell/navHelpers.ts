import type { NavigationGroup, NavigationItem, NavigationSubItem } from "@/app/navigation";
import { findPageMeta } from "@/app/pageMeta";

export interface FlatNavigationEntry {
  group: NavigationGroup;
  item: NavigationItem;
  child?: NavigationSubItem;
}

export function flattenNavigation(groups: NavigationGroup[]): FlatNavigationEntry[] {
  const entries: FlatNavigationEntry[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      entries.push({ group, item });
      for (const child of item.children ?? []) {
        entries.push({ group, item, child });
      }
    }
  }
  return entries;
}

export function entryPath(entry: FlatNavigationEntry): string {
  return entry.child?.path ?? entry.item.path;
}

/**
 * Settings replaces the app shell: it brings its own left rail, so the main
 * sidebar and breadcrumb would be two navigations side by side.
 */
export function isSettingsPath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

export function matchesPath(entry: FlatNavigationEntry, pathname: string): boolean {
  const target = entryPath(entry);
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function resolveActiveEntry(
  entries: FlatNavigationEntry[],
  pathname: string,
): FlatNavigationEntry | undefined {
  const matched = entries.filter((entry) => matchesPath(entry, pathname));
  if (matched.length === 0) return undefined;
  return matched.reduce((deepest, current) =>
    entryPath(current).length > entryPath(deepest).length ? current : deepest,
  );
}

export function describeLocation(entry: FlatNavigationEntry | undefined, pathname: string) {
  if (!entry) {
    // Settings is reached from the footer status bar instead of the menu, so
    // it has no navigation entry to describe itself.
    const meta = findPageMeta(pathname);
    if (meta) return { section: meta.section, title: meta.title };
    return { section: "Morrow Agent", title: "未找到页面" };
  }
  if (entry.child) {
    return { section: entry.item.label, title: entry.child.label };
  }
  return { section: entry.group.label, title: entry.item.label };
}
