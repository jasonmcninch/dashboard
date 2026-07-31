"use client";

import { useEffect, useRef, useState } from "react";
import { GOAL_MAX_LENGTH } from "@/lib/wellness/limits";

const CORAL = "#E8624A";

/**
 * A weekday's standing goal.
 *
 * Its own component with its own draft state so typing in one row doesn't re-render
 * the whole checklist, and so a response arriving from a checkbox toggle elsewhere
 * can't overwrite what's being typed here.
 *
 * Unlike the topic and date-note fields, this is NOT keyed for remounting: the goal
 * persists until changed, so there's no period boundary at which it should reset.
 */
export function GoalField({
  dayKey,
  label,
  initial,
  fieldLabel,
  onError,
}: {
  dayKey: string;
  /** Day name, used for the accessible label. */
  label: string;
  initial: string;
  /** The visible caption, e.g. "Goal". Renameable in settings. */
  fieldLabel: string;
  onError: (message: string | null) => void;
}) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(initial);

  async function save(value: string) {
    if (value === lastSaved.current) return;
    lastSaved.current = value;
    onError(null);
    try {
      const response = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: dayKey, goal: value }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    } catch {
      onError("Couldn't save that goal — check the server is running.");
    }
  }

  function commit(value: string) {
    if (timer.current) clearTimeout(timer.current);
    void save(value);
  }

  // Flush nothing on unmount, just stop the pending timer — a save already in flight
  // is unaffected.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="mt-2 flex items-center gap-2">
      <label
        htmlFor={`goal-${dayKey}`}
        className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: CORAL }}
      >
        {fieldLabel}
      </label>
      <input
        id={`goal-${dayKey}`}
        type="text"
        value={text}
        maxLength={GOAL_MAX_LENGTH}
        placeholder="What are you aiming for?"
        aria-label={`${label} goal`}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          // Debounce so a sentence isn't one disk write per keystroke.
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void save(next), 700);
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
      <span
        aria-live="polite"
        className="w-8 shrink-0 text-[10px] transition-opacity"
        style={{ color: CORAL, opacity: saved ? 1 : 0 }}
      >
        ✓
      </span>
    </div>
  );
}
