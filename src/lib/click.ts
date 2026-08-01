// A synthesized detent click.
//
// Generated with the Web Audio API rather than shipped as an audio file: the sound is
// a 12ms noise burst, which costs a few lines to synthesize and would otherwise be a
// network request and a decode for something shorter than a single frame.
//
// This matters more than it sounds: iOS has no Vibration API, so on an iPhone the
// click is the ONLY feedback the slider can give. On Android you get both.
//
// See claimAudioSession() for why the page declares itself a media source, and what
// that costs.

let context: AudioContext | null = null;
let sessionClaimed = false;

/**
 * Asks iOS to treat this page's audio as media playback.
 *
 * iOS routes Web Audio through the ringer channel, so with the physical switch on
 * silent the click is muted — WebKit bug 237322, and iOS 16.3 tightened it further.
 * The only session category that ignores the switch is the one declaring itself
 * primary media playback, which is what this claims.
 *
 * ⚠️ The cost is unavoidable and by design: "playback" means this page becomes the
 * device's media source, so whatever music or podcast is playing is INTERRUPTED. There
 * is no category for "short UI tick that overrides silent but mixes with other audio";
 * ambient mixes but obeys the switch, playback overrides it but takes over. Chosen
 * deliberately over silence.
 *
 * Claimed once, lazily, on the first click rather than at import: doing it on load
 * would stop the user's music the moment the dashboard opened, whether or not they
 * ever touched the slider.
 */
function claimAudioSession(): void {
  if (sessionClaimed) return;
  sessionClaimed = true;
  try {
    const session = (
      navigator as Navigator & { audioSession?: { type: string } }
    ).audioSession;
    // Absent on Android and on desktop, where the ringer switch doesn't exist and
    // nothing needs overriding.
    if (session) session.type = "playback";
  } catch {
    // Some WebKit builds expose the property but reject the assignment. Not worth
    // failing a decorative click over.
  }
}

/** Lazily created — constructing an AudioContext before any gesture gets it suspended. */
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    // Before the context exists, so the session category is in place for the very
    // first sound rather than from the second onward.
    claimAudioSession();
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
 * iOS routes Web Audio through the ringer switch, so this used to be silent whenever
 * the phone was. claimAudioSession() overrides that, at the cost of interrupting other
 * audio.
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
