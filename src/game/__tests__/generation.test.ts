import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
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
const REAL_DICTIONARY = readFileSync('public/dictionary.txt', 'utf8')
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
    expect(() => randomCharacterString(2)).toThrowError(
      'Character set size too small!',
    );
  });

  it('rejects sizes above the maximum', () => {
    expect(() => randomCharacterString(27)).toThrowError(
      'Character set size too large!',
    );
  });
});

describe('storeWordSalad and loadWordSalad', () => {
  it('round-trips a game through the location hash format', () => {
    const original = new WordSalad(new Set('WORDTES'), 'T', 4, DICTIONARY);
    const stored = storeWordSalad(original);
    expect(stored).toBe('WORDTES.T.4');

    const loaded = loadWordSalad(DICTIONARY, `#${stored}`);
    expect(loaded.characterSet).toEqual(original.characterSet);
    expect(loaded.requiredCharacter).toBe('T');
    expect(loaded.minimumLength).toBe(4);
    expect(loaded.remainingWords).toEqual(original.remainingWords);
    expect(storeWordSalad(loaded)).toBe(stored);
  });

  it('rejects a hash with the wrong number of pieces', () => {
    expect(() => loadWordSalad(DICTIONARY, '#WORDTES')).toThrowError(
      'Invalid game data!',
    );
    expect(() => loadWordSalad(DICTIONARY, '#WORDTES.T')).toThrowError(
      'Invalid game data!',
    );
    expect(() => loadWordSalad(DICTIONARY, '#WORDTES.T.4.9')).toThrowError(
      'Invalid game data!',
    );
  });

  it('normalizes a lowercase hash', () => {
    const loaded = loadWordSalad(DICTIONARY, '#wordtes.t.4');
    expect(storeWordSalad(loaded)).toBe('WORDTES.T.4');
  });

  it('rejects malformed hash pieces', () => {
    const malformed = [
      '#WOR^TES.T.4', // non-alphabetic character in the set
      '#WORDTES.TT.4', // multi-letter required character
      '#WORDTES.7.4', // non-alphabetic required character
      '#WORDTES.T.0', // minimum length below 1
      '#WORDTES.T.-5', // negative minimum length
      '#WORDTES.T.4abc', // non-numeric minimum length
      '#WORDTES.T.', // empty minimum length
    ];
    for (const hash of malformed) {
      expect(() => loadWordSalad(DICTIONARY, hash)).toThrowError(
        'Invalid game data!',
      );
    }
  });

  it('rejects a hash whose required character is not in the set', () => {
    expect(() => loadWordSalad(DICTIONARY, '#WORDES.T.4')).toThrowError(
      'Missing required character!',
    );
  });

  it('rejects a hash with no valid words', () => {
    expect(() => loadWordSalad(DICTIONARY, '#XYZQJKV.X.4')).toThrowError(
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
        expect(wordSalad.characterSet.has(wordSalad.requiredCharacter)).toBe(
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
});

describe('generateWordSalad', () => {
  it('generates a game with a pangram and 15 to 60 words', () => {
    const wordSalad = generateWordSalad(REAL_DICTIONARY);
    expect(wordSalad.pangramWords.size).toBeGreaterThan(0);
    expect(wordSalad.remainingWords.size).toBeGreaterThanOrEqual(15);
    expect(wordSalad.remainingWords.size).toBeLessThanOrEqual(60);
  });

  it('gives up after too many failed attempts', () => {
    expect(() => generateWordSalad([])).toThrowError(
      'Failed to generate a game!',
    );
  });
});
