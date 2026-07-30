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

// English's fold: play keys are the words themselves.
const identityFold = (text: string) => text.toUpperCase();

interface WordSearchResult {
  validWords: Set<string>;
  pangramWords: Set<string>;
  wordsByKey: Map<string, string[]>;
}

function getWords(
  referenceDictionary: readonly string[],
  characterSet: ReadonlySet<string>,
  requiredCharacters: string,
  minimumLength: number,
  fold: (text: string) => string,
): WordSearchResult {
  const characterSetClass = Array.from(characterSet).join('');
  // Validity is judged on the play key (the folded, typeable form): a valid
  // word's key is drawn entirely from the character set and contains every
  // required letter (all of them — a multi-letter requirement is a harder
  // constraint, not a choice among letters). The dictionary itself carries
  // surface forms (CÔTÉ), several of which may share one key (COTE).
  const charsetRegex = new RegExp(`^[${characterSetClass}]+$`);
  const required = Array.from(requiredCharacters);
  const validWords = new Set<string>();
  const pangramWords = new Set<string>();
  const wordsByKey = new Map<string, string[]>();

  for (const word of referenceDictionary) {
    const key = fold(word);
    if (
      key.length >= minimumLength &&
      charsetRegex.test(key) &&
      required.every((character) => key.includes(character))
    ) {
      validWords.add(word);
      const siblings = wordsByKey.get(key);
      if (siblings === undefined) {
        wordsByKey.set(key, [word]);
      } else {
        siblings.push(word);
      }

      if (new Set(key).size === characterSet.size) {
        pangramWords.add(word);
      }
    }
  }

  if (validWords.size === 0) {
    throw new WordSaladError('NoValidWords', 'No valid words!');
  }

  return { validWords, pangramWords, wordsByKey };
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
  private readonly fold: (text: string) => string;
  private readonly wordsByKey: Map<string, string[]>;

  constructor(
    characterSet: ReadonlySet<string>,
    requiredCharacters: string,
    minimumLength: number,
    referenceDictionary: readonly string[],
    fold: (text: string) => string = identityFold,
  ) {
    // Canonicalize the required letters (distinct, sorted) so "TT" and "IA"
    // collapse to the one set they describe — encodings and keys stay stable.
    const canonicalRequired = Array.from(new Set(requiredCharacters))
      .sort()
      .join('');
    this.characterSet = characterSet;
    this.requiredCharacters = canonicalRequired;
    this.minimumLength = minimumLength;
    this.fold = fold;

    if (!isSuperset(characterSet, new Set(canonicalRequired))) {
      throw new WordSaladError(
        'MissingRequiredCharacter',
        'Missing required character!',
      );
    }

    this.pangramBonusPoints = characterSet.size;
    const { validWords, pangramWords, wordsByKey } = getWords(
      referenceDictionary,
      characterSet,
      canonicalRequired,
      minimumLength,
      fold,
    );
    this.remainingWords = validWords;
    this.pangramWords = pangramWords;
    this.wordsByKey = wordsByKey;
    this.maxPoints = Array.from(this.remainingWords)
      .map((word) => this.getPointsForWord(word))
      .reduce((accumulator, points) => accumulator + points, 0);
  }

  // The play key of any text: what the player must type to name it.
  keyOf(text: string): string {
    return this.fold(text);
  }

  // Every surface form whose play key matches the input (typed text or a
  // surface form — folding either lands on the same key). Empty when the
  // input spells no word.
  wordsMatching(input: string): readonly string[] {
    return this.wordsByKey.get(this.fold(input)) ?? [];
  }

  // Classify an input without mutating any game state, mirroring the checks
  // (and check order) that tryWord enforces. Folding means one input can
  // stand for several surface forms; it is valid while any of them remains
  // unfound, worth their combined points.
  previewWord(word: string): WordPreview {
    const key = this.fold(word);
    const matches = this.wordsByKey.get(key);
    const unfound =
      matches === undefined
        ? []
        : matches.filter((match) => !this.foundWords.has(match));
    if (matches !== undefined && unfound.length === 0) {
      return { verdict: 'already-found' };
    } else if (key.length < this.minimumLength) {
      return { verdict: 'too-short' };
    } else if (
      !Array.from(this.requiredCharacters).every((character) =>
        key.includes(character),
      )
    ) {
      return {
        verdict: 'missing-required',
        requiredCharacters: this.requiredCharacters,
      };
    } else if (!isSuperset(this.characterSet, new Set(key))) {
      return { verdict: 'invalid-letters' };
    } else if (unfound.length === 0) {
      return { verdict: 'not-a-word' };
    }
    const points = unfound
      .map((match) => this.getPointsForWord(match))
      .reduce((accumulator, value) => accumulator + value, 0);
    return { verdict: 'valid', points };
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

  // The shortest word still to be found (by its play key, the length the
  // player must type), for the hint system. Ties resolve to whichever the
  // dictionary yielded first.
  shortestRemainingWord(): string | null {
    let shortest: string | null = null;
    let shortestLength = Infinity;
    for (const word of this.remainingWords) {
      const length = this.fold(word).length;
      if (length < shortestLength) {
        shortest = word;
        shortestLength = length;
      }
    }
    return shortest;
  }

  // One submission finds every surface form sharing the input's key: typed
  // input is folded, so there is no way to name côte without côté — they
  // arrive together, each scoring as its own word.
  private handleValidWord(word: string): number {
    const matches = this.wordsMatching(word);
    let awarded = 0;
    for (const match of matches) {
      if (this.foundWords.has(match)) {
        continue;
      }
      const points = this.getPointsForWord(match);
      this.foundWords.set(match, points);
      this.remainingWords.delete(match);
      awarded = awarded + points;
    }
    this.currentPoints = this.currentPoints + awarded;
    return awarded;
  }

  // Points come from the play key — the letters actually typed — so CŒUR
  // scores its five played letters (COEUR), not its four codepoints.
  private getPointsForWord(word: string): number {
    let points = this.fold(word).length - this.minimumLength + 1;

    if (this.pangramWords.has(word)) {
      points = points + this.pangramBonusPoints;
    }

    return points;
  }
}
