import { useEffect, useRef, useState } from 'react';

import { useMessages } from '../i18n';
import type { Celebration, RankUp, WordSlot } from '../useWordSaladGame';
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
  challengeScore: number | null;
  rankUp: RankUp | null;
  onPlayAgain: () => void;
  onRestart: () => void;
}

// The share snippet's miniature bar: earned, lost-to-hints, unclaimed.
const SHARE_BAR_SEGMENTS = 7;

function shareBar(earned: number, lost: number, max: number): string {
  const greens = Math.round((earned / max) * SHARE_BAR_SEGMENTS);
  const darks = Math.min(
    SHARE_BAR_SEGMENTS - greens,
    Math.round((lost / max) * SHARE_BAR_SEGMENTS),
  );
  return (
    '🟩'.repeat(greens) +
    '⬛'.repeat(darks) +
    '⬜'.repeat(SHARE_BAR_SEGMENTS - greens - darks)
  );
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
  challengeScore,
  rankUp,
  onPlayAgain,
  onRestart,
}: ScoreboardProps) {
  const t = useMessages();
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const ratingsButtonRef = useRef<HTMLButtonElement>(null);

  // "Copied!" flashes on the Share button after a clipboard fallback.
  const [shareCopied, setShareCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  // Wordle-style share: a themed snippet whose link replays this puzzle and
  // carries the score as a challenge. Native share sheet where available,
  // clipboard otherwise; the score is a claim, verified socially.
  const handleShare = async () => {
    const url = new URL(window.location.href);
    const letters = url.searchParams.get('letters') ?? '';
    url.searchParams.set('score', String(earnedPoints));
    url.searchParams.set('hints', String(hintCount));

    const summary =
      `${earnedPoints}/${maxPoints} · ${t.levelName(level)}` +
      (hasWon ? ' ✓' : '') +
      (hintCount > 0 ? ` · ${t.hintsUsed(hintCount, lostPoints)}` : '');
    const text = [
      `${t.appTitle} · ${letters} (${requiredCharacter})`,
      summary,
      shareBar(earnedPoints, lostPoints, maxPoints),
      url.toString(),
    ].join('\n');

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ text });
        return;
      }
    } catch (_error) {
      return; // the user dismissed the share sheet
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
      copiedTimer.current = window.setTimeout(() => {
        setShareCopied(false);
      }, 2000);
    } catch (_error) {
      // No share sheet, no clipboard: nothing to do.
    }
  };

  const foundCount = wordSlots.filter((slot) => slot.found !== null).length;
  const anyHinted = wordSlots.some((slot) => slot.found?.hinted ?? false);
  // The gold treatment is state, not event: a restored perfect game keeps
  // it (only the animations are reserved for the moment itself).
  const isPerfect = earnedPoints === maxPoints;

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
        // A perfect score fires a second, grander (gold) pass even though
        // the banner is already up — the class change replays the pop.
        <div
          className={`relative space-y-2 rounded-xl p-4 text-center ${
            isPerfect
              ? 'bg-amber-50 dark:bg-amber-400/10'
              : 'bg-accent-soft dark:bg-accent/15'
          } ${
            celebration === null
              ? ''
              : celebration.perfect
                ? 'win-pop-perfect'
                : 'win-pop'
          }`}
          data-perfect={isPerfect ? 'true' : 'false'}
          data-testid="win-banner"
        >
          {celebration === null ? null : (
            <WinBurst
              key={`burst-${celebration.id}`}
              letters={saladLetters}
              perfect={celebration.perfect}
              requiredCharacter={requiredCharacter}
            />
          )}
          <p>
            {/* Real text for readers and tests; the visible tiles — the
                victory phrase spelled in the game's own letter tiles, with
                punctuation in accent (gold across the board for a perfect
                score) — vault in one by one. Keyed per celebration so the
                perfect pass re-vaults; grouped per word so wrapping never
                splits one. */}
            <span className="sr-only">{t.victory}</span>
            <span
              aria-hidden="true"
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5"
              key={celebration?.id ?? 0}
            >
              {victoryTiles.map((word, wordIndex) => (
                <span className="flex gap-1.5" key={wordIndex}>
                  {word.map(({ character, delayIndex }) => (
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold ${
                        isPerfect
                          ? /[\p{L}\p{N}]/u.test(character)
                            ? 'border border-amber-400 bg-amber-300 text-amber-900'
                            : 'bg-amber-400 text-white'
                          : /[\p{L}\p{N}]/u.test(character)
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
      {/* A score that arrived via a shared link: the duel banner. */}
      {challengeScore === null ? null : earnedPoints > challengeScore ? (
        <p
          className="rounded-xl bg-accent-soft p-3 text-center text-sm font-medium text-accent dark:bg-accent/15"
          data-testid="challenge"
          role="status"
        >
          {t.challengeBeaten(challengeScore)}
        </p>
      ) : (
        <p
          className="rounded-xl bg-gray-100 p-3 text-center text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          data-testid="challenge"
        >
          {t.challengeNote(challengeScore)}
        </p>
      )}
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
          <span className="flex items-center gap-3">
            <button
              className="-my-2 flex touch-manipulation items-center gap-1 py-2 text-xs font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
              onClick={() => {
                void handleShare();
              }}
              type="button"
            >
              <span aria-hidden="true">↗</span>
              {shareCopied ? t.shareCopied : t.shareButton}
            </button>
            <button
              className="-my-2 flex touch-manipulation items-center gap-1 py-2 text-xs font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
              onClick={onRestart}
              type="button"
            >
              <span aria-hidden="true">⟲</span>
              {t.restartButton}
            </button>
          </span>
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
            celebration === null
              ? ''
              : celebration.perfect
                ? 'bar-shine-perfect'
                : 'bar-shine'
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
      {/* relative + inline-block anchor the rank-up burst on the score. */}
      <div className="relative inline-block">
        <button
          aria-haspopup="dialog"
          className="-mx-2 -my-1 touch-manipulation rounded px-2 py-1 text-left text-sm text-gray-600 underline decoration-gray-400/60 decoration-dotted underline-offset-4 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          onClick={() => {
            setIsRatingsOpen(true);
          }}
          ref={ratingsButtonRef}
          type="button"
        >
          {t.scoreLabel(earnedPoints, maxPoints)}
          {' · '}
          {/* Split-flaps in on a rank-up (keyed remount replays it). */}
          <span
            className={rankUp === null ? undefined : 'rank-flip inline-block'}
            data-rank-id={rankUp?.id ?? 0}
            data-testid="rating-name"
            key={`rank-${rankUp?.id ?? 0}`}
          >
            {t.levelName(level)}
          </span>
        </button>
        {rankUp === null ? null : (
          <span data-testid="rank-burst" key={`burst-${rankUp.id}`}>
            <WinBurst
              letters={saladLetters}
              mini
              requiredCharacter={requiredCharacter}
            />
          </span>
        )}
      </div>
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
