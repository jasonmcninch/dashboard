import type { Wellness } from "../data/types";
import { isoWeekKey, SCHEDULE, todayKey } from "./schedule";
import { getGoals, getWeek } from "./store";

export * from "./schedule";
export { getGoals, getHistory, setDay, setGoal } from "./store";
export { GOAL_MAX_LENGTH } from "./limits";

/** Builds this week's checklist by overlaying stored completions on the plan. */
export async function getWellness(): Promise<Wellness> {
  const week = isoWeekKey();
  const [stored, goals] = await Promise.all([getWeek(week), getGoals()]);
  const today = todayKey();

  const days = SCHEDULE.map((entry) => ({
    day: entry.day,
    label: entry.label,
    kind: entry.kind,
    done: stored[entry.day] === true,
    isToday: entry.day === today,
    goal: goals[entry.day] ?? "",
  }));

  const completed = days.filter((day) => day.done).length;

  return {
    week,
    days,
    completedPct: days.length
      ? Math.round((completed / days.length) * 100)
      : 0,
  };
}
