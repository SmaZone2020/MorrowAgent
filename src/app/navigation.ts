import type { ComponentType, SVGProps } from "react";
import {
  BookOpen,
  ChartLine,
  FileText,
  GraduationCap,
  House,
  Persons,
  Target,
  TargetDart,
} from "@gravity-ui/icons";
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

// Group labels are reserved for the two axis-level destinations. Secondary
// modules (training, mistake book, knowledge base) sit inline so the rail
// collapses without leftover group headings.
export const navigationGroups: NavigationGroup[] = [
  {
    key: "core",
    label: "学习主线",
    items: [
      { key: "dashboard", label: "仪表盘", path: "/", icon: House },
      { key: "lumi", label: "Lumi AI", path: "/lumi", icon: LumiMark },
    ],
  },
  {
    key: "learning",
    // The group used to repeat its own first item's label, which read as a
    // heading plus a same-named row. This label covers everything it holds.
    label: "学习与记录",
    items: [
      {
        key: "myLearning",
        label: "我的学习",
        path: "/learning",
        icon: Target,
        children: [
          { key: "goal", label: "学习目标", path: "/learning/goal", icon: Target },
          { key: "plan", label: "学习计划", path: "/learning/plan", icon: TargetDart },
          { key: "profile", label: "知识画像", path: "/learning/profile", icon: ChartLine },
          { key: "report", label: "学习报告", path: "/learning/report", icon: FileText },
        ],
      },
      {
        key: "trainingCenter",
        label: "训练中心",
        path: "/training",
        icon: GraduationCap,
        children: [
          { key: "assessment", label: "智能测评", path: "/training/assessment" },
          { key: "drill", label: "专项训练", path: "/training/drill" },
          { key: "mock", label: "模拟考试", path: "/training/mock" },
        ],
      },
      { key: "wrongBook", label: "错题本", path: "/wrong-book", icon: Persons },
      { key: "knowledge", label: "知识库", path: "/knowledge", icon: BookOpen },
    ],
  },
];

export const settingsPath = "/settings/provider";
