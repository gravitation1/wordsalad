import { useCallback, useEffect, useState } from 'react';

import {
  generateWordSalad,
  loadWordSalad,
  shuffled,
  storeWordSalad,
} from './game/generation';
import { getLevel } from './game/levels';
import type { WordPreview } from './game/wordSalad';
import { WordSalad } from './game/wordSalad';
import {
  clearSavedProgress,
  loadHintedWords,
  loadSavedWords,
  saveHintedWords,
  saveWords,
} from './progressStore';

export type { WordPreview } from './game/wordSalad';

// The level is won when earned points reach this fraction of the maximum.
// Hinted words score nothing, so their points are permanently unreachable;
// hint too much and the ceiling on earned points drops below this line.
const WIN_THRESHOLD = 0.75;

export type GameFeedback =
  | { kind: 'letter-rejected'; letter: string }
  | { kind: 'scored'; word: string; points: number }
  | {
      kind: 'word-rejected';
      word: string;
      reason: Exclude<WordPreview, { verdict: 'valid' }>;
    };

export interface FoundWord {
  word: string;
  points: number;
  hinted: boolean;
}

export type SubmitReadiness = 'empty' | 'partial' | 'ready';

export interface SubmittedPreview {
  id: number;
  preview: WordPreview;
}

export interface LetterRejection {
  id: number;
  letter: string;
}

export interface LetterActivation {
  id: number;
  letter: string;
}

export interface HintReveal {
  id: number;
  letters: readonly string[];
}

export interface PlayingGame {
  status: 'playing';
  saladLetters: readonly string[];
  requiredCharacter: string;
  inputLetters: readonly string[];
  isValidCharacter: (character: string) => boolean;
  inputPreview: WordPreview | null;
  submitReadiness: SubmitReadiness;
  lastSubmission: SubmittedPreview | null;
  lastRejection: LetterRejection | null;
  lastAppended: LetterActivation | null;
  hintReveal: HintReveal | null;
  feedback: GameFeedback | null;
  foundWords: readonly FoundWord[];
  lastFoundWord: string | null;
  earnedPoints: number;
  maxPoints: number;
  earnedPercent: number;
  lostPercent: number;
  winThreshold: number;
  level: string;
  hasWon: boolean;
  lockedOut: boolean;
  canHint: boolean;
  hintCount: number;
  tossId: number;
  deleteId: number;
  gameId: number;
  appendLetter: (character: string) => void;
  deleteLetter: () => void;
  clearInput: () => void;
  tossSalad: () => void;
  submitWord: () => void;
  startNewGame: () => void;
  restartGame: () => void;
  revealHint: () => void;
}

export type FailureReason = 'generation-failed' | 'invalid-game-data';

export interface FailedGame {
  status: 'error';
  reason: FailureReason;
}

export type WordSaladGame = FailedGame | PlayingGame;

type GameInit = { reason: FailureReason } | { wordSalad: WordSalad };

// Hinted (committed) words score nothing, so they show 0 points.
function toFoundWords(
  wordSalad: WordSalad,
  hintedWords: ReadonlySet<string>,
): readonly FoundWord[] {
  return Array.from(wordSalad.foundWords, ([word, points]) => ({
    word,
    points: hintedWords.has(word) ? 0 : points,
    hinted: hintedWords.has(word),
  })).sort((a, b) => (a.word < b.word ? -1 : 1));
}

// Split found-and-committed points into earned (green) and lost-to-hints
// (red). Committed words that were never submitted still count as lost.
function tallyPoints(
  wordSalad: WordSalad,
  hintedWords: ReadonlySet<string>,
): { earnedPoints: number; lostPoints: number } {
  let earnedPoints = 0;
  let lostPoints = 0;

  for (const [word, points] of wordSalad.foundWords) {
    if (hintedWords.has(word)) {
      lostPoints += points;
    } else {
      earnedPoints += points;
    }
  }
  for (const word of hintedWords) {
    if (!wordSalad.foundWords.has(word)) {
      lostPoints += wordSalad.pointsFor(word);
    }
  }

  return { earnedPoints, lostPoints };
}

