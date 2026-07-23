import { useEffect, useMemo, useRef, useState } from 'react';

import { completionToPoints, getLevel } from '../game/levels';
import { useMessages } from '../i18n';
import type { HistoryEntry } from '../progressStore';
import { WIN_THRESHOLD } from '../useWordSaladGame';
import { miniTileClass } from './tiles';

// The history browser: aggregate statistics up top, then every recorded
// game as a resumable link (navigation boots the puzzle and restores its
// saved progress). The parent loads the entries and timestamp in its event
// handler so this component's render stays pure.
interface HistoryDialogProps {
  entries: readonly HistoryEntry[];
  // The ?lang override to carry into resume links, if any.
  langParam: string | null;
  now: number;
  onClose: () => void;
}

type SortMode = 'date' | 'rating' | 'result';

type GameStatus = 'locked' | 'playing' | 'won';

interface Row {
  dateLabel: string;
  earned: number;
  gameKey: string;
  href: string;
  letters: string;
  level: string;
  lost: number;
  max: number;
  playedAt: number;
  ratio: number;
  requiredCharacter: string;
  status: GameStatus;
}

// Won games first, then in progress, then locked out.
const STATUS_ORDER: Record<GameStatus, number> = {
  locked: 2,
  playing: 1,
  won: 0,
};

function toRow(
  entry: HistoryEntry,
  langParam: string | null,
  formatDate: (timestamp: number) => string,
): Row {
  const { gameKey, summary } = entry;
  const [letters, requiredCharacter, minimumLength] = gameKey.split('.');
  const winPoints = completionToPoints(WIN_THRESHOLD, summary.max);
  const won = summary.earned >= winPoints;
  const locked = !won && summary.max - summary.lost < winPoints;

  const params = new URLSearchParams();
  if (langParam !== null) {
    params.set('lang', langParam);
  }
  params.set('letters', letters);
  params.set('required', requiredCharacter);
  if (minimumLength !== '4') {
    params.set('min', minimumLength);
  }

  return {
    dateLabel: formatDate(summary.playedAt),
    earned: summary.earned,
    gameKey,
    href: `?${params.toString()}`,
    letters,
    level: getLevel(summary.earned / summary.max),
    lost: summary.lost,
    max: summary.max,
    playedAt: summary.playedAt,
    ratio: summary.earned / summary.max,
    requiredCharacter,
    status: won ? 'won' : locked ? 'locked' : 'playing',
  };
}

function sortRows(rows: readonly Row[], sort: SortMode): readonly Row[] {
  const byDate = (a: Row, b: Row) => b.playedAt - a.playedAt;
  return [...rows].sort((a, b) => {
    if (sort === 'result' && a.status !== b.status) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    if (sort === 'rating' && a.ratio !== b.ratio) {
      return b.ratio - a.ratio;
    }
    return byDate(a, b);
  });
}

// Consecutive days played, counting back from today (or yesterday, so a
// streak is not "broken" before today's game happens).
function currentStreak(entries: readonly HistoryEntry[], now: number): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const days = new Set(
    entries.map((entry) =>
      Math.floor(
        (entry.summary.playedAt -
          new Date(entry.summary.playedAt).getTimezoneOffset() * 60000) /
          DAY_MS,
      ),
    ),
  );
  const today = Math.floor(
    (now - new Date(now).getTimezoneOffset() * 60000) / DAY_MS,
  );
  let day = days.has(today) ? today : today - 1;
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day--;
  }
  return streak;
}

