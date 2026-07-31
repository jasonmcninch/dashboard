"use client";

import { useState, useTransition } from "react";
import { CircleCheck } from "@/components/circle-check";

const CORAL = "#E8624A";
const REMINDER_MAX_LENGTH = 200;

const surface = {
  background: "var(--c-surface)",
  backdropFilter: "var(--c-blur)",
  WebkitBackdropFilter: "var(--c-blur)",
  boxShadow: "var(--c-shadow-sm)",
  border: "1px solid var(--c-border)",
} as const;

export type Reminder = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
};

export type RemindersState = {
  items: Reminder[];
  completedPct: number;
};

export function RemindersPanel({ initial }: { initial: RemindersState }) {
  const [state, setState] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, unknown>, optimistic?: RemindersState) {
    const previous = state;
    if (optimistic) setState(optimistic);
    setError(null);
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(String(response.status));
      setState(await response.json());
    } catch {
      setState(previous);
      setError("Couldn't save that — check the server is running.");
    }
  }

  function toggle(id: string, done: boolean) {
    const items = state.items.map((r) => (r.id === id ? { ...r, done } : r));
    void send(
      { action: "toggle", id, done },
      {
        items,
        completedPct: items.length
          ? Math.round((items.filter((r) => r.done).length / items.length) * 100)
          : 100,
      },
    );
  }

  async function add() {
    const text = draft.trim();
    if (!text) {
      setAdding(false);
      return;
    }
    // No optimistic insert: the id is server-generated, and inventing a temporary
    // one would mean reconciling it away on the response.
    setDraft("");
    setAdding(false);
    await send({ action: "add", text });
  }

  return (
    <div>
      <div className="space-y-2">
        {state.items.length === 0 && !adding && (
          <p
            className="py-6 text-center text-[11px]"
            style={{ color: "var(--c-text-faint)" }}
          >
            No reminders.
          </p>
        )}

        {state.items.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-center justify-between gap-3 rounded-[18px] px-4 py-3"
            style={surface}
          >
            <span
              className="min-w-0 flex-1 text-sm"
              style={{
                color: reminder.done ? "var(--c-text-dim)" : "var(--c-text)",
                textDecoration: reminder.done ? "line-through" : "none",
              }}
            >
              {reminder.text}
            </span>
            <button
              type="button"
              onClick={() => void send({ action: "delete", id: reminder.id })}
              aria-label={`Delete reminder: ${reminder.text}`}
              className="shrink-0 px-1 text-sm transition-opacity hover:opacity-100"
              style={{ color: "var(--c-text-faint)", opacity: 0.6 }}
            >
              ×
            </button>
            <CircleCheck
              checked={reminder.done}
              label={reminder.text}
              onChange={(next) =>
                startTransition(() => toggle(reminder.id, next))
              }
            />
          </div>
        ))}

        {adding && (
          <div
            className="flex items-center gap-2 rounded-[18px] px-4 py-3"
            style={surface}
          >
            <input
              type="text"
              autoFocus
              value={draft}
              maxLength={REMINDER_MAX_LENGTH}
              placeholder="What do you need to remember?"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void add();
                // Escape abandons the draft rather than saving a half-typed note.
                if (event.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              // Blur commits, so tapping elsewhere on a phone doesn't lose it.
              onBlur={() => void add()}
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: "var(--c-text)" }}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-3 w-full rounded-full px-4 py-2.5 text-[12px] font-bold transition-opacity hover:opacity-80"
        style={{ border: `1px solid ${CORAL}`, color: CORAL }}
      >
        + Reminder
      </button>

      {error && (
        <p role="alert" className="mt-3 text-[11px]" style={{ color: CORAL }}>
          {error}
        </p>
      )}
    </div>
  );
}
