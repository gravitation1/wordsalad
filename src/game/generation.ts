import { WordSaladError } from './errors';
import { WordSalad } from './wordSalad';

const MINIMUM_SET_SIZE = 3;
const MAXIMUM_SET_SIZE = 26;
const GAME_CHARACTER_SET_SIZE = 7;
const GAME_MINIMUM_WORD_LENGTH = 4;
const MAX_GENERATION_ATTEMPTS = 1000;

export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function randomCharacterString(length: number): string {
  if (length < MINIMUM_SET_SIZE) {
    throw new WordSaladError(
      'CharacterSetTooSmall',
      'Character set size too small!',
    );
  } else if (length > MAXIMUM_SET_SIZE) {
    throw new WordSaladError(
      'CharacterSetTooLarge',
      'Character set size too large!',
    );
  }

  const vowels = shuffled([...'AEIOU'])
    .slice(0, Math.ceil(length / 5))
    .join('');
  const consonants = shuffled([...'BCDFGHJKLMNPQRSTVWXYZ'])
    .slice(0, length - vowels.length)
    .join('');
  return shuffled([...(vowels + consonants)]).join('');
}

// The curated word-count band a generated game falls into unless a caller
// asks for a different range.
const DEFAULT_MIN_WORDS = 15;
const DEFAULT_MAX_WORDS = 60;

// Levers a caller can pin; anything omitted takes its default (the minimum
// length, the word-count band, requiring a pangram) or is chosen from the
// generated set (the required letter).
export interface GenerationConstraints {
  minimumLength?: number;
  // Distinct letters every valid word must contain. Omit to let the
  // generator pick one; pass '' for a puzzle with no required letter.
  requiredCharacters?: string;
  minWords?: number;
  maxWords?: number;
  requirePangram?: boolean;
}

export function newRandomWordSalad(
  validWordList: readonly string[],
  { minimumLength, requiredCharacters }: GenerationConstraints = {},
): WordSalad {
  const required = requiredCharacters ?? '';
  const characters = randomCharacterString(GAME_CHARACTER_SET_SIZE);
  // Force every pinned required letter into the set; the displaced letters
  // keep the set at seven distinct characters.
  const kept = Array.from(characters).filter(
    (character) => !required.includes(character),
  );
  const validCharacters =
    required.length === 0
      ? characters
      : (required + kept.join('')).slice(0, GAME_CHARACTER_SET_SIZE);
  // Unspecified means "pick one for me"; an explicit '' means none at all.
  const chosen =
    requiredCharacters === undefined ? validCharacters[0] : requiredCharacters;
  return new WordSalad(
    new Set(validCharacters),
    chosen,
    minimumLength ?? GAME_MINIMUM_WORD_LENGTH,
    validWordList,
  );
}

// The exact pool of pangram-capable character sets: the distinct-letter set
// of every word long enough to play that uses exactly `size` letters, deduped.
// Filtered to sets containing all the required letters, since a pangram (which
// uses every charset letter) must contain them too.
function pangramSignatures(
  validWordList: readonly string[],
  size: number,
  minimumLength: number,
  requiredCharacters: string,
): string[] {
  const required = Array.from(requiredCharacters);
  const seen = new Set<string>();
  const signatures: string[] = [];
  for (const word of validWordList) {
    if (word.length < minimumLength) {
      continue;
    }
    const distinct = new Set(word);
    if (distinct.size !== size) {
      continue;
    }
    const signature = Array.from(distinct).sort().join('');
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    if (required.every((character) => signature.includes(character))) {
      signatures.push(signature);
    }
  }
  return signatures;
}

