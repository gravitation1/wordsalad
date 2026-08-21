import { useLayoutEffect, useRef, useState } from 'react';

import { useMessages } from '../i18n';
import type {
  HintReveal,
  LetterRejection,
  SpentHint,
  SubmittedPreview,
  WordExit,
  WordExitOutcome,
  WordPreview,
} from '../useWordSaladGame';
import { REVEAL_STAGGER_MS } from '../useWordSaladGame';
import type { WordOrigin } from './tiles';
import { KEYCAP_CLASS } from './tiles';
import type { BadgeSpot } from './VerdictBadge';
import { VerdictBadge, VerdictGhost } from './VerdictBadge';

interface WordInputProps {
  wordExit: WordExit | null;
  // The staged word's standing verdict, and the one just submitted, whose
  // badge floats away from where it stood.
  preview: WordPreview | null;
  lastSubmission: SubmittedPreview | null;
  canHint: boolean;
  hasWon: boolean;
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

// The cost, worn at the hint button's trailing edge in the typed word's
// verdict-badge grammar: whatever stands in the word area wears its points
// consequence as a trailing pill — +N for a word, −N max for a hint. Red
// borrows the verdict family's "this will cost you" recipe (the invalid-
// letters ✕), so the color already carries the warning in this spot.
const HINT_BADGE_CLASS =
  'flex h-[17px] items-center justify-center whitespace-nowrap rounded-full border border-red-300 bg-white px-1.5 text-xs font-bold tracking-normal text-red-500 dark:border-red-400/40 dark:bg-gray-950 dark:text-red-400';

// Full alarm: this hint would drop the reachable maximum below the win
// line. The verdict family is all outlines, so the solid fill is a
// categorical break — "this one is different".
const HINT_BADGE_DANGER_CLASS =
  'flex h-[17px] items-center justify-center whitespace-nowrap rounded-full bg-red-500 px-1.5 text-xs font-bold tracking-normal text-white';

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
  hasWon,
  isComplete,
  isPerfect,
  hintCost,
  hintForfeitsWin,
  hintReveal,
  lastSubmission,
  preview,
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
  // Where the verdict pill last stood, so its ghost can fly from that exact
  // spot after the word — and the pill with it — has gone.
  const badgeSpotRef = useRef<BadgeSpot | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (inputLetters.length > 0 && wordRef.current !== null) {
      const rect = wordRef.current.getBoundingClientRect();
      wordOriginRef.current = {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
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
    // relative + full width so the verdict can hang at the line's right
    // edge, in the drum's points column, without disturbing the word's
    // centering.
    <p className="word-input relative flex h-10 w-full items-center justify-center text-3xl font-semibold tracking-widest">
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
              className={`${wordExit === null ? 'hint-enter' : 'hint-enter-delayed'} flex min-h-10 touch-manipulation items-center rounded-full bg-gray-100 px-4 py-1 text-sm font-medium text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200`}
              data-forfeits-win={hintForfeitsWin ? 'true' : 'false'}
              onClick={handleHint}
              title={hintNote}
              type="button"
            >
              {/* Label over keycap, the shortcut pattern every other button
                  follows — with the cost badge outside, the interior is
                  exactly that pattern and nothing else. min-h-10 (not a
                  fixed height): the stack collapses to one finger-sized
                  line where the keycap hides. */}
              <span className="flex flex-col items-center leading-tight">
                {t.hintButton}
                {/* Keyboard shortcut, shown only where there is a real
                    keyboard. */}
                <span aria-hidden="true" className={KEYCAP_CLASS}>
                  {/* tracking-normal above: inherited letter-spacing trails
                    the glyph and skews it off-center. The half-pixel lift
                    moves the ink to its measured optical center. */}
                  <span className="inline-block -translate-y-[0.5px]">?</span>
                </span>
              </span>
            </button>
            {/* Taking a hint lowers your reachable max score by this much,
                worn at the button's trailing edge the way a typed word
                wears its verdict. Decoration, not a click target — the
                button's title and note already speak the cost. It enters
                with the button so the pair arrives as one object.
                Re-revealing an already-paid word is free: no badge. */}
            {hintCost > 0 ? (
              <span
                aria-hidden="true"
                className={`${wordExit === null ? 'hint-enter' : 'hint-enter-delayed'} pointer-events-none ml-2 ${
                  hintForfeitsWin ? HINT_BADGE_DANGER_CLASS : HINT_BADGE_CLASS
                }`}
                ref={costBadgeRef}
              >
                {t.hintCostBadge(hintCost)}
              </span>
            ) : null}
            {/* Outside the button: describes it without joining its
                accessible name (which stays a plain "Hint"). */}
            <span className="sr-only" id="hint-note">
              {hintNote}
            </span>
          </>
        ) : isComplete ? (
          // The board is cleared: a tile-styled verdict where the typing
          // cursor would otherwise beckon for words that don't exist.
          // Gold check for a perfect clear, the win accent's check for a
          // win — but a board revealed into a loss closes in the hinted
          // tiles' spent gray with the feedback line's ✕, since a green
          // check here would claim a win that never came.
          <span
            aria-hidden="true"
            // tracking-normal: the word line's wide letter-spacing trails
            // the glyph and would drag its ink left of the chip's center.
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold tracking-normal text-white ${
              isPerfect
                ? 'bg-amber-400'
                : hasWon
                  ? 'bg-accent'
                  : 'bg-gray-400 dark:bg-gray-600'
            }`}
            data-perfect={isPerfect ? 'true' : 'false'}
            data-testid="complete-mark"
            data-won={hasWon ? 'true' : 'false'}
          >
            {/* The glyphs' ink rides half a pixel below the line box's
                middle; lifted onto the chip's measured optical center. */}
            <span className="inline-block -translate-y-[0.5px]">
              {hasWon ? '✓' : '✕'}
            </span>
          </span>
        ) : inputLetters.length === 0 ? (
          // Only ever an invitation to an empty line: letters always append
          // at the end and delete from the end, so a caret beside a staged
          // word marks the one position it could possibly be, and pulses
          // for attention next to a badge that is actually saying
          // something. Once letters exist, the verdict is the trailing mark.
          <span
            aria-hidden="true"
            className="animate-pulse font-light text-gray-400"
          >
            |
          </span>
        ) : null}
        {/* What the staged letters are worth, or why they are worth nothing
            yet — carried at the word's own trailing edge, where the eye
            already is. Inside the shake wrapper, so a rejected word takes
            its verdict with it. Screen readers hear this as Submit's
            description instead: the word is a live region, and a fresh
            verdict per keystroke would talk over the typing. */}
        <VerdictBadge preview={preview} spotRef={badgeSpotRef} />
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
      {/* The submitted word's verdict, floating up from where the pill was
          standing. Out here with the other fixed ghosts: the shake
          wrapper's transform would become its containing block. */}
      <VerdictGhost lastSubmission={lastSubmission} spotRef={badgeSpotRef} />
    </p>
  );
}
