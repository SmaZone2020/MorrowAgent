import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/vendor/beui/lib/utils";
import { settingsSections } from "@/pages/settings/settingsSections";

// Settings is one destination with several sections, so it owns its own
// local navigation: the app sidebar has no business listing every preference
// page, and Provider is just one section among them.
export function SettingsLayout() {
  return (
    <div className="flex h-full w-full flex-col">
      <nav
        aria-label="设置分区"
        className="scrollbar-thin flex shrink-0 gap-1 overflow-x-auto border-b border-border px-5 py-2.5 sm:px-7"
      >
        {settingsSections.map((section) => (
          <NavLink
            key={section.key}
            to={section.path}
            className={({ isActive }) =>
              cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-card text-foreground shadow-surface"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            <section.icon aria-hidden="true" className="size-4" />
            {section.label}
          </NavLink>
        ))}
      </nav>

      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
