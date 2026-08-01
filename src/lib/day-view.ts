// Which day the dashboard is showing.
//
// Client-safe: no filesystem imports, so the swipe component can share these rules
// with the server page rather than reimplementing them.

/** How far back you can swipe. Past this, there's no data worth showing. */
export const MAX_DAYS_BACK = 30;

/** Local calendar date, `YYYY-MM-DD`. Duplicated from lib/calendar to stay fs-free. */
export function toDayParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a `?day=` parameter into a local midnight Date.
 *
 * Built from the parts rather than `new Date(string)`: a bare "2026-07-30" is parsed as
 * UTC midnight by the Date constructor, which is the previous evening in Mountain time
 * and would silently show the wrong day.
 *
 * Returns null for anything malformed, in the future, or further back than
 * MAX_DAYS_BACK — all of which fall back to today rather than erroring, since a bad URL
 * shouldn't be a broken page.
 */
export function parseDayParam(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  // Rejects impossible dates like 2026-02-30, which the constructor would roll forward.
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }

  const today = startOfDay(new Date());
  if (date.getTime() > today.getTime()) return null;

  const earliest = startOfDay(new Date());
  earliest.setDate(earliest.getDate() - MAX_DAYS_BACK);
  if (date.getTime() < earliest.getTime()) return null;

  return date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Days between `date` and today. 0 for today, 1 for yesterday. */
export function daysBack(date: Date): number {
  const a = startOfDay(date).getTime();
  const b = startOfDay(new Date()).getTime();
  // Rounded, not floored: a DST boundary makes the difference 23 or 25 hours, and
  // flooring 23/24 would report yesterday as today.
  return Math.round((b - a) / 86_400_000);
}

/** "Yesterday", "Today", or a written date for anything further back. */
export function describeDay(date: Date): string {
  const back = daysBack(date);
  if (back === 0) return "Today";
  if (back === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
