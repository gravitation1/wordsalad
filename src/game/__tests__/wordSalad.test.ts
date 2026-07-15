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
      requiredCharacter: 'T',
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