export function HistoryDialog({
  entries,
  langParam,
  now,
  onClose,
}: HistoryDialogProps) {
  const t = useMessages();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Tapping the active sort again reverses it; switching sorts returns to
  // that sort's natural direction.
  const [sort, setSort] = useState<{ flipped: boolean; mode: SortMode }>({
    flipped: false,
    mode: 'date',
  });

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

  const rows = useMemo(() => {
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
    const sorted = sortRows(
      entries.map((entry) => toRow(entry, langParam, formatDate)),
      sort.mode,
    );
    return sort.flipped ? [...sorted].reverse() : sorted;
  }, [entries, langParam, now, sort, t.locale]);

  const stats = useMemo(
    () => ({
      hints: entries.reduce((sum, entry) => sum + entry.summary.hints, 0),
      played: entries.length,
      points: entries.reduce((sum, entry) => sum + entry.summary.earned, 0),
      streak: currentStreak(entries, now),
      won: entries.filter(
        (entry) =>
          entry.summary.earned >=
          completionToPoints(WIN_THRESHOLD, entry.summary.max),
      ).length,
      words: entries.reduce((sum, entry) => sum + entry.summary.found, 0),
    }),
    [entries, now],
  );

  const sortButton = (mode: SortMode, label: string) => {
    const isActive = sort.mode === mode;
    return (
      <button
        aria-pressed={isActive}
        className={`touch-manipulation rounded-full px-3 py-1 text-xs font-medium transition ${
          isActive
            ? 'bg-accent text-white'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
        data-direction={isActive && sort.flipped ? 'reversed' : 'natural'}
        data-sort={mode}
        onClick={() => {
          setSort((previous) =>
            previous.mode === mode
              ? { flipped: !previous.flipped, mode }
              : { flipped: false, mode },
          );
        }}
        type="button"
      >
        {label}
        {isActive ? (
          <span aria-hidden="true" className="ml-1">
            {sort.flipped ? '↑' : '↓'}
          </span>
        ) : null}
      </button>
    );
  };

  const statTile = (label: string, value: number, testId: string) => (
    <div className="rounded-lg bg-gray-50 px-2 py-1.5 text-center dark:bg-gray-800/60">
      <div className="text-base font-bold" data-testid={testId}>
        {value}
      </div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400">
        {label}
      </div>
    </div>
  );

  return (
    <dialog
      aria-labelledby="history-title"
      className="m-auto w-[26rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
        id="history-title"
      >
        {t.historyTitle}
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t.historyEmpty}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            {statTile(t.statPlayed, stats.played, 'stat-played')}
            {statTile(t.statWon, stats.won, 'stat-won')}
            {statTile(t.statStreak, stats.streak, 'stat-streak')}
            {statTile(t.pointsHeader, stats.points, 'stat-points')}
            {statTile(t.wordsHeader, stats.words, 'stat-words')}
            {statTile(t.statHints, stats.hints, 'stat-hints')}
          </div>
          <div className="flex gap-1.5">
            {sortButton('date', t.sortRecent)}
            {sortButton('result', t.sortResult)}
            {sortButton('rating', t.sortRating)}
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {rows.map((row, index) => (
              // Rows deal in with the game's usual stagger. Keyed by game,
              // so re-sorting reorders without replaying the entrance.
              <li
                className="row-enter"
                key={row.gameKey}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Resuming is just navigation: the puzzle URL boots the
                    game and its saved progress comes along. */}
                <a
                  className="block touch-manipulation rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  data-status={row.status}
                  href={row.href}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex gap-1">
                      {Array.from(row.letters).map((letter, tileIndex) => (
                        <span
                          className={miniTileClass(
                            letter,
                            row.requiredCharacter,
                          )}
                          key={tileIndex}
                        >
                          {letter}
                        </span>
                      ))}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {row.dateLabel}
                    </span>
                  </span>
                  {/* The game's signature bar in miniature: earned green,
                      lost gray, the tick at the win line. */}
                  <span className="mt-2 flex items-center gap-3">
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                      <span
                        className="absolute inset-y-0 left-0 bg-accent"
                        style={{ width: `${(row.earned / row.max) * 100}%` }}
                      />
                      <span
                        className="absolute inset-y-0 right-0 bg-gray-400 dark:bg-gray-600"
                        style={{ width: `${(row.lost / row.max) * 100}%` }}
                      />
                      <span
                        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-gray-700 dark:bg-gray-300"
                        style={{ left: `${WIN_THRESHOLD * 100}%` }}
                      />
                    </span>
                    {/* Fixed-width columns so every row's bar spans the
                        same range and lengths compare across rows. */}
                    <span className="w-16 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
                      {row.earned} / {row.max}
                    </span>
                    <span className="w-32 truncate text-right text-xs text-gray-500 dark:text-gray-400">
                      {t.levelName(row.level)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </dialog>
  );
}
