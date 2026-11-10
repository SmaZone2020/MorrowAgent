import type { NavigationGroup, NavigationItem, NavigationSubItem } from "@/app/navigation";
import {
  shelfNavigation,
  workspaceBase,
  workspaceNavigation,
  workspacePath,
} from "@/app/navigation";

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

/** The navigation groups for a layer, with workspace paths already prefixed. */
export function navigationFor(layer: ShellLayer): NavigationGroup[] {
  if (layer.kind === "workspace") {
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
  return shelfNavigation;
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

export function isSettingsPath(pathname: string): boolean {
  return resolveShellLayer(pathname).kind === "settings";
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

/** The leaf of a workspace URL: `/w/x/knowledge` → `/knowledge`. */
export function workspaceRelative(pathname: string, workspaceId: string): string {
  const base = workspaceBase(workspaceId);
  if (pathname === base || pathname === `${base}/`) return "/";
  return pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
}
