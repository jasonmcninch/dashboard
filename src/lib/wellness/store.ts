import { isoWeekKey } from "../calendar";
import { JsonStore } from "../json-store";
import type { DayKey } from "../data/types";
import { GOAL_MAX_LENGTH } from "./limits";

// Persistence for the wellness checklist.
//
// Moved onto the shared JsonStore: this file previously carried its own copy of the
// atomic-write and write-queue logic, and read WELLNESS_DATA_DIR while every other
// checklist read CHECKLIST_DATA_DIR — which would have meant wellness silently
// writing to a different directory once deployed with a mounted volume.

type WellnessFile = {
  /** week key -> day key -> completed. Absent day means not completed. */
  weeks: Record<string, Partial<Record<DayKey, boolean>>>;
  /**
   * day key -> goal text. Keyed by WEEKDAY, not by week, so a goal set for Monday
   * stays on every Monday until it's changed — unlike the checkboxes, which clear
   * each week. Optional so files written before goals existed still load.
   */
  goals?: Partial<Record<DayKey, string>>;
};

const store = new JsonStore<WellnessFile>(
  "wellness.json",
  () => ({ weeks: {}, goals: {} }),
  (parsed) =>
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as WellnessFile).weeks === "object",
);

/** Completed days for one week. */
export async function getWeek(
  week = isoWeekKey(),
): Promise<Partial<Record<DayKey, boolean>>> {
  const file = await store.read();
  return file.weeks[week] ?? {};
}

/** Every weekday's standing goal. */
export async function getGoals(): Promise<Partial<Record<DayKey, string>>> {
  const file = await store.read();
  return file.goals ?? {};
}

/** Sets one day's completion and returns the updated week. */
export async function setDay(
  day: DayKey,
  done: boolean,
  week = isoWeekKey(),
): Promise<Partial<Record<DayKey, boolean>>> {
  return store.update((file) => {
    const current = (file.weeks[week] ??= {});
    if (done) current[day] = true;
    else delete current[day]; // absent means "not done" — keeps the file small
    return current;
  });
}

export async function setGoal(day: DayKey, goal: string): Promise<void> {
  const trimmed = goal.trim().slice(0, GOAL_MAX_LENGTH);
  await store.update((file) => {
    const goals = (file.goals ??= {});
    // Drop empties rather than storing "" for every day that was cleared.
    if (trimmed) goals[day] = trimmed;
    else delete goals[day];
  });
}

/** Every recorded week, newest first. Kept for streaks and history views. */
export async function getHistory(): Promise<
  { week: string; days: Partial<Record<DayKey, boolean>> }[]
> {
  const file = await store.read();
  return Object.entries(file.weeks)
    .map(([week, days]) => ({ week, days }))
    .sort((a, b) => b.week.localeCompare(a.week));
}
