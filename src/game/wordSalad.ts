import { WordSaladError } from './errors';

function isSuperset(
  set: ReadonlySet<string>,
  subset: ReadonlySet<string>,
): boolean {
  for (const element of subset) {
    if (!set.has(element)) {
      return false;
    }
  }
  return true;
}

export type WordPreview =
  | { verdict: 'already-found' }
  | { verdict: 'invalid-letters' }
  | { verdict: 'missing-required'; requiredCharacter: string }
  | { verdict: 'not-a-word' }
  | { verdict: 'too-short' }
  | { verdict: 'valid'; points: number };

interface WordSearchResult {
  validWords: Set<string>;
  pangramWords: Set<string>;
}

function getWords(
  referenceDictionary: readonly string[],
  characterSet: ReadonlySet<string>,
  requiredCharacter: string,
  minimumLength: number,
): WordSearchResult {
  const characterSetClass = Array.from(characterSet).join('');
  const regex = new RegExp(
    `^[${characterSetClass}]*${requiredCharacter}+[${characterSetClass}]*$`,
  );
  const validWords = new Set<string>();
  const pangramWords = new Set<string>();

  for (const word of referenceDictionary) {
    if (regex.test(word) && word.length >= minimumLength) {
      validWords.add(word);

      if (new Set(word).size === characterSet.size) {
        pangramWords.add(word);
      }
    }
  }

  if (validWords.size === 0) {
    throw new WordSaladError('NoValidWords', 'No valid words!');
  }

  return { validWords, pangramWords };
}

export class WordSalad {
  readonly characterSet: ReadonlySet<string>;
  readonly requiredCharacter: string;
  readonly minimumLength: number;
  readonly pangramBonusPoints: number;
  readonly remainingWords: Set<string>;
  readonly pangramWords: ReadonlySet<string>;
  readonly maxPoints: number;
  readonly foundWords = new Map<string, number>();
  currentPoints = 0;

  constructor(
    characterSet: ReadonlySet<string>,
    requiredCharacter: string,
    minimumLength: number,
    referenceDictionary: readonly string[],
  ) {
    this.characterSet = characterSet;
    this.requiredCharacter = requiredCharacter;
    this.minimumLength = minimumLength;

    if (!characterSet.has(requiredCharacter)) {
      throw new WordSaladError(
        'MissingRequiredCharacter',
        'Missing required character!',
      );
    }

    this.pangramBonusPoints = characterSet.size;
    const { validWords, pangramWords } = getWords(
      referenceDictionary,
      characterSet,
      requiredCharacter,
      minimumLength,
    );
    this.remainingWords = validWords;
    this.pangramWords = pangramWords;
    this.maxPoints = Array.from(this.remainingWords)
      .map((word) => this.getPointsForWord(word))
      .reduce((accumulator, points) => accumulator + points, 0);
  }

  // Classify a word without mutating any game state, mirroring the checks
  // (and check order) that tryWord enforces.
  previewWord(word: string): WordPreview {
    if (this.foundWords.has(word)) {
      return { verdict: 'already-found' };
    } else if (word.length < this.minimumLength) {
      return { verdict: 'too-short' };
    } else if (!word.includes(this.requiredCharacter)) {
      return {
        verdict: 'missing-required',
        requiredCharacter: this.requiredCharacter,
      };
    } else if (!isSuperset(this.characterSet, new Set(word))) {
      return { verdict: 'invalid-letters' };
    } else if (!this.remainingWords.has(word)) {
      return { verdict: 'not-a-word' };
    }
    return { verdict: 'valid', points: this.getPointsForWord(word) };
  }

  tryWord(word: string): number {
    const { verdict } = this.previewWord(word);

    if (verdict === 'already-found') {
      throw new WordSaladError('AlreadyFound', `${word} was already found!`);
    } else if (verdict === 'too-short') {
      throw new WordSaladError('TooShort', `${word} is too short!`);
    } else if (verdict === 'missing-required') {
      throw new WordSaladError(
        'MissingRequiredCharacter',
        `${word} is missing required character!`,
      );
    } else if (verdict === 'invalid-letters') {
      throw new WordSaladError(
        'InvalidWordLetters',
        `${word} has invalid letters!`,
      );
    } else if (verdict === 'not-a-word') {
      throw new WordSaladError('NotFound', `${word} was not found!`);
    }
    return this.handleValidWord(word);
  }

  private handleValidWord(word: string): number {
    const points = this.getPointsForWord(word);
    this.foundWords.set(word, points);
    this.remainingWords.delete(word);
    this.currentPoints = this.currentPoints + points;
    return points;
  }

  private getPointsForWord(word: string): number {
    let points = word.length - this.minimumLength + 1;

    if (this.pangramWords.has(word)) {
      points = points + this.pangramBonusPoints;
    }

    return points;
  }
}
