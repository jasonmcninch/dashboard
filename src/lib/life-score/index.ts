import { dayKey, isoWeekKey } from "../calendar";
import { JsonStore } from "../json-store";

// History for the combined score.
//
// Daily snapshots rather than a weekly total: the underlying sections reset on
// three different clocks (daily, weekly, and the two-week date rotation), so
// there's no single moment at which "this week's score" could be computed. Sampling
// the live score once a day and averaging gives a weekly figure that means
// something, and keeps the daily grain for future charts.

type LifeScoreFile = {
  /** day key -> the combined score recorded that day. */
  daily: Record<string, number>;
};

const store = new JsonStore<LifeScoreFile>(
  "life-score.json",
  () => ({ daily: {} }),
  (parsed) =>
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as LifeScoreFile).daily === "object",
);

/** Monday of the ISO week containing `date`. */
function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() + 6) % 7; // Mon=0 … Sun=6
  start.setDate(start.getDate() - offset);
  return start;
}

export type WeekScore = {
  /** ISO week key, e.g. "2026-W31". */
  week: string;
  /** Mean of the days recorded in that week, or null if none were. */
  score: number | null;
  /** How many days contributed, so a 2-day week isn't read as a full one. */
  days: number;
  /** Monday of that week as YYYY-MM-DD, for axis labels. */
  start: string;
};

export type LifeScoreHistory = {
  /** This week first, then previous weeks, oldest last. */
  weeks: WeekScore[];
  /** The live score for today, unaveraged. */
  today: number | null;
};

/**
 * Records today's score, overwriting any earlier value for the same day.
 *
 * Called on dashboard render. Overwriting rather than appending means the stored
 * figure always reflects the most recent state of the day rather than whatever it
 * happened to be the first time the page was opened.
 */
export async function recordToday(score: number | null): Promise<void> {
  if (score === null) return;
  await store.update((file) => {
    file.daily[dayKey()] = score;
  });
}

/**
 * One day's recorded score, or null if nothing was recorded that day.
 *
 * Separate from getHistory() because a past-day view needs the figure as it was
 * recorded, not a weekly average that includes days after it.
 */
export async function getDailyScore(on: Date): Promise<number | null> {
  const file = await store.read();
  return file.daily[dayKey(on)] ?? null;
}

/** Weekly averages, newest first, covering `weekCount` weeks back from this one. */
export async function getHistory(weekCount = 6): Promise<LifeScoreHistory> {
  const file = await store.read();

  const weeks: WeekScore[] = [];
  const now = new Date();

  for (let back = 0; back < weekCount; back++) {
    const monday = weekStart(now);
    monday.setDate(monday.getDate() - back * 7);
    const key = isoWeekKey(monday);

    // Collect that week's seven day keys rather than filtering the whole file, so
    // the cost doesn't grow with history length.
    const scores: number[] = [];
    for (let offset = 0; offset < 7; offset++) {
      const day = new Date(monday);
      day.setDate(day.getDate() + offset);
      const value = file.daily[dayKey(day)];
      if (typeof value === "number") scores.push(value);
    }

    weeks.push({
      week: key,
      score: scores.length
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : null,
      days: scores.length,
      start: dayKey(monday),
    });
  }

  return { weeks, today: file.daily[dayKey()] ?? null };
}
