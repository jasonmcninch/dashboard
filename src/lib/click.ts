// A synthesized detent click.
//
// Generated with the Web Audio API rather than shipped as an audio file: the sound is
// a 12ms noise burst, which costs a few lines to synthesize and would otherwise be a
// network request and a decode for something shorter than a single frame.
//
// This matters more than it sounds: iOS has no Vibration API, so on an iPhone the
// click is the ONLY feedback the slider can give. On Android you get both.

let context: AudioContext | null = null;

/** Lazily created — constructing an AudioContext before any gesture gets it suspended. */
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    // Browsers start the context suspended until a user gesture. Resuming inside the
    // gesture that triggered the click is what unlocks it.
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

/**
 * A short mechanical tick.
 *
 * Band-passed noise with a cubic decay: noise gives the broadband character of two
 * surfaces meeting, the bandpass puts it in the range a small plastic detent occupies,
 * and the steep envelope keeps it from reading as a thud. A pure tone at this length
 * sounds like a beep instead.
 *
 * ⚠️ iOS routes Web Audio through the ringer switch, so this is silent when the phone
 * is on silent — there is no way around that from a web page.
 */
export function click(volume = 0.16): void {
  const ctx = audio();
  if (!ctx) return;

  try {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.012));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const decay = (1 - i / length) ** 3;
      samples[i] = (Math.random() * 2 - 1) * decay;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2400;
    band.Q.value = 1.1;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(band).connect(gain).connect(ctx.destination);
    source.start();
  } catch {
    // Autoplay policy, a closed context, or an unsupported browser. Feedback is a
    // nicety — never let it break the interaction it's decorating.
  }
}
