import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft } from "@gravity-ui/icons";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-5 sm:p-7">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">404</h1>
      <EmptyState
        mood="confused"
        surface="page"
        title="页面不存在"
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="size-4" />
            返回
          </Button>
        }
      />
    </div>
  );
}
