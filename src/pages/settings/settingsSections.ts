import type { ComponentType, SVGProps } from "react";
import { CloudGear, Database, Sliders } from "@gravity-ui/icons";

export interface SettingsSection {
  key: string;
  label: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** One-line state shown on the overview row. */
  status: string;
}

// Section order follows the first-run path: connect a provider, pick a model,
// then decide where the data lives.
export const settingsSections: SettingsSection[] = [
  {
    key: "provider",
    label: "AI Provider",
    path: "/settings/provider",
    icon: CloudGear,
    status: "未接入",
  },
  {
    key: "model",
    label: "模型配置",
    path: "/settings/model",
    icon: Sliders,
    status: "未配置",
  },
  {
    key: "data",
    label: "数据管理",
    path: "/settings/data",
    icon: Database,
    status: "本地",
  },
];
