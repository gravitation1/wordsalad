import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  bestRequiredCharacter,
  generateWordSalad,
  loadWordSalad,
  newRandomWordSalad,
  randomCharacterString,
  shuffled,
  storeWordSalad,
} from '../generation';
import { WordSalad } from '../wordSalad';

const DICTIONARY = ['TEST', 'ROTTED', 'WORSTED', 'WORD', 'REDO', 'ABLE'];

// Vitest runs with the project root as the working directory.
const REAL_DICTIONARY = readFileSync('public/dictionaries/en.txt', 'utf8')
  .split('\n')
  .filter((word) => word.length > 0);

describe('shuffled', () => {
  it('preserves the items', () => {
    const items = ['A', 'B', 'C', 'D', 'E'];
    const result = shuffled(items);
    expect(result).toHaveLength(items.length);
    expect(new Set(result)).toEqual(new Set(items));
    // The input must not be mutated.
    expect(items).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});

describe('randomCharacterString', () => {
  it('produces unique uppercase letters with at least one vowel', () => {
    for (let i = 0; i < 25; ++i) {
      const characters = randomCharacterString(7);
      expect(characters).toMatch(/^[A-Z]{7}$/);
      expect(new Set(characters).size).toBe(7);
      expect(characters).toMatch(/[AEIOU]/);
    }
  });

  it('supports the minimum and maximum sizes', () => {
    expect(new Set(randomCharacterString(3)).size).toBe(3);
    expect(new Set(randomCharacterString(26)).size).toBe(26);
  });

  it('rejects sizes below the minimum', () => {
    expect(() => randomCharacterString(2)).toThrow(
      'Character set size too small!',
    );
  });

  it('rejects sizes above the maximum', () => {
    expect(() => randomCharacterString(27)).toThrow(
      'Character set size too large!',
    );
  });
});

describe('storeWordSalad and loadWordSalad', () => {
  it('round-trips a game through its encoded form', () => {
    const original = new WordSalad(new Set('WORDTES'), 'T', 4, DICTIONARY);
    const stored = storeWordSalad(original);
    expect(stored).toBe('DEORSTW.T.4');

    const loaded = loadWordSalad(DICTIONARY, stored);
    expect(loaded.characterSet).toEqual(original.characterSet);
    expect(loaded.requiredCharacters).toBe('T');
    expect(loaded.minimumLength).toBe(4);
    expect(loaded.remainingWords).toEqual(original.remainingWords);
    expect(storeWordSalad(loaded)).toBe(stored);
  });

  it('rejects an encoding with the wrong number of pieces', () => {
    expect(() => loadWordSalad(DICTIONARY, 'WORDTES')).toThrow(
      'Invalid game data!',
    );
    expect(() => loadWordSalad(DICTIONARY, 'WORDTES.T')).toThrow(
      'Invalid game data!',
    );
    expect(() => loadWordSalad(DICTIONARY, 'WORDTES.T.4.9')).toThrow(
      'Invalid game data!',
    );
  });

  it('normalizes a lowercase encoding', () => {
    const loaded = loadWordSalad(DICTIONARY, 'wordtes.t.4');
    expect(storeWordSalad(loaded)).toBe('DEORSTW.T.4');
  });

  it('rejects malformed encoding pieces', () => {
    const malformed = [
      'WOR^TES.T.4', // non-alphabetic character in the set
      'WORDTES.7.4', // non-alphabetic required character
      'WORDTES.T.0', // minimum length below 1
      'WORDTES.T.-5', // negative minimum length
      'WORDTES.T.4abc', // non-numeric minimum length
      'WORDTES.T.', // empty minimum length
    ];
    for (const encoded of malformed) {
      expect(() => loadWordSalad(DICTIONARY, encoded)).toThrow(
        'Invalid game data!',
      );
    }
  });

  it('round-trips a multi-letter required set, canonicalized', () => {
    // Valid words must contain both R and T (ROTTED, WORSTED); the required
    // set is stored distinct and sorted, so "TR" encodes as "RT".
    const loaded = loadWordSalad(DICTIONARY, 'WORDTES.TR.4');
    expect(loaded.requiredCharacters).toBe('RT');
    expect(loaded.remainingWords).toEqual(new Set(['ROTTED', 'WORSTED']));
    expect(storeWordSalad(loaded)).toBe('DEORSTW.RT.4');
  });

  it('rejects an encoding whose required character is not in the set', () => {
    expect(() => loadWordSalad(DICTIONARY, 'WORDES.T.4')).toThrow(
      'Missing required character!',
    );
  });

  it('rejects an encoding requiring a letter outside the set', () => {
    // R is present but Z is not; every required letter must be in the set.
    expect(() => loadWordSalad(DICTIONARY, 'WORDTES.RZ.4')).toThrow(
      'Missing required character!',
    );
  });

  it('rejects a hash with no valid words', () => {
    expect(() => loadWordSalad(DICTIONARY, 'XYZQJKV.X.4')).toThrow(
      'No valid words!',
    );
  });
});

describe('the dictionary asset', () => {
  it('contains only unhyphenated uppercase words', () => {
    expect(REAL_DICTIONARY.every((word) => /^[A-Z]+$/.test(word))).toBe(true);
  });
});

describe('newRandomWordSalad', () => {
  it('uses seven characters with the first as the required character', () => {
    // Retry: a random character set may produce no valid words at all.
    for (let attempt = 0; ; ++attempt) {
      try {
        const wordSalad = newRandomWordSalad(REAL_DICTIONARY);
        expect(wordSalad.characterSet.size).toBe(7);
        expect(wordSalad.characterSet.has(wordSalad.requiredCharacters)).toBe(
          true,
        );
        expect(wordSalad.minimumLength).toBe(4);
        return;
      } catch (error) {
        if (attempt > 100) {
          throw error;
        }
      }
    }
  });

  it('honors a pinned required letter and minimum length', () => {
    for (let attempt = 0; ; ++attempt) {
      try {
        const wordSalad = newRandomWordSalad(REAL_DICTIONARY, {
          minimumLength: 5,
          requiredCharacters: 'A',
        });
        expect(wordSalad.characterSet.size).toBe(7);
        expect(wordSalad.characterSet.has('A')).toBe(true);
        expect(wordSalad.requiredCharacters).toBe('A');
        expect(wordSalad.minimumLength).toBe(5);
        return;
      } catch (error) {
        if (attempt > 100) {
          throw error;
        }
      }
    }
  });
});

describe('generateWordSalad', () => {
  it('generates a game with a pangram and 30 to 80 words', () => {
    const wordSalad = generateWordSalad(REAL_DICTIONARY);
    expect(wordSalad.pangramWords.size).toBeGreaterThan(0);
    expect(wordSalad.remainingWords.size).toBeGreaterThanOrEqual(30);
    expect(wordSalad.remainingWords.size).toBeLessThanOrEqual(80);
  });

  it('generates around a pinned required letter', () => {
    const wordSalad = generateWordSalad(REAL_DICTIONARY, {
      requiredCharacters: 'A',
    });
    expect(wordSalad.characterSet.has('A')).toBe(true);
    expect(wordSalad.requiredCharacters).toBe('A');
    expect(wordSalad.remainingWords.size).toBeGreaterThan(0);
  });

  it('accepts a small minimum length via best-effort fallback', () => {
    // min=2 blows past the 80-word ceiling, so no puzzle meets the curated
    // band; the best valid one is returned anyway.
    const wordSalad = generateWordSalad(REAL_DICTIONARY, { minimumLength: 2 });
    expect(wordSalad.minimumLength).toBe(2);
    expect(wordSalad.remainingWords.size).toBeGreaterThan(0);
  });

  it('honors a custom word-count band', () => {
    const wordSalad = generateWordSalad(REAL_DICTIONARY, {
      minWords: 20,
      maxWords: 25,
    });
    expect(wordSalad.remainingWords.size).toBeGreaterThanOrEqual(20);
    expect(wordSalad.remainingWords.size).toBeLessThanOrEqual(25);
    expect(wordSalad.pangramWords.size).toBeGreaterThan(0);
  });

  it('generates around multiple required letters (pangram-seeded)', () => {
    const wordSalad = generateWordSalad(REAL_DICTIONARY, {
      requiredCharacters: 'IN',
    });
    expect(wordSalad.characterSet.has('I')).toBe(true);
    expect(wordSalad.characterSet.has('N')).toBe(true);
    expect(wordSalad.requiredCharacters).toBe('IN');
    // A pangram is present (this is the pangram-seeded path) and contains
    // every required letter, so all required letters are in the set.
    expect(wordSalad.pangramWords.size).toBeGreaterThan(0);
    for (const word of wordSalad.remainingWords) {
      expect(word.includes('I') && word.includes('N')).toBe(true);
    }
  });

  it('can drop the pangram requirement', () => {
    // Without the pangram requirement the game need not contain one; assert
    // it still generates a valid board inside the band.
    const wordSalad = generateWordSalad(REAL_DICTIONARY, {
      requirePangram: false,
    });
    expect(wordSalad.remainingWords.size).toBeGreaterThanOrEqual(30);
    expect(wordSalad.remainingWords.size).toBeLessThanOrEqual(80);
  });

  it('fails when more letters are required than a board holds', () => {
    expect(() =>
      generateWordSalad(REAL_DICTIONARY, { requiredCharacters: 'ABCDEFGH' }),
    ).toThrow('Failed to generate a game!');
  });

  it('gives up after too many failed attempts', () => {
    expect(() => generateWordSalad([])).toThrow('Failed to generate a game!');
  });
});

describe('bestRequiredCharacter', () => {
  it('picks the letter that makes the most words', () => {
    // Within WORDTES, O, R, D and E each reach four words; O comes first.
    expect(bestRequiredCharacter(DICTIONARY, 'WORDTES', 4)).toBe('O');
  });

  it('respects the minimum length when scoring letters', () => {
    // At length 6 only ROTTED and WORSTED qualify; O still leads.
    expect(bestRequiredCharacter(DICTIONARY, 'WORDTES', 6)).toBe('O');
  });

  it('throws when no letter yields any word', () => {
    expect(() => bestRequiredCharacter(DICTIONARY, 'XYZQJKV', 4)).toThrow(
      'No valid words!',
    );
  });
});
