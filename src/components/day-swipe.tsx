"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { MAX_DAYS_BACK, daysBack, toDayParam } from "@/lib/day-view";

/**
 * Horizontal swipe to step through days.
 *
 * Swipe RIGHT (finger travels right, as if dragging the previous page into view) goes
 * back a day; swipe LEFT returns toward today. That matches the direction a stack of
 * pages moves, and it's the same sense as the platform back gesture.
 *
 * Navigation is a URL change rather than component state, so the day is bookmarkable,
 * survives a reload, and is rendered on the server from stored data — there's no
 * client-side cache of "yesterday" that could drift from what's on disk.
 *
 * Renders nothing. It only listens, so it can wrap the page without affecting layout.
 */
export function DaySwipe({ viewing }: { viewing: string }) {
  const router = useRouter();
  // Refs, not state: these change on every touchmove and must not re-render the page.
  const start = useRef<{ x: number; y: number } | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    /** Minimum horizontal travel before this counts as a swipe rather than a tap. */
    const THRESHOLD = 70;
    /**
     * How much more horizontal than vertical the movement has to be.
     *
     * Without this, scrolling the page fires the gesture: a vertical flick almost never
     * travels in a perfectly straight line, so its horizontal component alone will pass
     * a distance threshold.
     */
    const RATIO = 1.7;

    function onStart(event: TouchEvent) {
      if (event.touches.length !== 1) return; // pinch-zoom, not a swipe
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
      settled.current = false;
    }

    function onMove(event: TouchEvent) {
      if (!start.current || settled.current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - start.current.x;
      const dy = touch.clientY - start.current.y;

      if (Math.abs(dx) < THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * RATIO) return;

      // Fire once per touch, on crossing the threshold, rather than waiting for the
      // finger to lift — it makes the page feel like it's responding to the gesture
      // instead of to its end.
      settled.current = true;

      const current = new Date(`${viewing}T00:00:00`);
      const back = daysBack(current);
      const step = dx > 0 ? 1 : -1; // right = further back
      const target = back + step;

      if (target < 0 || target > MAX_DAYS_BACK) return;

      const next = new Date();
      next.setDate(next.getDate() - target);

      // Today drops the parameter entirely, so the canonical URL for the live dashboard
      // stays clean and shareable.
      router.push(target === 0 ? "/dashboard" : `/dashboard?day=${toDayParam(next)}`);
    }

    function onEnd() {
      start.current = null;
    }

    // Passive: this never calls preventDefault, so it must not be allowed to block
    // scrolling while it decides.
    const options = { passive: true } as const;
    document.addEventListener("touchstart", onStart, options);
    document.addEventListener("touchmove", onMove, options);
    document.addEventListener("touchend", onEnd, options);
    document.addEventListener("touchcancel", onEnd, options);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [router, viewing]);

  return null;
}
