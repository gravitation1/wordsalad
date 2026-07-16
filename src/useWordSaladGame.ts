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
import { clearSavedWords, loadSavedWords, saveWords } from './progressStore';

export type { WordPreview } from './game/wordSalad';

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
  feedback: GameFeedback | null;
  foundWords: readonly FoundWord[];
  lastFoundWord: string | null;
  currentPoints: number;
  maxPoints: number;
  completionPercent: number;
  level: string;
  hasWon: boolean;
  tossId: number;
  deleteId: number;
  gameId: number;
  appendLetter: (character: string) => void;
  deleteLetter: () => void;
  tossSalad: () => void;
  submitWord: () => void;
  startNewGame: () => void;
  restartGame: () => void;
}

export type FailureReason = 'generation-failed' | 'invalid-game-data';

export interface FailedGame {
  status: 'error';
  reason: FailureReason;
}

export type WordSaladGame = FailedGame | PlayingGame;

type GameInit = { reason: FailureReason } | { wordSalad: WordSalad };

function toFoundWords(wordSalad: WordSalad): readonly FoundWord[] {
  return Array.from(wordSalad.foundWords, ([word, points]) => ({
    word,
    points,
  })).sort((a, b) => (a.word < b.word ? -1 : 1));
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
    clearSavedWords(storeWordSalad(wordSalad));
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
  const [foundWords, setFoundWords] = useState<readonly FoundWord[]>(() =>
    wordSalad === null ? [] : toFoundWords(wordSalad),
  );
  const [currentPoints, setCurrentPoints] = useState(
    () => wordSalad?.currentPoints ?? 0,
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
  const [tossId, setTossId] = useState(0);
  const [deleteId, setDeleteId] = useState(0);
  const [hasWon, setHasWon] = useState(
    () => wordSalad !== null && wordSalad.remainingWords.size === 0,
  );

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
    setDeleteId((previous) => previous + 1);
    setInputLetters((previous) => previous.slice(0, -1));
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
    setCurrentPoints(0);
    setLastFoundWord(null);
    setLastSubmission(null);
    setLastRejection(null);
    setLastAppended(null);
    setHasWon(false);
  }, [dictionary]);

  // Same salad, clean slate: rebuild the engine from the same parameters
  // and drop the saved progress.
  const restartGame = useCallback(() => {
    if (wordSalad === null) {
      return;
    }
    clearSavedWords(storeWordSalad(wordSalad));
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
    setCurrentPoints(0);
    setLastFoundWord(null);
    setLastSubmission(null);
    setLastRejection(null);
    setLastAppended(null);
    setHasWon(false);
  }, [dictionary, wordSalad]);

  const submitWord = useCallback(() => {
    if (wordSalad === null) {
      return;
    }

    const word = inputLetters.join('');

    if (word.length === 0) {
      return;
    }

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

    const points = wordSalad.tryWord(word);
    setFeedback({ kind: 'scored', word, points });
    setFoundWords(toFoundWords(wordSalad));
    setCurrentPoints(wordSalad.currentPoints);
    setLastFoundWord(word);
    saveWords(
      storeWordSalad(wordSalad),
      Array.from(wordSalad.foundWords.keys()),
    );

    if (wordSalad.remainingWords.size === 0) {
      setHasWon(true);
    }
  }, [inputLetters, wordSalad]);

  useEffect(() => {
    if (wordSalad === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Leave keyboard shortcuts (copy, reload, select-all, ...) alone.
      if (event.metaKey || event.ctrlKey || event.altKey) {
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
  }, [appendLetter, deleteLetter, submitWord, tossSalad, wordSalad]);

  if (wordSalad === null) {
    return {
      status: 'error',
      reason:
        'reason' in gameState.init
          ? gameState.init.reason
          : 'invalid-game-data',
    };
  }

  const completionPercent = currentPoints / wordSalad.maxPoints;
  const inputPreview =
    inputLetters.length === 0
      ? null
      : wordSalad.previewWord(inputLetters.join(''));

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
    feedback,
    foundWords,
    lastFoundWord,
    currentPoints,
    maxPoints: wordSalad.maxPoints,
    completionPercent,
    level: getLevel(completionPercent),
    hasWon,
    tossId,
    deleteId,
    gameId: gameState.id,
    appendLetter,
    deleteLetter,
    tossSalad,
    submitWord,
    startNewGame,
    restartGame,
  };
}
