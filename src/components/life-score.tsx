import { AnimatedBead, AnimatedRingTicks } from "@/components/animated-ring-ticks";

const CORAL = "#E8624A";

// The dial's palette lives in globals.css as custom properties, keyed on the root's
// data-theme. This component stays a server component and has no way to know the
// theme; custom properties resolve at paint time, so one set of markup renders
// correctly in both. See the --ls-* block there.
const FACE_STOPS = [
  { offset: 0, token: "--ls-face-1" },
  { offset: 0.35, token: "--ls-face-2" },
  { offset: 0.68, token: "--ls-face-3" },
  { offset: 1, token: "--ls-face-4" },
] as const;

/**
 * The edge ramps, as [offset, alpha] pairs.
 *
 * Only the alphas live here; the ink and an overall gain come from the theme. The
 * ramp's SHAPE describes the form — how quickly the lit edge falls off around the
 * circumference — and that's a property of the geometry, not of the palette. What
 * genuinely differs between themes is how hard each edge has to be pushed, which is
 * one multiplier rather than fourteen restated stops.
 */
const HIGHLIGHT_RAMP = [
  [0, 0.3],
  [0.12, 0.25],
  [0.24, 0.18],
  [0.36, 0.11],
  [0.48, 0.05],
  [0.6, 0.015],
  [0.72, 0],
] as const;

const SHADOW_RAMP = [
  [0.26, 0],
  [0.4, 0.1],
  [0.52, 0.26],
  [0.64, 0.44],
  [0.76, 0.62],
  [0.88, 0.78],
  [1, 0.9],
] as const;

/** One gradient stop on a themed edge ramp. */
const edgeStop = (edge: "hi" | "lo", alpha: number): React.CSSProperties => ({
  stopColor: `var(--ls-${edge}-ink)`,
  // calc() in stop-opacity is what lets a single theme variable scale the whole ramp.
  stopOpacity: `calc(var(--ls-${edge}-gain) * ${alpha})`,
});

/**
 * The same ramps for the disc, on their own gains.
 *
 * The disc cannot reuse the ring's. The ring's shadow runs near-opaque because it is
 * a hard edge a few pixels wide; spread over the disc's much broader wall the same
 * strength floods the whole face and the disc stops reading as a shallow dish and
 * starts reading as a hole punched through the page. The dish needs a weaker shadow
 * and a slightly stronger highlight than the ring does.
 */
const discStop = (edge: "hi" | "lo", alpha: number): React.CSSProperties => ({
  stopColor: `var(--ls-${edge}-ink)`,
  stopOpacity: `calc(var(--ls-d${edge}-gain) * ${alpha})`,
});

/** Ticks around the bezel. 60 reads as a dense ring without turning into a blur. */
const TICK_COUNT = 60;

const BOX = 380;
const CENTER = BOX / 2;

/**
 * A length from the 380-unit design into container-relative units.
 *
 * The dial is capped at BOX but shrinks to fit a narrow phone, and the readout is
 * HTML rather than SVG text, so it doesn't scale with the viewBox for free. Sizing
 * it in `cqw` against the dial's own container keeps the type locked to the ring at
 * every width, with BOX still the single source of truth. Below ~428px the ring used
 * to overflow the viewport and give the page a horizontal scrollbar.
 */
const cqw = (length: number) => `${((length / BOX) * 100).toFixed(4)}cqw`;

/**
 * Rounds a coordinate to a stable number of decimals.
 *
 * `Math.cos`/`Math.sin` are implementation-defined to the last bit, and the server's
 * V8 is a different build from the browser's, so the same angle produced
 * `230.67366430758` on the server and `230.67366430758003` in Chrome. React compares
 * the serialized attribute, saw two different strings and reported a hydration
 * mismatch for most of the sixty ticks. Three decimals is far below a device pixel in
 * a 380-unit box, and identical on both sides.
 */
const q = (value: number) => Math.round(value * 1000) / 1000;

