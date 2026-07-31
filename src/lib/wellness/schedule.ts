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
