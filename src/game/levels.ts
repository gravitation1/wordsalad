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

// The share of the board's points that wins it. Lives with the ladder so
// the history aggregate and the game hook read one definition.
export const WIN_THRESHOLD = 0.75;

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

// The smallest whole-point score that reaches a completion fraction. The
// epsilon absorbs float noise so a boundary that means exactly N points
// never rounds up to N + 1.
export function completionToPoints(
  fraction: number,
  maxPoints: number,
): number {
  return Math.ceil(fraction * maxPoints - 1e-9);
}

export interface NextRank {
  level: string;
  // The smallest score that reaches it.
  points: number;
}

// The rank the next earned points are chasing: the lowest rung above the
// current score, provided a flawless rest-of-game can still get there.
// Null once nothing above remains reachable — a perfect sweep, or hints
// burned past the last rung. (Rung points grow with the ladder, so burned
// rungs are always a suffix: there is never a reachable rung beyond an
// unreachable one.)
export function getNextRank(
  earnedPoints: number,
  maxPoints: number,
  reachablePoints: number,
): NextRank | null {
  let next: NextRank | null = null;
  for (const step of getLevelLadder()) {
    const points = completionToPoints(step.minimumCompletion, maxPoints);
    if (points <= earnedPoints || points > reachablePoints) {
      continue;
    }
    if (next !== null && points > next.points) {
      break;
    }
    // On small boards several rungs can collapse onto one score; keep the
    // last of them — the rank that crossing score actually awards.
    next = { level: step.level, points };
  }
  return next;
}
