import type { NavigationGroup, NavigationItem, NavigationSubItem } from "@/app/navigation";
import { workspaceNavigation, workspacePath } from "@/app/navigation";

export interface FlatNavigationEntry {
  group: NavigationGroup;
  item: NavigationItem;
  child?: NavigationSubItem;
}

/**
 * Which of the three layers a URL belongs to. The shelf and a workspace are
 * separate shells, not two states of one page: the shelf has no sidebar to
 * navigate with, and a workspace cannot be described without knowing which
 * package it belongs to.
 */
export type ShellLayer =
  | { kind: "shelf" }
  | { kind: "workspace"; workspaceId: string }
  | { kind: "settings" };

const WORKSPACE_PREFIX = /^\/w\/([a-z0-9][a-z0-9._-]*)(\/|$)/i;

export function resolveShellLayer(pathname: string): ShellLayer {
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return { kind: "settings" };
  }
  const matched = WORKSPACE_PREFIX.exec(pathname);
  if (matched) return { kind: "workspace", workspaceId: matched[1]! };
  return { kind: "shelf" };
}

/**
 * The navigation groups for a layer, with workspace paths already prefixed.
 * The shelf and settings are single pages without a rail, so only a workspace
 * has a list.
 */
export function navigationFor(layer: ShellLayer): NavigationGroup[] {
  if (layer.kind !== "workspace") return [];
  return workspaceNavigation.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      path: workspacePath(layer.workspaceId, item.path),
      children: item.children?.map((child) => ({
        ...child,
        path: workspacePath(layer.workspaceId, child.path),
      })),
    })),
  }));
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
 * A package's home has the workspace root as its path, which prefixes every
 * other page; it therefore only matches exactly. Every other entry owns its
 * subtree.
 */
function matchesItem(item: NavigationItem, pathname: string): boolean {
  const target = item.path;
  if (item.home) {
    return pathname.replace(/\/+$/, "") === target;
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function isItemActive(item: NavigationItem, pathname: string): boolean {
  return matchesItem(item, pathname);
}

export function matchesPath(entry: FlatNavigationEntry, pathname: string): boolean {
  if (entry.child) {
    const target = entry.child.path;
    return pathname === target || pathname.startsWith(`${target}/`);
  }
  return matchesItem(entry.item, pathname);
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

export function describeLocation(
  entry: FlatNavigationEntry | undefined,
): { section: string; title: string } {
  if (!entry) {
    return { section: "Morrow Agent", title: "未找到页面" };
  }
  if (entry.child) {
    return { section: entry.item.label, title: entry.child.label };
  }
  return { section: entry.group.label, title: entry.item.label };
}
