import { dayKey, isoWeekKey } from "../calendar";
import { getDay, getTopic } from "./store";
import { ITEMS, type ReadingItemKey, type Spiritual, type SpiritualRow } from "./types";
import { getLabels } from "../settings";

// Server-side entry point. Touches the filesystem via ./store, so this must not
// be imported from a "use client" component — import ./types and
// ./book-of-mormon directly there instead.

export * from "./book-of-mormon";
export * from "./types";
export { dayKey, getHistory, getTopic, setDone, setReading, setTopic } from "./store";
export type { SpiritualDay } from "./store";

export async function getSpiritual(on = new Date()): Promise<Spiritual> {
  const [state, topic, labels] = await Promise.all([
    getDay(dayKey(on)),
    getTopic(isoWeekKey(on)),
    getLabels(),
  ]);

  const rows: SpiritualRow[] = ITEMS.map((item) => ({
    item,
    label: labels[`spiritual.${item}`],
    done: state.done[item],
    reading:
      item === "bom" || item === "family"
        ? state.readings[item as ReadingItemKey]
        : undefined,
  }));

  const completed = rows.filter((row) => row.done).length;

  return {
    day: state.day,
    rows,
    completedPct: rows.length ? Math.round((completed / rows.length) * 100) : 0,
    week: isoWeekKey(on),
    topic,
  };
}
