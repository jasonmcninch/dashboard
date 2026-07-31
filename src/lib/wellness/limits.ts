// Client-safe constants. No filesystem imports.
//
// Separate from ./store for the same reason spiritual/types.ts is: importing the
// store from a "use client" component drags `node:fs/promises` into the browser
// bundle and fails the build.

/** Longest goal accepted. Bounds the stored file against a runaway paste. */
export const GOAL_MAX_LENGTH = 120;
