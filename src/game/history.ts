import type { GameSummary, HistoryEntry } from '../progressStore';
import { DICTIONARIES } from './dictionaries';
import { parseGameKey } from './gameKey';
import { completionToPoints, WIN_THRESHOLD } from './levels';

// The lifetime record, aggregated from the per-game summaries: the numbers
// the History dialog shows up top, and the ones the achievements' lifetime
// tracks are measured against. Both read one definition of "won" and
// "perfect" from here, so the case and History can never disagree.
export interface LifetimeStats {
  played: number;
  won: number;
  points: number;
  words: number;
  hints: number;
  // Boards where every point was earned.
  perfect: number;
  // Word lists with at least one win, and how many lists there are.
  wonDictionaries: number;
  dictionaries: number;
  // Consecutive days played, counting back from today (or yesterday, so a
  // streak is not "broken" before today's game happens).
  streak: number;
}

export function isWon(summary: GameSummary): boolean {
  return summary.earned >= completionToPoints(WIN_THRESHOLD, summary.max);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// The calendar day a timestamp falls on, in the local timezone.
function localDay(timestamp: number): number {
  return Math.floor(
    (timestamp - new Date(timestamp).getTimezoneOffset() * 60000) / DAY_MS,
  );
}

function currentStreak(entries: readonly HistoryEntry[], now: number): number {
  const days = new Set(
    entries.map((entry) => localDay(entry.summary.playedAt)),
  );
  const today = localDay(now);
  let day = days.has(today) ? today : today - 1;
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day--;
  }
  return streak;
}

export function summarizeHistory(
  entries: readonly HistoryEntry[],
  now: number,
): LifetimeStats {
  const wonDictionaries = new Set<string>();
  let won = 0;
  let perfect = 0;
  let points = 0;
  let words = 0;
  let hints = 0;
  for (const { gameKey, summary } of entries) {
    points += summary.earned;
    words += summary.found;
    hints += summary.hints;
    if (isWon(summary)) {
      won++;
      // English games carry no prefix in their key (see gameKey.ts).
      wonDictionaries.add(parseGameKey(gameKey)?.dict ?? 'en');
    }
    if (summary.earned === summary.max) {
      perfect++;
    }
  }
  return {
    played: entries.length,
    won,
    points,
    words,
    hints,
    perfect,
    wonDictionaries: wonDictionaries.size,
    dictionaries: Object.keys(DICTIONARIES).length,
    streak: currentStreak(entries, now),
  };
}
