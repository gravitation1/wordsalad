import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearSavedProgress,
  countFreshUnlocks,
  loadAchievementsSeenAt,
  loadBoardUnlocks,
  loadBuilt,
  loadUnlocks,
  recordUnlocks,
  saveAchievementsSeenAt,
  saveBoardUnlocks,
  saveBuilt,
} from '../progressStore';

describe('achievement unlocks', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts with nothing earned', () => {
    expect(loadUnlocks()).toEqual({});
  });

  it('records an unlock with its timestamp', () => {
    recordUnlocks(['first-win'], 1000);
    expect(loadUnlocks()).toEqual({ 'first-win': 1000 });
  });

  it('is append-only: an achievement already held keeps its first date', () => {
    recordUnlocks(['first-win'], 1000);
    recordUnlocks(['first-win', 'first-perfect'], 2000);
    expect(loadUnlocks()).toEqual({ 'first-perfect': 2000, 'first-win': 1000 });
  });

  it('drops ids the catalog does not know and values that are not dates', () => {
    window.localStorage.setItem(
      'wordsalad:achievements',
      JSON.stringify({
        regular: 5,
        'first-perfect': 'soon',
        'first-win': 1000,
      }),
    );
    expect(loadUnlocks()).toEqual({ 'first-win': 1000 });
  });

  it('reads corrupt storage as nothing earned', () => {
    window.localStorage.setItem('wordsalad:achievements', '{nope');
    expect(loadUnlocks()).toEqual({});
    window.localStorage.setItem('wordsalad:achievements', '[1, 2]');
    expect(loadUnlocks()).toEqual({});
  });

  it('survives a per-game reset', () => {
    recordUnlocks(['first-win'], 1000);
    clearSavedProgress('DEORSTW.T.4');
    expect(loadUnlocks()).toEqual({ 'first-win': 1000 });
  });
});

describe('built boards', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('remembers a board that came from the builder, per board', () => {
    expect(loadBuilt('DEORSTW.T.4')).toBe(false);
    saveBuilt('DEORSTW.T.4');
    expect(loadBuilt('DEORSTW.T.4')).toBe(true);
    expect(loadBuilt('AHIMTUZ.I.4')).toBe(false);
  });

  it('is not a kind of progress: a restart leaves it alone', () => {
    saveBuilt('DEORSTW.T.4');
    clearSavedProgress('DEORSTW.T.4');
    expect(loadBuilt('DEORSTW.T.4')).toBe(true);
  });
});

describe('a board’s achievements', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps the board’s story in earned order, per board', () => {
    expect(loadBoardUnlocks('DEORSTW.T.4')).toEqual([]);
    saveBoardUnlocks('DEORSTW.T.4', ['pangrammer', 'first-win']);
    expect(loadBoardUnlocks('DEORSTW.T.4')).toEqual([
      'pangrammer',
      'first-win',
    ]);
    expect(loadBoardUnlocks('AHIMTUZ.I.4')).toEqual([]);
  });

  it('drops ids the catalog does not know', () => {
    window.localStorage.setItem(
      'wordsalad:unlocks:DEORSTW.T.4',
      JSON.stringify(['regular', 'first-win', 5]),
    );
    expect(loadBoardUnlocks('DEORSTW.T.4')).toEqual(['first-win']);
  });

  it('is progress: a reset clears it', () => {
    saveBoardUnlocks('DEORSTW.T.4', ['first-win']);
    clearSavedProgress('DEORSTW.T.4');
    expect(loadBoardUnlocks('DEORSTW.T.4')).toEqual([]);
  });
});

describe('new since the case was opened', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('counts unlocks later than the last opening', () => {
    expect(loadAchievementsSeenAt()).toBe(0);
    recordUnlocks(['first-win'], 1000);
    expect(countFreshUnlocks()).toBe(1);
    saveAchievementsSeenAt(1500);
    expect(loadAchievementsSeenAt()).toBe(1500);
    expect(countFreshUnlocks()).toBe(0);
    recordUnlocks(['pangrammer', 'no-help-needed'], 2000);
    expect(countFreshUnlocks()).toBe(2);
  });
});
