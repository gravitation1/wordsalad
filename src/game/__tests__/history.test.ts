import { describe, expect, it } from 'vitest';

import type { GameSummary, HistoryEntry } from '../../progressStore';
import { isWon, summarizeHistory } from '../history';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 2, 12);

function entry(
  gameKey: string,
  summary: Partial<GameSummary> = {},
): HistoryEntry {
  return {
    gameKey,
    summary: {
      earned: 12,
      found: 3,
      hints: 0,
      lost: 0,
      max: 15,
      playedAt: NOW,
      total: 3,
      ...summary,
    },
  };
}

describe('isWon', () => {
  it("applies the win line to each board's own maximum", () => {
    expect(isWon(entry('A', { earned: 12, max: 15 }).summary)).toBe(true);
    expect(isWon(entry('A', { earned: 11, max: 15 }).summary)).toBe(false);
    expect(isWon(entry('A', { earned: 1, max: 1 }).summary)).toBe(true);
  });
});

describe('summarizeHistory', () => {
  it('totals the record and counts wins, perfects, and word lists', () => {
    const stats = summarizeHistory(
      [
        entry('DEORSTW.T.4', { earned: 15, found: 3 }), // perfect, en
        entry('fr:ABCDEFG.A.4', { earned: 12, found: 2, hints: 1 }), // won, fr
        entry('fr:ABCDEFH.A.4', { earned: 12, found: 1 }), // won, fr again
        entry('es:ABCDEFG.A.4', { earned: 3, found: 1 }), // not won
      ],
      NOW,
    );
    expect(stats).toMatchObject({
      played: 4,
      won: 3,
      points: 42,
      words: 7,
      hints: 1,
      perfect: 1,
      wonDictionaries: 2,
      dictionaries: 7,
    });
  });

  it('counts consecutive days back from today, or from yesterday', () => {
    expect(
      summarizeHistory(
        [
          entry('A.A.4', { playedAt: NOW }),
          entry('B.A.4', { playedAt: NOW - DAY }),
          entry('C.A.4', { playedAt: NOW - 3 * DAY }),
        ],
        NOW,
      ).streak,
    ).toBe(2);
    expect(
      summarizeHistory([entry('B.A.4', { playedAt: NOW - DAY })], NOW).streak,
    ).toBe(1);
    expect(
      summarizeHistory([entry('C.A.4', { playedAt: NOW - 2 * DAY })], NOW)
        .streak,
    ).toBe(0);
    expect(summarizeHistory([], NOW).streak).toBe(0);
  });
});
