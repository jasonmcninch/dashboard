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
      <span className="theme-knob" aria-hidden />
    </button>
  );
}