// Replay saved words through the engine so every entry is revalidated;
// stale or corrupt entries simply fail and are dropped.
function restoreProgress(wordSalad: WordSalad): void {
  for (const word of loadSavedWords(storeWordSalad(wordSalad))) {
    try {
      wordSalad.tryWord(word);
    } catch (_error) {
      // Not a valid word for this puzzle (anymore); skip it.
    }
  }
}

function generateGameInit(dictionary: readonly string[]): GameInit {
  try {
    const wordSalad = generateWordSalad(dictionary);
    // An explicitly new game starts with a clean slate, even if the same
    // puzzle was played before.
    clearSavedProgress(storeWordSalad(wordSalad));
    return { wordSalad };
  } catch (_error) {
    return { reason: 'generation-failed' };
  }
}

// Generate a new game if we have no game data; otherwise load the game
// encoded in the URL hash (restoring any saved progress for it). New games
// are started explicitly via startNewGame, so a refresh resumes the game.
function createWordSalad(dictionary: readonly string[]): GameInit {
  if (window.location.hash.length === 0) {
    return generateGameInit(dictionary);
  }

  try {
    const wordSalad = loadWordSalad(dictionary, window.location.hash);
    restoreProgress(wordSalad);
    return { wordSalad };
  } catch (_error) {
    return { reason: 'invalid-game-data' };
  }
}

