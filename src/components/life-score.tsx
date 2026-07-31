import { AnimatedBead, AnimatedRingTicks } from "@/components/animated-ring-ticks";

const CORAL = "#E8624A";
const PAGE = "#0a0a0a";

/** Ticks around the bezel. 60 reads as a dense ring without turning into a blur. */
const TICK_COUNT = 60;

const BOX = 380;
const CENTER = BOX / 2;

// Same thickness as before.
const RING_OUTER = 150;
const RING_THICKNESS = 80;
const RING_INNER = RING_OUTER - RING_THICKNESS;
const RING_MID = (RING_OUTER + RING_INNER) / 2;

// How wide the lit and shadowed edges are, and how far they blur.
const EDGE_WIDTH = 9;
const EDGE_BLUR = 6;

// Ticks centred on the ring at a fixed length, measured from the midpoint so
// changing RING_THICKNESS can't stretch them.
const TICK_LENGTH = 20;
const TICK_OUTER = RING_MID + TICK_LENGTH / 2;
const TICK_INNER = RING_MID - TICK_LENGTH / 2;
const TICK_INNER_LONG = TICK_INNER - 6; // every fifth reaches further in

/**
 * An annulus as a single fillable path.
 *
 * Two circles wound the same direction, resolved with `fill-rule: evenodd` to punch
 * the hole.
 */
