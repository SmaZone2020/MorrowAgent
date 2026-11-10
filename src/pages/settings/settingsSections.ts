import type { ComponentType, SVGProps } from "react";
import {
  CircleInfo,
  CloudGear,
  Database,
  Sliders,
  SlidersVertical,
} from "@gravity-ui/icons";

export type SettingsSectionKey =
  | "general"
  | "provider"
  | "model"
  | "data"
  | "about";

export interface SettingsSection {
  key: SettingsSectionKey;
  label: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface SettingsGroup {
  key: string;
  label: string;
  sections: SettingsSection[];
}

// Rail order follows the first-run path: personal settings first, then the
// things you configure once (provider, data).
export const settingsGroups: SettingsGroup[] = [
  {
    key: "personal",
    label: "个人",
    sections: [
      {
        key: "general",
        label: "首选项",
        path: "/settings/general",
        icon: SlidersVertical,
      },
    ],
  },
  {
    key: "ai",
    label: "AI",
    sections: [
      {
        key: "provider",
        label: "AI 供应商",
        path: "/settings/provider",
        icon: CloudGear,
      },
      {
        key: "model",
        label: "生成参数",
        path: "/settings/model",
        icon: Sliders,
      },
    ],
  },
  {
    key: "app",
    label: "应用",
    sections: [
      {
        key: "data",
        label: "数据管理",
        path: "/settings/data",
        icon: Database,
      },
      {
        key: "about",
        label: "关于",
        path: "/settings/about",
        icon: CircleInfo,
      },
    ],
  },
];

export const settingsSections: SettingsSection[] = settingsGroups.flatMap(
  (group) => group.sections,
);
