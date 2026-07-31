"use client";

import { motion } from "framer-motion";
import { knock } from "@/lib/haptics";

// Coral, as explicit ramps rather than one token: the neumorphic shading needs a
// lighter and a darker sibling of the accent for the dome's highlight and shadow,
// and a deep desaturated version for the off state.
const CORAL_DOME =
  "linear-gradient(145deg, #FFA592 0%, #F2795F 38%, #DB5A41 70%, #A93D2A 100%)";
const CORAL_DISH =
  "linear-gradient(145deg, #3A1A13 0%, #4A2219 55%, #5A2A1F 100%)";

/**
 * The `switch` attribute, iOS 17.4+.
 *
 * A checkbox carrying this renders as a native iOS switch, and toggling a native
 * control makes iOS fire its own Taptic feedback — the same tap you feel flipping
 * a switch in Settings. There is no JavaScript equivalent: Safari does not
 * implement the Vibration API, so `navigator.vibrate` is a no-op on iOS.
 *
 * Two constraints, both load-bearing:
 *   - Do NOT set `appearance` (or width/height) on the input. The haptic is a side
 *     effect of the *native rendering*; override it and the feedback disappears
 *     along with the switch look. The control is hidden with `opacity` alone.
 *   - The input must be the thing that gets activated.
 *
 * Verified on-device (iOS, 2026-07-31): the haptic fires both when tapping the
 * circle directly and when tapping the surrounding label, i.e. label-forwarded
 * activation counts, so the switch needn't span the whole row.
 *
 * Note the platform asymmetry: iOS's native haptic fires on check *and* uncheck
 * and can't be suppressed, while `knock()` fires only on check.
 *
 * React doesn't type this attribute, hence the cast.
 */
const IOS_SWITCH = {
  switch: "",
} as unknown as React.InputHTMLAttributes<HTMLInputElement>;

/**
 * The visible button. Purely decorative — the hidden input beside it is the control.
 *
 * Two physical states rather than two colours:
 *
 *   unchecked — a convex dome, brightly lit and clearly extruded. It reads as a
 *               button waiting to be pressed.
 *   checked   — a concave dish in deep coral. Pressing it in *is* the completion,
 *               which is the way a physical button actually behaves.
 *
 * Both are coral, so the pair reads as one material in two positions rather than
 * two different controls. The `socket` ring stays constant around both, which is
 * what gives the two-part look.
 *
 * Note both states are distinguished by *shape and lightness*, not hue alone, and
 * the underlying input carries the real checked state for assistive tech.
 */
function Ring({ checked }: { checked: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      // The socket: a shallow recess the button sits in, constant across states.
      style={{
        background: "linear-gradient(145deg, #0e0e0e 0%, #1a1a1a 100%)",
        boxShadow:
          "inset 0 1px 2px rgba(0,0,0,0.9), inset 0 -1px 1px rgba(255,255,255,0.06)",
        padding: 3,
      }}
      // A small squash on press makes the state change feel mechanical.
      animate={{ scale: checked ? 0.97 : 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
    >
      <motion.span
        className="h-full w-full rounded-full"
        initial={false}
        animate={
          checked
            ? {
                // Pressed in. Shadow along the top inside edge with a faint lift at
                // the bottom is what reads as a depression.
                background: CORAL_DISH,
                boxShadow:
                  "inset 0 3px 5px rgba(0,0,0,0.80), inset 0 -1.5px 2px rgba(255,255,255,0.10), 0 1px 0 rgba(255,255,255,0.04)",
              }
            : {
                // Raised. A stronger top highlight and a deeper shadow beneath the
                // inside edge exaggerate the curvature, so it sits more proud of the
                // socket than a subtler bevel would.
                background: CORAL_DOME,
                boxShadow: [
                  "0 3px 7px rgba(0,0,0,0.62)",
                  "inset 0 2px 1.5px rgba(255,255,255,0.62)",
                  "inset 0 -3px 4px rgba(0,0,0,0.38)",
                ].join(", "),
              }
        }
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* A tick inside the pressed dish. Held at 50% opacity so it sits down in
            the shadow with the rest of the recess rather than reading as a bright
            badge on top of it. Scaled rather than mounted/unmounted so it animates
            out as well as in.

            Delayed on the way IN so it lands after the button has finished pressing
            down — a spring with no delay starts moving immediately and reads as the
            tick arriving before the press, which inverts cause and effect. Nothing
            on the way OUT, because releasing should feel instant. */}
        <motion.svg
          className="h-full w-full"
          viewBox="0 0 24 24"
          initial={false}
          animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 0.5 : 0 }}
          transition={{
            type: "spring",
            stiffness: 520,
            damping: 26,
            // Slightly past the dish's 0.22s so the two don't overlap at all.
            delay: checked ? 0.24 : 0,
          }}
        >
          <path
            d="M7.5 12.4 L10.6 15.4 L16.6 8.9"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </motion.span>
    </motion.span>
  );
}

/**
 * A circular checkbox that produces haptic feedback on both platforms.
 *
 * Renders a real `<input type="checkbox">` invisibly over the ring so iOS fires
 * its native haptic; `knock()` covers Android, where the native control doesn't.
 */
export function CircleCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name — the row's text isn't necessarily associated with it. */
  label: string;
}) {
  return (
    <label className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center">
      <Ring checked={checked} />
      <input
        {...IOS_SWITCH}
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          // Fire on the tick only, and before any network call so it lands with
          // the tap rather than after the round trip.
          if (event.target.checked) knock();
          onChange(event.target.checked);
        }}
        aria-label={label}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer opacity-0"
        // No `appearance: none` and no width/height: overriding either drops the
        // native rendering, and the iOS haptic goes with it. The switch is wider
        // than the ring (~51px vs 24px); that overhang is a welcome thumb target.
        style={{ margin: 0 }}
      />
    </label>
  );
}
