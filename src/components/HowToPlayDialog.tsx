import { useEffect, useRef } from 'react';

import { useMessages } from '../i18n';
import { TiledText } from './Coach';

interface HowToPlayDialogProps {
  letterCount: number;
  minimumLength: number;
  requiredCharacters: string;
  // The win line as a fraction of the board's points.
  winThreshold: number;
  onClose: () => void;
}

// The rules in full, in the Ratings dialog's shell: five short paragraphs
// and the keys. Quotes the live puzzle (its required letter, its minimum
// length) so the example is the board behind the dialog, not a generic one.
export function HowToPlayDialog({
  letterCount,
  minimumLength,
  requiredCharacters,
  winThreshold,
  onClose,
}: HowToPlayDialogProps) {
  const t = useMessages();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog !== null && !dialog.open) {
      // jsdom lacks showModal in some versions; fall back to plain open.
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }
  }, []);

  // Each key stays glued to its label (no-break spaces), so the line can
  // only wrap between entries.
  const keys = [
    t.howToPlayTypeHint,
    `⏎\u00A0${t.submitButton}`,
    `⌫\u00A0${t.deleteButton}`,
    `␣\u00A0${t.tossButton}`,
    `1\u00A0${t.newGameButton}`,
    `2\u00A0${t.restartButton}`,
    `3\u00A0${t.shareButton}`,
  ].join(' · ');

  return (
    // Backdrop click closes the dialog. The keyboard equivalent the a11y
    // rules ask for is built into <dialog> itself — Esc fires onClose —
    // so the handler needs no key listener of its own.
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
       jsx-a11y/no-noninteractive-element-interactions */
    <dialog
      aria-labelledby="how-to-play-title"
      className="m-auto w-80 rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      data-testid="how-to-play-dialog"
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
    >
      <button
        aria-label={t.closeButton}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-95 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        onClick={onClose}
        type="button"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <h2
        className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
        id="how-to-play-title"
      >
        {t.howToPlayTitle}
      </h2>
      {/* Default text-sm leading (the Ratings dialog's density): the inline
          tile is sized to that 20px line, so it centers on the text. */}
      <div className="space-y-3 text-sm">
        <p>{t.howToPlayLetters(minimumLength, letterCount)}</p>
        {requiredCharacters.length > 0 ? (
          <p>
            <TiledText
              requiredCharacters={requiredCharacters}
              text={t.howToPlayRequired(requiredCharacters.length)}
            />
          </p>
        ) : null}
        {/* The pangram bonus is one point per letter on the board. */}
        <p>{t.howToPlayScoring(minimumLength, letterCount, letterCount)}</p>
        <p>{t.howToPlayRanks(Math.round(winThreshold * 100))}</p>
        <p>{t.howToPlayHints}</p>
        {/* Keys only where keys are the way in: the same rule that hides
            the keycap chips on coarse pointers. */}
        <p className="text-xs text-gray-500 pointer-coarse:hidden dark:text-gray-400">
          {keys}
        </p>
      </div>
    </dialog>
  );
}
