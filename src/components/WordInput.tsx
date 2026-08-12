import { useLayoutEffect, useRef, useState } from 'react';

import { useMessages } from '../i18n';
import type {
  HintReveal,
  LetterRejection,
  SpentHint,
  WordExit,
  WordExitOutcome,
} from '../useWordSaladGame';
import { REVEAL_STAGGER_MS } from '../useWordSaladGame';
import type { WordOrigin } from './tiles';

interface WordInputProps {
  wordExit: WordExit | null;
  canHint: boolean;
  isComplete: boolean;
  isPerfect: boolean;
  hintCost: number;
  hintForfeitsWin: boolean;
  hintReveal: HintReveal | null;
  spentHint: SpentHint | null;
  inputLetters: readonly string[];
  onHint: () => void;
  rejection: LetterRejection | null;
  requiredCharacters: string;
  isValidCharacter: (character: string) => boolean;
  // Written here on every edit; the drum reads it to fly a found word from
  // its typed spot into its slot.
  wordOriginRef: { current: WordOrigin | null };
}

// Faded to sit quietly beside the muted "Hint" label; red as a cost warning
// before the purchase (once spent, the bar shows the loss in neutral gray).
const HINT_BADGE_CLASS =
  'flex h-5 items-center whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-400 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-400/80';

// Full alarm: this hint would drop the reachable maximum below the win
// line. The routine faded chip goes solid so the same object reads as
// "this one is different".
const HINT_BADGE_DANGER_CLASS =
  'flex h-5 items-center whitespace-nowrap rounded-full bg-red-500 px-2 text-[11px] font-semibold text-white';

// The exiting word's letters peel off left to right as it animates away.
const EXIT_STAGGER_MS = 35;

