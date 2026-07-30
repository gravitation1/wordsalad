import { describe, expect, it } from 'vitest';

import { WordSaladError } from '../errors';
import { WordSalad } from '../wordSalad';

// With the character set WORDTES and required character T, the valid words
// are TEST (1 point), ROTTED (3 points), and WORSTED (a pangram: 4 points
// + 7 bonus points), for a maximum of 15 points.
const DICTIONARY = ['TEST', 'ROTTED', 'WORSTED', 'WORD', 'REDO', 'ABLE'];

function newWordSalad(): WordSalad {
  return new WordSalad(new Set('WORDTES'), 'T', 4, DICTIONARY);
}

function expectWordSaladError(
  routine: () => unknown,
  name: string,
  message: string,
): void {
  let thrown: unknown = null;
  try {
    routine();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(WordSaladError);
  expect(thrown).toMatchObject({ name, message });
}

describe('WordSalad', () => {
  it('finds the valid words and pangrams in the dictionary', () => {
    const wordSalad = newWordSalad();
    expect(wordSalad.remainingWords).toEqual(
      new Set(['TEST', 'ROTTED', 'WORSTED']),
    );
    expect(wordSalad.pangramWords).toEqual(new Set(['WORSTED']));
    expect(wordSalad.pangramBonusPoints).toBe(7);
    expect(wordSalad.maxPoints).toBe(15);
    expect(wordSalad.currentPoints).toBe(0);
    expect(wordSalad.foundWords.size).toBe(0);
  });

  it('throws when the required character is not in the character set', () => {
    expectWordSaladError(
      () => new WordSalad(new Set('WORDES'), 'T', 4, DICTIONARY),
      'MissingRequiredCharacter',
      'Missing required character!',
    );
  });

  it('throws when the dictionary has no valid words', () => {
    expectWordSaladError(
      () => new WordSalad(new Set('XYZQJKV'), 'X', 4, DICTIONARY),
      'NoValidWords',
      'No valid words!',
    );
  });

  it('scores a word by length above the minimum', () => {
    const wordSalad = newWordSalad();
    expect(wordSalad.tryWord('TEST')).toBe(1);
    expect(wordSalad.tryWord('ROTTED')).toBe(3);
    expect(wordSalad.currentPoints).toBe(4);
    expect(wordSalad.foundWords.get('TEST')).toBe(1);
    expect(wordSalad.foundWords.get('ROTTED')).toBe(3);
    expect(wordSalad.remainingWords.has('TEST')).toBe(false);
  });

  it('awards the pangram bonus', () => {
    const wordSalad = newWordSalad();
    expect(wordSalad.tryWord('WORSTED')).toBe(11);
  });

  it('empties the remaining words once every word is found', () => {
    const wordSalad = newWordSalad();
    wordSalad.tryWord('TEST');
    wordSalad.tryWord('ROTTED');
    wordSalad.tryWord('WORSTED');
    expect(wordSalad.remainingWords.size).toBe(0);
    expect(wordSalad.currentPoints).toBe(15);
  });

  it('rejects a word that was already found', () => {
    const wordSalad = newWordSalad();
    wordSalad.tryWord('TEST');
    expectWordSaladError(
      () => wordSalad.tryWord('TEST'),
      'AlreadyFound',
      'TEST was already found!',
    );
  });

  it('rejects a word below the minimum length', () => {
    const wordSalad = newWordSalad();
    expectWordSaladError(
      () => wordSalad.tryWord('TET'),
      'TooShort',
      'TET is too short!',
    );
  });

  it('rejects a word missing the required character', () => {
    const wordSalad = newWordSalad();
    expectWordSaladError(
      () => wordSalad.tryWord('DOSE'),
      'MissingRequiredCharacter',
      'DOSE is missing required character!',
    );
  });

  it('requires every letter when multiple are required', () => {
    // WORDTES requiring both R and T: only ROTTED and WORSTED qualify.
    const wordSalad = new WordSalad(new Set('WORDTES'), 'RT', 4, DICTIONARY);
    expect(wordSalad.remainingWords).toEqual(new Set(['ROTTED', 'WORSTED']));
    // TEST has T but not R; WORD has R but not T.
    expect(wordSalad.previewWord('TEST')).toEqual({
      verdict: 'missing-required',
      requiredCharacters: 'RT',
    });
    expect(wordSalad.previewWord('WORD')).toEqual({
      verdict: 'missing-required',
      requiredCharacters: 'RT',
    });
    expect(wordSalad.previewWord('ROTTED')).toEqual({
      verdict: 'valid',
      points: 3,
    });
  });

  it('canonicalizes the required letters to distinct and sorted', () => {
    const wordSalad = new WordSalad(new Set('WORDTES'), 'TTR', 4, DICTIONARY);
    expect(wordSalad.requiredCharacters).toBe('RT');
  });

  it('throws when any required letter is outside the set', () => {
    expectWordSaladError(
      () => new WordSalad(new Set('WORDTES'), 'RZ', 4, DICTIONARY),
      'MissingRequiredCharacter',
      'Missing required character!',
    );
  });

  it('rejects a word with letters outside the character set', () => {
    const wordSalad = newWordSalad();
    expectWordSaladError(
      () => wordSalad.tryWord('TAXI'),
      'InvalidWordLetters',
      'TAXI has invalid letters!',
    );
  });

  it('rejects a word that is not in the dictionary', () => {
    const wordSalad = newWordSalad();
    expectWordSaladError(
      () => wordSalad.tryWord('TOWS'),
      'NotFound',
      'TOWS was not found!',
    );
  });

  it('reports the shortest remaining word, or null when none remain', () => {
    const wordSalad = newWordSalad();
    // Valid words: TEST (4), ROTTED (6), WORSTED (7).
    expect(wordSalad.shortestRemainingWord()).toBe('TEST');
    wordSalad.tryWord('TEST');
    expect(wordSalad.shortestRemainingWord()).toBe('ROTTED');
    wordSalad.tryWord('ROTTED');
    wordSalad.tryWord('WORSTED');
    expect(wordSalad.shortestRemainingWord()).toBeNull();
  });

  it('previews words without mutating any state', () => {
    const wordSalad = newWordSalad();

    expect(wordSalad.previewWord('TEST')).toEqual({
      verdict: 'valid',
      points: 1,
    });
    expect(wordSalad.previewWord('WORSTED')).toEqual({
      verdict: 'valid',
      points: 11,
    });
    expect(wordSalad.previewWord('TET')).toEqual({ verdict: 'too-short' });
    expect(wordSalad.previewWord('DOSE')).toEqual({
      verdict: 'missing-required',
      requiredCharacters: 'T',
    });
    expect(wordSalad.previewWord('TAXI')).toEqual({
      verdict: 'invalid-letters',
    });
    expect(wordSalad.previewWord('TOWS')).toEqual({ verdict: 'not-a-word' });

    // Previewing must not change the game.
    expect(wordSalad.remainingWords.size).toBe(3);
    expect(wordSalad.foundWords.size).toBe(0);
    expect(wordSalad.currentPoints).toBe(0);

    wordSalad.tryWord('TEST');
    expect(wordSalad.previewWord('TEST')).toEqual({
      verdict: 'already-found',
    });
  });
});

describe('WordSalad with a folding dictionary', () => {
  // The French fold: accents strip, ligatures expand, keys stay A-Z.
  const fold = (text: string) =>
    text
      .toUpperCase()
      .replace(/Œ/g, 'OE')
      .replace(/Æ/g, 'AE')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

  // One key group of four (COTE) plus two singletons, board CEOST.
  const FRENCH = ['CÔTE', 'CÔTÉ', 'COTE', 'COTÉ', 'ÉTÉS', 'TÊTES'];

  const build = () => new WordSalad(new Set('CEOST'), 'T', 4, FRENCH, fold);

  it('finds every surface form sharing the submitted key at once', () => {
    const wordSalad = build();
    expect(wordSalad.remainingWords.size).toBe(6);

    // Four siblings, one point each (key length 4, minimum 4).
    expect(wordSalad.previewWord('COTE')).toEqual({
      verdict: 'valid',
      points: 4,
    });
    expect(wordSalad.tryWord('COTE')).toBe(4);
    expect(Array.from(wordSalad.foundWords.keys()).sort()).toEqual(
      ['COTE', 'COTÉ', 'CÔTE', 'CÔTÉ'].sort(),
    );
    // Each sibling scored as its own word.
    expect(wordSalad.foundWords.get('CÔTÉ')).toBe(1);
    expect(wordSalad.previewWord('COTE')).toEqual({
      verdict: 'already-found',
    });
  });

  it('folds typed input, so accented typing matches its key', () => {
    const wordSalad = build();
    expect(wordSalad.tryWord('côté')).toBe(4);
  });

  it('judges validity and points on the key, not the surface form', () => {
    const wordSalad = build();
    // ÉTÉS folds to ETES: subset of the board, contains T, length 4.
    expect(wordSalad.previewWord('ETES')).toEqual({
      verdict: 'valid',
      points: 1,
    });
    // TÊTES folds to TETES (5 letters): worth 2.
    expect(wordSalad.pointsFor('TÊTES')).toBe(2);
    expect(wordSalad.keyOf('TÊTES')).toBe('TETES');
    expect(wordSalad.wordsMatching('cote')).toEqual([
      'CÔTE',
      'CÔTÉ',
      'COTE',
      'COTÉ',
    ]);
  });

  it('detects pangrams on folded letters', () => {
    // CŒURS folds to COEURS: 6 distinct letters covering the whole board.
    const wordSalad = new WordSalad(
      new Set('CEORSU'),
      'C',
      4,
      ['CŒURS', 'CŒUR'],
      fold,
    );
    expect(wordSalad.pangramWords.has('CŒURS')).toBe(true);
    // Key length 6 - 4 + 1 + pangram bonus 6.
    expect(wordSalad.pointsFor('CŒURS')).toBe(9);
    expect(wordSalad.pointsFor('CŒUR')).toBe(2);
  });
});
