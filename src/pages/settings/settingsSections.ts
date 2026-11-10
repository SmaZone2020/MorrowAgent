import type { ComponentType, SVGProps } from "react";
import {
  CircleInfo,
  CloudGear,
  Database,
  Palette,
  Sliders,
  SlidersVertical,
} from "@gravity-ui/icons";

export type SettingsSectionKey =
  | "general"
  | "appearance"
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

// Order follows the first-run path: decide how the app looks, connect a
// provider, pick the model, then the things you touch once.
export const settingsSections: SettingsSection[] = [
  {
    key: "general",
    label: "首选项",
    path: "/settings/general",
    icon: SlidersVertical,
  },
  {
    key: "appearance",
    label: "外观",
    path: "/settings/appearance",
    icon: Palette,
  },
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
];
