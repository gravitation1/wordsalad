import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { DictionarySpec } from '../dictionaries';
import { DICTIONARIES } from '../dictionaries';
import {
  forcedPrefix,
  gapAdmits,
  liveNextLetters,
  rankedLetters,
  slotPrefixes,
  wordGaps,
  wordListOrder,
} from '../gapPrefixes';
import { WordSalad } from '../wordSalad';

// The screenshot board: letters ANOWCLE, in dictionary order.
const BOARD = rankedLetters('ANOWCLE', 'en');

describe('rankedLetters', () => {
  it('orders letters as the language collates them, not by code point', () => {
    // Ñ files between N and O; its code point would land it after Z.
    expect(rankedLetters('ZAÑON', 'es').join('')).toBe('ANÑOZ');
  });
});

describe('forcedPrefix', () => {
  it('derives the common ground between two found neighbors', () => {
    // Between CACAO and CALL every word starts with CA: deviating from CA
    // would sort outside the gap. The third letter stays open (C, E, or L
    // all fit), so CA is where the derivation must stop.
    expect(
      forcedPrefix({
        alphabet: BOARD,
        lower: 'CACAO',
        upper: 'CALL',
        minimumLength: 4,
      }),
    ).toBe('CA');
  });

  it('forces nothing when the bounds share nothing', () => {
    expect(
      forcedPrefix({
        alphabet: BOARD,
        lower: 'CANAL',
        upper: 'OCEAN',
        minimumLength: 4,
      }),
    ).toBe('');
  });

  it('forces nothing before the first found word on an open board', () => {
    // A word before CACAO could still start with A or C.
    expect(
      forcedPrefix({
        alphabet: BOARD,
        lower: null,
        upper: 'CACAO',
        minimumLength: 4,
      }),
    ).toBe('');
  });

  it('lets the board force letters at the edges of the list', () => {
    // W is the board's last letter, so everything after WOW starts with W —
    // the bound alone would allow X, Y, or Z.
    expect(
      forcedPrefix({
        alphabet: BOARD,
        lower: 'WOW',
        upper: null,
        minimumLength: 4,
      }),
    ).toBe('W');
  });

  it('forces nothing with no bounds at all', () => {
    expect(
      forcedPrefix({
        alphabet: BOARD,
        lower: null,
        upper: null,
        minimumLength: 4,
      }),
    ).toBe('');
  });

  it('climbs along the lower bound when the board blocks every branch', () => {
    // Between CEWW and CLAA: the board has no letter between E and L, and
    // no CL-word of four letters sorts below CLAA — so every word in the
    // gap must extend CEWW itself.
    expect(
      forcedPrefix({
        alphabet: BOARD,
        lower: 'CEWW',
        upper: 'CLAA',
        minimumLength: 4,
      }),
    ).toBe('CEWW');
  });

  it('respects the minimum length when judging what fits', () => {
    // The same gap at minimum length 2 stops forcing after the C: the
    // two-letter word CL now fits below CLAA, so L stays possible.
    expect(
      forcedPrefix({
        alphabet: BOARD,
        lower: 'CEWW',
        upper: 'CLAA',
        minimumLength: 2,
      }),
    ).toBe('C');
  });

  it('stops where the prefix itself could be the word', () => {
    // Strings over {A, B} strictly between A and AAB are AA and AAA. Both
    // start with AA — but only AAA extends further, and claiming the third
    // A would be wrong for AA itself.
    expect(
      forcedPrefix({
        alphabet: ['A', 'B'],
        lower: 'A',
        upper: 'AAB',
        minimumLength: 1,
      }),
    ).toBe('AA');
  });
});

describe('gapAdmits', () => {
  const bounds = {
    alphabet: BOARD,
    lower: 'CACAO',
    upper: 'CALL',
    minimumLength: 4,
  };

  it('admits prefixes some in-gap string could carry', () => {
    expect(gapAdmits(bounds, '')).toBe(true);
    expect(gapAdmits(bounds, 'CA')).toBe(true);
    // CACAOA extends the lower bound itself past it.
    expect(gapAdmits(bounds, 'CAC')).toBe(true);
    // CALA still fits under CALL.
    expect(gapAdmits(bounds, 'CAL')).toBe(true);
  });

  it('rejects prefixes no in-gap string could carry', () => {
    expect(gapAdmits(bounds, 'A')).toBe(false); // sorts below CACAO
    expect(gapAdmits(bounds, 'CAN')).toBe(false); // sorts above CALL
    expect(gapAdmits(bounds, 'CALL')).toBe(false); // nothing fits under CALL
  });
});

