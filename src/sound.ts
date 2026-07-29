// The game's voice: a handful of short synthesized tones, one per moment
// worth hearing. Everything is generated with Web Audio oscillators rather
// than sampled files — there is nothing to download or decode, so the first
// keystroke of a session sounds exactly like the thousandth, and tuning the
// palette means editing numbers here.
//
// Every sound is deliberately small: the loudest thing in the game (the
// perfect-game fanfare) peaks well under half scale, and typing sits near a
// tenth of it. Audio is opt-in; nothing here runs until the player asks for
// it.

// Scales the whole palette at once. Individual voices below are relative to
// this, so their numbers stay comparable to each other.
const MASTER_GAIN = 0.35;

// exponentialRampToValueAtTime cannot reach zero, so silence is an epsilon.
const SILENT = 0.0001;

// Ramp in over a few milliseconds instead of starting at full amplitude: an
// instant edge is a click, and clicks are what make game audio feel cheap.
const ATTACK = 0.008;

// Schedule everything a hair ahead of the clock — starting a node exactly at
// currentTime can drop its first samples.
const LEAD = 0.005;

// Typing repeats fast (a held key fires ~30 times a second). Blips closer
// together than this are dropped, so a fast typist gets a phrase rather than
// a pile-up.
const LETTER_INTERVAL = 0.045;

// A ceiling on simultaneous notes. Nothing in the palette approaches it in
// normal play; it exists so no sequence of inputs can build a wall of sound.
const MAX_VOICES = 16;

// One major pentatonic scale, rooted at C5, feeds every pitched voice. A
// scale with no semitone clashes means overlapping sounds — a letter typed
// during the win fanfare — stay consonant whatever the player does.
const ROOT_HZ = 523.25;
const PENTATONIC = [0, 2, 4, 7, 9];

// Degrees run off the end of the scale into the octaves above and below.
function scaleHz(degree: number): number {
  const octave = Math.floor(degree / PENTATONIC.length);
  const semitones =
    PENTATONIC[degree - octave * PENTATONIC.length] + 12 * octave;
  return ROOT_HZ * 2 ** (semitones / 12);
}

interface Audio {
  context: AudioContext;
  master: GainNode;
}

let audio: Audio | null = null;
let activeVoices = 0;
let lastLetterAt = -Infinity;

// The context is built on first use and kept: browsers only allow one to
// start from a user gesture, and every path into this module is a keystroke,
// a tap, or the sound toggle itself. Returns null where Web Audio does not
// exist (jsdom under test, very old browsers) so callers stay silent instead
// of throwing.
function ensureAudio(): Audio | null {
  const Constructor =
    typeof window === 'undefined' ? undefined : window.AudioContext;

  if (Constructor === undefined) {
    return null;
  }

  audio ??= (() => {
    const context = new Constructor();
    const master = context.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(context.destination);
    return { context, master };
  })();

  // A context created before the page has been interacted with starts
  // suspended, and one can be suspended later by the browser (backgrounded
  // tab). Nudging it on every sound means the first audible event after a
  // reload is not swallowed. Nothing is lost while suspended: the clock is
  // stopped too, so scheduled notes simply wait.
  if (audio.context.state === 'suspended') {
    void audio.context.resume();
  }

  return audio;
}

interface NoteSpec {
  // Seconds from now, for building sequences.
  at?: number;
  hz: number;
  // Slide to this frequency across the note, for sounds that fall away.
  bendTo?: number;
  seconds: number;
  gain: number;
  wave?: OscillatorType;
}

function note({
  at = 0,
  hz,
  bendTo,
  seconds,
  gain,
  wave = 'triangle',
}: NoteSpec): void {
  const nodes = ensureAudio();

  if (nodes === null || activeVoices >= MAX_VOICES) {
    return;
  }

  const { context, master } = nodes;
  const start = context.currentTime + LEAD + at;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(hz, start);
  if (bendTo !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(bendTo, start + seconds);
  }

  // Fast attack, exponential decay: the shape of something struck, which
  // reads as a UI blip rather than a beep.
  envelope.gain.setValueAtTime(SILENT, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + ATTACK);
  envelope.gain.exponentialRampToValueAtTime(SILENT, start + seconds);

  oscillator.connect(envelope);
  envelope.connect(master);
  activeVoices++;
  oscillator.onended = () => {
    activeVoices--;
  };
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.03);
}

// Reused for every toss: filling a noise buffer is the one allocation in the
// palette worth keeping around.
let noiseBuffer: AudioBuffer | null = null;

// The only unpitched voice, for the one action that scatters rather than
// sounds a note. A bandpass sweeping downward over white noise is the shape
// of something being shuffled.
function noiseSweep(seconds: number, fromHz: number, toHz: number): void {
  const nodes = ensureAudio();

  if (nodes === null) {
    return;
  }

  const { context, master } = nodes;

  if (noiseBuffer === null) {
    noiseBuffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * 0.5),
      context.sampleRate,
    );
    const samples = noiseBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      samples[index] = Math.random() * 2 - 1;
    }
  }

  const start = context.currentTime + LEAD;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();

  source.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(fromHz, start);
  filter.frequency.exponentialRampToValueAtTime(toHz, start + seconds);
  envelope.gain.setValueAtTime(SILENT, start);
  envelope.gain.exponentialRampToValueAtTime(0.14, start + ATTACK);
  envelope.gain.exponentialRampToValueAtTime(SILENT, start + seconds);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(master);
  source.start(start);
  source.stop(start + seconds + 0.03);
}

