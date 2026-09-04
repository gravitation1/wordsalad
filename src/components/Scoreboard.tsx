import type { RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { AchievementId } from '../game/achievements';
import {
  beatsChallenge,
  completionToPoints,
  getLevelLadder,
  getNextRank,
} from '../game/levels';
import { useMessages } from '../i18n';
import { loadSummaries } from '../progressStore';
import type {
  Celebration,
  DeniedControl,
  GameFeedback,
  Lockout,
  RankUp,
  RestartExit,
  ShareRequest,
  UnlockMoment,
  WordSlot,
  WordSpotlight,
} from '../useWordSaladGame';
import { Coach } from './Coach';
import { WinBurst } from './Confetti';
import { FeedbackLine } from './FeedbackLine';
import { LockoutDialog } from './LockoutDialog';
import { RatingsDialog } from './RatingsDialog';
import type { WordOrigin } from './tiles';
import { KEYCAP_CLASS, KEYCAP_TINTED_CLASS } from './tiles';
import { UnlockCard } from './UnlockCard';
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
  // Start slots of the gaps the staged input could still break, for the
  // drum's hunt cursor.
  admittingGaps: ReadonlySet<number>;
  // The admitting gap a block tap named, for the drum's cursor tiebreak.
  huntOrigin: number | null;
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
  // The shortest word the puzzle accepts, quoted by the first-run coach.
  minimumLength: number;
  rankUp: RankUp | null;
  onCustomGame: () => void;
  onNewGame: () => void;
  // Passed through to the word drum's unfound rows: types a row's derived
  // prefix into the word area.
  onPrefill: (prefix: string, origin: number) => void;
  onRestart: () => void;
  // A share went out (sheet or clipboard), for the achievements; true when
  // it was the end-game dialog's own button, whose recap will show it.
  onShared: (fromDialog: boolean) => void;
  // The board's achievements so far (the dialogs' recap), the one waiting
  // to be announced mid-board, and where its card flies to.
  boardUnlocks: readonly AchievementId[];
  unlockMoment: UnlockMoment | null;
  onUnlockDone: () => void;
  unlockTargetRef: RefObject<HTMLElement | null>;
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

// The ratings ladder riding the progress bar as dots, one rule for all of
// them: passed melts into the fill, ahead is hollow, burned melts into the
// gray burn. The two point targets — the win line and the perfect sweep —
// wear larger rings while they are live promises: green for the win, gold
// for perfect. Every dot overhangs the 6px track by exactly the strip's
// 2px padding, so no state changes the strip's footprint.
const DOT_BASE_CLASS =
  'pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full transition-colors';
const RUNG_CLASS = `${DOT_BASE_CLASS} h-[7px] w-[7px] -translate-x-1/2`;
const RUNG_AHEAD_CLASS = `${RUNG_CLASS} border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-950`;
const RUNG_PASSED_CLASS = `${RUNG_CLASS} bg-accent`;
const RUNG_BURNED_CLASS = `${RUNG_CLASS} bg-gray-400 dark:bg-gray-600`;
// Solid states keep the border (in their fill color) rather than dropping
// it, so a ring resolving never changes size.
const TARGET_CLASS = `${DOT_BASE_CLASS} h-2.5 w-2.5 border-2`;
const TARGET_WIN_CLASS = `${TARGET_CLASS} -translate-x-1/2`;
// The terminus ring is tucked fully inside the track's right edge (no
// centering translate), so the bar with its ladder is exactly as wide as
// the bare gold sweep the perfect dissolve leaves behind.
const TARGET_END_CLASS = `${TARGET_CLASS} right-0`;
const TARGET_WIN_LIVE_CLASS = 'border-accent bg-white dark:bg-gray-950';
const TARGET_GOLD_LIVE_CLASS = 'border-amber-400 bg-white dark:bg-gray-950';
const TARGET_KEPT_CLASS = 'border-accent bg-accent';
const TARGET_DEAD_CLASS =
  'border-gray-400 bg-gray-400 dark:border-gray-600 dark:bg-gray-600';
// A shared score rides the bar as a diamond — a shape of its own, so it
// can't be mistaken for a rung, and one the score line can name in prose
// (◇/◆) — in the targets' grammar: hollow while it is a promise, filled
// with the accent once you are ahead, spent gray once hints have burned it
// out of reach (the rungs' own dead state). A 7px square on its corner
// spans just under the strip's 10px, keeping the footprint rule. A share
// at the board's maximum takes the gold terminus ring's slot instead, in
// the ring's gold: the same promise, now with a name.
const CHALLENGE_MARK_BASE_CLASS =
  'pointer-events-none absolute top-1/2 h-[7px] w-[7px] -translate-y-1/2 rotate-45 rounded-[1.5px] border-2 transition-colors';
const CHALLENGE_MARK_CLASS = `${CHALLENGE_MARK_BASE_CLASS} -translate-x-1/2`;
// Centered where the 10px ring's center sits: 5px in from the track's edge.
const CHALLENGE_MARK_END_CLASS = `${CHALLENGE_MARK_BASE_CLASS} right-[1.5px]`;
const CHALLENGE_LIVE_CLASS =
  'border-gray-500 bg-white dark:border-gray-400 dark:bg-gray-950';
const CHALLENGE_DONE_CLASS = 'border-accent bg-accent';
const CHALLENGE_DEAD_CLASS = TARGET_DEAD_CLASS;

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

// The share snippet's rack: the board's letters as Unicode square tiles in
// the rack's own grammar — outlined for a plain letter, filled for the
// required one — in one row, as the wide rack shows them (a share shouldn't
// depend on which layout the sender was in). The outlined set (U+1F130–49)
// has no emoji members; the filled set (U+1F170–) does at A, B, O and P,
// which is why fill marks only the required letter. A letter with no
// squared form (Ñ) stays as it is.
const SQUARED_A = 0x1f130;
const NEGATIVE_SQUARED_A = 0x1f170;

function shareTile(letter: string, required: string): string {
  const code = letter.codePointAt(0) ?? 0;
  if (code < 0x41 || code > 0x5a) {
    return letter;
  }
  const base = required.includes(letter) ? NEGATIVE_SQUARED_A : SQUARED_A;
  return String.fromCodePoint(base + code - 0x41);
}

function shareRack(letters: string, required: string): string {
  return Array.from(letters)
    .map((letter) => shareTile(letter, required))
    .join('');
}

export function Scoreboard({
  celebration,
  feedback,
  definitionUrl,
  foldLetter,
  saladLetters,
  requiredCharacters,
  wordSlots,
  admittingGaps,
  huntOrigin,
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
  minimumLength,
  rankUp,
  onCustomGame,
  onNewGame,
  onPrefill,
  onRestart,
  onShared,
  boardUnlocks,
  unlockMoment,
  onUnlockDone,
  unlockTargetRef,
  wordOriginRef,
}: ScoreboardProps) {
  const t = useMessages();
  // The first-run coach speaks until this device has ever scored a word.
  // History already records that: a summary is written on progress, and
  // its earned points say whether any of it was scored rather than hinted.
  // Read once per board (this component remounts per game), so a New game
  // after the first score already finds the record; a reload or a Restart
  // before that first score brings the coach back, which is the point.
  const [hadScoredRecord] = useState(() =>
    loadSummaries().some((entry) => entry.summary.earned > 0),
  );
  const coaching = !hadScoredRecord && earnedPoints === 0;
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

  // The share: the board as tiles, the result, and a link that replays this
  // puzzle and carries the score as a challenge. Native share sheet where available,
  // clipboard otherwise; the score is a claim, verified socially.
  const handleShare = async (fromDialog = false) => {
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
      t.appTitle,
      shareRack(letters, requiredCharacters),
      summary,
      url.toString(),
    ].join('\n');

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ text });
        onShared(fromDialog);
        return;
      }
    } catch (_error) {
      return; // the user dismissed the share sheet
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      onShared(fromDialog);
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

  // One fixed scale for the whole game: the full board. The fill crosses
  // the win ring instead of the bar re-scaling at the win, and hint burn
  // is always visible from the right — the gray reaching the win ring IS
  // the lost state. Max() guards the degenerate zero-point puzzle rather
  // than dividing by nothing.
  const barMax = Math.max(1, maxPoints);
  const earnedWidth = Math.min(1, earnedPoints / barMax);
  const burnedWidth = Math.min(1 - earnedWidth, lostPoints / barMax);
  // What a flawless rest-of-game could still reach; every rating boundary
  // past it is burned. Boundaries compare in points (the ladder's own
  // epsilon-guarded rounding), never as raw fractions.
  const reachablePoints = maxPoints - lostPoints;
  // The rung the next earned points are chasing, for the score line's
  // countdown; null once nothing above the current rank can be caught (a
  // perfect sweep, or hints burned past the last rung).
  const nextRank = getNextRank(earnedPoints, maxPoints, reachablePoints);
  // The shared score's standing, as a race against the sharer — the score
  // itself is not on the page, so an absolute target would be a number
  // with nothing to measure it against, and a countdown to "beat 150"
  // would be 151 with the arithmetic showing. Behind, tied, or ahead by a
  // margin; a strictly higher score wins, except that a share at the
  // board's maximum can only be tied, so there the tie is the finish
  // (beatsChallenge, the rule the achievements judge by too).
  // Reachability is measured against what a flawless rest-of-game could
  // still earn: hints burn a share out of reach the way they burn rungs.
  const challenge = (() => {
    if (challengeScore === null) {
      return null;
    }
    const margin = earnedPoints - challengeScore;
    const atMax = challengeScore >= maxPoints;
    const done = beatsChallenge(earnedPoints, challengeScore, maxPoints);
    const targetPoints = atMax ? challengeScore : challengeScore + 1;
    const state = done
      ? 'done'
      : targetPoints > reachablePoints
        ? 'unreachable'
        : 'live';
    return { score: challengeScore, margin, atMax, state } as const;
  })();
  // The clause's mark mirrors the diamond on the bar: hollow while live,
  // filled once settled either way.
  const challengeMark =
    challenge === null || challenge.state === 'live' ? '◇' : '◆';
  const challengeClause =
    challenge === null
      ? null
      : challenge.state === 'unreachable'
        ? t.challengeUnreachable(challengeMark)
        : challenge.margin < 0
          ? t.challengeBehind(-challenge.margin, challengeMark)
          : challenge.margin === 0
            ? `${t.challengeTied(challengeMark)}${challenge.state === 'done' ? ' ✓' : ''}`
            : `${t.challengeAhead(challenge.margin, challengeMark)} ✓`;
  // Its spoken form, for screen readers and the bar mark's title.
  const challengeNote =
    challenge === null
      ? null
      : challenge.state === 'unreachable'
        ? t.challengeUnreachableNote(challenge.score)
        : challenge.margin < 0
          ? t.challengeBehindNote(-challenge.margin, challenge.score)
          : challenge.margin === 0
            ? challenge.state === 'done'
              ? t.challengeTiedDoneNote(challenge.score)
              : t.challengeTiedNote(challenge.score)
            : t.challengeAheadNote(challenge.margin, challenge.score);
  // The ladder's interior rungs: every rating boundary except the two
  // ringed targets (the win line and the perfect sweep).
  const rungFractions = getLevelLadder()
    .map((step) => step.minimumCompletion)
    .filter(
      (fraction) => fraction > 0 && fraction < 1 && fraction !== winThreshold,
    );

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
            void handleShare(true);
          }}
          requiredCharacters={requiredCharacters}
          shareCopied={shareCopied}
          unlocked={boardUnlocks}
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
          unlocked={boardUnlocks}
          winPoints={winPoints}
        />
      ) : null}
      {/* One thin line: rank, countdown, and the bar as a hairline beneath
          it. The countdown names the next rank still in reach — a single
          delta instead of the old score-over-win-line fraction, which sat
          on a different scale than the maxPoints bar right below it and
          made the two disagree ("96% by the numbers" over a 72% fill).
          The win needs no words of its own: it is the Genius rung, ringed
          green on the bar, and the countdown wears the accent while that
          rung is the target. With nothing left to chase the line falls
          back to the plain score against the whole board. */}
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
              {' · '}
              {nextRank === null ? (
                t.scoreLabel(earnedPoints, maxPoints)
              ) : (
                /* Accented while the target rung is also the win line — a
                   kept win puts every remaining rung above it, and a broken
                   one (lockout) leaves only rungs below, so the tint needs
                   no hasWon/lockedOut guard of its own. */
                <span
                  className={
                    nextRank.points === winPoints ? 'text-accent' : undefined
                  }
                >
                  {t.pointsToRank(
                    nextRank.points - earnedPoints,
                    t.levelName(nextRank.level),
                  )}
                </span>
              )}
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
          {/* Secondary now that it shares the score's line, and points-only
              like the countdown beside it: the shared score's standing,
              then what hints have cost as a footnote. (The word count moved
              to the list header, where the words it counts are.) shrink-0
              makes it wrap the row rather than compress into an ellipsised
              stub, so it yields the whole line only when the content
              genuinely will not fit; max-w-full plus truncate is the last
              resort for a lone item wider than the band. */}
          {challenge === null && hintCount === 0 ? null : (
            <p className="min-w-0 max-w-full shrink-0 truncate text-xs text-gray-500 dark:text-gray-500">
              {/* The shared score as a race, naming the diamond on the bar
                  ("5 points behind ◇", "45 points ahead of ◆"). The eye
                  gets the short form: accented once ahead (or tied at the
                  maximum), spent gray once hints have put it out of reach.
                  Screen readers get the full sentence, and hear only the
                  state changes — the margin moves silently rather than
                  announcing after every word. */}
              {challenge === null ? null : (
                <span data-state={challenge.state} data-testid="challenge">
                  <span
                    aria-hidden="true"
                    className={
                      challenge.state === 'done'
                        ? 'font-medium text-accent'
                        : challenge.state === 'unreachable'
                          ? 'text-gray-400 dark:text-gray-600'
                          : 'text-gray-600 dark:text-gray-400'
                    }
                  >
                    {challengeClause}
                  </span>
                  <span className="sr-only" role="status">
                    {challenge.state === 'live' ? null : challengeNote}
                  </span>
                  {challenge.state === 'live' ? (
                    <span className="sr-only">{challengeNote}</span>
                  ) : null}
                </span>
              )}
              {hintCount > 0 ? (
                <span className="text-gray-400 dark:text-gray-600">
                  {`${challenge === null ? '' : ' · '}${t.hintsUsed(hintCount, lostPoints)}`}
                </span>
              ) : null}
            </p>
          )}
        </div>
        {/* Green earned points grow from the left; gray points lost to
            hints eat in from the right. A hairline under the score line,
            wearing the ratings ladder as dots. */}
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
                meet. A perfect sweep trades the accent for gold. */}
            <div
              className={`absolute inset-y-0 left-0 transition-all ${
                isPerfect ? 'bg-amber-400' : 'bg-accent'
              }`}
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
          {/* At perfect the ladder dissolves: every rung is history, and
              the gold sweep stands alone. */}
          {isPerfect ? null : (
            <>
              {rungFractions.map((fraction) => {
                const rungPoints = completionToPoints(fraction, maxPoints);
                return (
                  <div
                    aria-hidden="true"
                    className={
                      earnedPoints >= rungPoints
                        ? RUNG_PASSED_CLASS
                        : rungPoints > reachablePoints
                          ? RUNG_BURNED_CLASS
                          : RUNG_AHEAD_CLASS
                    }
                    key={fraction}
                    style={{ left: `${fraction * 100}%` }}
                  />
                );
              })}
              {/* The shared score as a diamond at its point. A share at or
                  beyond the board's maximum takes the terminus slot below
                  instead. */}
              {challenge === null || challenge.atMax ? null : (
                <div
                  aria-hidden="true"
                  className={`${CHALLENGE_MARK_CLASS} ${
                    challenge.state === 'done'
                      ? CHALLENGE_DONE_CLASS
                      : challenge.state === 'unreachable'
                        ? CHALLENGE_DEAD_CLASS
                        : CHALLENGE_LIVE_CLASS
                  }`}
                  data-state={challenge.state}
                  data-testid="challenge-mark"
                  style={{ left: `${(challenge.score / maxPoints) * 100}%` }}
                  title={challengeNote ?? undefined}
                />
              )}
              {/* The win target: a green promise until it is kept (filled
                  by the arriving fill) or broken (spent gray). */}
              <div
                aria-hidden="true"
                className={`${TARGET_WIN_CLASS} ${
                  hasWon
                    ? TARGET_KEPT_CLASS
                    : lockedOut
                      ? TARGET_DEAD_CLASS
                      : TARGET_WIN_LIVE_CLASS
                }`}
                style={{ left: `${winThreshold * 100}%` }}
                title={t.winThresholdLabel(winPoints)}
              />
              {/* The perfect target: a gold promise the first hint breaks
                  — the ring grays right as the spent cost lands here. A
                  share at the board's maximum is that same promise with a
                  name, so it wears the slot as a gold diamond; it can only
                  be tied, and a tie here is the perfect sweep that dissolves
                  the whole ladder, so the mark never needs a kept state. */}
              {challenge?.atMax ? (
                <div
                  aria-hidden="true"
                  className={`${CHALLENGE_MARK_END_CLASS} ${
                    challenge.state === 'unreachable'
                      ? TARGET_DEAD_CLASS
                      : TARGET_GOLD_LIVE_CLASS
                  }`}
                  data-state={challenge.state}
                  data-testid="challenge-mark"
                  title={challengeNote ?? undefined}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className={`${TARGET_END_CLASS} ${
                    lostPoints > 0 ? TARGET_DEAD_CLASS : TARGET_GOLD_LIVE_CLASS
                  }`}
                />
              )}
            </>
          )}
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
      <div className="relative grid w-full">
        {/* A mid-board unlock's card, over the verdict it follows. A dialog
            owns the moment when one is open, so the card waits it out —
            and any unlock it would have shown is in that dialog's recap. */}
        {unlockMoment !== null &&
        !(celebration !== null && celebration !== dismissedWin) &&
        !(lockout !== null && lockout !== dismissedLockout) ? (
          <UnlockCard
            key={unlockMoment.id}
            moment={unlockMoment}
            onDone={onUnlockDone}
            targetRef={unlockTargetRef}
          />
        ) : null}
        <div
          className={`col-start-1 row-start-1 flex items-baseline justify-between gap-4 text-sm text-gray-500 dark:text-gray-400 ${
            feedback === null && !coaching ? '' : 'invisible'
          }`}
        >
          {/* The label counts down what is left: the words it counts are
              the drum's gap blocks right below it, and the countdown is
              the same grammar the score line speaks. */}
          <span className="font-medium" data-testid="words-header">
            {t.wordsHeader}
            {t.wordsRemaining(wordSlots.length - foundCount)}
          </span>
          <span className="w-16 text-right font-medium">{t.pointsHeader}</span>
        </div>
        <div className="col-start-1 row-start-1 flex justify-center">
          <FeedbackLine
            feedback={feedback}
            requiredCharacters={requiredCharacters}
          />
          {/* The verdict outranks the coach: a rejection takes the row and
              the coach returns once the next edit clears it. The status
              line stays mounted (empty) so its live region never churns. */}
          {feedback === null && coaching ? (
            <Coach
              letterCount={saladLetters.length}
              minimumLength={minimumLength}
              requiredCharacters={requiredCharacters}
            />
          ) : null}
        </div>
      </div>
      <WordDrum
        admittingGaps={admittingGaps}
        definitionUrl={definitionUrl}
        foldLetter={foldLetter}
        huntOrigin={huntOrigin}
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
