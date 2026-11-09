import { useNavigate } from "react-router-dom";
import { ChevronRight } from "@gravity-ui/icons";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { settingsSections } from "@/pages/settings/settingsSections";

// The overview exists so settings reads as one place with several sections
// rather than a set of unrelated destinations.
export function SettingsOverviewPage() {
  const navigate = useNavigate();

  return (
    <Panel title="设置">
      <ul className="flex flex-col">
        {settingsSections.map((section) => (
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
                status={section.status === "本地" ? "neutral" : "warning"}
                size="sm"
                contentKey={`${section.key}-status`}
                className="shrink-0"
              >
                {section.status}
              </AnimatedBadge>
              <ChevronRight
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