// A letter joins the word. The pitch climbs the scale with the word's
// length, so typing draws a rising phrase and a longer word audibly reaches
// higher — and the scale caps out because words do.
export function letterAdded(position: number): void {
  const nodes = ensureAudio();

  if (nodes === null) {
    return;
  }
  if (nodes.context.currentTime - lastLetterAt < LETTER_INTERVAL) {
    return;
  }
  lastLetterAt = nodes.context.currentTime;

  note({
    hz: scaleHz(Math.min(Math.max(position, 0), 12)),
    seconds: 0.09,
    gain: 0.22,
  });
}

// A letter outside the salad. A soft, low thunk that sags in pitch — a
// closed door, not a buzzer, since this is the sound of an honest mistake
// the player will make dozens of times.
export function letterRejected(): void {
  note({ hz: 165, bendTo: 118, seconds: 0.16, gain: 0.3, wave: 'sine' });
}

// Backspace, and clearing the whole word. The append voice one step lower:
// the same gesture running backwards.
export function letterDeleted(remaining: number): void {
  note({
    hz: scaleHz(Math.min(Math.max(remaining - 1, 0), 12)),
    seconds: 0.07,
    gain: 0.14,
    wave: 'sine',
  });
}

export function tossed(): void {
  noiseSweep(0.24, 1900, 620);
}

// A hint arrives: a bare ping with a long tail, distinct from the scoring
// chime because a hint is not a reward.
export function hinted(): void {
  note({ hz: scaleHz(7), seconds: 0.5, gain: 0.24, wave: 'sine' });
  note({ at: 0.07, hz: scaleHz(9), seconds: 0.44, gain: 0.16, wave: 'sine' });
}

// A word is accepted. Two notes rising, with the interval widening as the
// word is worth more, so the sound reports the score without ever running
// longer. A big word (a pangram clears this easily) earns a third note.
// Words revealed by a hint score nothing and get a single flat note instead:
// accepted, but not celebrated.
export function wordScored(points: number): void {
  if (points <= 0) {
    note({ hz: scaleHz(2), seconds: 0.16, gain: 0.22, wave: 'sine' });
    return;
  }

  const reach = points >= 7 ? 4 : points >= 3 ? 3 : 2;
  note({ hz: scaleHz(2), seconds: 0.16, gain: 0.42 });
  note({ at: 0.075, hz: scaleHz(2 + reach), seconds: 0.24, gain: 0.42 });

  if (points >= 10) {
    note({ at: 0.16, hz: scaleHz(4 + reach), seconds: 0.34, gain: 0.36 });
  }
}

// A word is refused. The scoring chime inverted: two notes, falling, quieter
// and shorter than the reward.
export function wordRejected(): void {
  note({ hz: scaleHz(2), seconds: 0.12, gain: 0.26, wave: 'sine' });
  note({ at: 0.09, hz: scaleHz(0), seconds: 0.18, gain: 0.26, wave: 'sine' });
}

// Climbing a rung of the ratings ladder: a three-note run, the win fanfare
// in miniature.
export function rankedUp(): void {
  [0, 2, 4].forEach((degree, index) => {
    note({ at: index * 0.09, hz: scaleHz(degree), seconds: 0.2, gain: 0.4 });
  });
}

// The win. An arpeggio over a low swell; the perfect game takes the same
// shape an octave up, longer, and adds a sparkle above it — the audible
// counterpart of the gold treatment the board switches to.
export function won(perfect: boolean): void {
  const base = perfect ? 5 : 0;
  const degrees = perfect ? [0, 2, 4, 5, 7] : [0, 2, 4, 5];

  degrees.forEach((degree, index) => {
    note({
      at: index * 0.11,
      hz: scaleHz(base + degree),
      seconds: perfect ? 0.6 : 0.45,
      gain: 0.5,
    });
  });

  // A pad underneath, two octaves down, holding through the arpeggio so the
  // moment has some floor to it.
  note({
    hz: scaleHz(base - 10),
    seconds: perfect ? 1.5 : 1.1,
    gain: 0.16,
    wave: 'sine',
  });

  if (perfect) {
    [12, 14, 16, 19].forEach((degree, index) => {
      note({
        at: 0.55 + index * 0.08,
        hz: scaleHz(degree),
        seconds: 0.3,
        gain: 0.14,
        wave: 'sine',
      });
    });
  }
}

// Switching sound on answers in its own medium — and does it on the click,
// which is the gesture browsers require before any audio can start at all.
export function soundEnabled(): void {
  wordScored(3);
}
