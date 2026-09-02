import { useEffect, useRef } from 'react';

import type { AchievementId } from '../game/achievements';
import { useMessages } from '../i18n';
import { matchesDigitKey } from '../useWordSaladGame';
import { AchievementRecap } from './AchievementRecap';
import { KEYCAP_TINTED_CLASS } from './tiles';

// The loss counterpart to the win modal: too many hints have put the win out
// of reach. Interrupts once, then gets out of the way — dismissing returns
// the board so the player can keep climbing the ranks (a slim reminder stays
// on the score line). No confetti; the palette is the app's spent-hint red.
interface LockoutDialogProps {
  // Points still reachable, and the win line, for the explanatory note.
  reachablePoints: number;
  winPoints: number;
  // Every word found: there is nothing left to keep playing for.
  isComplete: boolean;
  onClose: () => void;
  onCustomGame: () => void;
  onRestart: () => void;
  // What this lockout earned across games — a loss can be a first too.
  unlocked: readonly AchievementId[];
}

export function LockoutDialog({
  reachablePoints,
  winPoints,
  isComplete,
  onClose,
  onCustomGame,
  onRestart,
  unlocked,
}: LockoutDialogProps) {
  const t = useMessages();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog !== null && !dialog.open) {
      // jsdom lacks showModal in some versions; fall back to plain open.
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        // Focus the dialog itself, not its first control, so the Hint
        // keypress/click that triggered the lockout can't immediately
        // activate a button. (Focus stays within the labelled dialog.)
        dialog.focus();
      } else {
        dialog.setAttribute('open', '');
      }
    }
  }, []);

  // The meta row's digit shortcut follows Restart into the modal: 2 clears
  // the board and starts over. Document-level like the game's own handler
  // (which yields while a modal is open), so it works wherever focus sits
  // within the dialog — and unmounting removes it.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesDigitKey(event, '2')) {
        onRestart();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onRestart]);

  return (
    // Backdrop click closes the dialog. The keyboard equivalent the a11y
    // rules ask for is built into <dialog> itself — Esc fires onClose —
    // so the handler needs no key listener of its own.
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
       jsx-a11y/no-noninteractive-element-interactions */
    <dialog
      aria-labelledby="lockout-title"
      className="m-auto w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/40 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      data-testid="lockout-dialog"
      onClick={(event) => {
        // A click on the backdrop region targets the dialog element itself.
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      // Fires on native dismissals (Esc). Unmounting via onClose closes the
      // element; calling dialog.close() here too would loop.
      onClose={onClose}
      ref={dialogRef}
      tabIndex={-1}
    >
      <button
        aria-label={t.closeButton}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-95 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        onClick={onClose}
        type="button"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <div className="space-y-4 py-2 text-center">
        <h2
          className="text-lg font-bold text-red-600 dark:text-red-400"
          id="lockout-title"
        >
          {t.lockedOutTitle}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t.lockedOutNote(reachablePoints, winPoints)}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            className="min-h-11 touch-manipulation rounded-full bg-accent px-5 font-medium text-white transition hover:bg-accent/90 active:scale-95"
            onClick={onRestart}
            type="button"
          >
            <span className="flex flex-col items-center leading-tight">
              {t.restartButton}
              <span aria-hidden="true" className={KEYCAP_TINTED_CLASS}>
                2
              </span>
            </span>
          </button>
          {/* A cleared board leaves nothing to keep playing for. */}
          {isComplete ? null : (
            <button
              className="min-h-11 touch-manipulation rounded-full border border-gray-300 px-5 font-medium transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:hover:bg-gray-800"
              onClick={onClose}
              type="button"
            >
              {t.keepPlayingButton}
            </button>
          )}
        </div>
        {/* An escape hatch to friendlier letters, at the moment of defeat. */}
        <button
          className="touch-manipulation text-sm font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
          onClick={onCustomGame}
          type="button"
        >
          {t.customGameButton}
        </button>
        {/* Last, below even the escape hatch: the actions never move for it. */}
        <AchievementRecap unlocked={unlocked} />
      </div>
    </dialog>
  );
}