// The controller for a game session: owns the WordSalad engine instance and
// all UI-facing state, and wires up document-level keyboard input. Components
// stay purely presentational.
export function useWordSaladGame(dictionary: readonly string[]): WordSaladGame {
  const [gameState, setGameState] = useState<{ id: number; init: GameInit }>(
    () => ({ id: 0, init: createWordSalad(dictionary) }),
  );
  const wordSalad =
    'wordSalad' in gameState.init ? gameState.init.wordSalad : null;
  const [saladLetters, setSaladLetters] = useState(() =>
    wordSalad === null ? [] : shuffled(Array.from(wordSalad.characterSet)),
  );
  const [inputLetters, setInputLetters] = useState<readonly string[]>([]);
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const [hintedWords, setHintedWords] = useState<ReadonlySet<string>>(() =>
    wordSalad === null
      ? new Set()
      : new Set(loadHintedWords(storeWordSalad(wordSalad))),
  );
  const [foundWords, setFoundWords] = useState<readonly FoundWord[]>(() =>
    wordSalad === null ? [] : toFoundWords(wordSalad, hintedWords),
  );
  const [lastFoundWord, setLastFoundWord] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<SubmittedPreview | null>(
    null,
  );
  const [lastRejection, setLastRejection] = useState<LetterRejection | null>(
    null,
  );
  const [lastAppended, setLastAppended] = useState<LetterActivation | null>(
    null,
  );
  const [hintReveal, setHintReveal] = useState<HintReveal | null>(null);
  const [tossId, setTossId] = useState(0);
  const [deleteId, setDeleteId] = useState(0);

  useEffect(() => {
    if (wordSalad !== null) {
      window.location.hash = storeWordSalad(wordSalad);
    }
  }, [wordSalad]);

  // Blur on any click so that Enter submits the current word instead of
  // re-triggering the last focused button or link.
  useEffect(() => {
    const blurActiveElement = () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    document.addEventListener('click', blurActiveElement);
    return () => {
      document.removeEventListener('click', blurActiveElement);
    };
  }, []);

  const appendLetter = useCallback(
    (character: string) => {
      const letter = character.toUpperCase();

      // Reject letters outside the salad right away instead of letting the
      // player build a word that can never score.
      if (wordSalad !== null && !wordSalad.characterSet.has(letter)) {
        setLastRejection((previous) => ({
          id: (previous?.id ?? 0) + 1,
          letter,
        }));
        setFeedback({ kind: 'letter-rejected', letter });
        return;
      }

      // A keystroke ends any hint reveal, so its source tiles stop carrying a
      // latent press that would re-ripple as later letters are typed.
      setHintReveal(null);
      setLastAppended((previous) => ({
        id: (previous?.id ?? 0) + 1,
        letter,
      }));
      setInputLetters((previous) => [...previous, letter]);
    },
    [wordSalad],
  );

  const deleteLetter = useCallback(() => {
    // Only signal a deletion when there is actually a letter to delete.
    if (inputLetters.length === 0) {
      return;
    }
    setHintReveal(null);
    setDeleteId((previous) => previous + 1);
    setInputLetters((previous) => previous.slice(0, -1));
  }, [inputLetters]);

  // Clear the whole input at once (long-press Delete, or Ctrl/Cmd+Backspace).
  const clearInput = useCallback(() => {
    if (inputLetters.length === 0) {
      return;
    }
    setHintReveal(null);
    setDeleteId((previous) => previous + 1);
    setInputLetters([]);
  }, [inputLetters]);

  const tossSalad = useCallback(() => {
    if (wordSalad !== null) {
      setSaladLetters(shuffled(Array.from(wordSalad.characterSet)));
      setTossId((previous) => previous + 1);
      // The tiles remount to replay the toss; drop the press marker so the
      // last-pressed tile does not also replay its ripple.
      setLastAppended(null);
    }
  }, [wordSalad]);

  const isValidCharacter = useCallback(
    (character: string) => wordSalad?.characterSet.has(character) ?? false,
    [wordSalad],
  );

  // Reveal the shortest not-yet-hinted unfound word and commit it: its points
  // are forfeit whether or not it is submitted. The reveal fills the input so
  // it can still be submitted (and land in the found list) if wanted.
  const revealHint = useCallback(() => {
    if (wordSalad === null) {
      return;
    }
    let word: string | null = null;
    for (const candidate of wordSalad.remainingWords) {
      if (!hintedWords.has(candidate)) {
        if (word === null || candidate.length < word.length) {
          word = candidate;
        }
      }
    }
    if (word === null) {
      return;
    }

    const letters = Array.from(word);
    setInputLetters(letters);
    // Drive the reveal animation (letters cascade in, source tiles ripple);
    // clear any stale press so only the hint drives the tiles.
    setLastAppended(null);
    setHintReveal((previous) => ({ id: (previous?.id ?? 0) + 1, letters }));

    const committed = new Set(hintedWords).add(word);
    setHintedWords(committed);
    saveHintedWords(storeWordSalad(wordSalad), Array.from(committed));
  }, [hintedWords, wordSalad]);

  const startNewGame = useCallback(() => {
    const init = generateGameInit(dictionary);
    setGameState((previous) => ({ id: previous.id + 1, init }));
    setSaladLetters(
      'wordSalad' in init
        ? shuffled(Array.from(init.wordSalad.characterSet))
        : [],
    );
    setInputLetters([]);
    setFeedback(null);
    setFoundWords([]);
    setLastFoundWord(null);
    setLastSubmission(null);
    setLastRejection(null);
    setLastAppended(null);
    setHintReveal(null);
    // Reset the press counters so the control buttons don't replay a ripple
    // when the board remounts for the fresh game.
    setTossId(0);
    setDeleteId(0);
    setHintedWords(new Set());
  }, [dictionary]);

  // Same salad, clean slate: rebuild the engine from the same parameters
  // and drop the saved progress.
  const restartGame = useCallback(() => {
    if (wordSalad === null) {
      return;
    }
    clearSavedProgress(storeWordSalad(wordSalad));
    const fresh = new WordSalad(
      wordSalad.characterSet,
      wordSalad.requiredCharacter,
      wordSalad.minimumLength,
      dictionary,
    );
    setGameState((previous) => ({
      id: previous.id,
      init: { wordSalad: fresh },
    }));
    setInputLetters([]);
    setFeedback(null);
    setFoundWords([]);
    setLastFoundWord(null);
    setLastSubmission(null);
    setLastRejection(null);
    setLastAppended(null);
    setHintReveal(null);
    setTossId(0);
    setDeleteId(0);
    setHintedWords(new Set());
  }, [dictionary, wordSalad]);

  const submitWord = useCallback(() => {
    if (wordSalad === null) {
      return;
    }

    const word = inputLetters.join('');

    if (word.length === 0) {
      return;
    }

    setHintReveal(null);

    // Record the badge as it looked at submit time (before the engine
    // mutates), so the view can animate it away.
    const preview = wordSalad.previewWord(word);
    setLastSubmission((previous) => ({
      id: (previous?.id ?? 0) + 1,
      preview,
    }));

    setInputLetters([]);

    if (preview.verdict !== 'valid') {
      setFeedback({ kind: 'word-rejected', word, reason: preview });
      return;
    }

    // The word is hinted if it was already committed via a hint reveal; the
    // engine still records it, but it scores nothing.
    const isHinted = hintedWords.has(word);
    const awarded = wordSalad.tryWord(word);
    setFeedback({ kind: 'scored', word, points: isHinted ? 0 : awarded });

    const gameKey = storeWordSalad(wordSalad);
    setFoundWords(toFoundWords(wordSalad, hintedWords));
    setLastFoundWord(word);
    saveWords(gameKey, Array.from(wordSalad.foundWords.keys()));
  }, [hintedWords, inputLetters, wordSalad]);

  useEffect(() => {
    if (wordSalad === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd+Backspace clears the whole word (matches OS text editing).
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === 'Backspace' || event.key === 'Delete')
      ) {
        event.preventDefault();
        clearInput();
        return;
      }

      // Leave other keyboard shortcuts (copy, reload, select-all, ...) alone.
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      // An open modal owns the keyboard; don't drive the game behind it.
      if (document.querySelector('dialog[open]') !== null) {
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        appendLetter(event.key);
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        deleteLetter();
      } else if (event.key === 'Enter') {
        submitWord();
      } else if (event.key === ' ') {
        event.preventDefault(); // don't scroll the page
        tossSalad();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    appendLetter,
    clearInput,
    deleteLetter,
    submitWord,
    tossSalad,
    wordSalad,
  ]);

  if (wordSalad === null) {
    return {
      status: 'error',
      reason:
        'reason' in gameState.init
          ? gameState.init.reason
          : 'invalid-game-data',
    };
  }

  const inputPreview =
    inputLetters.length === 0
      ? null
      : wordSalad.previewWord(inputLetters.join(''));

  const { earnedPoints, lostPoints } = tallyPoints(wordSalad, hintedWords);
  const earnedPercent = earnedPoints / wordSalad.maxPoints;
  const lostPercent = lostPoints / wordSalad.maxPoints;
  const hasWon = earnedPercent >= WIN_THRESHOLD;
  // Earned points can rise at most to (max - lost); once that ceiling falls
  // below the win line, the level can no longer be won.
  const lockedOut = !hasWon && lostPercent > 1 - WIN_THRESHOLD;
  const canHint = Array.from(wordSalad.remainingWords).some(
    (word) => !hintedWords.has(word),
  );

  return {
    status: 'playing',
    saladLetters,
    requiredCharacter: wordSalad.requiredCharacter,
    inputLetters,
    isValidCharacter,
    inputPreview,
    submitReadiness:
      inputPreview === null
        ? 'empty'
        : inputPreview.verdict === 'valid'
          ? 'ready'
          : 'partial',
    lastSubmission,
    lastRejection,
    lastAppended,
    hintReveal,
    feedback,
    foundWords,
    lastFoundWord,
    earnedPoints,
    maxPoints: wordSalad.maxPoints,
    earnedPercent,
    lostPercent,
    winThreshold: WIN_THRESHOLD,
    level: getLevel(earnedPercent),
    hasWon,
    lockedOut,
    canHint,
    hintCount: hintedWords.size,
    tossId,
    deleteId,
    gameId: gameState.id,
    appendLetter,
    deleteLetter,
    clearInput,
    tossSalad,
    submitWord,
    startNewGame,
    restartGame,
    revealHint,
  };
}
