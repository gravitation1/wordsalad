import { useEffect, useRef, useState } from 'react';

import { useMessages } from '../i18n';
import type {
  Celebration,
  Lockout,
  RankUp,
  WordSlot,
  WordSpotlight,
} from '../useWordSaladGame';
import { WinBurst } from './Confetti';
import { LockoutDialog } from './LockoutDialog';
import { RatingsDialog } from './RatingsDialog';
import { WinDialog } from './WinDialog';
import { WordDrum } from './WordDrum';

interface ScoreboardProps {
  celebration: Celebration | null;
  // Passed through to the word drum's found-word rows.
  definitionUrl: (word: string) => string;
  foldLetter: (letter: string) => string;
  // For the celebration burst's letter tiles.
  saladLetters: readonly string[];
  requiredCharacters: string;
  wordSlots: readonly WordSlot[];
  spotlight: WordSpotlight | null;
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
  lockout: Lockout | null;
  hintCount: number;
  challengeScore: number | null;
  rankUp: RankUp | null;
  onCustomGame: () => void;
  onNewGame: () => void;
  // Passed through to the word drum's unfound rows: types a row's derived
  // prefix into the word area.
  onPrefill: (prefix: string) => void;
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
  definitionUrl,
  foldLetter,
  saladLetters,
  requiredCharacters,
  wordSlots,
  spotlight,
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
  lockout,
  hintCount,
  challengeScore,
  rankUp,
  onCustomGame,
  onNewGame,
  onPrefill,
  onRestart,
}: ScoreboardProps) {
  const t = useMessages();
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const ratingsButtonRef = useRef<HTMLButtonElement>(null);

  // The win modal opens on each celebration (the win, and again — gold —
  // for a perfect clear) and stays dismissed once closed, so closing it
  // returns the board to its normal playing view. Restored wins never open
  // it: a restore carries no celebration.
  //
  // Dismissal is held as the event itself rather than its id. Restart
  // clears the celebration without remounting the board — so the counter
  // starts over at 1 while this state survives, and a remembered id would
  // read the next win as the one already dismissed and never open again.
  // Every event is a fresh object, so identity cannot collide that way.
  const [dismissedWin, setDismissedWin] = useState<Celebration | null>(null);

  // The lockout modal mirrors the win: it opens once on the crossing event
  // and stays dismissed, so the board returns to normal (a slim reminder
  // stays on the score line). A restored locked game carries no event, so
  // it shows only the reminder — never the modal.
  const [dismissedLockout, setDismissedLockout] = useState<Lockout | null>(
    null,
  );

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
      `${t.appTitle} · ${letters}` +
        (requiredCharacters.length > 0 ? ` (${requiredCharacters})` : ''),
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
  const isComplete = foundCount === wordSlots.length;
  const anyHinted = wordSlots.some((slot) => slot.found?.hinted ?? false);
  // The gold treatment is state, not event: a restored perfect game keeps
  // it (only the animations are reserved for the moment itself).
  const isPerfect = earnedPoints === maxPoints;

  // Closing the dialog restores focus to this trigger; blur it so a
  // subsequent Enter submits a word instead of re-opening the dialog.
  const closeRatings = () => {
    setIsRatingsOpen(false);
    ratingsButtonRef.current?.blur();
  };

  return (
    <section className="w-full space-y-3">
      {/* The fanfare interrupts, then gets out of the way: dismissing the
          modal returns the board to its normal view. Keyed per celebration
          so the perfect (gold) pass remounts and replays the show. */}
      {celebration !== null && celebration !== dismissedWin ? (
        <WinDialog
          celebration={celebration}
          isComplete={isComplete}
          key={`win-${celebration.id}`}
          letters={saladLetters}
          level={level}
          onClose={() => {
            setDismissedWin(celebration);
          }}
          onCustomGame={() => {
            setDismissedWin(celebration);
            onCustomGame();
          }}
          onNewGame={onNewGame}
          onShare={() => {
            void handleShare();
          }}
          requiredCharacters={requiredCharacters}
          shareCopied={shareCopied}
        />
      ) : null}
      {/* The loss counterpart to the win modal: fired once on the crossing,
          then dismissible so play can continue for rank. */}
      {lockout !== null && lockout !== dismissedLockout ? (
        <LockoutDialog
          isComplete={isComplete}
          key={`lockout-${lockout.id}`}
          onClose={() => {
            setDismissedLockout(lockout);
          }}
          onCustomGame={() => {
            setDismissedLockout(lockout);
            onCustomGame();
          }}
          onRestart={onRestart}
          reachablePoints={maxPoints - lostPoints}
          winPoints={winPoints}
        />
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
              {/* Stacked in one grid cell so the confirmation does not
                  widen the button and reflow the summary beside it. */}
              <span className="grid">
                <span
                  aria-hidden={shareCopied}
                  className={`col-start-1 row-start-1 flex items-center gap-1 whitespace-nowrap ${
                    shareCopied ? 'invisible' : ''
                  }`}
                >
                  <span aria-hidden="true">↗</span>
                  {t.shareButton}
                </span>
                <span
                  aria-hidden={!shareCopied}
                  className={`col-start-1 row-start-1 flex items-center gap-1 whitespace-nowrap ${
                    shareCopied ? '' : 'invisible'
                  }`}
                >
                  <span aria-hidden="true">✓</span>
                  {t.shareCopied}
                </span>
              </span>
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
        {/* The win's quiet residue once the modal is gone (and the only
            marker a restored won game shows): gold for a perfect score.
            Outside the ratings button so its accessible name stays the
            plain score. */}
        {hasWon ? (
          <span
            className={`mr-1 text-sm font-semibold ${
              isPerfect ? 'text-amber-500' : 'text-accent'
            }`}
            data-perfect={isPerfect ? 'true' : 'false'}
            data-testid="won-mark"
          >
            <span aria-hidden="true">✓</span>
            <span className="sr-only">{t.statWon}</span>
          </span>
        ) : null}
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
              requiredCharacters={requiredCharacters}
            />
          </span>
        )}
      </div>
      {/* The lockout modal's quiet residue once dismissed — and the only
          cue a restored locked game shows (it carries no event, so the
          modal never opens). A slim line, not the old padded banner. */}
      {lockedOut ? (
        <p
          className="text-xs font-medium text-red-500 dark:text-red-400"
          data-testid="lockout-note"
        >
          {t.lockedOutShort}
        </p>
      ) : null}
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
      <WordDrum
        definitionUrl={definitionUrl}
        foldLetter={foldLetter}
        onPrefill={onPrefill}
        spotlight={spotlight}
        requiredCharacters={requiredCharacters}
        slots={wordSlots}
      />
      {anyHinted ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t.hintedLegend}
        </p>
      ) : null}
    </section>
  );
}
