import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/vendor/beui/components/motion/card";
import { SectionTitle } from "@/components/SectionTitle";

export interface PanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

// Cards sit one step lighter than the 雾白 canvas and drop the border, so
// nesting a second panel inside one never stacks two outlines.
export function Panel({ title, action, children, className }: PanelProps) {
  return (
    <Card
      variant="outlined"
      size="compact"
      className={`border-transparent bg-card shadow-surface ${className ?? ""}`}
    >
      <CardHeader>
        <CardTitle as="h2">
          <SectionTitle title={title} action={action} />
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
