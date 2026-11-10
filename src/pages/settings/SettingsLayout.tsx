import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowLeft, Magnifier } from "@gravity-ui/icons";
import { cn } from "@/vendor/beui/lib/utils";
import {
  settingsGroups,
  type SettingsSection,
} from "@/pages/settings/settingsSections";

/**
 * Settings is one destination with several sections, so it owns its own
 * navigation: the app sidebar has no business listing every preference page.
 * A pinned left rail with grouped entries keeps every section one click away,
 * and the search filters that rail instead of the content.
 */
export function SettingsLayout() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return settingsGroups;
    return settingsGroups
      .map((group) => ({
        ...group,
        sections: group.sections.filter((section) =>
          section.label.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.sections.length > 0);
  }, [query]);

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex w-52 shrink-0 flex-col gap-3 border-r border-border p-3 sm:w-60 sm:p-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4 shrink-0" />
          返回应用
        </button>

        <div className="relative">
          <Magnifier
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索设置"
            aria-label="搜索设置"
            spellCheck={false}
            autoComplete="off"
            className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-(--color-border-strong) focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <nav
          aria-label="设置分区"
          className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-1"
        >
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              <p className="px-2 text-sm font-semibold text-muted-foreground">
                {group.label}
              </p>
              {group.sections.map((section: SettingsSection) => (
                <NavLink
                  key={section.key}
                  to={section.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )
                  }
                >
                  <section.icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{section.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          {groups.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              没有匹配的设置项。
            </p>
          ) : null}
        </nav>
      </div>

      <div className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
