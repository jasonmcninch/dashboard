// The two keys the checklists reset on. Shared, because several sections need
// them and they must agree: wellness resets weekly, the spiritual checklist and
// diet slider daily, the spiritual topic weekly.

/**
 * ISO-8601 week identifier, e.g. "2026-W31".
 *
 * ISO weeks start on Monday and belong to whichever year contains their Thursday,
 * so a week straddling New Year gets one stable key instead of splitting across
 * two. Computed from local time, matching how a person experiences "this week".
 */
export function isoWeekKey(date = new Date()): string {
  // Work on a copy at midnight so DST shifts can't move us across a day boundary.
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Shift to the Thursday of this ISO week (getDay(): Sun=0 … Sat=6).
  const dayOfWeek = (target.getDay() + 6) % 7; // Mon=0 … Sun=6
  target.setDate(target.getDate() - dayOfWeek + 3);

  const isoYear = target.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDayOfWeek = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayOfWeek + 3);

  const week =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86_400_000));

  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/**
 * Local calendar date, `YYYY-MM-DD`.
 *
 * Built from local getters rather than `toISOString()`, which converts to UTC and
 * would roll the date over at the wrong time of day for anyone west of Greenwich.
 */
export function dayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
