// Pure types and cadence definitions — no filesystem imports, so client
// components can use them without dragging node:fs into the browser bundle.

export const FAMILY_ITEMS = [
  "date",
  "kristenSpace",
  "kristenValidate",
  "leadership",
] as const;

export type FamilyItemKey = (typeof FAMILY_ITEMS)[number];

/**
 * How often each row clears.
 *
 * Three different cadences in one section, deliberately: the date follows the
 * two-week rotation, the Kristen rows are daily intentions, and leadership is a
 * weekly planning task.
 */
export type Cadence = "turn" | "day" | "week";

export const CADENCE: Record<FamilyItemKey, Cadence> = {
  date: "turn",
  kristenSpace: "day",
  kristenValidate: "day",
  leadership: "week",
};

export const FAMILY_LABELS: Record<FamilyItemKey, string> = {
  date: "Daddy-Daughter Date",
  kristenSpace: "Kristen: Give Space",
  kristenValidate: "Kristen: Validate",
  leadership: "Leadership",
};

export const FAMILY_SUBTEXT: Partial<Record<FamilyItemKey, string>> = {
  leadership: "Plan & Execute a lesson and an activity",
};

/** Human wording for each cadence, shown under the row. */
export const CADENCE_LABEL: Record<Cadence, string> = {
  turn: "this turn",
  day: "today",
  week: "this week",
};

/** Longest date note accepted. */
export const NOTE_MAX_LENGTH = 200;

export type FamilyRow = {
  item: FamilyItemKey;
  label: string;
  subtext?: string;
  cadence: Cadence;
  done: boolean;
  /** Free-text note. Only the date row uses one. */
  note?: string;
  /** Whose turn it is. Only on the date row. */
  daughter?: string;
};

export type Family = {
  rows: FamilyRow[];
  /** Completed rows ÷ total rows, as a percentage. */
  completedPct: number;
  /** First day of the current daddy-daughter turn, `YYYY-MM-DD`. */
  turnStart: string;
};

export function isFamilyItemKey(value: unknown): value is FamilyItemKey {
  return (
    typeof value === "string" &&
    (FAMILY_ITEMS as readonly string[]).includes(value)
  );
}