function annulusPath(cx: number, cy: number, outer: number, inner: number): string {
  const circle = (r: number) =>
    `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  return `${circle(outer)} ${circle(inner)}`;
}

/**
 * The combined score dial: a ring embossed out of the background.
 *
 * Embossing is a different technique from the torus this replaced. A torus is read
 * from shading ACROSS its face — bright crest, dark rims. An emboss is read almost
 * entirely from its EDGES: the face sits at very nearly the background value, and
 * the eye infers a raised form from a lit edge on one side and a shadowed edge
 * opposite. That's why the face here is only a few points above #0a0a0a.
 *
 * The detail that sells it is that the two boundaries are lit in OPPOSITE senses:
 *
 *   outer edge — lit on the upper-left, shadowed on the lower-right. The surface
 *                rises toward the light there.
 *   inner edge — the reverse. It's the wall of a hole, so its upper-left is turned
 *                away from the light and falls into shadow while its lower-right
 *                wall catches it.
 *
 * Light both rims the same way and it reads as a flat sticker with a glow; invert
 * the inner one and it reads as a solid form with a hole punched through it.
 *
 * One honest limit of neumorphism on a near-black page: the shadow side has almost
 * nowhere to go. #0a0a0a can only darken ten steps before it clips to black, so the
 * shadow edges are pushed nearly to full opacity and the highlight carries most of
 * the read.
 *
 * Rendered on the server — it's a readout with no interaction.
 */
export function LifeScore({ pct }: { pct: number | null }) {
  const litTicks = pct === null ? 0 : Math.round((pct / 100) * TICK_COUNT);

  const ticks = Array.from({ length: TICK_COUNT }, (_, index) => {
    // Start at 12 o'clock and run clockwise.
    const angle = (index / TICK_COUNT) * 2 * Math.PI - Math.PI / 2;
    const isMajor = index % 5 === 0;
    const inner = isMajor ? TICK_INNER_LONG : TICK_INNER;
    const lit = index < litTicks;

    return {
      key: index,
      x1: CENTER + Math.cos(angle) * inner,
      y1: CENTER + Math.sin(angle) * inner,
      x2: CENTER + Math.cos(angle) * TICK_OUTER,
      y2: CENTER + Math.sin(angle) * TICK_OUTER,
      lit,
      litStroke: "rgba(255,255,255,0.85)",
      dimStroke: "rgba(255,255,255,0.06)",
      width: isMajor ? 2.4 : 1.5,
    };
  });

  const beadAngle =
    pct === null ? -Math.PI / 2 : (pct / 100) * 2 * Math.PI - Math.PI / 2;
  const beadRadius = RING_MID;

  const ring = annulusPath(CENTER, CENTER, RING_OUTER, RING_INNER);

  return (
    <div className="flex justify-center">
      <div
        className="relative"
        style={{ width: BOX, height: BOX }}
        role="img"
        aria-label={
          pct === null ? "Life score not available" : `Life score ${pct} percent`
        }
      >
        <svg
          className="absolute inset-0"
          width={BOX}
          height={BOX}
          viewBox={`0 0 ${BOX} ${BOX}`}
          aria-hidden
        >
          <defs>
            {/* The face. Barely above the page — an emboss shouldn't read as a
                lighter object sitting on the background, only as the same surface
                deformed. */}
            <linearGradient id="ls-face" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#161616" />
              <stop offset="0.35" stopColor="#131313" />
              <stop offset="0.68" stopColor="#0f0f0f" />
              <stop offset="1" stopColor="#0c0c0c" />
            </linearGradient>

            {/* Highlight, present only on the upper-left half of whatever it strokes.
                The axis runs past the corners so the fade is gradual rather than
                completing inside the visible arc. */}
            <linearGradient id="ls-hi" x1="-0.15" y1="-0.15" x2="1.1" y2="1.1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.30" />
              <stop offset="0.12" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="0.24" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="0.36" stopColor="#ffffff" stopOpacity="0.11" />
              <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="0.60" stopColor="#ffffff" stopOpacity="0.015" />
              <stop offset="0.72" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Shadow, mirrored onto the lower-right half. Pushed near full opacity
                because #0a0a0a has so little room left to darken. */}
            <linearGradient id="ls-lo" x1="-0.15" y1="-0.15" x2="1.1" y2="1.1">
              <stop offset="0.26" stopColor="#000000" stopOpacity="0" />
              <stop offset="0.40" stopColor="#000000" stopOpacity="0.10" />
              <stop offset="0.52" stopColor="#000000" stopOpacity="0.26" />
              <stop offset="0.64" stopColor="#000000" stopOpacity="0.44" />
              <stop offset="0.76" stopColor="#000000" stopOpacity="0.62" />
              <stop offset="0.88" stopColor="#000000" stopOpacity="0.78" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.9" />
            </linearGradient>

            {/* Softens the edge strokes. Applied per-stroke rather than to the whole
                group so the face and ticks stay sharp. */}
            <filter
              id="ls-soft"
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation={EDGE_BLUR} />
            </filter>

            {/* Keeps the edge strokes inside the ring. A stroke straddles its path, so
                without this the outer highlight would spill onto the page and the
                inner one into the hole, blurring the silhouette. */}
            <clipPath id="ls-clip">
              <path d={ring} fillRule="evenodd" />
            </clipPath>

            <radialGradient
              id="ls-well"
              gradientUnits="userSpaceOnUse"
              cx={CENTER}
              cy={CENTER - 14}
              r={RING_INNER}
            >
              <stop offset="0" stopColor="#0e0e0e" />
              <stop offset="0.72" stopColor="#0b0b0b" />
              <stop offset="1" stopColor={PAGE} />
            </radialGradient>
          </defs>

          {/* Face */}
          <path d={ring} fillRule="evenodd" fill="url(#ls-face)" />

          <g clipPath="url(#ls-clip)" filter="url(#ls-soft)">
            {/* Outer edge: lit upper-left, shadowed lower-right — a surface rising
                toward the light. */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_OUTER - EDGE_WIDTH / 2}
              fill="none"
              stroke="url(#ls-hi)"
              strokeWidth={EDGE_WIDTH}
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_OUTER - EDGE_WIDTH / 2}
              fill="none"
              stroke="url(#ls-lo)"
              strokeWidth={EDGE_WIDTH}
            />

            {/* Inner edge: the senses swap. This is the wall of a hole, so its
                upper-left faces away from the light and its lower-right catches it. */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_INNER + EDGE_WIDTH / 2}
              fill="none"
              stroke="url(#ls-lo)"
              strokeWidth={EDGE_WIDTH}
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_INNER + EDGE_WIDTH / 2}
              fill="none"
              stroke="url(#ls-hi)"
              strokeWidth={EDGE_WIDTH}
              // Flipped about the centre so the highlight lands on the lower-right.
              transform={`rotate(180 ${CENTER} ${CENTER})`}
            />
          </g>

          {/* A whisper inside the hole so the readout isn't on a flat void. */}
          <circle cx={CENTER} cy={CENTER} r={RING_INNER} fill="url(#ls-well)" />

          {/* Ticks — the only crisp element. Animated on load. */}
          <AnimatedRingTicks ticks={ticks} />

          {pct !== null && (
            <AnimatedBead
              cx={CENTER + Math.cos(beadAngle) * beadRadius}
              cy={CENTER + Math.sin(beadAngle) * beadRadius}
              litCount={litTicks}
            />
          )}
        </svg>

        {/* Readout, as HTML so the type uses the page's font stack. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-start leading-none">
            <span
              className="font-bold tabular-nums"
              style={{ fontSize: 56, letterSpacing: "-0.03em" }}
            >
              {pct === null ? "—" : pct}
            </span>
            {pct !== null && (
              <span
                className="mt-2 pl-0.5 font-bold"
                style={{ fontSize: 17, color: "rgba(255,255,255,0.5)" }}
              >
                %
              </span>
            )}
          </div>
          <span
            className="mt-1.5 text-center text-[9px] uppercase leading-tight tracking-[0.22em]"
            style={{ color: CORAL }}
          >
            Life Score
            <br />
            This Week
          </span>
        </div>
      </div>
    </div>
  );
}
