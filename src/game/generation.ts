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

export function newRandomWordSalad(
  validWordList: readonly string[],
): WordSalad {
  const validCharacters = randomCharacterString(GAME_CHARACTER_SET_SIZE);
  return new WordSalad(
    new Set(validCharacters),
    validCharacters[0],
    GAME_MINIMUM_WORD_LENGTH,
    validWordList,
  );
}

// Keep regenerating a WordSalad until we have one that has at least one
// pangram, and has between 15 and 60 words.
export function generateWordSalad(validWordList: readonly string[]): WordSalad {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; ++attempt) {
    let wordSalad: WordSalad;
    try {
      wordSalad = newRandomWordSalad(validWordList);
    } catch (error) {
      if (error instanceof WordSaladError && error.name === 'NoValidWords') {
        continue;
      }
      throw error;
    }

    if (
      wordSalad.pangramWords.size > 0 &&
      wordSalad.remainingWords.size >= 15 &&
      wordSalad.remainingWords.size <= 60
    ) {
      return wordSalad;
    }
  }

  throw new WordSaladError('GenerationFailed', 'Failed to generate a game!');
}

export function storeWordSalad(wordSalad: WordSalad): string {
  return (
    Array.from(wordSalad.characterSet).join('') +
    '.' +
    wordSalad.requiredCharacter +
    '.' +
    String(wordSalad.minimumLength)
  );
}

export function loadWordSalad(
  validWordList: readonly string[],
  locationHash: string,
): WordSalad {
  const pieces = locationHash.split('.');

  if (pieces.length !== 3) {
    throw new WordSaladError('InvalidGameData', 'Invalid game data!');
  }

  const validCharacters = pieces[0].slice(1).toUpperCase();
  const requiredCharacter = pieces[1].toUpperCase();
  const minimumWordLength = Number(pieces[2]);

  if (
    !/^[A-Z]+$/.test(validCharacters) ||
    !/^[A-Z]$/.test(requiredCharacter) ||
    !Number.isInteger(minimumWordLength) ||
    minimumWordLength < 1
  ) {
    throw new WordSaladError('InvalidGameData', 'Invalid game data!');
  }

  return new WordSalad(
    new Set(validCharacters),
    requiredCharacter,
    minimumWordLength,
    validWordList,
  );
}
