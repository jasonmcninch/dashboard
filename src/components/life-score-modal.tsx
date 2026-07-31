"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LifeScore } from "@/components/life-score";
import { EASE_OUT } from "@/lib/motion";

const CORAL = "#E8624A";

export type WeekScore = {
  week: string;
  score: number | null;
  days: number;
  start: string;
};

const panel = {
  background: "var(--c-surface2)",
  backdropFilter: "var(--c-blur)",
  WebkitBackdropFilter: "var(--c-blur)",
  boxShadow: "var(--c-shadow)",
  border: "1px solid var(--c-border)",
} as const;

/** "Aug 3" from a YYYY-MM-DD key, parsed as local rather than UTC. */
function shortDate(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * The dial, plus a comparison of recent weeks behind a tap.
 *
 * A thin client wrapper: `LifeScore` itself stays a server component with no
 * interactivity, and only this shell ships to the browser.
 */
export function LifeScoreModal({
  pct,
  weeks,
  dialLine1,
  dialLine2,
}: {
  pct: number | null;
  weeks: WeekScore[];
  /** The dial's two caption lines. Renameable in settings. */
  dialLine1: string;
  dialLine2: string;
}) {
  const [open, setOpen] = useState(false);

  // Escape closes, and the page behind doesn't scroll while the sheet is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const [current, ...previous] = weeks;
  const lastWeek = previous[0];

  // Chart scale: oldest on the left so time reads left-to-right, and a floor of 100
  // so a good week doesn't make a bad one look full-height by comparison.
  const chart = [...weeks].reverse();
  const change =
    current?.score != null && lastWeek?.score != null
      ? current.score - lastWeek.score
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Life score this week — see previous weeks"
        className="block w-full cursor-pointer border-0 bg-transparent p-0 transition-opacity hover:opacity-90"
      >
        <LifeScore pct={pct} line1={dialLine1} line2={dialLine2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop. Clicking it closes; it's a button so keyboard users get the
                same affordance rather than only Escape. */}
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default border-0 p-0"
              style={{ background: "var(--c-scrim)", backdropFilter: "blur(3px)" }}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Life score history"
              initial={{ y: 28, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.32, ease: EASE_OUT }}
              className="relative m-4 w-full max-w-md rounded-2xl p-5"
              style={panel}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: "var(--c-text-faint)" }}
                  >
                    Life Score
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {current?.score ?? "—"}
                    {current?.score != null && (
                      <span
                        className="pl-0.5 text-sm"
                        style={{ color: "var(--c-text-dim)" }}
                      >
                        %
                      </span>
                    )}
                    {change !== null && (
                      <span
                        className="pl-2 text-[12px] font-bold"
                        style={{ color: change >= 0 ? "#4ADE80" : CORAL }}
                      >
                        {change >= 0 ? "▲" : "▼"} {Math.abs(change)}
                      </span>
                    )}
                  </p>
                  <p
                    className="mt-0.5 text-[11px]"
                    style={{ color: "var(--c-text-dim)" }}
                  >
                    {change === null
                      ? "No previous week to compare yet"
                      : `vs ${lastWeek.score}% last week`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3 py-1 text-[11px] transition-opacity hover:opacity-70"
                  style={{
                    border: "1px solid var(--c-border-dim)",
                    color: "var(--c-text-dim)",
                  }}
                >
                  Close
                </button>
              </div>

              {/* Bars. Height is the percentage directly against a fixed 100 scale,
                  so weeks are comparable between visits rather than being normalised
                  against whatever the best week happened to be. */}
              <div className="flex h-40 items-end justify-between gap-2">
                {chart.map((entry, index) => {
                  const isCurrent = index === chart.length - 1;
                  const recorded = entry.score !== null;
                  return (
                    <div
                      key={entry.week}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span
                        className="text-[10px] font-bold tabular-nums"
                        style={{
                          color: recorded
                            ? isCurrent
                              ? CORAL
                              : "var(--c-text-dim)"
                            : "var(--c-text-faint)",
                        }}
                      >
                        {recorded ? entry.score : "—"}
                      </span>
                      <div
                        className="w-full rounded-t-md"
                        style={{
                          // A 3px floor keeps an empty week visible as a baseline
                          // rather than vanishing entirely.
                          height: `${recorded ? Math.max(3, entry.score!) : 3}%`,
                          background: isCurrent
                            ? `linear-gradient(180deg, #F2795F 0%, ${CORAL} 100%)`
                            : recorded
                              ? "var(--c-bar-track)"
                              : "var(--c-bar-track-dim)",
                        }}
                      />
                      <span
                        className="text-[9px]"
                        style={{ color: "var(--c-text-faint)" }}
                      >
                        {shortDate(entry.start)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p
                className="mt-4 text-[10px] leading-relaxed"
                style={{ color: "var(--c-text-faint)" }}
              >
                Each week is the average of the days recorded in it.
                {current && current.days < 7 && (
                  <>
                    {" "}
                    This week has {current.days}{" "}
                    {current.days === 1 ? "day" : "days"} so far.
                  </>
                )}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
