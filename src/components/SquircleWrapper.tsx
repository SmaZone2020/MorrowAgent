import type { CSSProperties, ReactNode } from "react";
import { Squircle } from "@squircle-js/react";

interface SquircleWrapperProps {
  children: ReactNode;
  radius?: number;
  smoothing?: number;
  className?: string;
  /** Overrides the defaults per call (padding, background, borders…). */
  style?: CSSProperties;
}

export function SquircleWrapper({
  children,
  radius = 28,
  smoothing = 1,
  className = "",
  style,
}: SquircleWrapperProps) {
  return (
    <Squircle
      cornerRadius={radius}
      cornerSmoothing={smoothing}
      className={className}
      style={{
        // The card token, not a fixed white: a squircle on a dark page must
        // not glow. A caller can still override it per instance.
        backgroundColor: "var(--card)",
        ...style,
      }}
    >
      {children}
    </Squircle>
  );
}