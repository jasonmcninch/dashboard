import { dayKey, isoWeekKey } from "../calendar";
import { JsonStore } from "../json-store";
import {
  isReadingItemKey,
  TOPIC_MAX_LENGTH,
  type ItemKey,
  type ReadingItemKey,
} from "./types";
import {
  FIRST_READING,
  isValidReading,
  nextReading,
  type Reading,
} from "./book-of-mormon";

// Unlike the wellness checklist (weekly), the spiritual checklist resets DAILY.
// Every day is retained so reading position can be derived from history rather
// than kept as a mutable pointer that can drift out of sync.

type DayRecord = {
  done?: Partial<Record<ItemKey, boolean>>;
  /** Chapter chosen (or defaulted) for each reading item on this day. */
  readings?: Partial<Record<ReadingItemKey, Reading>>;
};

type SpiritualFile = {
  days: Record<string, DayRecord>;
  /**
   * Study topic per ISO week. Weekly, unlike the checklist above, which is daily —
   * a topic carries across the whole week's reading.
   *
   * Optional so files written before this existed still load.
   */
  topics?: Record<string, string>;
};

const store = new JsonStore<SpiritualFile>(
  "spiritual.json",
  () => ({ days: {} }),
  (parsed) =>
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as SpiritualFile).days === "object",
);

export { dayKey };

/**
 * The chapter to show today for one reading item.
 *
 * Derived from history rather than stored as a pointer: whatever position was
 * explicitly set for today wins; otherwise advance from the most recent day the
 * item was actually completed. Skipping days therefore doesn't skip chapters —
 * an unread chapter stays on deck until it's ticked.
 */
function resolveReading(
  file: SpiritualFile,
  item: ReadingItemKey,
  today: string,
): Reading {
  const chosen = file.days[today]?.readings?.[item];
  if (chosen && isValidReading(chosen)) return chosen;

  // Newest first, ignoring today (today has no completion to advance from yet).
  const earlier = Object.keys(file.days)
    .filter((key) => key < today)
    .sort()
    .reverse();

  for (const key of earlier) {
    const record = file.days[key];
    const position = record?.readings?.[item];
    if (!position || !isValidReading(position)) continue;

    // Advance only past a chapter that was actually read. An unread chapter stays
    // on deck — otherwise skipping a day would skip that chapter entirely, and a
    // chapter chosen but never ticked would be forgotten back to 1 Nephi 1.
    return record.done?.[item] === true ? nextReading(position) : position;
  }

  return FIRST_READING;
}

export type SpiritualDay = {
  day: string;
  done: Record<ItemKey, boolean>;
  readings: Record<ReadingItemKey, Reading>;
};

export async function getDay(today = dayKey()): Promise<SpiritualDay> {
  const file = await store.read();
  const record = file.days[today] ?? {};

  return {
    day: today,
    done: {
      bom: record.done?.bom === true,
      personal: record.done?.personal === true,
      family: record.done?.family === true,
      prayer: record.done?.prayer === true,
    },
    readings: {
      bom: resolveReading(file, "bom", today),
      family: resolveReading(file, "family", today),
    },
  };
}

export async function setDone(
  item: ItemKey,
  done: boolean,
  today = dayKey(),
): Promise<void> {
  await store.update((file) => {
    const record = (file.days[today] ??= {});
    const flags = (record.done ??= {});

    if (done) {
      flags[item] = true;
      // Pin the position being completed. Without this, tomorrow's "advance from
      // the last completed day" has nothing to advance from, and the tracker
      // would reset to 1 Nephi 1.
      if (isReadingItemKey(item)) {
        const readings = (record.readings ??= {});
        readings[item] ??= resolveReading(file, item, today);
      }
    } else {
      delete flags[item];
    }
  });
}

export async function setReading(
  item: ReadingItemKey,
  reading: Reading,
  today = dayKey(),
): Promise<void> {
  await store.update((file) => {
    const record = (file.days[today] ??= {});
    const readings = (record.readings ??= {});
    readings[item] = reading;
  });
}

/** This week's study topic, or "" if none set. */
export async function getTopic(week = isoWeekKey()): Promise<string> {
  const file = await store.read();
  return file.topics?.[week] ?? "";
}

export async function setTopic(
  text: string,
  week = isoWeekKey(),
): Promise<void> {
  const trimmed = text.trim().slice(0, TOPIC_MAX_LENGTH);
  await store.update((file) => {
    const topics = (file.topics ??= {});
    // Drop empties rather than storing "" for every week the field was cleared.
    if (trimmed) topics[week] = trimmed;
    else delete topics[week];
  });
}

/** Every recorded day, newest first. Kept for history and streaks. */
export async function getHistory(): Promise<
  { day: string; record: DayRecord }[]
> {
  const file = await store.read();
  return Object.entries(file.days)
    .map(([day, record]) => ({ day, record }))
    .sort((a, b) => b.day.localeCompare(a.day));
}
