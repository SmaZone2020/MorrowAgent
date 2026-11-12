import { motion } from "motion/react";
import { cn } from "@/vendor/beui/lib/utils";

/**
 * A hand-written "你好", drawn stroke by stroke.
 *
 * The first run ends with something being made rather than a spinner being
 * dismissed: each stroke arrives after the one before it, the way it would be
 * written, so the last screen of setup is a greeting instead of a receipt.
 *
 * `speed` divides every duration and delay, so the whole figure takes about
 * 3.6 seconds at the default. Reduced motion is handled by the caller, which
 * simply skips ahead to the finished state.
 */
const initial = { pathLength: 0, opacity: 0 } as const;
const drawn = { pathLength: 1, opacity: 1 } as const;

export function HelloDraw({
  className,
  speed = 2.5,
  onComplete,
}: {
  className?: string;
  speed?: number;
  /** Fires when the final stroke lands. */
  onComplete?: () => void;
}) {
  const at = (seconds: number) => seconds / speed;

  return (
    <motion.svg
      className={cn("h-24 w-auto", className)}
      style={{ scale: 1.35 }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 492 220"
      fill="none"
      stroke="currentColor"
      strokeWidth="14.8883"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    >
      <motion.path
        d="M60.0571 18.1155C42.9356 50.4563 25.814 82.797 8.69238 115.138"
        style={{ strokeLinecap: "round" }}
        initial={initial}
        animate={drawn}
        transition={{ duration: at(0.8) }}
      />
      <motion.path
        d="M41.6947 55.8326C44.6724 99.7532 43.4317 171.713 40.7021 201.242"
        style={{ strokeLinecap: "round" }}
        initial={initial}
        animate={drawn}
        transition={{ duration: at(0.8), delay: at(0.8) }}
      />
      <motion.path
        d="M130.033 7.44551C115.723 33.0865 101.414 58.7276 87.1045 84.3686"
        style={{ strokeLinecap: "round" }}
        initial={initial}
        animate={drawn}
        transition={{ duration: at(0.6), delay: at(1.6) }}
      />
      <motion.path
        d="M87.1045 84.3686C107.427 58.841 135.925 39.2073 169.983 39.2073C187.353 39.2073 198.767 47.1477 198.767 62.5323C198.767 75.9318 190.578 87.8425 178.42 95.2867"
        style={{ strokeLinecap: "round" }}
        initial={initial}
        animate={drawn}
        transition={{ duration: at(0.8), delay: at(2.2) }}
      />
      <motion.path
        d="M136.98 92.5571C139.71 109.927 142.687 145.907 142.687 178.661C142.687 201.986 136.98 212.16 121.844 212.408C102.489 212.656 82.5992 191.968 82.6104 173.854C82.6162 164.424 86.5916 156.071 96.7701 148.346C111.049 137.328 140.454 129.53 168.99 130.026C194.796 130.522 206.955 141.192 206.955 158.314C206.955 173.947 199.759 188.091 189.337 198.264"
        style={{ strokeLinecap: "round" }}
        initial={initial}
        animate={drawn}
        transition={{ duration: at(1.5), delay: at(3.0) }}
      />
      <motion.path
        d="M329.381 11.7535C307.274 62.3829 294.259 103.476 294.259 123.942C294.259 149.535 327.177 190.68 353.81 204.679"
        style={{ strokeLinecap: "round" }}
        initial={initial}
        animate={drawn}
        transition={{ duration: at(1.0), delay: at(4.5) }}
      />
      <motion.path
        d="M349.861 66.5026C344.65 124.071 328.273 166.006 313.881 183.872C305.196 194.79 295.519 200.001 282.367 199.753C265.246 199.257 248.124 181.143 246.387 154.84C245.395 139.952 249.365 126.552 256.313 115.138C277.653 79.9021 329.514 61.2917 365.99 61.2917"
        style={{ strokeLinecap: "round" }}
        initial={initial}
        animate={drawn}
        transition={{ duration: at(1.2), delay: at(5.5) }}
      />
      <motion.path
        d="M388.818 25.3115C396.196 16.1529 407.429 9.18247 422.317 9.67875C436.213 10.175 444.65 17.6192 445.146 30.0261C445.89 46.8988 431.466 61.8038 403.707 75.6837"
        style={{ strokeLinecap: "round" }}
        initial={initial}
        animate={drawn}
        transition={{ duration: at(0.8), delay: at(6.7) }}
      />
      <motion.path
        d="M403.707 75.6837C422.797 90.3686 435.947 115.611 438.198 149.629C440.928 189.828 430.506 210.175 412.64 210.175C392.293 210.175 369.96 179.902 368.968 153.103C368.471 138.711 373.698 129.274 387.578 122.334C408.67 111.664 452.59 112.905 484.104 124.567"
        style={{ strokeLinecap: "round" }}
        initial={initial}
        animate={drawn}
        transition={{ duration: at(1.5), delay: at(7.5) }}
        onAnimationComplete={onComplete}
      />
    </motion.svg>
  );
}
