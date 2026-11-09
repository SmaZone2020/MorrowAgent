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
import {
  knowledgePoints,
  questions,
  weakPointCandidates,
} from "@/features/knowledge";

const cardClass = "border-transparent bg-card shadow-surface";

// The dashboard has no measured progress yet, so the counters report what the
// bundle actually contains instead of a dash that means "we never wired this".
export function DashboardPage() {
  const navigate = useNavigate();
  const candidates = weakPointCandidates().slice(0, 3);

  const metrics = [
    { key: "points", label: "知识库知识点", value: String(knowledgePoints.length) },
    { key: "questions", label: "知识库题目", value: String(questions.length) },
    { key: "observed", label: "已诊断知识点", value: "0" },
    { key: "trend", label: "学习趋势", value: "--" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-5 sm:p-7">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="Siyuan min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
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

      <div className="grid items-start gap-3 lg:grid-cols-[1.4fr_1fr]">
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
                <SectionTitle title="待验证知识点" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col">
                {candidates.map((point) => (
                  <li
                    key={point.id}
                    className="flex items-center gap-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {point.name}
                    </span>
                    <AnimatedBadge
                      status="neutral"
                      size="sm"
                      contentKey={`${point.id}-untested`}
                      className="shrink-0"
                    >
                      待诊断
                    </AnimatedBadge>
                  </li>
                ))}
              </ul>
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
