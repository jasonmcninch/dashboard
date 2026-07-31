import type { DayKey, WorkoutKind } from "../data/types";

// Re-exported so existing callers keep working; the implementation is shared
// with the spiritual section's weekly topic.
export { isoWeekKey } from "../calendar";

// The weekly plan: lift Mon/Wed/Fri, cardio Tue/Thu, bike Sat. Sunday is the
// rest day and isn't shown, so it can't drag the completion percentage down.
//
// Order matters: `todayKey` indexes this array by Monday-based weekday, so the
// entries must stay in calendar order starting at Monday.
export const SCHEDULE: { day: DayKey; label: string; kind: WorkoutKind }[] = [
  { day: "mon", label: "Monday", kind: "lift" },
  { day: "tue", label: "Tuesday", kind: "cardio" },
  { day: "wed", label: "Wednesday", kind: "lift" },
  { day: "thu", label: "Thursday", kind: "cardio" },
  { day: "fri", label: "Friday", kind: "lift" },
  { day: "sat", label: "Saturday", kind: "bike" },
];

export const DAY_KEYS = SCHEDULE.map((entry) => entry.day);

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === "string" && (DAY_KEYS as string[]).includes(value);
}

/** Today's day key, or null on Sunday (the rest day, which has no row). */
export function todayKey(date = new Date()): DayKey | null {
  const index = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  return index < SCHEDULE.length ? SCHEDULE[index].day : null;
}

/**
 * The scheduled days that have already arrived this week: Monday through today.
 *
 * Only these count toward the percentage. The week reads 100% when everything up
 * to today is ticked — on Wednesday, Saturday's bike ride is not yet a miss, so
 * counting it would mean the score could never be full until the weekend. Sunday
 * sits past Saturday, so by then the whole plan has elapsed and the week is scored
 * in full.
 */
export function elapsedDays(date = new Date()): DayKey[] {
  const index = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  return DAY_KEYS.slice(0, Math.min(index + 1, DAY_KEYS.length));
}

/**
 * Completed ÷ elapsed, as a percentage.
 *
 * Reads `counted` rather than recomputing which days have elapsed, so the client's
 * optimistic recount after a toggle can't disagree with the server's number over a
 * clock difference. Days still ahead are excluded from *both* halves of the
 * fraction: ticking Friday on a Wednesday doesn't move the score until Friday
 * arrives, which also stops early ticks pushing it past 100%.
 */
export function pctOfCounted(
  days: { done: boolean; counted: boolean }[],
): number {
  const counted = days.filter((day) => day.counted);
  if (!counted.length) return 0; // Monday always counts, so this is belt-and-braces.
  return Math.round(
    (counted.filter((day) => day.done).length / counted.length) * 100,
  );
}