describe('liveNextLetters', () => {
  it('aggregates possibility across every gap', () => {
    // After typed CA, the CACAO–CALL gap allows C, E, or L next; the open
    // gap above CALL allows L, N, O, or W. Only A serves neither.
    expect(
      liveNextLetters({
        gaps: [
          { lower: 'CACAO', upper: 'CALL' },
          { lower: 'CALL', upper: null },
        ],
        alphabet: BOARD,
        minimumLength: 4,
        prefix: 'CA',
      }),
    ).toEqual(new Set(['C', 'E', 'L', 'N', 'O', 'W']));
  });

  it('leaves everything live while nothing is found', () => {
    expect(
      liveNextLetters({
        gaps: [{ lower: null, upper: null }],
        alphabet: BOARD,
        minimumLength: 4,
        prefix: '',
      }),
    ).toEqual(new Set(BOARD));
  });

  it('dims everything once no gaps remain', () => {
    expect(
      liveNextLetters({
        gaps: [],
        alphabet: BOARD,
        minimumLength: 4,
        prefix: '',
      }),
    ).toEqual(new Set());
  });
});

describe('wordListOrder', () => {
  it('files words by their play keys', () => {
    const compare = wordListOrder(DICTIONARIES.de);
    // German collation alone would file Bär as if it were Bar (after
    // Bake); the player types BAER, and key order is what the gap
    // derivation can stand behind.
    expect(['Bär', 'Bake', 'Bad'].sort(compare)).toEqual([
      'Bad',
      'Bär',
      'Bake',
    ]);
  });

  it('breaks ties among equal keys with the collation', () => {
    const compare = wordListOrder(DICTIONARIES.fr);
    // cote and côte share the key COTE: they stay adjacent (before
    // COTEAU), ordered as French expects.
    expect(['coteau', 'côte', 'cote'].sort(compare)).toEqual([
      'cote',
      'côte',
      'coteau',
    ]);
  });

  it('files Ñ between N and O', () => {
    const compare = wordListOrder(DICTIONARIES.es);
    expect(['APO', 'AÑO', 'ANO'].sort(compare)).toEqual(['ANO', 'AÑO', 'APO']);
  });
});

describe('slotPrefixes', () => {
  // The screenshot's neighborhood: CAECAL sits alone between CACAO and
  // CALL; CANAL and OCEAN trail after.
  const words = ['CACAO', 'CAECAL', 'CALL', 'CANAL', 'OCEAN'];
  const options = {
    words,
    keyOf: (word: string) => word,
    alphabet: BOARD,
    minimumLength: 4,
  };

  it('gives every unfound word in a gap the gap prefix', () => {
    const found = new Set(['CACAO', 'CALL']);
    expect(
      slotPrefixes({ ...options, isFound: (word) => found.has(word) }),
    ).toEqual(['', 'CA', '', '', '']);
  });

  it('tightens the prefixes as finds split the gaps', () => {
    const found = new Set(['CACAO', 'CALL', 'CANAL']);
    // CAECAL keeps its CA; after CANAL the list stays open (any letter
    // from C up could still start the last words).
    expect(
      slotPrefixes({ ...options, isFound: (word) => found.has(word) }),
    ).toEqual(['', 'CA', '', '', '']);
  });

  it('shows nothing before the first find', () => {
    expect(slotPrefixes({ ...options, isFound: () => false })).toEqual([
      '',
      '',
      '',
      '',
      '',
    ]);
  });

  it('shows nothing once everything is found', () => {
    expect(slotPrefixes({ ...options, isFound: () => true })).toEqual([
      '',
      '',
      '',
      '',
      '',
    ]);
  });
});

