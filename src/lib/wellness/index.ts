import type { Wellness } from "../data/types";
import {
  elapsedDays,
  isoWeekKey,
  pctOfCounted,
  SCHEDULE,
  todayKey,
} from "./schedule";
import { getGoals, getWeek } from "./store";

export * from "./schedule";
export { getGoals, getHistory, setDay, setGoal } from "./store";
export { GOAL_MAX_LENGTH } from "./limits";

/** Builds this week's checklist by overlaying stored completions on the plan. */
export async function getWellness(): Promise<Wellness> {
  const week = isoWeekKey();
  const [stored, goals] = await Promise.all([getWeek(week), getGoals()]);
  const today = todayKey();
  const elapsed = new Set(elapsedDays());

  const days = SCHEDULE.map((entry) => ({
    day: entry.day,
    label: entry.label,
    kind: entry.kind,
    done: stored[entry.day] === true,
    isToday: entry.day === today,
    counted: elapsed.has(entry.day),
    goal: goals[entry.day] ?? "",
  }));

  return { week, days, completedPct: pctOfCounted(days) };
}
