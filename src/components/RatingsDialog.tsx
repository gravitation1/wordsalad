import { useEffect, useRef } from 'react';

import { getLevelLadder } from '../game/levels';
import { useMessages } from '../i18n';

interface RatingsDialogProps {
  completionPercent: number;
  level: string;
  onClose: () => void;
}

export function RatingsDialog({
  completionPercent,
  level,
  onClose,
}: RatingsDialogProps) {
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

  return (
    <dialog
      aria-labelledby="ratings-title"
      className="m-auto w-80 rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
        className="absolute right-3 top-3 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-95 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        onClick={onClose}
        type="button"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <h2
        className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
        id="ratings-title"
      >
        {t.ratingsTitle}
      </h2>
      <ul className="space-y-1.5">
        {getLevelLadder().map((step) => {
          const isAchieved = completionPercent >= step.minimumCompletion;
          const isCurrent = step.level === level;
          return (
            <li
              className={`flex items-baseline justify-between gap-4 text-sm ${
                isCurrent
                  ? 'font-semibold text-accent'
                  : isAchieved
                    ? ''
                    : 'text-gray-400 dark:text-gray-600'
              }`}
              data-achieved={isAchieved ? 'true' : 'false'}
              data-current={isCurrent ? 'true' : 'false'}
              key={step.level}
            >
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">{isAchieved ? '✓' : '○'}</span>
                {t.levelName(step.level)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t.thresholdFrom(step.minimumCompletion)}
              </span>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
