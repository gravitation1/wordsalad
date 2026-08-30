import { describe, expect, it } from 'vitest';

import { DICTIONARIES } from '../dictionaries';
import { parseGameKey, puzzleSearchParams, storageKey } from '../gameKey';
import { WordSalad } from '../wordSalad';

const DICTIONARY = ['TEST', 'ROTTED', 'WORSTED', 'WORD'];

describe('storageKey', () => {
  it('encodes the puzzle bare for English and prefixed for other lists', () => {
    const salad = new WordSalad(new Set('WORDTES'), 'T', 4, DICTIONARY);
    expect(storageKey(DICTIONARIES.en, salad)).toBe('DEORSTW.T.4');
    expect(storageKey(DICTIONARIES.fr, salad)).toBe('fr:DEORSTW.T.4');
  });
});

describe('parseGameKey', () => {
  it('inverts storageKey', () => {
    expect(parseGameKey('DEORSTW.T.4')).toEqual({
      dict: null,
      letters: 'DEORSTW',
      requiredCharacters: 'T',
      minimumLength: '4',
    });
    expect(parseGameKey('fr:ACEIRST..5')).toEqual({
      dict: 'fr',
      letters: 'ACEIRST',
      requiredCharacters: '',
      minimumLength: '5',
    });
  });

  it.each(['', 'garbage', 'DEORSTW.T', 'DEORSTW.T.4.1', '.T.4', 'DEORSTW.T.x'])(
    'rejects %j',
    (key) => {
      expect(parseGameKey(key)).toBeNull();
    },
  );
});

describe('puzzleSearchParams', () => {
  it('builds the app query string, min implicit at its default', () => {
    expect(puzzleSearchParams('DEORSTW.T.4', null)?.toString()).toBe(
      'letters=DEORSTW&required=T',
    );
    expect(puzzleSearchParams('fr:ACEIRST.A.5', 'de')?.toString()).toBe(
      'lang=de&dict=fr&letters=ACEIRST&required=A&min=5',
    );
  });

  it('is null for a key that does not parse', () => {
    expect(puzzleSearchParams('garbage', null)).toBeNull();
  });
});
