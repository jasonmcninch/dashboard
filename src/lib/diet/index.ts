import { dayKey } from "../calendar";
import { JsonStore } from "../json-store";

// Diet tracking. One number a day for now: how satisfied you felt with what you
// ate. Resets daily like the spiritual checklist; every day is retained so a
// trend is available later.

/**
 * Slider bounds, as a percentage.
 *
 * 0–100 in steps of 1 rather than 0–10: eleven positions across a full-width
 * track moves in visible jumps, while a hundred reads as continuous. The stored
 * value is the percentage, so no conversion is needed for display.
 */
export const SATISFACTION_MIN = 0;
export const SATISFACTION_MAX = 100;

/** Where the slider sits before it has ever been set. */
export const SATISFACTION_DEFAULT = 50;

/** Bumped when the stored shape changes, so old files can be migrated on read. */
const CURRENT_VERSION = 2;

type DietFile = {
  /** Absent on files written before the 0–100 change. */
  version?: number;
  /** day key -> satisfaction percentage. Absent day means never recorded. */
  satisfaction: Record<string, number>;
};

const store = new JsonStore<DietFile>(
  "diet.json",
  () => ({ version: CURRENT_VERSION, satisfaction: {} }),
  (parsed) =>
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as DietFile).satisfaction === "object",
);

/**
 * Rescales pre-v2 files from the old 0–10 scale to 0–100.
 *
 * Version-gated rather than value-sniffing: a stored `8` is ambiguous on its own
 * (8 out of 10, or 8%?), so guessing from the number would silently corrupt
 * whichever reading was wrong.
 */
function migrate(file: DietFile): { file: DietFile; changed: boolean } {
  if (file.version === CURRENT_VERSION) return { file, changed: false };
  for (const [day, score] of Object.entries(file.satisfaction)) {
    file.satisfaction[day] = Math.min(100, Math.max(0, Math.round(score * 10)));
  }
  file.version = CURRENT_VERSION;
  return { file, changed: true };
}

export type Diet = {
  /** Local date this covers, `YYYY-MM-DD`. */
  day: string;
  /**
   * Today's score, or `null` if never set today.
   *
   * Kept distinct from a default so the UI can show "—" rather than implying you
   * rated the day a 5 when you simply haven't rated it.
   */
  satisfaction: number | null;
};

export function isValidSatisfaction(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= SATISFACTION_MIN &&
    value <= SATISFACTION_MAX
  );
}

export async function getDiet(today = dayKey()): Promise<Diet> {
  const raw = await store.read();
  const { file, changed } = migrate(raw);

  // Persist the rescale so it happens once rather than on every read.
  if (changed) await store.update((current) => void migrate(current));

  const stored = file.satisfaction[today];
  return {
    day: today,
    satisfaction: isValidSatisfaction(stored) ? stored : null,
  };
}

export async function setSatisfaction(
  score: number,
  today = dayKey(),
): Promise<void> {
  await store.update((file) => {
    migrate(file);
    file.satisfaction[today] = score;
  });
}

/** Every recorded day, newest first. Kept for trends. */
export async function getHistory(): Promise<
  { day: string; satisfaction: number }[]
> {
  const file = await store.read();
  return Object.entries(file.satisfaction)
    .map(([day, satisfaction]) => ({ day, satisfaction }))
    .sort((a, b) => b.day.localeCompare(a.day));
}
