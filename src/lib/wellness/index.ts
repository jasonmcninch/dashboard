import type { Wellness } from "../data/types";
import {
  elapsedDays,
  isoWeekKey,
  pctOfCounted,
  SCHEDULE,
  todayKey,
} from "./schedule";
import { getGoals, getWeek } from "./store";
import { getLabels } from "../settings";

export * from "./schedule";
export { getGoals, getHistory, setDay, setGoal } from "./store";
export { GOAL_MAX_LENGTH } from "./limits";

/** Builds this week's checklist by overlaying stored completions on the plan. */
export async function getWellness(): Promise<Wellness> {
  const week = isoWeekKey();
  const [stored, goals, labels] = await Promise.all([
    getWeek(week),
    getGoals(),
    getLabels(),
  ]);
  const today = todayKey();
  const elapsed = new Set(elapsedDays());

  const days = SCHEDULE.map((entry) => ({
    day: entry.day,
    // Wording comes from settings; the schedule still owns which days exist and in
    // what order, since that drives the elapsed-day scoring.
    label: labels[`wellness.${entry.day}.label`],
    kind: labels[`wellness.${entry.day}.kind`],
    done: stored[entry.day] === true,
    isToday: entry.day === today,
    counted: elapsed.has(entry.day),
    goal: goals[entry.day] ?? "",
  }));

  return { week, days, completedPct: pctOfCounted(days) };
}
