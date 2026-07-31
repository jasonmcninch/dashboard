"use client";

import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Light/dark switch for the dashboard nav.
 *
 * Holds no React state. The theme lives in one place — `data-theme` on the root
 * element — and every themed value in the app is a CSS custom property keyed off it,
 * so flipping the attribute repaints the page without React re-rendering anything.
 *
 * That isn't just an optimisation. An inline script in the layout restores the saved
 * theme before first paint, which means by the time this component hydrates the root
 * may already say "light" while the server-rendered HTML was built as "dark". A
 * component holding the theme in state would have to reconcile that and would report a
 * hydration mismatch; markup that doesn't depend on the theme at all cannot.
 *
 * The knob's position comes from a CSS rule on `[data-theme="light"]`, so the two
 * states can't drift apart from whatever the attribute actually says.
 */
export function ThemeToggle() {
  return (
    <button
      type="button"
      className="theme-toggle"
      // Not aria-pressed: without state there's nothing to keep it truthful, and a
      // stale pressed state is worse than none. The label names the action instead.
      aria-label="Toggle light or dark mode"
      title="Toggle light or dark mode"
      data-toggle-bulb
      onClick={() => {
        const root = document.documentElement;
        const next = root.dataset.theme === "light" ? "dark" : "light";
        root.dataset.theme = next;
        // Tailwind's own dark variant and the shadcn tokens key off this class, so it
        // has to move with the attribute or `body`'s background would stay put.
        root.classList.toggle("dark", next === "dark");
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Safari in private mode throws on write. The toggle still works for this
          // page view; it just won't be remembered.
        }
      }}
    >
      {/* A bulb: outline while the page is dark, filled once it's lit. Both states are
          the same path — only the glass's fill and the icon's colour change, which is
          what keeps this driveable from CSS with no React state. */}
      <svg
        className="theme-bulb"
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {/* Glass. `bulb-glass` is what CSS fills in light mode. */}
        <path
          className="bulb-glass"
          d="M12 3a6 6 0 0 0-3.4 10.9c.4.3.6.8.6 1.3v.3h5.6v-.3c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z"
        />
        {/* Screw base: two contacts under the glass. */}
        <path d="M9.6 18.2h4.8" />
        <path d="M10.7 20.7h2.6" />
      </svg>
    </button>
  );
}
