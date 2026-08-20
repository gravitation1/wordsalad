import type { RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useMessages } from '../i18n';
import type {
  Celebration,
  DeniedControl,
  GameFeedback,
  Lockout,
  RankUp,
  RestartExit,
  ShareRequest,
  WordSlot,
  WordSpotlight,
} from '../useWordSaladGame';
import { WinBurst } from './Confetti';
import { FeedbackLine } from './FeedbackLine';
import { LockoutDialog } from './LockoutDialog';
import { RatingsDialog } from './RatingsDialog';
import type { WordOrigin } from './tiles';
import { KEYCAP_CLASS, KEYCAP_TINTED_CLASS } from './tiles';
import { WinDialog } from './WinDialog';
import { WordDrum } from './WordDrum';

interface ScoreboardProps {
  celebration: Celebration | null;
  // The last submission's verdict; it shares the word-list header's row.
  feedback: GameFeedback | null;
  // Passed through to the word drum's found-word rows.
  definitionUrl: (word: string) => string;
  foldLetter: (letter: string) => string;
  // For the celebration burst's letter tiles.
  saladLetters: readonly string[];
  requiredCharacters: string;
  wordSlots: readonly WordSlot[];
  spotlight: WordSpotlight | null;
  // A gated meta shortcut to acknowledge with a dip on its pill.
  denied: DeniedControl | null;
  // The 3 key, relayed from the game's keyboard handler as a one-shot:
  // sharing needs this component's URL/clipboard machinery.
  shareRequest: ShareRequest | null;
  // The rows a restart wiped: the drum flies their ghosts up toward the
  // Restart pill, which rings as it receives them.
  restartExit: RestartExit | null;
  // The New game pill's element, shared upward so a fresh deal can fly
  // its tiles out of the button that dealt them.
  newGameRef: RefObject<HTMLButtonElement | null>;
  // The outgoing board's earned-bar fraction, read at mount: a fresh
  // board's bar starts there and visibly drains to its empty state.
  // (Restart needs no help — its bar survives the reset and the width
  // transition plays the drain.)
  barDrainRef: { current: number };
  earnedPoints: number;
  maxPoints: number;
  lostPoints: number;
  winThreshold: number;
  winPoints: number;
  level: string;
  hasWon: boolean;
  lockedOut: boolean;
  lockout: Lockout | null;
  hintCount: number;
  // The letters typed so far, joined — the drum rolls to follow them.
  inputWord: string;
  challengeScore: number | null;
  rankUp: RankUp | null;
  onCustomGame: () => void;
  onNewGame: () => void;
  // Passed through to the word drum's unfound rows: types a row's derived
  // prefix into the word area.
  onPrefill: (prefix: string) => void;
  onRestart: () => void;
  // Passed through to the drum: where a found word flies in from.
  wordOriginRef: { current: WordOrigin | null };
}

// The meta row's pills: the play controls' finger-sized shape in the
// header's muted voice, so New game / Share / Restart stay secondary to
// the play loop while being just as easy to hit.
const ACTION_CLASS =
  'flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-gray-300 px-2 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 active:scale-95 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200';

// Same dashed idle look the play controls use for an action that would do
// nothing right now — including their press feedback: aria-disabled (not
// disabled) keeps CSS :active working, so a tap dips in acknowledgment.
const ACTION_DISABLED_CLASS =
  'flex min-h-11 cursor-not-allowed touch-manipulation items-center justify-center rounded-full border border-dashed border-gray-300 px-2 text-sm font-medium text-gray-300 transition active:scale-95 dark:border-gray-700 dark:text-gray-700';

// Share once the game is won: the row's hierarchy inverts — Submit's job
// is done and Share is the control whose moment arrived — so it alone
// takes the valid-word accent (border and text, no fill: a quiet tint,
// not a CTA shout). Same grammar as Submit's readiness tint, one level
// softer.
const ACTION_WON_CLASS =
  'flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-accent px-2 text-sm font-medium text-accent transition hover:bg-accent/10 active:scale-95';

// And the perfect sweep trades the accent for the score line's gilding:
// sharing a perfect game is holding up the trophy.
const ACTION_PERFECT_CLASS =
  'flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-amber-400 px-2 text-sm font-medium text-amber-600 transition hover:bg-amber-400/10 active:scale-95 dark:border-amber-400/60 dark:text-amber-300';

// A gated shortcut aimed at this pill (2 or 3 with nothing found): dip in
// acknowledgment, exactly as the play controls do for a denied Backspace
// or Enter. The identical animations alternate by denial parity so
// repeated denials replay without remounting the button.
function denyClass(
  denied: DeniedControl | null,
  control: DeniedControl['control'],
): string {
  if (denied?.control !== control) {
    return '';
  }
  return denied.id % 2 === 1 ? 'control-deny' : 'control-deny-alt';
}

