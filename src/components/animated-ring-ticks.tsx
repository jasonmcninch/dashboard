"use client";

import { motion, useReducedMotion } from "framer-motion";

export type Tick = {
  key: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lit: boolean;
  litStroke: string;
  dimStroke: string;
  width: number;
};

/**
 * The dial's ticks, sweeping alight clockwise on load.
 *
 * Only the lit ticks animate. Staggering the unlit ones too would draw the eye to
 * the empty part of the dial, which is the opposite of what a progress indicator
 * should emphasise — so they're painted immediately at their resting value and the
 * sweep runs over the filled arc alone.
 *
 * Client-side because it animates; the geometry is still computed on the server and
 * passed in, so nothing about the layout depends on JavaScript running.
 */
export function AnimatedRingTicks({ ticks }: { ticks: Tick[] }) {
  const reduceMotion = useReducedMotion();
  const litCount = ticks.filter((tick) => tick.lit).length;

  // Total sweep duration is capped rather than per-tick, so a 95% score doesn't take
  // three times as long to fill as a 30% one.
  const perTick = litCount > 0 ? Math.min(0.014, 0.9 / litCount) : 0;

  return (
    <>
      {ticks.map((tick, index) => {
        const common = {
          x1: tick.x1,
          y1: tick.y1,
          x2: tick.x2,
          y2: tick.y2,
          strokeWidth: tick.width,
          strokeLinecap: "round" as const,
        };

        if (!tick.lit) {
          return <line key={tick.key} {...common} stroke={tick.dimStroke} />;
        }

        if (reduceMotion) {
          return <line key={tick.key} {...common} stroke={tick.litStroke} />;
        }

        return (
          <motion.line
            key={tick.key}
            {...common}
            stroke={tick.litStroke}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.28,
              delay: 0.15 + index * perTick,
              ease: "easeOut",
            }}
          />
        );
      })}
    </>
  );
}

/**
 * The marker bead, arriving at the end of the tick sweep.
 *
 * Delayed to land just as the last tick lights, so the bead reads as the head of the
 * sweep rather than a separate element fading in over it.
 */
export function AnimatedBead({
  cx,
  cy,
  litCount,
}: {
  cx: number;
  cy: number;
  litCount: number;
}) {
  const reduceMotion = useReducedMotion();
  const sweep = litCount > 0 ? Math.min(0.014, 0.9 / litCount) * litCount : 0;

  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={5.5}
      fill="var(--ls-bead)"
      style={{ filter: "drop-shadow(0 0 8px var(--ls-bead-glow))" }}
      initial={reduceMotion ? undefined : { opacity: 0, scale: 0.3 }}
      animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 24,
        delay: 0.15 + sweep,
      }}
    />
  );
}
