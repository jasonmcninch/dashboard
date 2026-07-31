"use client";

import { useState, useTransition } from "react";
import { CircleCheck } from "@/components/circle-check";
import { GoalField } from "@/components/goal-field";
import type { Wellness } from "@/lib/data/types";
// Imported from the submodule, not the barrel: ./index pulls in the JSON store and
// would drag node:fs/promises into the browser bundle.
import { pctOfCounted } from "@/lib/wellness/schedule";

const CORAL = "#E8624A";

const surface = {
  background: "var(--c-surface)",
  backdropFilter: "var(--c-blur)",
  WebkitBackdropFilter: "var(--c-blur)",
  boxShadow: "var(--c-shadow-sm)",
  border: "1px solid var(--c-border)",
} as const;

export function WellnessChecklist({
  initial,
  goalLabel,
}: {
  initial: Wellness;
  /** Caption on each day's goal field. Renameable in settings. */
  goalLabel: string;
}) {
  const [wellness, setWellness] = useState(initial);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggle(day: string, next: boolean) {
    // Optimistic: flip immediately, reconcile with the server's response.
    const previous = wellness;
    const days = wellness.days.map((d) =>
      d.day === day ? { ...d, done: next } : d,
    );
    setWellness({ ...wellness, days, completedPct: pctOfCounted(days) });
    setError(null);

    try {
      const response = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, done: next }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setWellness(await response.json());
    } catch {
      // Roll back so the UI never claims something was saved when it wasn't.
      setWellness(previous);
      setError("Couldn't save that — check the server is running.");
    }
  }

  return (
    <div>
      {/* Week label only — the percentage lives in the ScoreBox beside this. */}
      <p
        className="mb-3 text-[10px] uppercase tracking-[0.2em]"
        style={{ color: "var(--c-text-faint)" }}
      >
        {wellness.week}
      </p>

      <div className="space-y-2">
        {wellness.days.map((day) => (
          <div
            key={day.day}
            className="rounded-[18px] px-4 py-3"
            style={{
              ...surface,
              // Mark today without relying on colour alone.
              border: day.isToday
                ? `1px solid ${CORAL}55`
                : "1px solid var(--c-border)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-bold">
                {day.label}
                {day.isToday && (
                  <span
                    className="ml-2 text-[9px] uppercase tracking-wider"
                    style={{ color: CORAL }}
                  >
                    today
                  </span>
                )}
              </span>
              <span
                className="mt-0.5 block text-[11px]"
                style={{
                  color: day.done ? CORAL : "var(--c-text-dim)",
                  textDecoration: day.done ? "line-through" : "none",
                }}
              >
                {day.kind}
              </span>
            </span>
            <CircleCheck
              checked={day.done}
              label={`${day.label} — ${day.kind}`}
              onChange={(next) =>
                startTransition(() => void toggle(day.day, next))
              }
            />
            </div>

            {/* Keyed by weekday, not by week: the goal persists, so remounting on a
                new week would be wrong here. */}
            <GoalField
              dayKey={day.day}
              label={day.label}
              initial={day.goal}
              fieldLabel={goalLabel}
              onError={setError}
            />
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
