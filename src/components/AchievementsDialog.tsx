import { useEffect, useRef } from 'react';

import type {
  AchievementId,
  AchievementProgress,
  AchievementTier,
  UnlockRecord,
} from '../game/achievements';
import { ACHIEVEMENTS } from '../game/achievements';
import type { LifetimeStats } from '../game/history';
import { useMessages } from '../i18n';
import { ACHIEVEMENT_MARK_CLASS } from './achievementTiers';

// The trophy case: every achievement in the catalog, the earned ones first
// in the order they were earned (with their dates), then the rest — still
// named and described, because the locked list is the catalog, and on a
// first visit it is the whole dialog. A ★ means earned and a ☆ locked; the
// color is the achievement's tier either way, so what is worth chasing
// shows before it is caught. The parent loads the record and the clock in
// its event handler so this render stays pure.
interface AchievementsDialogProps {
  now: number;
  onClose: () => void;
  // The lifetime record, for the tracks' progress fractions.
  stats: LifetimeStats;
  unlocks: UnlockRecord;
}

interface Row {
  id: AchievementId;
  tier: AchievementTier;
  // Null while locked.
  unlockedAt: number | null;
  // A lifetime track's standing, shown on its row while it is locked.
  progress: AchievementProgress | null;
}

export function AchievementsDialog({
  now,
  onClose,
  stats,
  unlocks,
}: AchievementsDialogProps) {
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

  const rows: Row[] = ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    tier: achievement.tier,
    unlockedAt: unlocks[achievement.id] ?? null,
    progress: achievement.progress?.(stats) ?? null,
  }));
  // Earned rows lead, oldest first — the case reads as the story so far —
  // and the sort is stable, so ties (several at once) keep catalog order.
  const earned = rows
    .filter((row) => row.unlockedAt !== null)
    .sort((a, b) => (a.unlockedAt ?? 0) - (b.unlockedAt ?? 0));
  const locked = rows.filter((row) => row.unlockedAt === null);

  // History's date format: day and month, the year only when it differs.
  const currentYear = new Date(now).getFullYear();
  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat(t.locale, {
      day: 'numeric',
      month: 'short',
      year:
        new Date(timestamp).getFullYear() === currentYear
          ? undefined
          : 'numeric',
    }).format(timestamp);

  return (
    // Backdrop click closes the dialog. The keyboard equivalent the a11y
    // rules ask for is built into <dialog> itself — Esc fires onClose —
    // so the handler needs no key listener of its own.
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
       jsx-a11y/no-noninteractive-element-interactions */
    <dialog
      aria-labelledby="achievements-title"
      className="m-auto w-[26rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      data-testid="achievements-dialog"
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
        className="mb-1 text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
        id="achievements-title"
      >
        {t.achievementsTitle}
      </h2>
      <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
        {t.achievementsEarned(earned.length, rows.length)}
      </p>
      {/* Scrolls on its own past a phone's height, as History's list does,
          so the title and tally stay put. */}
      <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
        {[...earned, ...locked].map((row) => {
          const isEarned = row.unlockedAt !== null;
          return (
            <li
              className="flex items-start gap-2 text-sm"
              data-achievement={row.id}
              data-earned={isEarned ? 'true' : 'false'}
              data-testid="achievement-row"
              key={row.id}
            >
              {/* Fill is state, color is tier: the Ratings ladder's ✓/○
                  rule and the tile faces' color rule, applied together. */}
              <span
                aria-hidden="true"
                className={`w-4 shrink-0 text-center ${ACHIEVEMENT_MARK_CLASS[row.tier]}`}
              >
                {isEarned ? '★' : '☆'}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={`font-semibold leading-tight ${
                    isEarned ? '' : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {t.achievements[row.id].name}
                  {/* The ★/☆ mark in words for screen readers. */}
                  <span className="sr-only">
                    {' '}
                    {isEarned
                      ? t.achievementEarnedLabel
                      : t.achievementLockedLabel}
                  </span>
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t.achievements[row.id].description}
                </span>
              </span>
              {/* Earned rows date themselves; a locked track shows how far
                  along it is. Other locked rows say nothing on the right. */}
              {row.unlockedAt !== null ? (
                <span className="shrink-0 pt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                  {formatDate(row.unlockedAt)}
                </span>
              ) : row.progress === null ? null : (
                <span
                  className="shrink-0 pt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400"
                  data-testid="achievement-progress"
                >
                  {Math.min(row.progress.value, row.progress.target)} /{' '}
                  {row.progress.target}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
