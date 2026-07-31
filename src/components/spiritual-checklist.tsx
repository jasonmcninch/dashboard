"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CircleCheck } from "@/components/circle-check";
// Imported from the leaf modules, not the @/lib/spiritual barrel: the barrel
// re-exports the filesystem-backed store, and pulling that into a client
// component drags `node:fs/promises` into the browser bundle and fails the build.
import {
  BOOKS,
  chaptersIn,
  CHURCH_HOME,
  studyUrl,
} from "@/lib/spiritual/book-of-mormon";
import { TOPIC_MAX_LENGTH, type Spiritual } from "@/lib/spiritual/types";

const CORAL = "#E8624A";

const surface = {
  background: "var(--c-surface)",
  backdropFilter: "var(--c-blur)",
  WebkitBackdropFilter: "var(--c-blur)",
  boxShadow: "var(--c-shadow-sm)",
  border: "1px solid var(--c-border)",
} as const;

const selectStyle = {
  border: "1px solid var(--c-border-dim)",
  background: "var(--c-surface)",
  color: "var(--c-text)",
  // Keep the platform picker: on iOS a native <select> opens the wheel, which is
  // a far better one-handed experience than anything custom.
} as const;

function ChapterPicker({
  book,
  chapter,
  onChange,
  disabled,
}: {
  book: string;
  chapter: number;
  onChange: (book: string, chapter: number) => void;
  disabled: boolean;
}) {
  const chapterCount = chaptersIn(book);

  return (
    <span className="mt-1.5 flex items-center gap-1.5">
      <select
        value={book}
        disabled={disabled}
        // Changing book resets to chapter 1 — the old chapter number may not
        // exist in the new book (Alma 63 -> Enos would be out of range).
        onChange={(event) => onChange(event.target.value, 1)}
        aria-label="Book"
        className="rounded-full px-2.5 py-1 text-[11px] outline-none disabled:opacity-50"
        style={selectStyle}
      >
        {BOOKS.map((entry) => (
          <option key={entry.name} value={entry.name}>
            {entry.name}
          </option>
        ))}
      </select>
      <select
        value={chapter}
        disabled={disabled}
        onChange={(event) => onChange(book, Number(event.target.value))}
        aria-label="Chapter"
        className="rounded-full px-2.5 py-1 text-[11px] outline-none disabled:opacity-50"
        style={selectStyle}
      >
        {Array.from({ length: chapterCount }, (_, index) => index + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </span>
  );
}

export function SpiritualChecklist({ initial }: { initial: Spiritual }) {
  const [spiritual, setSpiritual] = useState(initial);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, unknown>, optimistic: Spiritual) {
    const previous = spiritual;
    setSpiritual(optimistic);
    setError(null);
    try {
      const response = await fetch("/api/spiritual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(String(response.status));
      setSpiritual(await response.json());
    } catch {
      // Roll back so the UI never claims something saved when it didn't.
      setSpiritual(previous);
      setError("Couldn't save that — check the server is running.");
    }
  }

  function toggle(item: string, done: boolean) {
    const rows = spiritual.rows.map((row) =>
      row.item === item ? { ...row, done } : row,
    );
    const completedPct = Math.round(
      (rows.filter((r) => r.done).length / rows.length) * 100,
    );
    void send({ action: "toggle", item, done }, { ...spiritual, rows, completedPct });
  }

  function setReading(item: string, book: string, chapter: number) {
    const rows = spiritual.rows.map((row) =>
      row.item === item ? { ...row, reading: { book, chapter } } : row,
    );
    void send({ action: "position", item, book, chapter }, { ...spiritual, rows });
  }

  return (
    <div>
      {/* Date only — the percentage lives in the ScoreBox beside this. */}
      <p
        className="mb-3 text-[10px] uppercase tracking-[0.2em]"
        style={{ color: "var(--c-text-faint)" }}
      >
        {spiritual.day}
      </p>

      <div className="space-y-2">
        {spiritual.rows.map((row) => (
          <div
            key={row.item}
            className="flex items-start justify-between gap-3 rounded-[18px] px-4 py-3"
            style={surface}
          >
            <span className="min-w-0">
              {/*
                The title is a link. On a phone the scripture URLs are universal
                links for the Gospel Library app, so tapping the title opens the
                chapter in the app; on desktop, or without the app, the same URL
                loads the web page. Deliberately not a custom scheme like
                `ldstools://` — undocumented, and it dead-ends when the app is
                missing rather than falling back.
              */}
              <a
                href={row.reading ? studyUrl(row.reading) : CHURCH_HOME}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm font-bold transition-opacity hover:opacity-70"
                style={{ textDecoration: "none" }}
              >
                {row.label}
                <span
                  aria-hidden
                  className="pl-1 text-[10px]"
                  style={{ color: "var(--c-text-faint)" }}
                >
                  ↗
                </span>
              </a>
              {row.reading ? (
                // Not wrapped in the checkbox's <label>: tapping a picker must
                // open it, not toggle the row.
                <ChapterPicker
                  book={row.reading.book}
                  chapter={row.reading.chapter}
                  disabled={row.done}
                  onChange={(book, chapter) => setReading(row.item, book, chapter)}
                />
              ) : null}
              {row.done && row.reading && (
                <span
                  className="mt-1 block text-[10px] uppercase tracking-wider"
                  style={{ color: CORAL }}
                >
                  read · advances tomorrow
                </span>
              )}
            </span>

            <span className="pt-0.5">
              <CircleCheck
                checked={row.done}
                label={
                  row.reading
                    ? `${row.label} — ${row.reading.book} ${row.reading.chapter}`
                    : row.label
                }
                onChange={(next) =>
                  startTransition(() => toggle(row.item, next))
                }
              />
            </span>
          </div>
        ))}
      </div>

      {/* Keyed by week so a new week remounts with a fresh (empty) field —
          React's recommended alternative to resetting state in an effect. */}
      <TopicField
        key={spiritual.week}
        initial={spiritual.topic}
        onError={setError}
      />

      {error && (
        <p role="alert" className="mt-3 text-[11px]" style={{ color: CORAL }}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The week's study topic.
 *
 * Holds its own draft state rather than lifting it up: typing shouldn't re-render
 * the whole checklist, and the value must not be clobbered mid-keystroke by a
 * response arriving from an unrelated checkbox toggle.
 */
function TopicField({
  initial,
  onError,
}: {
  initial: string;
  onError: (message: string | null) => void;
}) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initial);

  async function save(value: string) {
    if (value === latest.current) return; // nothing changed
    latest.current = value;
    onError(null);
    try {
      const response = await fetch("/api/spiritual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "topic", text: value }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      onError("Couldn't save the topic — check the server is running.");
    }
  }

  function onChange(value: string) {
    setText(value);
    // Debounce: save 700ms after typing stops rather than per keystroke, which
    // would be one disk write per character.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(value), 700);
  }

  // Flush a pending save if the component goes away mid-debounce.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--c-border)" }}>
      <label className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span
          className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: CORAL }}
        >
          Current Topic:
        </span>
        <span className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={text}
            maxLength={TOPIC_MAX_LENGTH}
            placeholder="What are you studying this week?"
            onChange={(event) => onChange(event.target.value)}
            // Commit immediately on blur and on Enter, so leaving the field never
            // loses a change still sitting in the debounce window.
            onBlur={() => {
              if (timer.current) clearTimeout(timer.current);
              void save(text);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="w-full rounded-full px-4 py-2 text-[12px] outline-none"
            style={{
              border: "1px solid var(--c-border-dim)",
              background: "var(--c-surface)",
              color: "var(--c-text)",
            }}
          />
          <span
            aria-live="polite"
            className="w-10 shrink-0 text-[10px] transition-opacity"
            style={{ color: CORAL, opacity: saved ? 1 : 0 }}
          >
            saved
          </span>
        </span>
      </label>
    </div>
  );
}
