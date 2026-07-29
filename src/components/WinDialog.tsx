import { useEffect, useRef } from 'react';

import { useMessages } from '../i18n';
import type { Celebration } from '../useWordSaladGame';
import { Confetti, WinBurst } from './Confetti';
import { TILE_FACE } from './tiles';

// The win moment as a modal: the fanfare interrupts, then gets out of the
// way — dismissing it returns the board to its normal playing view (the
// score line keeps a small ✓). A perfect score reopens it in gold.
interface WinDialogProps {
  celebration: Celebration;
  // Every word found: there is nothing left to keep playing for (reachable
  // via hints + guesses at any rank, not only on a perfect score).
  isComplete: boolean;
  level: string;
  letters: readonly string[];
  onClose: () => void;
  onCustomGame: () => void;
  onNewGame: () => void;
  onShare: () => void;
  requiredCharacters: string;
  shareCopied: boolean;
}

export function WinDialog({
  celebration,
  isComplete,
  level,
  letters,
  onClose,
  onCustomGame,
  onNewGame,
  onShare,
  requiredCharacters,
  shareCopied,
}: WinDialogProps) {
  const t = useMessages();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { perfect } = celebration;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog !== null && !dialog.open) {
      // jsdom lacks showModal in some versions; fall back to plain open.
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        // showModal autofocuses the first focusable control (the close
        // button). The Enter keypress that just won the game would then
        // land on it and dismiss the modal the instant it appears — so
        // move focus to the dialog itself, where a stray Enter does
        // nothing. (Focus stays within the labelled dialog for readers.)
        dialog.focus();
      } else {
        dialog.setAttribute('open', '');
      }
    }
  }, []);

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

  return (
    // Backdrop click closes the dialog. The keyboard equivalent the a11y
    // rules ask for is built into <dialog> itself — Esc fires onClose —
    // so the handler needs no key listener of its own.
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
       jsx-a11y/no-noninteractive-element-interactions */
    <dialog
      aria-labelledby="win-title"
      // focus:outline-none: the dialog is a programmatic focus target (see
      // effect), so the browser's default focus ring would otherwise show a
      // blue border foreign to the app's palette.
      className="m-auto w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/40 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      data-perfect={perfect ? 'true' : 'false'}
      data-testid="win-banner"
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
      // Focus target on open (see effect); -1 keeps it out of the tab order.
      tabIndex={-1}
    >
      {/* Rains in the top layer, above the backdrop, while the dialog is
          up; fixed positioning keeps it viewport-wide. */}
      <Confetti
        letters={letters}
        perfect={perfect}
        requiredCharacters={requiredCharacters}
      />
      {/* A sibling of the rain, not a child of the banner below: the banner
          animates a transform, which would make it the containing block for
          this fixed layer and pull the pieces' flight back into the dialog's
          scrollable overflow — a scrollbar flickering through the
          celebration. Out here the viewport holds it, and the pieces fly
          past the dialog's edges without the dialog counting them. */}
      <WinBurst
        letters={letters}
        perfect={perfect}
        requiredCharacters={requiredCharacters}
      />
      {/* z-10 because the content below is positioned too, and being later
          in the DOM it would otherwise take the clicks aimed at this
          button — its boxes reach into this corner even where nothing of
          it is drawn there. */}
      <button
        aria-label={t.closeButton}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-95 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        onClick={onClose}
        type="button"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <div
        className={`relative space-y-4 py-2 text-center ${
          perfect ? 'win-pop-perfect' : 'win-pop'
        }`}
      >
        <h2 className="sr-only" id="win-title">
          {t.victory}
        </h2>
        {/* The victory phrase spelled in the game's own letter tiles, with
            punctuation in accent (gold across the board for a perfect
            score), vaulting in one by one; grouped per word so wrapping
            never splits one. */}
        <p
          aria-hidden="true"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5"
        >
          {victoryTiles.map((word, wordIndex) => (
            <span className="flex gap-1.5" key={wordIndex}>
              {word.map(({ character, delayIndex }) => (
                <span
                  className={`win-letter flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold ${
                    perfect
                      ? /[\p{L}\p{N}]/u.test(character)
                        ? TILE_FACE.gold
                        : TILE_FACE.goldSolid
                      : /[\p{L}\p{N}]/u.test(character)
                        ? TILE_FACE.plain
                        : TILE_FACE.accent
                  }`}
                  key={delayIndex}
                  style={{ animationDelay: `${delayIndex * 45}ms` }}
                >
                  {character}
                </span>
              ))}
            </span>
          ))}
        </p>
        <p
          className={`text-sm font-semibold ${
            perfect ? 'text-amber-500' : 'text-accent'
          }`}
        >
          {t.levelName(level)}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            className={`min-h-11 touch-manipulation rounded-full px-5 py-2 font-medium text-white transition active:scale-95 ${
              perfect
                ? 'bg-amber-400 hover:bg-amber-400/90'
                : 'bg-accent hover:bg-accent/90'
            }`}
            onClick={onNewGame}
            type="button"
          >
            {t.newGameButton}
          </button>
          <button
            className="min-h-11 touch-manipulation rounded-full border border-gray-300 px-5 py-2 font-medium transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:hover:bg-gray-800"
            onClick={onShare}
            type="button"
          >
            {/* Both labels sit in the same grid cell, so the button is
                always as wide as the longer of the two and the row never
                reflows when the copy lands. Only the shown one names the
                button. */}
            <span className="grid">
              <span
                aria-hidden={shareCopied}
                className={`col-start-1 row-start-1 whitespace-nowrap ${
                  shareCopied ? 'invisible' : ''
                }`}
              >
                <span aria-hidden="true">↗ </span>
                {t.shareButton}
              </span>
              <span
                aria-hidden={!shareCopied}
                className={`col-start-1 row-start-1 whitespace-nowrap ${
                  shareCopied ? '' : 'invisible'
                }`}
              >
                <span aria-hidden="true">✓ </span>
                {t.shareCopied}
              </span>
            </span>
          </button>
        </div>
        {/* The quiet "what next" row. Keep playing vanishes once every word
            is in (the ✕/Esc/backdrop still dismiss to review the board);
            the builder is offered at exactly this deciding moment. */}
        <div className="flex items-center justify-center gap-4">
          {isComplete ? null : (
            <button
              className="touch-manipulation text-sm font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
              onClick={onClose}
              type="button"
            >
              {t.keepPlayingButton}
            </button>
          )}
          <button
            className="touch-manipulation text-sm font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
            onClick={onCustomGame}
            type="button"
          >
            {t.customGameButton}
          </button>
        </div>
      </div>
    </dialog>
  );
}