// The soundness property the whole feature rests on: whatever prefix a gap
// shows, every word actually hiding in that gap starts with it — across
// dictionaries (accents, umlaut expansion, Ñ) and any pattern of finds.
describe('slotPrefixes on real dictionaries', () => {
  const loadWords = (id: string): string[] =>
    readFileSync(`public/dictionaries/${id}.txt`, 'utf8')
      .split('\n')
      .filter(Boolean);

  // Deterministic pseudo-randomness: the trials must replay identically.
  const lcg = (seed: number) => {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  };

  const boards: {
    spec: DictionarySpec;
    letters: string;
    required: string;
  }[] = [
    { spec: DICTIONARIES.en, letters: 'WORDTES', required: 'T' },
    // Rich in accented surface forms (ACCOTÉ, CÔTE, ...).
    { spec: DICTIONARIES.fr, letters: 'COTERAU', required: '' },
    // Umlaut expansion: Bär plays as BAER, Bürde as BUERDE.
    { spec: DICTIONARIES.de, letters: 'BAERKDU', required: '' },
    // Ñ as its own letter, ranked between N and O.
    { spec: DICTIONARIES.es, letters: 'CANOSERÑ', required: 'Ñ' },
  ];

  const setupBoard = ({ spec, letters, required }: (typeof boards)[number]) => {
    const wordSalad = new WordSalad(
      new Set(letters),
      required,
      4,
      loadWords(spec.id),
      spec.fold,
    );
    const words = [...wordSalad.remainingWords].sort(wordListOrder(spec));
    const alphabet = rankedLetters(wordSalad.characterSet, spec.lang);

    // Finds land in key groups (côte and cote arrive together), so the
    // trials must too: a found word can then never share a key with an
    // unfound neighbor, which is what makes the gap bounds strict.
    const groups = new Map<string, string[]>();
    for (const word of words) {
      const key = wordSalad.keyOf(word);
      groups.set(key, [...(groups.get(key) ?? []), word]);
    }
    const randomFound = (random: () => number): ReadonlySet<string> => {
      const found = new Set<string>();
      for (const group of groups.values()) {
        if (random() < 0.4) {
          for (const word of group) {
            found.add(word);
          }
        }
      }
      return found;
    };
    return { wordSalad, words, alphabet, randomFound };
  };

  it.each(boards)(
    'never claims a letter an unfound word lacks ($spec.id)',
    (board) => {
      const { wordSalad, words, alphabet, randomFound } = setupBoard(board);
      const random = lcg(42);
      for (let trial = 0; trial < 25; trial++) {
        const found = randomFound(random);
        const prefixes = slotPrefixes({
          words,
          isFound: (word) => found.has(word),
          keyOf: (word) => wordSalad.keyOf(word),
          alphabet,
          minimumLength: wordSalad.minimumLength,
        });
        words.forEach((word, index) => {
          if (found.has(word)) {
            expect(prefixes[index]).toBe('');
          } else {
            expect(wordSalad.keyOf(word).startsWith(prefixes[index])).toBe(
              true,
            );
          }
        });
      }
    },
  );

  it.each(boards)(
    'never dims a letter an unfound word needs next ($spec.id)',
    (board) => {
      const { wordSalad, words, alphabet, randomFound } = setupBoard(board);
      const random = lcg(7);
      for (let trial = 0; trial < 10; trial++) {
        const found = randomFound(random);
        const gaps = wordGaps({
          words,
          isFound: (word) => found.has(word),
          keyOf: (word) => wordSalad.keyOf(word),
        });
        // Walk a spread of unfound words letter by letter: at every
        // position, the word's actual next letter must be live.
        const unfound = words.filter((word) => !found.has(word));
        const stride = Math.max(1, Math.floor(unfound.length / 5));
        const sample = unfound
          .filter((_, index) => index % stride === 0)
          .slice(0, 5);
        for (const word of sample) {
          const key = wordSalad.keyOf(word);
          for (let position = 0; position < key.length; position++) {
            const live = liveNextLetters({
              gaps,
              alphabet,
              minimumLength: wordSalad.minimumLength,
              prefix: key.slice(0, position),
            });
            expect(live.has(key[position])).toBe(true);
          }
        }
      }
    },
  );
});