// The share snippet's miniature bar: earned, lost-to-hints, unclaimed —
// or solid gold for the perfect sweep.
const SHARE_BAR_SEGMENTS = 7;

function shareBar(earned: number, lost: number, max: number): string {
  // Gated on the real score, not the rounded bar: rounding can fill all
  // seven segments a point or two short of perfect.
  if (earned === max) {
    return '🟨'.repeat(SHARE_BAR_SEGMENTS);
  }
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
  feedback,
  definitionUrl,
  foldLetter,
  saladLetters,
  requiredCharacters,
  wordSlots,
  spotlight,
  denied,
  shareRequest,
  restartExit,
  newGameRef,
  barDrainRef,
  earnedPoints,
  maxPoints,
  lostPoints,
  winThreshold,
  winPoints,
  level,
  hasWon,
  lockedOut,
  lockout,
  hintCount,
  inputWord,
  challengeScore,
  rankUp,
  onCustomGame,
  onNewGame,
  onPrefill,
  onRestart,
  wordOriginRef,
}: ScoreboardProps) {
  const t = useMessages();
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const ratingsButtonRef = useRef<HTMLButtonElement>(null);

  // A fresh board's bar drains from where the outgoing board's ended: the
  // remount destroyed that bar before its width transition could play, so
  // the incoming one animates the hand-off imperatively (WAAPI, like the
  // tile flights — a quiet no-op where it's missing, in jsdom, or under
  // reduced motion). Before paint, so the empty bar never flashes first.
  const earnedBarRef = useRef<HTMLDivElement>(null);
  const hasDrained = useRef(false);
  useLayoutEffect(() => {
    if (hasDrained.current) {
      return;
    }
    hasDrained.current = true;
    const from = barDrainRef.current;
    const node = earnedBarRef.current;
    const animate = (node as { animate?: HTMLElement['animate'] } | null)
      ?.animate;
    if (
      from <= 0 ||
      node === null ||
      animate === undefined ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ) {
      return;
    }
    animate.call(node, [{ offset: 0, width: `${from * 100}%` }], {
      duration: 500,
      easing: 'ease-out',
    });
  }, [barDrainRef]);

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

    const wonMark = earnedPoints === maxPoints ? ' 🏆' : hasWon ? ' ✓' : '';
    const summary =
      `${earnedPoints}/${maxPoints} · ${t.levelName(level)}` +
      wonMark +
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

  // Answer the 3 key, relayed by the game hook as a one-shot id. The
  // latest-callback ref mirrors useGameSounds' useSignal, and the seen ref
  // starts at the current id so a remounting board (new game) never
  // replays a request from before its time.
  const shareRun = useRef(handleShare);
  useEffect(() => {
    shareRun.current = handleShare;
  });
  const seenShare = useRef(shareRequest?.id ?? 0);
  useEffect(() => {
    const previous = seenShare.current;
    seenShare.current = shareRequest?.id ?? 0;
    if (shareRequest !== null && shareRequest.id > previous) {
      void shareRun.current();
    }
  }, [shareRequest]);

  const foundCount = wordSlots.filter((slot) => slot.found !== null).length;
  // Gates Share and Restart: with nothing found there is nothing to share
  // or to clear.
  const hasProgress = foundCount > 0;
  const isComplete = foundCount === wordSlots.length;
  const anyHinted = wordSlots.some((slot) => slot.found?.hinted ?? false);
  // The gold treatment is state, not event: a restored perfect game keeps
  // it (only the animations are reserved for the moment itself).
  const isPerfect = earnedPoints === maxPoints;

  // The bar measures whatever is actually being played for: the win
  // threshold until it is reached, the full board once it is. Max() guards
  // the degenerate zero-point puzzle rather than dividing by nothing.
  const barMax = Math.max(1, hasWon ? maxPoints : winPoints);
  const earnedWidth = Math.min(1, earnedPoints / barMax);
  // What hints have taken. Against the full board that is simply what was
  // spent; against the threshold it is only the part that has eaten into
  // still-winnable points — nothing while the slack above the threshold
  // covers it, which is to say nothing until the game is lost.
  const burnedPoints = hasWon
    ? lostPoints
    : Math.max(0, winPoints - (maxPoints - lostPoints));
  const burnedWidth = Math.min(1 - earnedWidth, burnedPoints / barMax);

  // Closing the dialog restores focus to this trigger; blur it so a
  // subsequent Enter submits a word instead of re-opening the dialog.
  const closeRatings = () => {
    setIsRatingsOpen(false);
    ratingsButtonRef.current?.blur();
  };

  return (
    // A flex column (gap-3 standing in for the old space-y-3) so the drum
    // can flex: the section receives the app frame's spare height and the
    // drum, its only stretchy child, drinks it all. min-h-0 keeps the
    // section able to shrink to that share — its automatic minimum would
    // otherwise count the drum's full word list, not the window.
    <section className="scoreboard-panel flex min-h-0 w-full flex-1 flex-col gap-3">
      {/* The meta actions share one finger-sized row (they used to hide as
          text links in the score line's corner). New game is always live;
          Share and Restart wake with the first found word — aria-disabled
          rather than disabled keeps the press feedback working, and the
          handlers no-op, matching the play controls' convention. */}
      {/* Each pill answers a plain digit, numbered left to right — the one
          key family no dictionary's words can claim — and shows it below
          the label in the play controls' hint pattern (no leading icons:
          label over hint is already two lines of story). */}
      {/* Capped and centered like the play controls' row rather than
          full-bleed: the pills are peers of Delete/Toss/Submit, not a
          toolbar spanning the panel. A touch wider than that row's
          max-w-xs for the longer labels here; the longest localized one
          (Dutch "Opnieuw beginnen") wraps to two lines inside its pill,
          and the grid keeps the three pills equal height. */}
      <div className="meta-actions mx-auto grid w-full max-w-[25rem] grid-cols-3 gap-2">
        <button
          className={ACTION_CLASS}
          onClick={onNewGame}
          ref={newGameRef}
          type="button"
        >
          <span className="flex flex-col items-center leading-tight">
            {t.newGameButton}
            <span aria-hidden="true" className={KEYCAP_CLASS}>
              1
            </span>
          </span>
        </button>
        {/* Remounts per restart (key) so the press-and-ring replays: the
            pill visibly receives the rows the drum flies up at it. */}
        <button
          aria-disabled={!hasProgress}
          className={`relative ${hasProgress ? ACTION_CLASS : ACTION_DISABLED_CLASS} ${
            (restartExit?.id ?? 0) > 0 ? 'control-press' : ''
          } ${denyClass(denied, 'restart')}`}
          data-denied-id={denied?.control === 'restart' ? denied.id : 0}
          data-restart-id={restartExit?.id ?? 0}
          key={`restart-${restartExit?.id ?? 0}`}
          onClick={() => {
            if (hasProgress) {
              onRestart();
            }
          }}
          type="button"
        >
          <span className="flex flex-col items-center leading-tight">
            {t.restartButton}
            <span
              aria-hidden="true"
              className={hasProgress ? KEYCAP_CLASS : KEYCAP_TINTED_CLASS}
            >
              2
            </span>
          </span>
          {(restartExit?.id ?? 0) > 0 ? (
            <span
              aria-hidden="true"
              className="control-ring pointer-events-none absolute inset-0 rounded-full"
            />
          ) : null}
        </button>
        <button
          aria-disabled={!hasProgress}
          className={`${
            !hasProgress
              ? ACTION_DISABLED_CLASS
              : isPerfect
                ? ACTION_PERFECT_CLASS
                : hasWon
                  ? ACTION_WON_CLASS
                  : ACTION_CLASS
          } ${denyClass(denied, 'share')}`}
          data-denied-id={denied?.control === 'share' ? denied.id : 0}
          onClick={() => {
            if (hasProgress) {
              void handleShare();
            }
          }}
          type="button"
        >
          <span className="flex flex-col items-center leading-tight">
            {/* Stacked in one grid cell so the copy confirmation does not
                change the button's width. */}
            <span className="grid">
              <span
                aria-hidden={shareCopied}
                className={`col-start-1 row-start-1 whitespace-nowrap text-center ${
                  shareCopied ? 'invisible' : ''
                }`}
              >
                {t.shareButton}
              </span>
              <span
                aria-hidden={!shareCopied}
                className={`col-start-1 row-start-1 whitespace-nowrap text-center ${
                  shareCopied ? '' : 'invisible'
                }`}
              >
                {t.shareCopied}
              </span>
            </span>
            {/* Tinted whenever the pill has a color story of its own —
                disabled's dashes, the won accent, the perfect gold — so
                the cap rides currentColor like the label does. */}
            <span
              aria-hidden="true"
              className={
                hasProgress && !hasWon ? KEYCAP_CLASS : KEYCAP_TINTED_CLASS
              }
            >
              3
            </span>
          </span>
        </button>
      </div>
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
      {/* One thin line: score, rank, and the bar as a hairline beneath it.
          Before the win the measurement is against the threshold actually
          being played for. The full board is a number almost nobody clears,
          so grading against it left the bar near-empty and the rank sour
          for most of a game. Winning banks the goal and the bar rescales to
          the whole board, with the threshold left behind as a marker. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* Shrink-to-fit and relative so the rank-up burst lands on the
              score itself rather than the middle of the line. */}
          <div className="relative flex shrink-0 items-baseline">
            {/* The win's quiet residue once the modal is gone (and the only
                marker a restored won game shows): the trophy for a perfect
                score, matching the share snippet. Outside the ratings button
                so its accessible name stays the plain score. */}
            {hasWon ? (
              <span
                className={`mr-1 text-sm font-semibold ${
                  isPerfect ? 'text-amber-500' : 'text-accent'
                }`}
                data-perfect={isPerfect ? 'true' : 'false'}
                data-testid="won-mark"
              >
                <span aria-hidden="true">{isPerfect ? '🏆' : '✓'}</span>
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
              {hasWon
                ? t.scoreLabel(earnedPoints, maxPoints)
                : t.scoreToWin(earnedPoints, winPoints)}
              {' · '}
              {/* Split-flaps in on a rank-up (keyed remount replays it). */}
              <span
                className={
                  rankUp === null ? undefined : 'rank-flip inline-block'
                }
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
          {/* Secondary now that it shares the score's line: the word count,
              and what hints have cost. shrink-0 makes it wrap the row rather
              than compress into an ellipsised stub, so it yields the whole
              line only when the content genuinely will not fit; max-w-full
              plus truncate is the last resort for a lone item wider than the
              band. */}
          <p className="min-w-0 max-w-full shrink-0 truncate text-xs text-gray-500 dark:text-gray-500">
            {t.foundSummary(foundCount)}
            {hintCount > 0 ? (
              <span className="text-gray-400 dark:text-gray-600">
                {` · ${t.hintsUsed(hintCount, lostPoints)}`}
              </span>
            ) : null}
          </p>
        </div>
        {/* Green earned points grow from the left; gray points lost to
            hints eat in from the right. A hairline now, sitting under the
            score line rather than claiming a row of its own. */}
        <div className="progress-strip relative py-0.5">
          <div
            aria-label={t.completionLabel}
            aria-valuemax={barMax}
            aria-valuemin={0}
            aria-valuenow={Math.min(earnedPoints, barMax)}
            className={`relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800 ${
              celebration === null
                ? ''
                : celebration.perfect
                  ? 'bar-shine-perfect'
                  : 'bar-shine'
            }`}
            role="progressbar"
          >
            {/* Both fills advance with flat edges — the container's clip
                rounds the outer ends — so they butt cleanly when they
                meet. */}
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-all"
              ref={earnedBarRef}
              style={{ width: `${earnedWidth * 100}%` }}
            />
            {/* Lost-to-hints points are spent, not alarming: the same gray
                the hinted words wear in the drum and on the +0 badge. */}
            <div
              className="absolute inset-y-0 right-0 bg-gray-400 transition-all dark:bg-gray-600"
              style={{ width: `${burnedWidth * 100}%` }}
            />
          </div>
          {/* Only once the win is banked and the bar spans the full board is
              there a threshold to mark: before that it is the bar's own end.
              Dark enough to stay visible on top of the gray lost segment. */}
          {hasWon ? (
            <div
              aria-hidden="true"
              className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded bg-gray-700 dark:bg-gray-300"
              style={{ left: `${winThreshold * 100}%` }}
              title={t.winThresholdLabel(winPoints)}
            />
          ) : null}
        </div>
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
          start, anonymous until found. Its header row doubles as the verdict
          line: the last submission's feedback (cleared by the next input)
          borrows the row, landing right above the drum where its word
          arrives — and costing the app frame no extra height. The labels
          are visual scaffolding; yielding them while a message is up loses
          nothing (visibility also hides them from screen readers). */}
      <div className="grid w-full">
        <div
          className={`col-start-1 row-start-1 flex items-baseline justify-between gap-4 text-sm text-gray-500 dark:text-gray-400 ${
            feedback === null ? '' : 'invisible'
          }`}
        >
          <span className="font-medium">{t.wordsHeader}</span>
          <span className="w-16 text-right font-medium">{t.pointsHeader}</span>
        </div>
        <div className="col-start-1 row-start-1 flex justify-center">
          <FeedbackLine
            feedback={feedback}
            requiredCharacters={requiredCharacters}
          />
        </div>
      </div>
      <WordDrum
        definitionUrl={definitionUrl}
        foldLetter={foldLetter}
        inputWord={inputWord}
        onPrefill={onPrefill}
        restartExit={restartExit}
        spotlight={spotlight}
        requiredCharacters={requiredCharacters}
        slots={wordSlots}
        wordOriginRef={wordOriginRef}
      />
      {anyHinted ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t.hintedLegend}
        </p>
      ) : null}
    </section>
  );
}