// Generate a game inside the word-count band (default 15–60), respecting the
// pinned levers. When a pangram is required (the default), the charset is
// drawn from the exact pool of pangram-capable sets — no rejection sampling,
// so even tight required-letter constraints resolve reliably. Otherwise a
// random board is sampled. Either way, the closest-to-band puzzle found is
// kept as a fallback so narrow or sparse requests still land on a game.
export function generateWordSalad(
  validWordList: readonly string[],
  constraints: GenerationConstraints = {},
): WordSalad {
  const minimumLength = constraints.minimumLength ?? GAME_MINIMUM_WORD_LENGTH;
  const requiredCharacters = constraints.requiredCharacters;
  const requiredLetters = requiredCharacters ?? '';
  const minWords = constraints.minWords ?? DEFAULT_MIN_WORDS;
  const maxWords = constraints.maxWords ?? DEFAULT_MAX_WORDS;
  const requirePangram = constraints.requirePangram ?? true;

  // More required letters than a board can hold can never be satisfied.
  if (requiredLetters.length > GAME_CHARACTER_SET_SIZE) {
    throw new WordSaladError('GenerationFailed', 'Failed to generate a game!');
  }

  // The unconstrained daily game is curated-or-fail; an explicit custom
  // request (any lever pinned) keeps the closest-to-band puzzle as a fallback
  // so tight or sparse settings still resolve to a game.
  const constrained = Object.keys(constraints).length > 0;
  const midpoint = (minWords + maxWords) / 2;
  let fallback: WordSalad | null = null;
  let fallbackScore = -Infinity;
  const consider = (wordSalad: WordSalad): WordSalad | null => {
    const wordCount = wordSalad.remainingWords.size;
    if (wordCount >= minWords && wordCount <= maxWords) {
      return wordSalad;
    }
    if (constrained) {
      const score = -Math.abs(wordCount - midpoint);
      if (score > fallbackScore) {
        fallbackScore = score;
        fallback = wordSalad;
      }
    }
    return null;
  };

  if (requirePangram) {
    const signatures = shuffled(
      pangramSignatures(
        validWordList,
        GAME_CHARACTER_SET_SIZE,
        minimumLength,
        requiredLetters,
      ),
    );
    for (const signature of signatures) {
      const required =
        requiredCharacters === undefined
          ? shuffled(Array.from(signature))[0]
          : requiredCharacters;
      const wordSalad = new WordSalad(
        new Set(signature),
        required,
        minimumLength,
        validWordList,
      );
      const accepted = consider(wordSalad);
      if (accepted !== null) {
        return accepted;
      }
    }
  } else {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; ++attempt) {
      let wordSalad: WordSalad;
      try {
        wordSalad = newRandomWordSalad(validWordList, {
          minimumLength,
          requiredCharacters,
        });
      } catch (error) {
        if (error instanceof WordSaladError && error.name === 'NoValidWords') {
          continue;
        }
        throw error;
      }
      const accepted = consider(wordSalad);
      if (accepted !== null) {
        return accepted;
      }
    }
  }

  if (fallback !== null) {
    return fallback;
  }
  throw new WordSaladError('GenerationFailed', 'Failed to generate a game!');
}

// The required letter for a hand-specified charset when the URL omits one:
// the letter that makes the most valid words, so the puzzle is as rich as
// the letters allow. Throws NoValidWords if no letter yields any word.
export function bestRequiredCharacter(
  validWordList: readonly string[],
  characters: string,
  minimumLength: number,
): string {
  const characterSet = new Set(characters);
  let best: string | null = null;
  let bestCount = 0;
  for (const candidate of characterSet) {
    try {
      const wordSalad = new WordSalad(
        characterSet,
        candidate,
        minimumLength,
        validWordList,
      );
      if (wordSalad.remainingWords.size > bestCount) {
        bestCount = wordSalad.remainingWords.size;
        best = candidate;
      }
    } catch (error) {
      if (error instanceof WordSaladError && error.name === 'NoValidWords') {
        continue;
      }
      throw error;
    }
  }
  if (best === null) {
    throw new WordSaladError('NoValidWords', 'No valid words!');
  }
  return best;
}

export function storeWordSalad(wordSalad: WordSalad): string {
  // The letters sort so every ordering of the same charset produces one
  // canonical encoding — shared URLs, storage keys, and history entries all
  // agree on game identity (and a hand-typed URL no longer spells out the
  // pangram it was built from).
  return (
    Array.from(wordSalad.characterSet).sort().join('') +
    '.' +
    Array.from(wordSalad.requiredCharacters).sort().join('') +
    '.' +
    String(wordSalad.minimumLength)
  );
}

// Parses the exact encoding storeWordSalad produces (CHARACTERS.REQUIRED.MIN);
// the REQUIRED piece is empty for a puzzle with no required letter.
export function loadWordSalad(
  validWordList: readonly string[],
  encodedGame: string,
): WordSalad {
  const pieces = encodedGame.split('.');

  if (pieces.length !== 3) {
    throw new WordSaladError('InvalidGameData', 'Invalid game data!');
  }

  const validCharacters = pieces[0].toUpperCase();
  const requiredCharacters = pieces[1].toUpperCase();
  const minimumWordLength = Number(pieces[2]);

  if (
    !/^[A-Z]+$/.test(validCharacters) ||
    !/^[A-Z]*$/.test(requiredCharacters) ||
    !Number.isInteger(minimumWordLength) ||
    minimumWordLength < 1
  ) {
    throw new WordSaladError('InvalidGameData', 'Invalid game data!');
  }

  return new WordSalad(
    new Set(validCharacters),
    requiredCharacters,
    minimumWordLength,
    validWordList,
  );
}
