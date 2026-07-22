import { useMessages } from '../i18n';
import type {
  Celebration,
  HintReveal,
  LetterActivation,
} from '../useWordSaladGame';

interface SaladLettersProps {
  celebration: Celebration | null;
  hintReveal: HintReveal | null;
  lastAppended: LetterActivation | null;
  letters: readonly string[];
  onLetter: (letter: string) => void;
  requiredCharacter: string;
  tossId: number;
}

// Source-tile ripples during a hint cascade in word order, matching the
// letter reveal's stagger.
const HINT_STAGGER_MS = 45;

interface TilePress {
  key: string;
  delayMs: number;
}

// A tile ripples because it was just tapped/typed, or because it is a source
// letter of a freshly revealed hint (staggered by its place in the word).
function tilePress(
  letter: string,
  lastAppended: LetterActivation | null,
  hintReveal: HintReveal | null,
): TilePress | null {
  if (lastAppended?.letter === letter) {
    return { key: `append-${lastAppended.id}`, delayMs: 0 };
  }
  const hintIndex = hintReveal?.letters.indexOf(letter) ?? -1;
  if (hintIndex >= 0) {
    return {
      key: `hint-${hintReveal?.id ?? 0}`,
      delayMs: hintIndex * HINT_STAGGER_MS,
    };
  }
  return null;
}

export function SaladLetters({
  celebration,
  hintReveal,
  lastAppended,
  letters,
  onLetter,
  requiredCharacter,
  tossId,
}: SaladLettersProps) {
  const t = useMessages();

  // The win moment sends a staggered wave through the tiles. It replaces
  // the (long finished) toss entrance on the same element, and only for the
  // toss generation the win happened under — a later toss remounts the
  // tiles back onto their plain entrance instead of re-waving.
  const cheering = celebration !== null && celebration.tossId === tossId;

  return (
    // Remounts on every toss (key) so the letters replay the toss animation
    // as they land in their new order. On small screens the width is capped
    // to four tiles so seven letters wrap into a balanced, centered 4+3
    // instead of an awkward 6+1 (the cap matches the tile size: 4 tiles +
    // 3 gaps at each size).
    <div
      className="flex max-w-[13.5rem] flex-wrap justify-center gap-2 pointer-coarse:max-w-[15.5rem] sm:max-w-none"
      key={tossId}
    >
      {letters.map((letter, index) => {
        const isRequired = letter === requiredCharacter;
        const press = tilePress(letter, lastAppended, hintReveal);
        return (
          // The stable outer span owns the toss-in entrance; the inner
          // button remounts per activation (key) to replay the press —
          // whether the letter was tapped, typed, or revealed as a hint.
          <span
            // Alternating cheer names so a second celebration (the perfect
            // score after an earlier win) replays the wave without remount.
            className={`${
              cheering
                ? (celebration?.id ?? 0) % 2 === 1
                  ? 'tile-cheer'
                  : 'tile-cheer-alt'
                : 'letter-toss'
            } inline-block`}
            key={`${letter}${index}`}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <button
              // Touch devices get larger tiles: bigger targets and wider
              // tap-center spacing, the two levers against mis-taps.
              className={`relative h-12 w-12 touch-manipulation rounded-xl border text-xl font-semibold transition active:scale-90 pointer-coarse:h-14 pointer-coarse:w-14 pointer-coarse:text-2xl ${
                isRequired
                  ? 'border-accent bg-accent text-white'
                  : 'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
              } ${press === null ? '' : 'control-press'}`}
              data-letter={letter}
              data-pressed={lastAppended?.letter === letter ? 'true' : 'false'}
              data-required={isRequired ? 'true' : 'false'}
              key={press?.key ?? 'idle'}
              onClick={() => {
                onLetter(letter);
              }}
              style={
                press === null
                  ? undefined
                  : { animationDelay: `${press.delayMs}ms` }
              }
              title={isRequired ? t.requiredLetterTitle : undefined}
              type="button"
            >
              {letter}
              {press === null ? null : (
                <span
                  aria-hidden="true"
                  className="control-ring pointer-events-none absolute inset-0 rounded-xl"
                  style={{ animationDelay: `${press.delayMs}ms` }}
                />
              )}
            </button>
          </span>
        );
      })}
    </div>
  );
}
