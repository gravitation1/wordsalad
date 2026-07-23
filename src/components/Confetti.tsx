// Win fanfare made of the game itself: miniature salad tiles — this
// puzzle's letters, with the required letter's pieces in accent — rain from
// above the viewport and burst from the banner. Mount for a win, remount
// (key) to replay. Reduced-motion users see none of it.

import { TILE_FACE } from './tiles';

interface ConfettiProps {
  letters: readonly string[];
  // The perfect-score variant: denser, longer, and gilded.
  perfect?: boolean;
  requiredCharacter: string;
}

// Deterministic jitter (a classic sine hash) keeps render pure — the same
// shower every time, which no one can tell from a random one.
function jitter(seed: number): number {
  const noise = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return noise - Math.floor(noise);
}

// Positions and timing are game-independent; each slot picks its letter
// from the live salad at render time.
function rainLayouts(
  count: number,
  delaySpreadMs: number,
  durationBaseMs: number,
  durationSpreadMs: number,
  sizeBase: number,
) {
  return Array.from({ length: count }, (_, index) => {
    const size = sizeBase + jitter(index + 300) * 10;
    return {
      goldSlot: jitter(index + 950),
      letterSlot: jitter(index + 700),
      style: {
        '--confetti-drift': `${(-50 + jitter(index + 400) * 100).toFixed(0)}px`,
        '--confetti-spin': `${((jitter(index + 500) < 0.5 ? -1 : 1) * (300 + jitter(index + 600) * 480)).toFixed(0)}deg`,
        animationDelay: `${(jitter(index + 100) * delaySpreadMs).toFixed(0)}ms`,
        animationDuration: `${(durationBaseMs + jitter(index + 200) * durationSpreadMs).toFixed(0)}ms`,
        fontSize: `${Math.round(size * 0.58)}px`,
        height: size,
        left: `${(jitter(index) * 100).toFixed(2)}%`,
        width: size,
      },
    };
  });
}

const RAIN_LAYOUTS = rainLayouts(110, 1600, 1500, 1200, 14);
const PERFECT_RAIN_LAYOUTS = rainLayouts(210, 2800, 1700, 1900, 15);

// The perfect show gilds most tiles; the required letter keeps its accent.
function tileClass(
  letter: string,
  requiredCharacter: string,
  gold: boolean,
): string {
  if (letter === requiredCharacter) {
    return TILE_FACE.accent;
  }
  return gold ? TILE_FACE.gold : TILE_FACE.plain;
}

function letterFor(letters: readonly string[], slot: number): string {
  return letters[Math.floor(slot * letters.length)] ?? '?';
}

export function Confetti({
  letters,
  perfect,
  requiredCharacter,
}: ConfettiProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      data-perfect={perfect ? 'true' : 'false'}
      data-testid="confetti"
    >
      {(perfect ? PERFECT_RAIN_LAYOUTS : RAIN_LAYOUTS).map((piece, index) => {
        const letter = letterFor(letters, piece.letterSlot);
        return (
          <span
            className={`confetti-piece absolute top-0 flex items-center justify-center rounded font-semibold ${tileClass(letter, requiredCharacter, (perfect ?? false) && piece.goldSlot < 0.65)}`}
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

function burstLayouts(count: number, tilePx: number, reach: number) {
  return Array.from({ length: count }, (_, index) => ({
    letterSlot: jitter(index + 900),
    style: {
      '--burst-angle': `${((index / count) * 360 + jitter(index + 40) * 24).toFixed(0)}deg`,
      '--burst-distance': `${(reach + jitter(index + 80) * reach * 1.25).toFixed(0)}px`,
      animationDelay: `${(jitter(index + 120) * 120).toFixed(0)}ms`,
      fontSize: Math.round(tilePx * 0.58),
      height: tilePx,
      width: tilePx,
    },
  }));
}

// The win banner's burst, and a pocket-sized cousin for rank-ups.
const BURST_LAYOUTS = burstLayouts(22, 17, 75);
const MINI_BURST_LAYOUTS = burstLayouts(10, 14, 36);

interface WinBurstProps extends ConfettiProps {
  mini?: boolean;
}

// A radial pop of letter tiles flying out of the anchor's center — the
// close-range companion to the overhead rain.
export function WinBurst({
  letters,
  mini,
  perfect,
  requiredCharacter,
}: WinBurstProps) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {(mini ? MINI_BURST_LAYOUTS : BURST_LAYOUTS).map((piece, index) => {
        const letter = letterFor(letters, piece.letterSlot);
        return (
          <span
            className={`burst-piece absolute flex items-center justify-center rounded font-semibold ${tileClass(letter, requiredCharacter, (perfect ?? false) && piece.letterSlot < 0.65)}`}
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
