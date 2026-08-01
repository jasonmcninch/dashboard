/**
 * The mañana mark.
 *
 * Traced from the supplied SVG with two changes: the `<style>` block and its `.cls-1`
 * class are gone, and both paths take `currentColor`. The original hard-coded
 * `fill: #020202`, which would have been invisible on the dark theme and unable to pick
 * up the accent — colour now comes from whatever context it sits in, so the same file
 * serves the coral wordmark and the completed-box stamp.
 *
 * The viewBox is the artwork's own 102.42 × 97.84, left as-is so the proportions can't
 * drift from the source.
 */
export function MananaMark({
  size = 20,
  className,
}: {
  /** Rendered width in px. Height follows from the viewBox's aspect ratio. */
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * (97.84 / 102.42)}
      viewBox="0 0 102.42 97.84"
      fill="currentColor"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d="M76.8,24.94h-23.66s-5.69-3.56-6.76-9.79h10.68s6.58.71,9.43,8.01v-8.01s10.32,1.13,10.32,9.79Z" />
      <path d="M77.11,33.6l6.44-5.37h-16.9v21.48h-8.54c-.14-12.56-10.35-22.7-22.95-22.7s-22.95,10.28-22.95,22.95h11.37c-3.18,3.61-3.01,8.96-3.01,8.96h13.1c3.55,8.09,11.62,13.74,21.02,13.74,12.68,0,22.95-10.28,22.95-22.95l-.02.13v-5.37s2.3.71,3.98-1.91c2.18-3.41-.92-6.09-.92-6.09l-3.58-2.86ZM71.3,33.57c-.76,0-1.38-.62-1.38-1.38s.62-1.38,1.38-1.38,1.38.62,1.38,1.38-.62,1.38-1.38,1.38Z" />
    </svg>
  );
}
