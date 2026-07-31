/**
 * The site's standard ease-out curve.
 *
 * Declared as a fixed-length tuple rather than inline: framer-motion's
 * `Transition.ease` accepts a 4-element cubic-bezier tuple, and an inline
 * `[0.22, 1, 0.36, 1]` widens to `number[]`, which fails to typecheck.
 */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
