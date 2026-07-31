"use client";

import { useRef, useState } from "react";
import { click } from "@/lib/click";
import { knock } from "@/lib/haptics";

const CORAL = "#E8624A";

// 0-100 in steps of 1: eleven positions moved in visible jumps, a hundred
// reads as continuous. The stored value IS the percentage.
const SATISFACTION_MIN = 0;
const SATISFACTION_MAX = 100;
const SATISFACTION_DEFAULT = 50;

/**
 * How far the value moves between feedback pulses.
 *
 * The slider still steps by 1 so dragging stays smooth, but firing on every step
 * would be ~100 pulses per sweep — past what the hardware can render as distinct
 * taps, so it degrades into a buzz. Ten detents across the range is what a physical
 * control with notches feels like.
 */
const DETENT = 10;

export type DietState = {
  day: string;
  satisfaction: number | null;
};

export function DietPanel({ initial }: { initial: DietState }) {
  // Track "set" separately from the value: the slider still needs a position
  // before it's ever been dragged, but the readout must not claim you rated
  // today a 5 when you haven't rated it at all.
  const [value, setValue] = useState(initial.satisfaction ?? SATISFACTION_DEFAULT);
  const [isSet, setIsSet] = useState(initial.satisfaction !== null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(initial.satisfaction);
  // Which detent band the value last sat in, so feedback fires on crossings only.
  const lastDetent = useRef(
    Math.round((initial.satisfaction ?? SATISFACTION_DEFAULT) / DETENT),
  );

  async function save(score: number) {
    if (score === lastSaved.current) return;
    lastSaved.current = score;
    setError(null);
    try {
      const response = await fetch("/api/diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ satisfaction: score }),
      });
      if (!response.ok) throw new Error(String(response.status));
    } catch {
      setError("Couldn't save that — check the server is running.");
    }
  }

  function onInput(next: number) {
    // Fire once per detent crossed, not per step. Comparing which band the value
    // falls into means a fast drag that skips several units still gets exactly one
    // pulse per notch rather than none.
    const band = Math.round(next / DETENT);
    if (band !== lastDetent.current) {
      lastDetent.current = band;
      // Both, deliberately: iOS has no Vibration API, so on an iPhone the click is
      // the only feedback available; on Android you get the tap as well.
      knock();
      click();
    }

    setValue(next);
    setIsSet(true);
    // Debounce: dragging fires an event per pixel, and each would be a disk write.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 500);
  }

  function commit(next: number) {
    // Fires on release. Save immediately rather than waiting out the debounce.
    if (timer.current) clearTimeout(timer.current);
    void save(next);
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <label
          htmlFor="satisfaction"
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ color: "var(--c-text-faint)" }}
        >
          Satisfaction Level
        </label>
        <span className="text-sm font-bold" style={{ color: CORAL }}>
          {isSet ? `${value}%` : "—"}
        </span>
      </div>

      {/* The raised outer rim the groove sits inside. A wrapper rather than more
          shadows on the input itself, because the groove is a pseudo-element and can't
          carry a second, outer bevel of its own. */}
      <div
        className="rounded-full px-2.5 py-1"
        style={{
          background: "var(--c-rail)",
          boxShadow:
            "var(--c-rail-shadow)",
        }}
      >
        <input
          id="satisfaction"
          type="range"
          min={SATISFACTION_MIN}
          max={SATISFACTION_MAX}
          step={1}
          value={value}
          onChange={(event) => onInput(Number(event.target.value))}
          // Both: pointerup covers mouse and touch, keyup covers arrow keys.
          onPointerUp={(event) => commit(Number(event.currentTarget.value))}
          onKeyUp={(event) => commit(Number(event.currentTarget.value))}
          aria-valuetext={isSet ? `${value} percent` : "not set"}
          className="detent-slider"
          // Handed to the track pseudo-element, which can't read the value itself but
          // does inherit custom properties. Only shown once rated — an unrated day
          // should read as empty, not as 50%.
          style={{ ["--fill" as string]: isSet ? `${value}%` : "0%" }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[11px]" style={{ color: CORAL }}>
          {error}
        </p>
      )}
    </div>
  );
}
