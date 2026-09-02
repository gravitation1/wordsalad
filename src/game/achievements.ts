// The achievement catalog and the rule that awards it. Achievements are the
// reward layer that spans games: a rank is earned per board and resets with
// the next deal, an achievement is earned once and kept. Each entry pairs a
// stable id — the storage key and the message key, never renamed — with a
// tier and the predicate that awards it. Names and descriptions live in the
// message catalog (i18n.tsx), keyed by the same id.

import type { LifetimeStats } from './history';
import { getLevel } from './levels';

export type AchievementId =
  | 'first-win'
  | 'no-help-needed'
  | 'first-perfect'
  | 'completionist'
  | 'super-genius'
  | 'pangrammer'
  | 'long-haul'
  | 'marathon'
  | 'challenger'
  | 'hard-mode'
  | 'double-duty'
  | 'builder'
  | 'overreach'
  | 'host'
  | 'ten-wins'
  | 'fifty-wins'
  | 'century'
  | 'wordsmith'
  | 'perfectionist'
  | 'bilingual'
  | 'polyglot';

// How good the achievement is, worn as a color everywhere it appears (the
// case's star, the end-game chip): the game's own tile faces, from the plain
// letter tile through the required-letter accent to the perfect-score gold.
export type AchievementTier = 'plain' | 'accent' | 'gold';

// The board as it stands once the event has been applied.
export interface BoardFacts {
  // This event took earned points across the win line. Only a scored word
  // can; it is what makes the win-type feats fire at the win itself.
  crossedWin: boolean;
  // Every point earned; every word found, hinted ones included.
  perfect: boolean;
  complete: boolean;
  earnedPoints: number;
  maxPoints: number;
  // Words found so far, hinted ones included.
  foundWords: number;
  // Hinted words, the hint that fired this event included.
  hints: number;
  minimumLength: number;
  requiredLetters: number;
  // The board came from the custom-game builder.
  built: boolean;
  // The score a share link asked this board to beat, if it arrived by one.
  challengeScore: number | null;
}

// The word a 'scored' event is about.
export interface WordFacts {
  length: number;
  pangram: boolean;
  // Revealed by a hint before it was submitted, so it scored nothing.
  hinted: boolean;
}

// Something the achievements can judge: a scored word (the win and the
// perfect are scored words too), the hint that locks the board, or a share.
// Live play only — a restored board fires nothing, exactly like the
// celebration and lockout events this rides on.
export interface AchievementEvent {
  kind: 'scored' | 'lockout' | 'shared';
  board: BoardFacts;
  word: WordFacts | null;
  // Lifetime totals with this board's current standing already counted.
  stats: LifetimeStats;
}

export interface AchievementProgress {
  value: number;
  target: number;
}

export interface AchievementDefinition {
  id: AchievementId;
  tier: AchievementTier;
  // Whether this event earns the achievement. Checked only while it is
  // still locked: an achievement is awarded once.
  unlocks: (event: AchievementEvent) => boolean;
  // Lifetime tracks: how far along, for the case's locked rows.
  progress?: (stats: LifetimeStats) => AchievementProgress;
}

// The rank ladder's two top rungs (levels.ts), by the names the ladder uses.
function isSuperGenius(board: BoardFacts): boolean {
  const level = getLevel(board.earnedPoints / board.maxPoints);
  return level === 'Super-Genius' || level === 'Super-Duper-Genius';
}

const scored = (event: AchievementEvent): boolean => event.kind === 'scored';
const found = (event: AchievementEvent): WordFacts | null =>
  event.word !== null && !event.word.hinted ? event.word : null;

function track(
  key: 'won' | 'words' | 'perfect' | 'wonDictionaries',
  target: number | ((stats: LifetimeStats) => number),
): Pick<AchievementDefinition, 'progress' | 'unlocks'> {
  const targetOf = (stats: LifetimeStats) =>
    typeof target === 'number' ? target : target(stats);
  return {
    unlocks: (event) => event.stats[key] >= targetOf(event.stats),
    progress: (stats) => ({ value: stats[key], target: targetOf(stats) }),
  };
}

