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

/**
 * Builds a week's checklist by overlaying stored completions on the plan.
 *
 * Takes a date so a past day can be replayed. Nothing extra had to be recorded for
 * that: completions are stored per ISO week and per weekday, which IS a per-day record
 * — `elapsedDays(on)` then scores the week as it stood on that date rather than as it
 * stands now.
 */
export async function getWellness(on = new Date()): Promise<Wellness> {
  const week = isoWeekKey(on);
  const [stored, goals, labels] = await Promise.all([
    getWeek(week),
    getGoals(),
    getLabels(),
  ]);
  const today = todayKey(on);
  const elapsed = new Set(elapsedDays(on));

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
