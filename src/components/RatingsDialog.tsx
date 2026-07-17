import { Fragment, useEffect, useRef } from 'react';

import { completionToPoints, getLevelLadder } from '../game/levels';
import { useMessages } from '../i18n';

interface RatingsDialogProps {
  earnedPoints: number;
  maxPoints: number;
  winPoints: number;
  level: string;
  onClose: () => void;
}

export function RatingsDialog({
  earnedPoints,
  maxPoints,
  winPoints,
  level,
  onClose,
}: RatingsDialogProps) {
  const t = useMessages();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Each rung's lower bound on this puzzle's whole-point scale, plus where
  // the win line falls: right above the first rung that reaches it.
  const ladder = getLevelLadder().map((step) => ({
    ...step,
    points: completionToPoints(step.minimumCompletion, maxPoints),
  }));
  const winIndex = ladder.findIndex((step) => step.points >= winPoints);

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
        {ladder.map((step, index) => {
          const isAchieved = earnedPoints >= step.points;
          const isCurrent = step.level === level;
          return (
            <Fragment key={step.level}>
              {index === winIndex ? (
                <li className="flex items-center gap-2 pt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-gray-300 dark:bg-gray-600"
                  />
                  {t.winThresholdLabel(winPoints)}
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-gray-300 dark:bg-gray-600"
                  />
                </li>
              ) : null}
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
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true">{isAchieved ? '✓' : '○'}</span>
                  {t.levelName(step.level)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t.thresholdFrom(step.points)}
                </span>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </dialog>
  );
}
