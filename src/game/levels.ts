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

export function getLevel(completionPercent: number): string {
  for (const [threshold, level] of LEVELS) {
    if (completionPercent < threshold) {
      return level;
    }
  }
  return 'Super-Duper-Genius';
}
