// Win fanfare made of the game itself: miniature salad tiles — this
// puzzle's letters, with the required letter's pieces in accent — rain from
// above the viewport and burst from the banner. Mount for a win, remount
// (key) to replay. Reduced-motion users see none of it.

interface ConfettiProps {
  letters: readonly string[];
  requiredCharacter: string;
}

const PARTICLE_COUNT = 110;

// Deterministic jitter (a classic sine hash) keeps render pure — the same
// shower every time, which no one can tell from a random one.
function jitter(seed: number): number {
  const noise = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return noise - Math.floor(noise);
}

// Positions and timing are game-independent; each slot picks its letter
// from the live salad at render time.
const RAIN_LAYOUTS = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const size = 14 + jitter(index + 300) * 10;
  return {
    letterSlot: jitter(index + 700),
    style: {
      '--confetti-drift': `${(-50 + jitter(index + 400) * 100).toFixed(0)}px`,
      '--confetti-spin': `${((jitter(index + 500) < 0.5 ? -1 : 1) * (300 + jitter(index + 600) * 480)).toFixed(0)}deg`,
      animationDelay: `${(jitter(index + 100) * 1600).toFixed(0)}ms`,
      animationDuration: `${(1500 + jitter(index + 200) * 1200).toFixed(0)}ms`,
      fontSize: `${Math.round(size * 0.58)}px`,
      height: size,
      left: `${(jitter(index) * 100).toFixed(2)}%`,
      width: size,
    },
  };
});

function tileClass(letter: string, requiredCharacter: string): string {
  return letter === requiredCharacter
    ? 'bg-accent text-white'
    : 'border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';
}

function letterFor(letters: readonly string[], slot: number): string {
  return letters[Math.floor(slot * letters.length)] ?? '?';
}

export function Confetti({ letters, requiredCharacter }: ConfettiProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      data-testid="confetti"
    >
      {RAIN_LAYOUTS.map((piece, index) => {
        const letter = letterFor(letters, piece.letterSlot);
        return (
          <span
            className={`confetti-piece absolute top-0 flex items-center justify-center rounded font-semibold ${tileClass(letter, requiredCharacter)}`}
            key={index}
            style={piece.style}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}

const BURST_COUNT = 22;
const BURST_TILE_PX = 17;

const BURST_LAYOUTS = Array.from({ length: BURST_COUNT }, (_, index) => ({
  letterSlot: jitter(index + 900),
  style: {
    '--burst-angle': `${((index / BURST_COUNT) * 360 + jitter(index + 40) * 24).toFixed(0)}deg`,
    '--burst-distance': `${(75 + jitter(index + 80) * 95).toFixed(0)}px`,
    animationDelay: `${(jitter(index + 120) * 120).toFixed(0)}ms`,
    fontSize: Math.round(BURST_TILE_PX * 0.58),
    height: BURST_TILE_PX,
    width: BURST_TILE_PX,
  },
}));

// A radial pop of letter tiles flying out of the win banner's center — the
// close-range companion to the overhead rain.
export function WinBurst({ letters, requiredCharacter }: ConfettiProps) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {BURST_LAYOUTS.map((piece, index) => {
        const letter = letterFor(letters, piece.letterSlot);
        return (
          <span
            className={`burst-piece absolute flex items-center justify-center rounded font-semibold ${tileClass(letter, requiredCharacter)}`}
            key={index}
            style={piece.style}
          >
            {letter}
          </span>
        );
      })}
    </span>
  );
}
