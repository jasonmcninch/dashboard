/**
 * A single short "knock" pulse.
 *
 * ⚠️ Android only in practice. iOS Safari does not implement the Vibration API —
 * `navigator.vibrate` is simply absent there, so this is a silent no-op on
 * iPhone and iPad, including when installed to the home screen as a PWA. There
 * is no JavaScript route to Taptic Engine feedback from a web page; the only
 * native-haptic path Safari exposes is the `switch` attribute on a real
 * `<input type="checkbox">`, which brings its own iOS-drawn switch UI.
 *
 * 12ms is short enough to read as one crisp tap rather than a buzz.
 */
export function knock(): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;

  try {
    navigator.vibrate(12);
  } catch {
    // Some browsers throw if the page hasn't been interacted with, or when the
    // user has disabled vibration. Never let feedback break the interaction.
  }
}