// Scored and hinted words get no exit ghost here: wherever animation is
// possible, the drum flies the word from its typed spot into its slot, and
// a second copy fading out underneath would double it. The input's ghost
// still sees off rejected words — and every outcome where nothing can fly
// (no Web Animations API, reduced motion), so no word vanishes unsaluted.
// The conditions mirror the drum's own flight guards exactly.
function drumFliesWord(outcome: WordExitOutcome): boolean {
  return (
    outcome !== 'rejected' &&
    typeof Element.prototype.animate === 'function' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Accepted words rise; rejected words sink, tinted like the Submit badge's
// rejection verdicts (hinted words match their gray +0 badge).
const EXIT_TONE: Record<WordExitOutcome, string> = {
  scored: 'word-exit-up text-accent',
  hinted: 'word-exit-up text-gray-400 dark:text-gray-500',
  rejected: 'word-exit-down text-orange-600 dark:text-orange-400',
};

function letterClass(
  letter: string,
  requiredCharacters: string,
  isValidCharacter: (character: string) => boolean,
): string {
  if (requiredCharacters.includes(letter)) {
    return 'text-accent';
  } else if (isValidCharacter(letter)) {
    return '';
  }
  return 'text-red-500';
}

// The reveal is active while the untouched hinted word fills the input. This
// stays false for typed letters, and turns itself off the moment the player
// edits (the input no longer matches the hint).
function isHintReveal(
  hintReveal: HintReveal | null,
  inputLetters: readonly string[],
): boolean {
  return (
    hintReveal !== null &&
    hintReveal.letters.length === inputLetters.length &&
    hintReveal.letters.every((letter, index) => letter === inputLetters[index])
  );
}

export function WordInput({
  wordExit,
  canHint,
  isComplete,
  isPerfect,
  hintCost,
  hintForfeitsWin,
  hintReveal,
  spentHint,
  inputLetters,
  onHint,
  rejection,
  requiredCharacters,
  isValidCharacter,
  wordOriginRef,
}: WordInputProps) {
  const t = useMessages();
  const isRevealing = isHintReveal(hintReveal, inputLetters);

  // When nothing is typed, the word area offers a hint instead of a cursor.
  const showHint = inputLetters.length === 0 && canHint;

  // Doubles as the tooltip and the button's accessible description (via
  // aria-describedby, so the accessible name stays a plain "Hint").
  const hintNote = hintForfeitsWin
    ? t.hintForfeitsWinLabel
    : hintCost > 0
      ? t.hintCostLabel(hintCost)
      : t.hintAgainLabel;

  // The word span is gone by the time its exit ghost mounts, and the word
  // area re-centers around the returning hint button — so the ghost is
  // fixed-positioned at the word's last on-screen spot, captured while the
  // letters were still laid out. The shared ref also hands the spot (and
  // the word's height, for the scale morph) to the drum's flight.
  const wordRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (inputLetters.length > 0 && wordRef.current !== null) {
      const rect = wordRef.current.getBoundingClientRect();
      wordOriginRef.current = {
        height: rect.height,
        left: rect.left,
        top: rect.top,
      };
    }
  }, [inputLetters, wordOriginRef]);

  // Places a mounting ghost at the captured spot. A ref callback runs at
  // commit (before paint), where reading refs and positioning imperatively
  // is allowed — render itself stays pure.
  const placeExitGhost = (node: HTMLSpanElement | null) => {
    if (node === null) {
      return;
    }
    if (wordOriginRef.current === null) {
      node.style.display = 'none';
    } else {
      node.style.left = `${wordOriginRef.current.left}px`;
      node.style.top = `${wordOriginRef.current.top}px`;
    }
  };

  // The cost badge vanishes with the button when a hint is taken, so we
  // capture its screen position on tap and launch the fly-away ghost from
  // there (fixed-positioned, unaffected by the word area reflowing).
  const costBadgeRef = useRef<HTMLSpanElement>(null);
  const [ghostOrigin, setGhostOrigin] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const handleHint = () => {
    const rect = costBadgeRef.current?.getBoundingClientRect();
    if (rect) {
      setGhostOrigin({ left: rect.left, top: rect.top });
    }
    onHint();
  };

  return (
    <p className="word-input flex h-10 items-center text-3xl font-semibold tracking-widest">
      {/* Shakes on every rejection by alternating between two identical
          animations (a name change replays without a remount, which would
          reset the hint button's entrance). The fixed ghosts below must stay
          OUTSIDE this wrapper: its shake transform would become their
          containing block, throwing their viewport coordinates off. */}
      <span
        className={`flex items-center ${
          rejection === null
            ? ''
            : rejection.id % 2 === 1
              ? 'input-shake'
              : 'input-shake-alt'
        }`}
      >
        <span
          aria-label={t.currentWordLabel}
          // Echoes letters as they arrive — typed, tapped, or hint-revealed.
          aria-live="polite"
          data-revealing={isRevealing}
          ref={wordRef}
        >
          {inputLetters.map((letter, index) => (
            <span
              className={`${letterClass(letter, requiredCharacters, isValidCharacter)} ${
                isRevealing ? 'letter-reveal' : ''
              }`}
              key={`${letter}${index}`}
              style={
                isRevealing
                  ? { animationDelay: `${index * REVEAL_STAGGER_MS}ms` }
                  : undefined
              }
            >
              {letter}
            </span>
          ))}
        </span>
        {showHint ? (
          <>
            <button
              aria-describedby="hint-note"
              // The button eases in; after a submission it waits out the
              // exiting word so the two never hard-cut in the same frame.
              className={`${wordExit === null ? 'hint-enter' : 'hint-enter-delayed'} flex h-10 touch-manipulation items-center gap-2 rounded-full bg-gray-100 px-4 text-sm font-medium text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200`}
              data-forfeits-win={hintForfeitsWin ? 'true' : 'false'}
              onClick={handleHint}
              title={hintNote}
              type="button"
            >
              {t.hintButton}
              {/* Taking a hint lowers your reachable max score by this much.
                  Re-revealing an already-paid word is free: no cost chip. */}
              {hintCost > 0 ? (
                <span
                  aria-hidden="true"
                  className={
                    hintForfeitsWin ? HINT_BADGE_DANGER_CLASS : HINT_BADGE_CLASS
                  }
                  ref={costBadgeRef}
                >
                  {t.hintCostBadge(hintCost)}
                </span>
              ) : null}
              {/* Keyboard shortcut, shown only where there is a real
                  keyboard. */}
              <span
                aria-hidden="true"
                className="hidden h-4 w-4 items-center justify-center rounded border border-gray-300 text-[10px] font-normal leading-none tracking-normal text-gray-400 pointer-fine:inline-flex dark:border-gray-600 dark:text-gray-500"
              >
                {/* tracking-normal above: inherited letter-spacing trails the
                  glyph and skews it off-center. The half-pixel lift moves the
                  ink to its measured optical center. */}
                <span className="inline-block -translate-y-[0.5px]">?</span>
              </span>
            </button>
            {/* Outside the button: describes it without joining its
                accessible name (which stays a plain "Hint"). */}
            <span className="sr-only" id="hint-note">
              {hintNote}
            </span>
          </>
        ) : isComplete ? (
          // The board is cleared: a tile-styled check where the typing
          // cursor would otherwise beckon for words that don't exist.
          // Gold for a perfect clear.
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold text-white ${
              isPerfect ? 'bg-amber-400' : 'bg-accent'
            }`}
            data-testid="complete-mark"
          >
            ✓
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="animate-pulse font-light text-gray-400"
          >
            |
          </span>
        )}
      </span>
      {/* A rejected word sinks away from where it sat, its letters peeling
          off left to right, while the hint button returns underneath.
          Accepted words leave no ghost here when the drum can fly them —
          the word itself travels up into its slot instead. */}
      {wordExit === null || drumFliesWord(wordExit.outcome) ? null : (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed"
          data-testid="word-exit"
          data-word-exit={wordExit.outcome}
          key={`exit-${wordExit.id}`}
          ref={placeExitGhost}
        >
          {wordExit.letters.map((letter, index) => (
            <span
              className={`inline-block ${EXIT_TONE[wordExit.outcome]}`}
              key={`${letter}${index}`}
              style={{ animationDelay: `${index * EXIT_STAGGER_MS}ms` }}
            >
              {letter}
            </span>
          ))}
        </span>
      )}
      {/* The spent cost floats away from where the badge sat on the button. */}
      {spentHint === null || ghostOrigin === null ? null : (
        <span
          aria-hidden="true"
          className={`badge-fly-away pointer-events-none fixed ${HINT_BADGE_CLASS}`}
          key={`spent-${spentHint.id}`}
          style={{ left: ghostOrigin.left, top: ghostOrigin.top }}
        >
          {t.hintCostBadge(spentHint.cost)}
        </span>
      )}
    </p>
  );
}
