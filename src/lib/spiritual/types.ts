import type { Reading } from "./book-of-mormon";

// Pure types, data, and guards — no filesystem, no server-only imports.
//
// Kept separate from ./store so client components can import them. Importing the
// barrel (./index) from a "use client" file pulls the store's `node:fs/promises`
// into the browser bundle and fails the build.

/** The checklist items, in display order. */
export const ITEMS = ["bom", "personal", "family", "prayer"] as const;
export type ItemKey = (typeof ITEMS)[number];

/** Items that track a Book of Mormon reading position. */
export const READING_ITEMS = ["bom", "family"] as const;
export type ReadingItemKey = (typeof READING_ITEMS)[number];

export const LABELS: Record<ItemKey, string> = {
  bom: "Book of Mormon",
  personal: "Personal Study",
  family: "Family Book of Mormon",
  prayer: "Prayer",
};

export function isItemKey(value: unknown): value is ItemKey {
  return typeof value === "string" && (ITEMS as readonly string[]).includes(value);
}

export function isReadingItemKey(value: unknown): value is ReadingItemKey {
  return (
    typeof value === "string" &&
    (READING_ITEMS as readonly string[]).includes(value)
  );
}

/** One rendered checklist row. */
export type SpiritualRow = {
  item: ItemKey;
  label: string;
  done: boolean;
  /** Present only on rows that track a reading position. */
  reading?: Reading;
};

/** Longest topic accepted. Bounds the stored file against a runaway paste. */
export const TOPIC_MAX_LENGTH = 200;

export type Spiritual = {
  /** Local date the checklist covers, `YYYY-MM-DD`. */
  day: string;
  rows: SpiritualRow[];
  /** Completed rows ÷ total rows, as a percentage. */
  completedPct: number;
  /** ISO week the topic belongs to, e.g. "2026-W31". */
  week: string;
  /** This week's study topic. Empty string when unset. */
  topic: string;
};
