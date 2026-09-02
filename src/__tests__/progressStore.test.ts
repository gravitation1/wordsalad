import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearSavedProgress,
  loadBuilt,
  loadUnlocks,
  recordUnlocks,
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
