"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { MonthCalendar } from "@/components/month-calendar";
import { RemindersPanel, type RemindersState } from "@/components/reminders-panel";
import { EASE_OUT } from "@/lib/motion";

const CORAL = "#E8624A";

const panel = {
  background: "var(--c-surface2)",
  backdropFilter: "var(--c-blur)",
  WebkitBackdropFilter: "var(--c-blur)",
  boxShadow: "var(--c-shadow)",
  border: "1px solid var(--c-border)",
} as const;

/**
 * Remembers which week's prompt has been dismissed.
 *
 * localStorage rather than the server: this is per-device UI state, and syncing it
 * would mean dismissing on the laptop also silences the phone. Keyed by ISO week
 * so next Monday brings a fresh prompt without any cleanup.
 */
const DISMISS_KEY = "mcninch:plan-prompt-dismissed";

export function PlanToast({
  week,
  topic,
  reminders,
}: {
  week: string;
  topic: string;
  reminders: RemindersState;
}) {
  // Starts closed and decides on mount: reading localStorage during render would
  // mismatch the server-rendered HTML and trip hydration.
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Monday only. getDay(): 1 = Monday.
    if (new Date().getDay() !== 1) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === week) return;
    } catch {
      // Private browsing can throw on localStorage; showing the prompt is the
      // harmless failure here.
    }
    // The decision depends on localStorage and the client clock, neither of which
    // exists during server rendering. Computing it in a useState initializer would
    // run on the server too and produce a hydration mismatch, so it has to happen
    // after mount. Runs once per week value, not on every render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
  }, [week]);

  function dismiss() {
    setShow(false);
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, week);
    } catch {
      // Nothing to do — it'll prompt again next load, which is acceptable.
    }
  }

  return (
    <>
      <AnimatePresence>
        {show && !open && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            role="status"
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
            style={{ ...panel, border: `1px solid ${CORAL}55` }}
          >
            <span className="min-w-0">
              <span className="block text-sm font-bold">It&apos;s Monday</span>
              <span
                className="mt-0.5 block text-[11px]"
                style={{ color: "var(--c-text-dim)" }}
              >
                Plan for the week.
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-full px-4 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-80"
                style={{ background: CORAL }}
              >
                Plan
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="px-1 text-sm transition-opacity hover:opacity-100"
                style={{ color: "var(--c-text-faint)" }}
              >
                ×
              </button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="mb-8 overflow-hidden"
          >
            <div className="rounded-2xl p-5" style={panel}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: CORAL }}>
                  Plan the week
                </span>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-full px-3 py-1 text-[11px] transition-opacity hover:opacity-70"
                  style={{
                    border: "1px solid var(--c-border-dim)",
                    color: "var(--c-text-dim)",
                  }}
                >
                  Done
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p
                    className="mb-2 text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: "var(--c-text-faint)" }}
                  >
                    Schedule
                  </p>
                  <MonthCalendar eventTitle="Lesson & Activity" />
                </div>

                <div>
                  <p
                    className="mb-2 text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: "var(--c-text-faint)" }}
                  >
                    Tasks
                  </p>
                  <RemindersPanel initial={reminders} />

                  <div
                    className="mt-5 border-t pt-4"
                    style={{ borderColor: "var(--c-border)" }}
                  >
                    <PlanTopic key={week} initial={topic} />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * The same weekly topic as the Spiritual section.
 *
 * A second view onto one stored value rather than a copy: both write to
 * /api/spiritual, so editing here updates there and vice versa on next load.
 */
function PlanTopic({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);

  async function save() {
    try {
      const response = await fetch("/api/spiritual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "topic", text }),
      });
      if (!response.ok) return;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // Silent: the Spiritual section is the primary surface for this field and
      // reports its own errors.
    }
  }

  return (
    <label className="block">
      <span
        className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{ color: CORAL }}
      >
        Current Topic:
      </span>
      <span className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          maxLength={200}
          placeholder="What are you studying this week?"
          onChange={(event) => setText(event.target.value)}
          onBlur={() => void save()}
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
  );
}
