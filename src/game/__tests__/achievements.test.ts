import { describe, expect, it } from 'vitest';

import type { AchievementEvent, BoardFacts, WordFacts } from '../achievements';
import {
  ACHIEVEMENTS,
  achievementTier,
  findNewUnlocks,
  isAchievementId,
} from '../achievements';
import type { LifetimeStats } from '../history';

const BOARD: BoardFacts = {
  crossedWin: false,
  perfect: false,
  complete: false,
  earnedPoints: 0,
  maxPoints: 15,
  foundWords: 1,
  hints: 0,
  minimumLength: 4,
  requiredLetters: 1,
  built: false,
  challengeScore: null,
};

const STATS: LifetimeStats = {
  played: 1,
  won: 0,
  points: 0,
  words: 1,
  hints: 0,
  perfect: 0,
  wonDictionaries: 0,
  dictionaries: 7,
  streak: 1,
};

const WORD: WordFacts = { length: 4, pangram: false, hinted: false };

function event(
  overrides: {
    board?: Partial<BoardFacts>;
    kind?: AchievementEvent['kind'];
    stats?: Partial<LifetimeStats>;
    word?: Partial<WordFacts> | null;
  } = {},
): AchievementEvent {
  const kind = overrides.kind ?? 'scored';
  return {
    kind,
    board: { ...BOARD, ...overrides.board },
    word:
      overrides.word === null || kind !== 'scored'
        ? null
        : { ...WORD, ...overrides.word },
    stats: { ...STATS, ...overrides.stats },
  };
}

describe('findNewUnlocks', () => {
  it('awards the win feats on the crossing, and no-help only without hints', () => {
    expect(
      findNewUnlocks(
        event({ board: { crossedWin: true, earnedPoints: 12 } }),
        {},
      ),
    ).toEqual(['first-win', 'no-help-needed']);
    expect(
      findNewUnlocks(
        event({ board: { crossedWin: true, earnedPoints: 12, hints: 1 } }),
        {},
      ),
    ).toEqual(['first-win']);
  });

  it('awards the perfect, the completion, and the top rungs on a perfect word', () => {
    expect(
      findNewUnlocks(
        event({
          board: {
            crossedWin: true,
            perfect: true,
            complete: true,
            earnedPoints: 15,
          },
        }),
        {},
      ),
    ).toEqual([
      'first-win',
      'no-help-needed',
      'first-perfect',
      'completionist',
      'super-genius',
    ]);
  });

  it('keeps catalog order and skips what is already held', () => {
    expect(
      findNewUnlocks(event({ board: { crossedWin: true, earnedPoints: 12 } }), {
        'first-win': 1,
      }),
    ).toEqual(['no-help-needed']);
  });

  it('judges Super-Genius by the rank ladder, not the win line', () => {
    expect(findNewUnlocks(event({ board: { earnedPoints: 13 } }), {})).toEqual(
      [],
    );
    expect(findNewUnlocks(event({ board: { earnedPoints: 14 } }), {})).toEqual([
      'super-genius',
    ]);
  });

  it('awards the word feats only for words found, not revealed', () => {
    expect(
      findNewUnlocks(event({ word: { pangram: true, length: 10 } }), {}),
    ).toEqual(['pangrammer', 'long-haul']);
    expect(
      findNewUnlocks(
        event({ word: { pangram: true, length: 10, hinted: true } }),
        {},
      ),
    ).toEqual([]);
    expect(findNewUnlocks(event({ word: { length: 9 } }), {})).toEqual([]);
  });

  it('awards Marathon, Challenger, and the constrained-board wins', () => {
    expect(findNewUnlocks(event({ board: { foundWords: 25 } }), {})).toEqual([
      'marathon',
    ]);
    expect(
      findNewUnlocks(
        event({ board: { challengeScore: 8, earnedPoints: 9 } }),
        {},
      ),
    ).toEqual(['challenger']);
    expect(
      findNewUnlocks(
        event({ board: { challengeScore: 9, earnedPoints: 9 } }),
        {},
      ),
    ).toEqual([]);
    expect(
      findNewUnlocks(
        event({
          board: {
            crossedWin: true,
            earnedPoints: 12,
            hints: 1,
            minimumLength: 5,
            requiredLetters: 2,
            built: true,
          },
        }),
        {},
      ),
    ).toEqual(['first-win', 'hard-mode', 'double-duty', 'builder']);
  });

  it('awards Overreach for a lockout and Host for a share, nothing else', () => {
    expect(findNewUnlocks(event({ kind: 'lockout' }), {})).toEqual([
      'overreach',
    ]);
    expect(findNewUnlocks(event({ kind: 'shared' }), {})).toEqual(['host']);
  });

  it('awards the lifetime tracks from the totals, on any event', () => {
    expect(
      findNewUnlocks(
        event({
          kind: 'shared',
          stats: { won: 100, words: 1000, perfect: 10, wonDictionaries: 7 },
        }),
        {},
      ),
    ).toEqual([
      'host',
      'ten-wins',
      'fifty-wins',
      'century',
      'wordsmith',
      'perfectionist',
      'bilingual',
      'polyglot',
    ]);
    expect(
      findNewUnlocks(
        event({
          word: null,
          stats: { won: 9, words: 999, perfect: 9, wonDictionaries: 1 },
        }),
        {},
      ),
    ).toEqual([]);
  });

  it('sizes Polyglot to however many word lists exist', () => {
    expect(
      findNewUnlocks(
        event({ word: null, stats: { wonDictionaries: 3, dictionaries: 3 } }),
        { bilingual: 1 },
      ),
    ).toEqual(['polyglot']);
  });
});

describe('catalog', () => {
  it('gives every achievement a unique id and a tier', () => {
    const ids = ACHIEVEMENTS.map((achievement) => achievement.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(21);
    for (const achievement of ACHIEVEMENTS) {
      expect(achievementTier(achievement.id)).toBe(achievement.tier);
    }
  });

  it('reports progress for the lifetime tracks only', () => {
    const progress = (id: string) =>
      ACHIEVEMENTS.find((achievement) => achievement.id === id)?.progress;
    expect(progress('first-win')).toBeUndefined();
    expect(progress('ten-wins')?.({ ...STATS, won: 3 })).toEqual({
      value: 3,
      target: 10,
    });
    expect(progress('polyglot')?.({ ...STATS, wonDictionaries: 2 })).toEqual({
      value: 2,
      target: 7,
    });
  });

  it('recognizes only catalog ids', () => {
    expect(isAchievementId('first-win')).toBe(true);
    expect(isAchievementId('regular')).toBe(false);
  });
});
