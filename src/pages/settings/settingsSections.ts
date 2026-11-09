import type { ComponentType, SVGProps } from "react";
import { CloudGear, Database, Sliders } from "@gravity-ui/icons";

export type SettingsSectionKey = "provider" | "model" | "data";

export interface SettingsSection {
  key: SettingsSectionKey;
  label: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

// Section order follows the first-run path: connect a provider, pick a model,
// then decide where the data lives.
export const settingsSections: SettingsSection[] = [
  {
    key: "provider",
    label: "AI Provider",
    path: "/settings/provider",
    icon: CloudGear,
  },
  {
    key: "model",
    label: "模型配置",
    path: "/settings/model",
    icon: Sliders,
  },
  {
    key: "data",
    label: "数据管理",
    path: "/settings/data",
    icon: Database,
  },
];
