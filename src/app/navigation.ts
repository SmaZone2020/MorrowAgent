import type { ComponentType, SVGProps } from "react";
import { BookOpen, ChartLine, GraduationCap, Persons, Target } from "@gravity-ui/icons";
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
 */
export const workspaceNavigation: NavigationGroup[] = [
  {
    key: "workspace",
    label: "学习区",
    items: [
      { key: "lumi", label: "Lumi AI", path: "/lumi", icon: LumiMark },
      { key: "knowledge", label: "知识库", path: "/knowledge", icon: BookOpen },
      { key: "diagnostic", label: "诊断测评", path: "/diagnostic", icon: Target },
      { key: "drill", label: "专项训练", path: "/drill", icon: GraduationCap },
      { key: "wrongBook", label: "错题本", path: "/wrong-book", icon: Persons },
      { key: "profile", label: "知识画像", path: "/profile", icon: ChartLine },
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
