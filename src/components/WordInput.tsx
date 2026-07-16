import { useLayoutEffect, useRef, useState } from 'react';

import { useMessages } from '../i18n';
import type {
  AcceptedWord,
  HintReveal,
  LetterRejection,
  SpentHint,
} from '../useWordSaladGame';

interface WordInputProps {
  acceptedWord: AcceptedWord | null;
  canHint: boolean;
  hintCost: number;
  hintReveal: HintReveal | null;
  spentHint: SpentHint | null;
  inputLetters: readonly string[];
  onHint: () => void;
  rejection: LetterRejection | null;
  requiredCharacter: string;
  isValidCharacter: (character: string) => boolean;
}

// Faded to sit quietly beside the muted "Hint" label; still red to tie it to
// the bar's lost-max anti-progress.
const HINT_BADGE_CLASS =
  'flex h-5 items-center whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-400 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-400/80';

// Letters cascade in when they arrive from a hint; typed letters appear at
// once. Position i is delayed proportionally so it reads as a reveal.
const REVEAL_STAGGER_MS = 45;

// An accepted word's letters peel off left to right as the word floats away.
const EXIT_STAGGER_MS = 35;

function letterClass(
  letter: string,
  requiredCharacter: string,
  isValidCharacter: (character: string) => boolean,
): string {
  if (letter === requiredCharacter) {
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
  acceptedWord,
  canHint,
  hintCost,
  hintReveal,
  spentHint,
  inputLetters,
  onHint,
  rejection,
  requiredCharacter,
  isValidCharacter,
}: WordInputProps) {
  const t = useMessages();
  const isRevealing = isHintReveal(hintReveal, inputLetters);

  // When nothing is typed, the word area offers a hint instead of a cursor.
  const showHint = inputLetters.length === 0 && canHint;

  // The word span is gone by the time its exit ghost mounts, and the word
  // area re-centers around the returning hint button — so the ghost is
  // fixed-positioned at the word's last on-screen spot, captured while the
  // letters were still laid out.
  const wordRef = useRef<HTMLSpanElement>(null);
  const wordOrigin = useRef<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (inputLetters.length > 0 && wordRef.current !== null) {
      const rect = wordRef.current.getBoundingClientRect();
      wordOrigin.current = { left: rect.left, top: rect.top };
    }
  }, [inputLetters]);

  // Places a mounting ghost at the captured spot. A ref callback runs at
  // commit (before paint), where reading refs and positioning imperatively
  // is allowed — render itself stays pure.
  const placeExitGhost = (node: HTMLSpanElement | null) => {
    if (node === null) {
      return;
    }
    if (wordOrigin.current === null) {
      node.style.display = 'none';
    } else {
      node.style.left = `${wordOrigin.current.left}px`;
      node.style.top = `${wordOrigin.current.top}px`;
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
    <p
      className={`flex h-10 items-center text-3xl font-semibold tracking-widest ${
        rejection === null ? '' : 'input-shake'
      }`}
      // Remounts on every rejection (key) to replay the shake.
      key={rejection?.id ?? 0}
    >
      <span
        aria-label={t.currentWordLabel}
        data-revealing={isRevealing}
        ref={wordRef}
      >
        {inputLetters.map((letter, index) => (
          <span
            className={`${letterClass(letter, requiredCharacter, isValidCharacter)} ${
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
        <button
          // The button eases in; after a submission it waits out the exiting
          // word so the two never hard-cut in the same frame.
          className={`${acceptedWord === null ? 'hint-enter' : 'hint-enter-delayed'} flex h-10 touch-manipulation items-center gap-2 rounded-full bg-gray-100 px-4 text-sm font-medium text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200`}
          onClick={handleHint}
          title={t.hintCostLabel(hintCost)}
          type="button"
        >
          {t.hintButton}
          {/* Taking a hint lowers your reachable max score by this much. */}
          <span
            aria-hidden="true"
            className={HINT_BADGE_CLASS}
            ref={costBadgeRef}
          >
            {t.hintCostBadge(hintCost)}
          </span>
          {/* Keyboard shortcut, shown only where there is a real keyboard. */}
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
      ) : (
        <span
          aria-hidden="true"
          className="animate-pulse font-light text-gray-400"
        >
          |
        </span>
      )}
      {/* The accepted word floats up from where it sat, its letters peeling
          off left to right, while the hint button returns underneath. */}
      {acceptedWord === null ? null : (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed"
          data-testid="word-exit"
          data-word-exit={acceptedWord.scored ? 'scored' : 'hinted'}
          key={acceptedWord.id}
          ref={placeExitGhost}
        >
          {acceptedWord.letters.map((letter, index) => (
            <span
              className={`word-exit inline-block ${
                acceptedWord.scored
                  ? 'text-accent'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
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
          key={spentHint.id}
          style={{ left: ghostOrigin.left, top: ghostOrigin.top }}
        >
          {t.hintCostBadge(spentHint.cost)}
        </span>
      )}
    </p>
  );
}
