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
  | { verdict: 'missing-required'; requiredCharacters: string }
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
  requiredCharacters: string,
  minimumLength: number,
): WordSearchResult {
  const characterSetClass = Array.from(characterSet).join('');
  // A valid word is drawn entirely from the character set and contains every
  // required letter (all of them — a multi-letter requirement is a harder
  // constraint, not a choice among letters).
  const charsetRegex = new RegExp(`^[${characterSetClass}]+$`);
  const required = Array.from(requiredCharacters);
  const validWords = new Set<string>();
  const pangramWords = new Set<string>();

  for (const word of referenceDictionary) {
    if (
      word.length >= minimumLength &&
      charsetRegex.test(word) &&
      required.every((character) => word.includes(character))
    ) {
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
  // The distinct letters every valid word must contain. May be empty: a
  // puzzle with no required letter — any word from the set counts — is a
  // legitimate (easier) game, not a broken one.
  readonly requiredCharacters: string;
  readonly minimumLength: number;
  readonly pangramBonusPoints: number;
  readonly remainingWords: Set<string>;
  readonly pangramWords: ReadonlySet<string>;
  readonly maxPoints: number;
  readonly foundWords = new Map<string, number>();
  currentPoints = 0;

  constructor(
    characterSet: ReadonlySet<string>,
    requiredCharacters: string,
    minimumLength: number,
    referenceDictionary: readonly string[],
  ) {
    // Canonicalize the required letters (distinct, sorted) so "TT" and "IA"
    // collapse to the one set they describe — encodings and keys stay stable.
    const canonicalRequired = Array.from(new Set(requiredCharacters))
      .sort()
      .join('');
    this.characterSet = characterSet;
    this.requiredCharacters = canonicalRequired;
    this.minimumLength = minimumLength;

    if (!isSuperset(characterSet, new Set(canonicalRequired))) {
      throw new WordSaladError(
        'MissingRequiredCharacter',
        'Missing required character!',
      );
    }

    this.pangramBonusPoints = characterSet.size;
    const { validWords, pangramWords } = getWords(
      referenceDictionary,
      characterSet,
      canonicalRequired,
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
    } else if (
      !Array.from(this.requiredCharacters).every((character) =>
        word.includes(character),
      )
    ) {
      return {
        verdict: 'missing-required',
        requiredCharacters: this.requiredCharacters,
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

  // The points a word is worth, whether or not it has been found. Used to
  // value hinted words that were committed but not submitted.
  pointsFor(word: string): number {
    return this.getPointsForWord(word);
  }

  // The shortest word still to be found, for the hint system. Ties resolve
  // to whichever the dictionary yielded first.
  shortestRemainingWord(): string | null {
    let shortest: string | null = null;
    for (const word of this.remainingWords) {
      if (shortest === null || word.length < shortest.length) {
        shortest = word;
      }
    }
    return shortest;
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