// Same thickness as before.
const RING_OUTER = 150;
const RING_THICKNESS = 80;
const RING_INNER = RING_OUTER - RING_THICKNESS;
const RING_MID = (RING_OUTER + RING_INNER) / 2;

// How wide the lit and shadowed edges are, and how far they blur.
const EDGE_WIDTH = 9;
const EDGE_BLUR = 6;

// The disc inside the ring. Its rim is a little wider and softer than the ring's own
// edges: a dish's wall is read across a broader band than a hard machined edge.
const DISC_EDGE = 13;
const DISC_BLUR = 8;

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
      x1: q(CENTER + Math.cos(angle) * inner),
      y1: q(CENTER + Math.sin(angle) * inner),
      x2: q(CENTER + Math.cos(angle) * TICK_OUTER),
      y2: q(CENTER + Math.sin(angle) * TICK_OUTER),
      lit,
      litStroke: "var(--ls-tick-lit)",
      dimStroke: "var(--ls-tick-dim)",
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
        style={{
          // Caps at the design size on a wide screen, shrinks to the available width
          // on a narrow one. aspectRatio rather than a fixed height so it stays
          // circular while shrinking.
          width: BOX,
          maxWidth: "100%",
          aspectRatio: "1",
          // Makes this the reference box for the cqw() sizes in the readout below.
          containerType: "inline-size",
        }}
        role="img"
        aria-label={
          pct === null ? "Life score not available" : `Life score ${pct} percent`
        }
      >
        {/* 100% rather than BOX px: the viewBox then does the scaling, so every
            coordinate below stays in the 380-unit design space. */}
        <svg
          className="absolute inset-0"
          width="100%"
          height="100%"
          viewBox={`0 0 ${BOX} ${BOX}`}
          aria-hidden
        >
          <defs>
            {/* The face. Barely above the page — an emboss shouldn't read as a
                lighter object sitting on the background, only as the same surface
                deformed. */}
            <linearGradient id="ls-face" x1="0" y1="0" x2="1" y2="1">
              {FACE_STOPS.map(({ offset, token }) => (
                <stop key={token} offset={offset} style={{ stopColor: `var(${token})` }} />
              ))}
            </linearGradient>

            {/* Highlight, present only on the upper-left half of whatever it strokes.
                The axis runs past the corners so the fade is gradual rather than
                completing inside the visible arc. */}
            <linearGradient id="ls-hi" x1="-0.15" y1="-0.15" x2="1.1" y2="1.1">
              {HIGHLIGHT_RAMP.map(([offset, alpha]) => (
                <stop key={offset} offset={offset} style={edgeStop("hi", alpha)} />
              ))}
            </linearGradient>

            {/* Shadow, mirrored onto the lower-right half. Pushed near full opacity
                because #0a0a0a has so little room left to darken. */}
            <linearGradient id="ls-lo" x1="-0.15" y1="-0.15" x2="1.1" y2="1.1">
              {SHADOW_RAMP.map(([offset, alpha]) => (
                <stop key={offset} offset={offset} style={edgeStop("lo", alpha)} />
              ))}
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

            {/* The disc behind the readout. Darker at the upper-left, lighter toward
                the lower-right — the floor of a dish tilts away from the light on the
                side nearest it, which is the opposite of the ring's own face. */}
            <linearGradient id="ls-disc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--ls-disc-1)" }} />
              <stop offset="0.55" style={{ stopColor: "var(--ls-disc-2)" }} />
              <stop offset="1" style={{ stopColor: "var(--ls-disc-3)" }} />
            </linearGradient>

            {/* The same two ramps as the ring, run in the opposite direction.
                A recess is not a raised form with different colours — it's the same
                lighting read backwards: the wall nearest the light is the one turned
                AWAY from it and falls into shadow, while the far wall catches it.
                Reversing the gradient axis is enough; the stops don't change. */}
            <linearGradient id="ls-hi-rev" x1="1.1" y1="1.1" x2="-0.15" y2="-0.15">
              {HIGHLIGHT_RAMP.map(([offset, alpha]) => (
                <stop key={offset} offset={offset} style={discStop("hi", alpha)} />
              ))}
            </linearGradient>

            <linearGradient id="ls-lo-rev" x1="1.1" y1="1.1" x2="-0.15" y2="-0.15">
              {SHADOW_RAMP.map(([offset, alpha]) => (
                <stop key={offset} offset={offset} style={discStop("lo", alpha)} />
              ))}
            </linearGradient>

            {/* Holds the disc's rim strokes inside the disc, so they read as an inner
                wall rather than a halo around it. */}
            <clipPath id="ls-disc-clip">
              <circle cx={CENTER} cy={CENTER} r={RING_INNER} />
            </clipPath>

            <filter
              id="ls-disc-soft"
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation={DISC_BLUR} />
            </filter>
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

          {/* The disc the readout sits on: filled, and pressed into the page.
              Exactly RING_INNER, so it meets the ring's inner wall with no gap. */}
          <circle cx={CENTER} cy={CENTER} r={RING_INNER} fill="url(#ls-disc)" />
          <g clipPath="url(#ls-disc-clip)" filter="url(#ls-disc-soft)">
            {/* Shadow on the upper-left inner wall, highlight on the lower-right.
                Both reversed relative to the ring's outer edge — that inversion is the
                whole difference between something sunk into the page and something
                rising out of it. */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_INNER - DISC_EDGE / 2}
              fill="none"
              stroke="url(#ls-lo-rev)"
              strokeWidth={DISC_EDGE}
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_INNER - DISC_EDGE / 2}
              fill="none"
              stroke="url(#ls-hi-rev)"
              strokeWidth={DISC_EDGE}
            />
          </g>

          {/* Ticks — the only crisp element. Animated on load. */}
          <AnimatedRingTicks ticks={ticks} />

          {pct !== null && (
            <AnimatedBead
              cx={q(CENTER + Math.cos(beadAngle) * beadRadius)}
              cy={q(CENTER + Math.sin(beadAngle) * beadRadius)}
              litCount={litTicks}
            />
          )}
        </svg>

        {/* Readout, as HTML so the type uses the page's font stack.
            Everything here is centred on the DIGITS, not on the digits-plus-unit
            cluster — the eye reads the number as the object and any unit hanging off
            it as decoration, so centring the cluster leaves the number looking
            pushed left. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative flex items-start leading-none">
            <span
              className="font-bold tabular-nums"
              style={{
                fontSize: cqw(56),
                letterSpacing: "-0.03em",
                // Letter-spacing is applied after EVERY character including the last,
                // so the box disagrees with the ink by exactly one step and centring
                // the box puts the ink off by half of it. Cancelling it on the trailing
                // edge makes box and ink agree. Negative tracking, hence a positive
                // correction.
                marginRight: "0.03em",
              }}
            >
              {pct === null ? "—" : pct}
            </span>
            {pct !== null && (
              // Absolute, so it contributes no width: the flex row above is then
              // exactly as wide as the digits and centres on them, with the unit
              // hanging outside. `left-full` pins it to the digits' right edge, so it
              // still tracks the number whether it reads 5, 50 or 100.
              <span
                className="absolute top-0 left-full font-bold"
                style={{
                  fontSize: cqw(17),
                  marginTop: cqw(8),
                  paddingLeft: cqw(2),
                  // Themed, not a fixed white: at 50% white this vanished entirely
                  // against the light dial's near-white face.
                  color: "var(--c-text-dim)",
                }}
              >
                %
              </span>
            )}
          </div>
          <span
            className="text-center uppercase leading-tight"
            style={{
              color: CORAL,
              fontSize: cqw(9),
              marginTop: cqw(6),
              letterSpacing: "0.22em",
              // Same trailing-step correction as the number. At 0.22em this is the
              // larger of the two errors relative to the type size.
              marginRight: "-0.22em",
            }}
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
