import { useId } from 'react';

import type { AchievementId } from '../game/achievements';
import { achievementTier } from '../game/achievements';
import { useMessages } from '../i18n';
import { ACHIEVEMENT_CHIP_CLASS } from './achievementTiers';

// The end-game dialogs' recap of what this board just unlocked: an eyebrow
// and a chip per achievement. It comes last in the dialog, after the
// actions, so a pile of unlocks can only ever grow the dialog downward and
// never push New game below the fold. Renders nothing when the board
// earned nothing, which is most boards.
interface AchievementRecapProps {
  unlocked: readonly AchievementId[];
}

export function AchievementRecap({ unlocked }: AchievementRecapProps) {
  const t = useMessages();
  const labelId = useId();

  if (unlocked.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-col items-center gap-1.5"
      data-testid="achievement-recap"
    >
      {/* The eyebrow does real work here: under the quiet gray links above
          it, the chips would otherwise read as one more row of them. */}
      <p
        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
        id={labelId}
      >
        {t.unlockedLabel}
      </p>
      <ul
        aria-labelledby={labelId}
        className="flex flex-wrap justify-center gap-1.5"
      >
        {unlocked.map((id) => (
          <li
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${ACHIEVEMENT_CHIP_CLASS[achievementTier(id)]}`}
            data-achievement={id}
            key={id}
          >
            <span aria-hidden="true">★</span>
            {t.achievements[id].name}
          </li>
        ))}
      </ul>
    </div>
  );
}
