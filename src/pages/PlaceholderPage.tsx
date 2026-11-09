import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { ArrowLeft } from "@gravity-ui/icons";
import { StageBadge } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { findPageMeta } from "@/app/pageMeta";

export function PlaceholderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = findPageMeta(location.pathname);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-foreground">
          {meta?.title ?? "页面未就绪"}
        </h1>
        <StageBadge label={meta?.stage === "planned" ? "待实现" : "骨架"} />
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="size-4" />
          返回
        </Button>
      </div>

      <Panel title="计划范围">
        <ul className="flex flex-col gap-2">
          {(meta?.scope ?? []).map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="leading-6">{item}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
