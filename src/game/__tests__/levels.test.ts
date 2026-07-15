import { describe, expect, it } from 'vitest';

import { getLevel } from '../levels';

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
