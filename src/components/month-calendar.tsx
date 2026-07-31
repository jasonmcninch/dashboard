"use client";

import { useState } from "react";
import { knock } from "@/lib/haptics";

const CORAL = "#E8624A";

/**
 * Google Calendar's event-composer URL, prefilled for one all-day date.
 *
 * This is a deep link, not an API call — creating events through the Calendar API
 * needs OAuth, and unlike Gmail there is no app-password path. So the app hands
 * off to Google's own composer with the date filled in, and you finish there.
 *
 * `dates` is an inclusive start / exclusive end pair, so a single day needs the
 * following day as the end.
 */
function composerUrl(date: Date, title: string): string {
  const stamp = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${stamp(date)}/${stamp(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function MonthCalendar({
  eventTitle,
  onPick,
}: {
  /** Prefilled title for a newly created event. */
  eventTitle: string;
  /** Called with the tapped date, for callers that want to react. */
  onPick?: (date: Date) => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // Monday-first offset: getDay() is Sunday-based.
  const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7;

  const isToday = (day: number) =>
    day === today.getDate() &&
    monthIndex === today.getMonth() &&
    year === today.getFullYear();

  const shift = (by: number) =>
    setMonth(new Date(year, monthIndex + by, 1));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="rounded-full px-2 py-1 text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--c-text-dim)" }}
        >
          ‹
        </button>
        <span className="text-[11px] font-bold">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="rounded-full px-2 py-1 text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--c-text-dim)" }}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="pb-1 text-[9px] uppercase"
            style={{ color: "var(--c-text-faint)" }}
          >
            {label}
          </span>
        ))}

        {/* Blank cells so the 1st lands on the right weekday. */}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const date = new Date(year, monthIndex, day);
          return (
            <a
              key={day}
              href={composerUrl(date, eventTitle)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                knock();
                onPick?.(date);
              }}
              className="flex aspect-square items-center justify-center rounded-lg text-[11px] transition-opacity hover:opacity-70"
              style={{
                background: isToday(day) ? CORAL : "var(--c-surface)",
                color: isToday(day) ? "#fff" : "var(--c-text)",
                border: "1px solid var(--c-border)",
                fontWeight: isToday(day) ? 700 : 400,
              }}
              aria-label={`Create an event on ${date.toDateString()}`}
            >
              {day}
            </a>
          );
        })}
      </div>

      <p className="mt-2 text-[10px]" style={{ color: "var(--c-text-faint)" }}>
        Tap a date to create an event in Google Calendar.
      </p>
    </div>
  );
}
