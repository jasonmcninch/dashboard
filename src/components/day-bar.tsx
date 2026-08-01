import Link from "next/link";
import { MAX_DAYS_BACK, daysBack, toDayParam } from "@/lib/day-view";

const CORAL = "#E8624A";

/**
 * Which day you're looking at, with arrows either side.
 *
 * The swipe is the intended gesture, but it only exists on a touchscreen and it's
 * invisible until someone happens to try it. These arrows make the same navigation
 * discoverable and usable with a mouse or a keyboard.
 *
 * Only rendered when viewing a past day — on today it would be furniture reminding you
 * that nothing is going on.
 */
export function DayBar({ viewing }: { viewing: Date }) {
  const back = daysBack(viewing);

  const href = (target: number) => {
    if (target <= 0) return "/dashboard";
    const date = new Date();
    date.setDate(date.getDate() - target);
    return `/dashboard?day=${toDayParam(date)}`;
  };

  const label = viewing.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="mb-6 flex items-center justify-between gap-3 rounded-full px-3 py-2"
      style={{
        background: "var(--c-surface)",
        border: `1px solid ${CORAL}55`,
        backdropFilter: "var(--c-blur)",
        WebkitBackdropFilter: "var(--c-blur)",
      }}
    >
      {/* Older. Disabled at the limit rather than hidden, so the control doesn't move
          around as you travel. */}
      {back < MAX_DAYS_BACK ? (
        <Link
          href={href(back + 1)}
          className="nav-icon"
          aria-label="Previous day"
          title="Previous day"
        >
          <Chevron direction="left" />
        </Link>
      ) : (
        <span className="nav-icon opacity-30" aria-hidden>
          <Chevron direction="left" />
        </span>
      )}

      <span className="min-w-0 truncate text-center text-[11px]">
        <span style={{ color: "var(--c-text-dim)" }}>
          {back === 1 ? "Yesterday · " : ""}
        </span>
        <span className="font-bold" style={{ color: CORAL }}>
          {label}
        </span>
      </span>

      <div className="flex items-center gap-1">
        <Link
          href={href(back - 1)}
          className="nav-icon"
          aria-label="Next day"
          title="Next day"
        >
          <Chevron direction="right" />
        </Link>
        {/* An explicit way home. Swiping back day by day from three weeks ago would be
            twenty-one gestures. */}
        <Link
          href="/dashboard"
          className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
          style={{ background: CORAL, color: "#fff" }}
        >
          Today
        </Link>
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="1.15em"
      height="1.15em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={direction === "left" ? "M14.5 5 8 12l6.5 7" : "M9.5 5 16 12l-6.5 7"} />
    </svg>
  );
}
