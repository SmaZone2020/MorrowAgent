import type { ComponentType, SVGProps } from "react";
import { BookOpen, Calendar, ChartLine, ChartColumn, GraduationCap, LayoutHeaderCells, Persons, Stopwatch, Target } from "@gravity-ui/icons";
import { LumiMark } from "@/features/lumi/LumiMark";

export type NavigationIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavigationSubItem {
  key: string;
  label: string;
  path: string;
  icon?: NavigationIcon;
}

export interface NavigationItem {
  key: string;
  label: string;
  path: string;
  icon: NavigationIcon;
  /**
   * The package's own home. Its `path` is the workspace root, which is a prefix
   * of every other entry, so it must match exactly instead of by prefix.
   */
  home?: boolean;
  children?: NavigationSubItem[];
}

export interface NavigationGroup {
  key: string;
  label: string;
  items: NavigationItem[];
}

/**
 * Inside a package. Every entry is scoped to `/:workspaceId`, so two packages
 * never share a transcript, a wrong-book or a profile (MLPS §1.2).
 *
 * Three groups rather than one list, because the entries answer three different
 * questions: what to read and ask, what to practise, and how it has been going.
 * A single ten-item column made "模拟考试" and "学习报告" look like neighbours,
 * when one is work and the other is the record of it.
 */
export const workspaceNavigation: NavigationGroup[] = [
  {
    key: "study",
    label: "学习",
    items: [
      {
        key: "dashboard",
        label: "仪表盘",
        path: "",
        icon: LayoutHeaderCells,
        home: true,
      },
      { key: "lumi", label: "Lumi AI", path: "/lumi", icon: LumiMark },
      { key: "plan", label: "学习计划", path: "/plan", icon: Calendar },
      { key: "knowledge", label: "知识库", path: "/knowledge", icon: BookOpen },
    ],
  },
  {
    key: "practice",
    label: "训练",
    items: [
      { key: "diagnostic", label: "诊断测评", path: "/diagnostic", icon: Target },
      { key: "drill", label: "专项训练", path: "/drill", icon: GraduationCap },
      { key: "exam", label: "模拟考试", path: "/exam", icon: Stopwatch },
      { key: "wrongBook", label: "错题本", path: "/wrong-book", icon: Persons },
    ],
  },
  {
    key: "review",
    label: "复盘",
    items: [
      { key: "profile", label: "知识画像", path: "/profile", icon: ChartLine },
      { key: "report", label: "学习报告", path: "/report", icon: ChartColumn },
    ],
  },
];

export function workspaceBase(workspaceId: string): string {
  return `/w/${workspaceId}`;
}

/** Resolves a workspace-relative path to the real one. */
export function workspacePath(workspaceId: string, relative: string): string {
  return `${workspaceBase(workspaceId)}${relative}`;
}

export const settingsPath = "/settings/general";
