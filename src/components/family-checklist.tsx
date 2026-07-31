"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CircleCheck } from "@/components/circle-check";
import { MonthCalendar } from "@/components/month-calendar";
import {
  CADENCE_LABEL,
  NOTE_MAX_LENGTH,
  type Family,
} from "@/lib/family/types";

const CORAL = "#E8624A";

const surface = {
  background: "var(--c-surface)",
  backdropFilter: "var(--c-blur)",
  WebkitBackdropFilter: "var(--c-blur)",
  boxShadow: "var(--c-shadow-sm)",
  border: "1px solid var(--c-border)",
} as const;

export function FamilyChecklist({ initial }: { initial: Family }) {
  const [family, setFamily] = useState(initial);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, unknown>, optimistic: Family) {
    const previous = family;
    setFamily(optimistic);
    setError(null);
    try {
      const response = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(String(response.status));
      setFamily(await response.json());
    } catch {
      setFamily(previous);
      setError("Couldn't save that — check the server is running.");
    }
  }

  function toggle(item: string, done: boolean) {
    const rows = family.rows.map((row) =>
      row.item === item ? { ...row, done } : row,
    );
    void send(
      { action: "toggle", item, done },
      {
        ...family,
        rows,
        completedPct: Math.round(
          (rows.filter((r) => r.done).length / rows.length) * 100,
        ),
      },
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {family.rows.map((row) => (
          <div
            key={row.item}
            className="rounded-[18px] px-4 py-3"
            style={surface}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{row.label}</span>
                {row.subtext && (
                  <span
                    className="mt-0.5 block text-[11px]"
                    style={{ color: "var(--c-text-dim)" }}
                  >
                    {row.subtext}
                  </span>
                )}
                <span
                  className="mt-0.5 block text-[9px] uppercase tracking-wider"
                  style={{ color: "var(--c-text-faint)" }}
                >
                  resets {CADENCE_LABEL[row.cadence]}
                </span>
              </span>
              <span className="pt-0.5">
                <CircleCheck
                  checked={row.done}
                  label={row.label}
                  onChange={(next) =>
                    startTransition(() => toggle(row.item, next))
                  }
                />
              </span>
            </div>

            {/* Date row: whose turn it is, plus a note about the outing. */}
            {row.item === "date" && (
              <DateNote
                key={family.turnStart}
                daughter={row.daughter ?? ""}
                initial={row.note ?? ""}
                onSave={(note) =>
                  void send(
                    { action: "note", item: "date", note },
                    {
                      ...family,
                      rows: family.rows.map((r) =>
                        r.item === "date" ? { ...r, note } : r,
                      ),
                    },
                  )
                }
              />
            )}

            {/* Leadership row: pick a date to schedule the lesson and activity. */}
            {row.item === "leadership" && (
              <div
                className="mt-3 border-t pt-3"
                style={{ borderColor: "var(--c-border)" }}
              >
                <MonthCalendar eventTitle="Lesson & Activity" />
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[11px]" style={{ color: CORAL }}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The daddy-daughter note.
 *
 * Own component with own draft state so typing doesn't re-render the whole
 * checklist, and so a response from an unrelated checkbox can't clobber the value
 * mid-keystroke.
 */
function DateNote({
  daughter,
  initial,
  onSave,
}: {
  daughter: string;
  initial: string;
  onSave: (note: string) => void;
}) {
  const [text, setText] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saved = useRef(initial);

  function commit(value: string) {
    if (timer.current) clearTimeout(timer.current);
    if (value === saved.current) return;
    saved.current = value;
    onSave(value);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="mt-2">
      <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
        <span
          className="shrink-0 text-[11px] font-bold"
          style={{ color: CORAL }}
        >
          {daughter}
        </span>
        <input
          type="text"
          value={text}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="What's the big idea?"
          onChange={(event) => {
            setText(event.target.value);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => commit(event.target.value), 700);
          }}
          onBlur={() => commit(text)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="w-full rounded-full px-3 py-1.5 text-[12px] outline-none"
          style={{
            border: "1px solid var(--c-border-dim)",
            background: "var(--c-surface)",
            color: "var(--c-text)",
          }}
        />
      </label>
    </div>
  );
}