// Catalog order is display order — for the case's locked rows, and for a
// recap that unlocks several at once.
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'first-win', tier: 'plain', unlocks: (e) => e.board.crossedWin },
  {
    id: 'no-help-needed',
    tier: 'accent',
    unlocks: (e) => e.board.crossedWin && e.board.hints === 0,
  },
  {
    id: 'first-perfect',
    tier: 'gold',
    unlocks: (e) => scored(e) && e.board.perfect,
  },
  {
    id: 'completionist',
    tier: 'plain',
    unlocks: (e) => scored(e) && e.board.complete,
  },
  {
    id: 'super-genius',
    tier: 'accent',
    unlocks: (e) => scored(e) && isSuperGenius(e.board),
  },
  {
    id: 'pangrammer',
    tier: 'plain',
    unlocks: (e) => found(e)?.pangram === true,
  },
  {
    id: 'long-haul',
    tier: 'gold',
    unlocks: (e) => (found(e)?.length ?? 0) >= 10,
  },
  {
    id: 'marathon',
    tier: 'plain',
    unlocks: (e) => scored(e) && e.board.foundWords >= 25,
  },
  {
    id: 'challenger',
    tier: 'accent',
    unlocks: (e) =>
      scored(e) &&
      e.board.challengeScore !== null &&
      e.board.earnedPoints > e.board.challengeScore,
  },
  {
    id: 'hard-mode',
    tier: 'accent',
    unlocks: (e) => e.board.crossedWin && e.board.minimumLength >= 5,
  },
  {
    id: 'double-duty',
    tier: 'accent',
    unlocks: (e) => e.board.crossedWin && e.board.requiredLetters >= 2,
  },
  {
    id: 'builder',
    tier: 'plain',
    unlocks: (e) => e.board.crossedWin && e.board.built,
  },
  { id: 'overreach', tier: 'plain', unlocks: (e) => e.kind === 'lockout' },
  { id: 'host', tier: 'plain', unlocks: (e) => e.kind === 'shared' },
  { id: 'ten-wins', tier: 'plain', ...track('won', 10) },
  { id: 'fifty-wins', tier: 'accent', ...track('won', 50) },
  { id: 'century', tier: 'gold', ...track('won', 100) },
  { id: 'wordsmith', tier: 'accent', ...track('words', 1000) },
  { id: 'perfectionist', tier: 'gold', ...track('perfect', 10) },
  { id: 'bilingual', tier: 'accent', ...track('wonDictionaries', 2) },
  {
    id: 'polyglot',
    tier: 'gold',
    ...track('wonDictionaries', (stats) => stats.dictionaries),
  },
];

const IDS: readonly string[] = ACHIEVEMENTS.map(
  (achievement) => achievement.id,
);

// The guard the store applies on the way in, so a retired id or a
// hand-edited value can never reach the case.
export function isAchievementId(value: string): value is AchievementId {
  return IDS.includes(value);
}

export function achievementTier(id: AchievementId): AchievementTier {
  return (
    ACHIEVEMENTS.find((achievement) => achievement.id === id)?.tier ?? 'plain'
  );
}

// Unlock timestamps by id; absent means locked. Append-only in storage —
// nothing in the game clears an unlock.
export type UnlockRecord = Readonly<Partial<Record<AchievementId, number>>>;

// The achievements this event earns that are not already held, in catalog
// order.
export function findNewUnlocks(
  event: AchievementEvent,
  unlocked: UnlockRecord,
): readonly AchievementId[] {
  return ACHIEVEMENTS.filter(
    (achievement) =>
      unlocked[achievement.id] === undefined && achievement.unlocks(event),
  ).map((achievement) => achievement.id);
}
