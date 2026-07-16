import { describe, expect, it } from 'vitest';

import { getLevel, getLevelLadder } from '../levels';

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
