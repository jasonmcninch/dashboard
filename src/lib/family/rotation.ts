import { dayKey } from "../calendar";

// Whose turn it is for the daddy-daughter date. Rotates in this order, changing
// every two weeks, so the full cycle is six weeks.

export const DAUGHTERS = ["Sofie", "Jocelyn", "Georgia"] as const;
export type Daughter = (typeof DAUGHTERS)[number];

/** Weeks per turn. */
const WEEKS_PER_TURN = 2;

/**
 * Start of the rotation — a Monday, so turns change on a Monday.
 *
 * Chosen so the CURRENT turn lands on Jocelyn. Moving the anchor two weeks later
 * steps the current name back by one in the list; two weeks earlier steps it
 * forward. From here the rotation carries on by itself, so the next turn is
 * Georgia, then Sofie, and so on.
 *
 * Override with FAMILY_ROTATION_ANCHOR (YYYY-MM-DD) to shift it again without
 * editing code.
 */
const DEFAULT_ANCHOR = "2026-01-19"; // Monday

function anchorDate(): Date {
  const raw = process.env.FAMILY_ROTATION_ANCHOR ?? DEFAULT_ANCHOR;
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) {
    // A malformed override shouldn't take the page down.
    const [y, m, d] = DEFAULT_ANCHOR.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * How many turns have elapsed since the anchor.
 *
 * Both dates are normalised to UTC midnight before subtracting: using local time
 * makes the difference 23 or 25 hours across a DST boundary, which can shift the
 * turn by a day.
 */
export function turnIndex(date = new Date()): number {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.floor((today - anchorDate().getTime()) / 86_400_000);
  const weeks = Math.floor(days / 7);
  // Floor division, so dates before the anchor count backwards rather than
  // rounding toward zero and repeating turn 0 twice.
  return Math.floor(weeks / WEEKS_PER_TURN);
}

/** Whose turn it is right now. */
export function currentDaughter(date = new Date()): Daughter {
  const index = turnIndex(date);
  // Positive modulo: JS's % keeps the sign of the dividend, so a date before the
  // anchor would otherwise index out of bounds.
  return DAUGHTERS[((index % DAUGHTERS.length) + DAUGHTERS.length) % DAUGHTERS.length];
}

/**
 * Storage key for the current turn, e.g. "turn-27".
 *
 * The date checkbox resets when the turn changes rather than weekly or daily —
 * one date per daughter per turn.
 */
export function turnKey(date = new Date()): string {
  return `turn-${turnIndex(date)}`;
}

/** First day of the current turn, for display. */
export function turnStart(date = new Date()): string {
  const start = new Date(anchorDate());
  start.setUTCDate(start.getUTCDate() + turnIndex(date) * WEEKS_PER_TURN * 7);
  return dayKey(
    new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
}
