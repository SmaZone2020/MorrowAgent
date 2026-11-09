import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/vendor/beui/components/motion/card";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Clock, Sparkles, Target, TargetDart } from "@gravity-ui/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { EmptyState } from "@/components/EmptyState";

interface MetricItem {
  key: string;
  label: string;
  value: string;
}

const metrics: MetricItem[] = [
  { key: "mastery", label: "知识点掌握度", value: "--" },
  { key: "weak", label: "当前薄弱点", value: "--" },
  { key: "goal", label: "目标进度", value: "--" },
  { key: "trend", label: "学习趋势", value: "--" },
];

const cardClass = "border-transparent bg-card shadow-surface";

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-5 sm:p-7">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 Siyuan truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          学习仪表盘
        </h1>
        <AnimatedBadge status="warning" size="sm" contentKey="no-diagnosis">
          未完成诊断
        </AnimatedBadge>
        <Button size="sm" onClick={() => navigate("/lumi")}>
          <Sparkles className="size-4" />
          Lumi
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.key}
            variant="outlined"
            size="compact"
            className={cardClass}
          >
            <CardContent className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-muted-foreground">
                {metric.label}
              </span>
              <span className="shrink-0 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {metric.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Card variant="outlined" size="compact" className={cardClass}>
          <CardHeader>
            <CardTitle as="h2">
              <SectionTitle title="今日任务" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="暂无学习任务"
              icon={<TargetDart className="size-5" />}
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate("/training/assessment")}
                >
                  智能测评
                </Button>
              }
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Card variant="outlined" size="compact" className={cardClass}>
            <CardHeader>
              <CardTitle as="h2">
                <SectionTitle title="薄弱知识点" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState title="暂无" />
            </CardContent>
          </Card>

          <Card variant="outlined" size="compact" className={cardClass}>
            <CardHeader>
              <CardTitle as="h2">
                <SectionTitle title="学习目标" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <Target className="size-4 shrink-0" />
                  <span className="truncate">未设置</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/learning/goal")}
                >
                  设置
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4 shrink-0" />
                <span className="truncate">待复习 0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
