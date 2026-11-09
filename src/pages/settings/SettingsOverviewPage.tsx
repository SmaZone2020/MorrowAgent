import { useNavigate } from "react-router-dom";
import { ChevronRight } from "@gravity-ui/icons";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { useProviderStatus } from "@/features/settings/providerStatus";
import {
  settingsSections,
  type SettingsSectionKey,
} from "@/pages/settings/settingsSections";

function useSectionStatus() {
  const configured = useProviderStatus((state) => state.configured);

  return (key: SettingsSectionKey) => {
    if (key === "provider") {
      return configured
        ? { label: "已配置", status: "success" as const }
        : { label: "未接入", status: "warning" as const };
    }
    // Model preferences always have a value; data is always local.
    return { label: "本地", status: "neutral" as const };
  };
}

// The overview exists so settings reads as one place with several sections
// rather than a set of unrelated destinations.
export function SettingsOverviewPage() {
  const navigate = useNavigate();
  const statusOf = useSectionStatus();

  return (
    <Panel title="设置">
      <ul className="flex flex-col">
        {settingsSections.map((section) => {
          const state = statusOf(section.key);
          return (
            <li key={section.key}>
              <button
                type="button"
                onClick={() => navigate(section.path)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <section.icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {section.label}
                </span>
                <AnimatedBadge
                  status={state.status}
                  size="sm"
                  contentKey={`${section.key}-${state.label}`}
                  className="shrink-0"
                >
                  {state.label}
                </AnimatedBadge>
                <ChevronRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
