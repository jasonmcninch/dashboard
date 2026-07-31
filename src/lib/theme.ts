// Theme plumbing, shared between the layout's inline script and the toggle so the
// storage key can't drift between them.
//
// No filesystem imports — this is pulled into the browser bundle.

export const THEME_STORAGE_KEY = "mcninch-theme";

/** The theme the server renders, and the fallback when nothing is stored. */
export const DEFAULT_THEME = "dark";

/**
 * Script that restores the saved theme before the first paint.
 *
 * This has to run synchronously in `<head>`, ahead of any rendering, or the page
 * paints in the server's default and then visibly snaps to the stored choice — the
 * flash-of-wrong-theme every themed site has to solve. A React effect is too late by
 * definition: effects run after paint.
 *
 * Deliberately NOT reading `prefers-color-scheme`. The dashboard is designed dark and
 * most phones sit in light mode, so honouring the OS would flip it for someone who
 * never asked. An explicit choice is remembered; absent one, dark.
 *
 * Minified by hand rather than by the bundler: inline scripts aren't processed, and
 * this one is short enough that clarity survives.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark")t=${JSON.stringify(
  DEFAULT_THEME,
)};var r=document.documentElement;r.dataset.theme=t;r.classList.toggle("dark",t==="dark")}catch(e){}})()`;
