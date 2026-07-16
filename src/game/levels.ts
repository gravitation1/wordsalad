const LEVELS: readonly (readonly [number, string])[] = [
  [0.05, 'Idiot'],
  [0.1, 'Meh'],
  [0.2, 'Okay'],
  [0.3, 'Nice'],
  [0.4, 'Not-Too-Shabby'],
  [0.5, 'Great'],
  [0.6, 'Awesome'],
  [0.75, 'Smarty-Pants'],
  [0.9, 'Genius'],
  [1, 'Super-Genius'],
];

const TOP_LEVEL = 'Super-Duper-Genius';

export function getLevel(completionPercent: number): string {
  for (const [threshold, level] of LEVELS) {
    if (completionPercent < threshold) {
      return level;
    }
  }
  return TOP_LEVEL;
}

export interface LevelStep {
  level: string;
  minimumCompletion: number;
}

// The full ladder with each level's lower completion bound, for display.
export function getLevelLadder(): readonly LevelStep[] {
  const ladder: LevelStep[] = [];
  let minimumCompletion = 0;

  for (const [threshold, level] of LEVELS) {
    ladder.push({ level, minimumCompletion });
    minimumCompletion = threshold;
  }

  ladder.push({ level: TOP_LEVEL, minimumCompletion: 1 });
  return ladder;
}
