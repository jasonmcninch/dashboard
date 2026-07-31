import { dayKey, isoWeekKey } from "../calendar";
import { JsonStore } from "../json-store";
import { currentDaughter, turnKey, turnStart } from "./rotation";
import {
  CADENCE,
  FAMILY_ITEMS,
  FAMILY_LABELS,
  FAMILY_SUBTEXT,
  NOTE_MAX_LENGTH,
  type Cadence,
  type Family,
  type FamilyItemKey,
  type FamilyRow,
} from "./types";

export * from "./rotation";
export * from "./types";

// Each row clears on its own cadence, so records are keyed by item AND by that
// item's current period. Storing one flat "today" bucket wouldn't work: the date
// row must survive a day boundary while the Kristen rows must not.

type Record_ = { done?: boolean; note?: string };
type FamilyFile = { items: Record<string, Record<string, Record_>> };

const store = new JsonStore<FamilyFile>(
  "family.json",
  () => ({ items: {} }),
  (parsed) =>
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as FamilyFile).items === "object",
);

/** The period key an item is currently filed under. */
export function periodKey(cadence: Cadence, date = new Date()): string {
  switch (cadence) {
    case "day":
      return dayKey(date);
    case "week":
      return isoWeekKey(date);
    case "turn":
      return turnKey(date);
  }
}

export async function getFamily(): Promise<Family> {
  const file = await store.read();

  const rows: FamilyRow[] = FAMILY_ITEMS.map((item) => {
    const cadence = CADENCE[item];
    const record = file.items[item]?.[periodKey(cadence)] ?? {};
    return {
      item,
      label: FAMILY_LABELS[item],
      subtext: FAMILY_SUBTEXT[item],
      cadence,
      done: record.done === true,
      note: item === "date" ? (record.note ?? "") : undefined,
      daughter: item === "date" ? currentDaughter() : undefined,
    };
  });

  const completed = rows.filter((row) => row.done).length;

  return {
    rows,
    completedPct: rows.length
      ? Math.round((completed / rows.length) * 100)
      : 0,
    turnStart: turnStart(),
  };
}

function mutate(
  item: FamilyItemKey,
  apply: (record: Record_) => void,
): Promise<void> {
  return store.update((file) => {
    const byPeriod = (file.items[item] ??= {});
    const record = (byPeriod[periodKey(CADENCE[item])] ??= {});
    apply(record);
  });
}

export async function setFamilyDone(
  item: FamilyItemKey,
  done: boolean,
): Promise<void> {
  await mutate(item, (record) => {
    if (done) record.done = true;
    else delete record.done;
  });
}

export async function setFamilyNote(
  item: FamilyItemKey,
  note: string,
): Promise<void> {
  const trimmed = note.trim().slice(0, NOTE_MAX_LENGTH);
  await mutate(item, (record) => {
    if (trimmed) record.note = trimmed;
    else delete record.note;
  });
}
