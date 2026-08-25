import { describe, expect, it } from 'vitest';

import { getLevel, getLevelLadder, getNextRank } from '../levels';

describe('getLevel', () => {
  it.each([
    [0, 'Idiot'],
    [0.049, 'Idiot'],
    [0.05, 'Meh'],
    [0.099, 'Meh'],
    [0.1, 'Okay'],
    [0.2, 'Nice'],
    [0.3, 'Not-Too-Shabby'],
    [0.4, 'Great'],
    [0.5, 'Awesome'],
    [0.6, 'Smarty-Pants'],
    [0.75, 'Genius'],
    [0.9, 'Super-Genius'],
    [0.999, 'Super-Genius'],
    [1, 'Super-Duper-Genius'],
  ])('maps %f to %s', (completionPercent, level) => {
    expect(getLevel(completionPercent)).toBe(level);
  });
});

describe('getLevelLadder', () => {
  it('lists every level with its minimum completion', () => {
    const ladder = getLevelLadder();
    expect(ladder).toHaveLength(11);
    expect(ladder[0]).toEqual({ level: 'Idiot', minimumCompletion: 0 });
    expect(ladder).toContainEqual({ level: 'Awesome', minimumCompletion: 0.5 });
    expect(ladder[10]).toEqual({
      level: 'Super-Duper-Genius',
      minimumCompletion: 1,
    });
  });

  it('agrees with getLevel at every lower bound', () => {
    for (const step of getLevelLadder()) {
      expect(getLevel(step.minimumCompletion)).toBe(step.level);
    }
  });
});

describe('getNextRank', () => {
  // The test boards' 15-point scale: Meh 1 · Okay 2 · Nice 3 · NTS 5 ·
  // Great 6 · Awesome 8 · Smarty-Pants 9 · Genius 12 · SG 14 · SDG 15.
  it.each([
    [0, { level: 'Meh', points: 1 }],
    [1, { level: 'Okay', points: 2 }],
    [11, { level: 'Genius', points: 12 }],
    [12, { level: 'Super-Genius', points: 14 }],
    [14, { level: 'Super-Duper-Genius', points: 15 }],
  ])('targets the rung above %i of 15', (earnedPoints, next) => {
    expect(getNextRank(earnedPoints, 15, 15)).toEqual(next);
  });

  it('returns null at a perfect score', () => {
    expect(getNextRank(15, 15, 15)).toBeNull();
  });

  it('skips nothing while burn keeps the next rung reachable', () => {
    expect(getNextRank(5, 15, 11)).toEqual({ level: 'Great', points: 6 });
  });

  it('returns null once burn puts every higher rung out of reach', () => {
    expect(getNextRank(9, 15, 11)).toBeNull();
  });

  it('awards a collapsed rung to its highest rank', () => {
    // On a 10-point board Meh and Okay both start at 1 point; crossing to
    // 1 point lands on Okay, so that is the rank worth promising.
    expect(getNextRank(0, 10, 10)).toEqual({ level: 'Okay', points: 1 });
  });

  it('promises exactly the rank that crossing score awards', () => {
    for (const maxPoints of [7, 10, 15, 212]) {
      for (let earned = 0; earned <= maxPoints; earned += 1) {
        const next = getNextRank(earned, maxPoints, maxPoints);
        if (next === null) {
          continue;
        }
        expect(next.points).toBeGreaterThan(earned);
        expect(getLevel(next.points / maxPoints)).toBe(next.level);
      }
    }
  });
});
