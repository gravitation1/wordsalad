import { useRef, useState } from 'react';

import { useMessages } from '../i18n';
import type { Celebration, WordSlot } from '../useWordSaladGame';
import { WinBurst } from './Confetti';
import { RatingsDialog } from './RatingsDialog';
import { WordDrum } from './WordDrum';

interface ScoreboardProps {
  celebration: Celebration | null;
  // For the celebration burst's letter tiles.
  saladLetters: readonly string[];
  requiredCharacter: string;
  wordSlots: readonly WordSlot[];
  lastFoundWord: string | null;
  earnedPoints: number;
  maxPoints: number;
  lostPoints: number;
  earnedPercent: number;
  lostPercent: number;
  winThreshold: number;
  winPoints: number;
  level: string;
  hasWon: boolean;
  lockedOut: boolean;
  hintCount: number;
  onPlayAgain: () => void;
  onRestart: () => void;
}

export function Scoreboard({
  celebration,
  saladLetters,
  requiredCharacter,
  wordSlots,
  lastFoundWord,
  earnedPoints,
  maxPoints,
  lostPoints,
  earnedPercent,
  lostPercent,
  winThreshold,
  winPoints,
  level,
  hasWon,
  lockedOut,
  hintCount,
  onPlayAgain,
  onRestart,
}: ScoreboardProps) {
  const t = useMessages();
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const ratingsButtonRef = useRef<HTMLButtonElement>(null);

  const foundCount = wordSlots.filter((slot) => slot.found !== null).length;
  const anyHinted = wordSlots.some((slot) => slot.found?.hinted ?? false);

  // The victory phrase as per-word tile groups, with a running index so the
  // vault stagger flows across word boundaries.
  const victoryTiles: { character: string; delayIndex: number }[][] = [];
  let delayCounter = 0;
  for (const word of t.victory.split(' ')) {
    if (word.length > 0) {
      victoryTiles.push(
        Array.from(word).map((character) => ({
          character,
          delayIndex: delayCounter++,
        })),
      );
    }
  }

  // Closing the dialog restores focus to this trigger; blur it so a
  // subsequent Enter submits a word instead of re-opening the dialog.
  const closeRatings = () => {
    setIsRatingsOpen(false);
    ratingsButtonRef.current?.blur();
  };

  return (
    <section className="w-full space-y-3">
      {hasWon ? (
        // Springs in only at the moment of winning; a restored win is calm.
        <div
          className={`relative space-y-2 rounded-xl bg-accent-soft p-4 text-center dark:bg-accent/15 ${
            celebration === null ? '' : 'win-pop'
          }`}
        >
          {celebration === null ? null : (
            <WinBurst
              letters={saladLetters}
              requiredCharacter={requiredCharacter}
            />
          )}
          <p>
            {/* Real text for readers and tests; the visible tiles — the
                victory phrase spelled in the game's own letter tiles, with
                punctuation in accent — vault in one by one on the win.
                Tiles group per word so wrapping never splits a word. */}
            <span className="sr-only">{t.victory}</span>
            <span
              aria-hidden="true"
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5"
            >
              {victoryTiles.map((word, wordIndex) => (
                <span className="flex gap-1.5" key={wordIndex}>
                  {word.map(({ character, delayIndex }) => (
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold ${
                        /[\p{L}\p{N}]/u.test(character)
                          ? 'border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
                          : 'bg-accent text-white'
                      } ${celebration === null ? '' : 'win-letter'}`}
                      key={delayIndex}
                      style={
                        celebration === null
                          ? undefined
                          : { animationDelay: `${delayIndex * 45}ms` }
                      }
                    >
                      {character}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </p>
          <p className="text-sm font-semibold text-accent">
            {t.levelName(level)}
          </p>
          <button
            className="min-h-11 touch-manipulation rounded-full bg-accent px-5 py-2 font-medium text-white transition hover:bg-accent/90 active:scale-95"
            onClick={onPlayAgain}
            type="button"
          >
            {t.playAgainButton}
          </button>
        </div>
      ) : null}
      {lockedOut ? (
        <p
          className="rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
          role="status"
        >
          {t.lockedOutNote(maxPoints - lostPoints, winPoints)}
        </p>
      ) : null}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t.foundSummary(foundCount)}
          {hintCount > 0 ? (
            <span className="text-gray-400 dark:text-gray-500">
              {` · ${t.hintsUsed(hintCount, lostPoints)}`}
            </span>
          ) : null}
        </p>
        {foundCount > 0 ? (
          <button
            className="-m-2 flex touch-manipulation items-center gap-1 p-2 text-xs font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
            onClick={onRestart}
            type="button"
          >
            <span aria-hidden="true">⟲</span>
            {t.restartButton}
          </button>
        ) : null}
      </div>
      {/* Green earned points grow from the left; red points lost to hints
          eat in from the right; the marker is the win threshold. */}
      <div className="relative py-1">
        <div
          aria-label={t.completionLabel}
          aria-valuemax={maxPoints}
          aria-valuemin={0}
          aria-valuenow={earnedPoints}
          className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800 ${
            celebration === null ? '' : 'bar-shine'
          }`}
          role="progressbar"
        >
          {/* Both fills advance with flat edges — the container's clip rounds
              the outer ends — so they butt cleanly when they meet. */}
          <div
            className="absolute inset-y-0 left-0 bg-accent transition-all"
            style={{ width: `${earnedPercent * 100}%` }}
          />
          {/* Lost-to-hints points are spent, not alarming: the same gray the
              hinted words wear in the drum and on the +0 badge. */}
          <div
            className="absolute inset-y-0 right-0 bg-gray-400 transition-all dark:bg-gray-600"
            style={{ width: `${lostPercent * 100}%` }}
          />
        </div>
        {/* Dark enough to stay visible on top of the gray lost segment. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded bg-gray-700 dark:bg-gray-300"
          style={{ left: `${winThreshold * 100}%` }}
          title={t.winThresholdLabel(winPoints)}
        />
      </div>
      <button
        aria-haspopup="dialog"
        className="-mx-2 -my-1 touch-manipulation rounded px-2 py-1 text-left text-sm text-gray-600 underline decoration-gray-400/60 decoration-dotted underline-offset-4 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        onClick={() => {
          setIsRatingsOpen(true);
        }}
        ref={ratingsButtonRef}
        type="button"
      >
        {t.progressLabel(earnedPoints, maxPoints, level)}
      </button>
      {isRatingsOpen ? (
        <RatingsDialog
          earnedPoints={earnedPoints}
          level={level}
          maxPoints={maxPoints}
          onClose={closeRatings}
          winPoints={winPoints}
        />
      ) : null}
      {/* The full word map: every word owns an alphabetized slot from the
          start, anonymous until found. The drum keeps the height fixed. */}
      <div className="flex items-baseline justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium">{t.wordsHeader}</span>
        <span className="w-16 text-right font-medium">{t.pointsHeader}</span>
      </div>
      <WordDrum lastFoundWord={lastFoundWord} slots={wordSlots} />
      {anyHinted ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t.hintedLegend}
        </p>
      ) : null}
    </section>
  );
}
