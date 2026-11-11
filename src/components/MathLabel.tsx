import { useMemo } from "react";
import { MathText } from "@/components/MathText";
import { autoMath } from "@/components/mathAuto";

/**
 * Renders a short label that may or may not be LaTeX.
 *
 * Model-written artifacts (plot titles, curve labels, mind-map nodes) mix maths
 * and prose in one string, so the delimiters are filled in before typesetting.
 */
export function MathLabel({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const source = useMemo(() => autoMath(children), [children]);
  return <MathText className={className}>{source}</MathText>;
}
