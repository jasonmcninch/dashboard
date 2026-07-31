"use client";

import { motion, useReducedMotion } from "framer-motion";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A percentage ring that draws itself on load.
 *
 * Animates `strokeDasharray` from empty to the target arc. Dasharray rather than
 * `strokeDashoffset`: offset animation sweeps a fixed-length arc around the circle,
 * which looks like something orbiting; growing the dash length makes the arc extend
 * from its start point, which is what "filling up" looks like.
 *
 * Honours `prefers-reduced-motion` by rendering the final state directly — six of
 * these animate at once on this page, and that's a lot of movement for anyone who
 * has asked for less.
 */
export function ProgressRing({
  pct,
  size = 52,
  delay = 0,
}: {
  /** null draws an empty ring — nothing recorded, as distinct from a score of zero. */
  pct: number | null;
  size?: number;
  /** Staggers this ring against its siblings. */
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const filled = pct === null ? 0 : Math.min(Math.max(pct, 0), 100) / 100;
  const target = `${CIRCUMFERENCE * filled} ${CIRCUMFERENCE}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      role="img"
      aria-label={pct === null ? "not set" : `${pct}%`}
    >
      <circle
        cx="26"
        cy="26"
        r={RADIUS}
        fill="none"
        stroke="var(--c-ring-track)"
        strokeWidth="3"
      />
      <motion.circle
        cx="26"
        cy="26"
        r={RADIUS}
        fill="none"
        stroke="var(--c-text)"
        strokeWidth="3"
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        initial={reduceMotion ? false : { strokeDasharray: `0 ${CIRCUMFERENCE}` }}
        animate={{ strokeDasharray: target }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }
        }
      />
    </svg>
  );
}
