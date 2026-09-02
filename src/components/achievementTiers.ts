import type { AchievementTier } from '../game/achievements';

// An achievement's tier as color, in the tile faces' recipes (tiles.ts):
// the plain letter tile, the required-letter accent, the perfect-score
// gold. Two renderings share one ladder — the case's star, which is text
// color alone, and the end-game chip, a soft tint so it stays below the
// buttons it follows. Neither ever borrows the dialog's own mood: a common
// unlock is plain inside the gold perfect dialog, a rare one gold inside
// the lockout's.
export const ACHIEVEMENT_MARK_CLASS: Record<AchievementTier, string> = {
  plain: 'text-gray-800 dark:text-gray-200',
  accent: 'text-accent',
  gold: 'text-amber-500',
};

export const ACHIEVEMENT_CHIP_CLASS: Record<AchievementTier, string> = {
  plain:
    'border border-gray-300 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200',
  accent: 'bg-accent/10 text-accent',
  gold: 'bg-amber-400/20 text-amber-600 dark:text-amber-300',
};
