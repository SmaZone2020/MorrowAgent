import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/vendor/beui/components/motion/combobox";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { useAnimatedSidebar } from "@/vendor/beui/components/motion/animated-sidebar";
import { workspaceBase, workspacePath } from "@/app/navigation";
import { useLibrary } from "@/features/library/store";

/**
 * Which package the reader is inside, and a way to change it.
 *
 * The rail only lists pages of one package, so without this the only route to
 * another one is the shelf. Every package is a separate workspace with its own
 * transcript and records (MLPS §1.2), so the list is exactly the installed
 * packages — no "recent" grouping, no duplicates.
 *
 * Switching keeps the reader on the same kind of page: leaving the drill lands
 * on the other package's drill, not on its dashboard.
 */
export function PackageSwitcher({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const workspaces = useLibrary((state) => state.workspaces);
  const { state } = useAnimatedSidebar();
  const collapsed = state === "collapsed";

  const current = workspaces.find((entry) => entry.id === workspaceId);

  // The part of the URL that is not the package prefix, so the same page can be
  // rebuilt under another id.
  const suffix = useMemo(() => {
    const base = workspaceBase(workspaceId);
    return pathname.startsWith(base) ? pathname.slice(base.length) : "";
  }, [pathname, workspaceId]);

  const select = (nextId: string) => {
    if (nextId === workspaceId) return;
    navigate(workspacePath(nextId, suffix));
  };

  // The rail has no room for a text field, so it becomes the package's initial
  // and opens the same list.
  if (collapsed) {
    return (
      <Combobox
        value={workspaceId}
        onValueChange={select}
        labels={{ listLabel: "已安装的学习包", empty: "没有匹配的学习包" }}
      >
        <ComboboxTrigger
          aria-label={`切换学习包，当前是 ${current?.name ?? "学习包"}`}
          className="mx-auto size-9 min-w-0 justify-center rounded-full px-0"
        >
          {/* The rail has no room for a field, but the list still has to be
              reachable by keyboard: the input stays mounted and invisible, so
              typing filters and Enter picks. */}
          <ComboboxInput wrapperClassName="sr-only" aria-label="搜索学习包" />
          <span className="text-sm font-semibold text-foreground">
            {current?.name.slice(0, 1) ?? "包"}
          </span>
        </ComboboxTrigger>
        <ComboboxContent className="w-72 rounded-2xl">
          <PackageOptions workspaces={workspaces} />
        </ComboboxContent>
      </Combobox>
    );
  }

  return (
    <Combobox
      value={workspaceId}
      onValueChange={select}
      labels={{
        inputLabel: "搜索学习包",
        inputPlaceholder: "选择学习包",
        listLabel: "已安装的学习包",
        empty: "没有匹配的学习包",
      }}
    >
      <ComboboxTrigger className="h-auto min-w-0 gap-2 rounded-xl px-2 py-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <ComboboxInput
            aria-label="搜索学习包"
            placeholder="选择学习包"
            className="h-8"
          />
          {current ? (
            <AnimatedBadge
              status="neutral"
              size="sm"
              contentKey={current.packageVersion}
            >
              {current.packageVersion}
            </AnimatedBadge>
          ) : null}
        </span>
      </ComboboxTrigger>

      <ComboboxContent className="w-72 rounded-2xl">
        <PackageOptions workspaces={workspaces} />
      </ComboboxContent>
    </Combobox>
  );
}

function PackageOptions({
  workspaces,
}: {
  workspaces: { id: string; name: string; packageVersion: string; tags: string[] }[];
}) {
  return (
    <ComboboxList ariaLabel="已安装的学习包" className="p-1.5">
      <ComboboxEmpty>没有匹配的学习包</ComboboxEmpty>
      {workspaces.map((entry) => (
        <ComboboxItem
          key={entry.id}
          value={entry.id}
          textValue={entry.name}
          keywords={[entry.packageVersion, ...entry.tags]}
          className="py-2"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {entry.name}
            </span>
            <AnimatedBadge
              status="neutral"
              size="sm"
              contentKey={entry.packageVersion}
            >
              {entry.packageVersion}
            </AnimatedBadge>
          </span>
        </ComboboxItem>
      ))}
    </ComboboxList>
  );
}
