import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  generateWordSalad,
  loadWordSalad,
  shuffled,
  storeWordSalad,
} from './game/generation';
import { completionToPoints, getLevel } from './game/levels';
import type { WordPreview } from './game/wordSalad';
import { WordSalad } from './game/wordSalad';
import {
  clearSavedProgress,
  loadHintedWords,
  loadSavedWords,
  saveHintedWords,
  saveSummary,
  saveWords,
} from './progressStore';

export type { WordPreview } from './game/wordSalad';

// The level is won when earned points reach this fraction of the maximum.
// Hinted words score nothing, so their points are permanently unreachable;
// hint too much and the ceiling on earned points drops below this line.
// Exported so the history view judges past games by the same line.
export const WIN_THRESHOLD = 0.75;

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

// One row of the alphabetized word list. Unfound slots stay anonymous: the
// view learns that a word exists (and where it sorts), never what it is.
export interface WordSlot {
  found: FoundWord | null;
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

export interface SpentHint {
  id: number;
  cost: number;
}

// The moment a submission pushes earned points across the win line. Fires
// exactly once per game, at the crossing — never for a restored win. The
// tossId lets the tile wave skip replaying after a post-win toss remount.
export interface Celebration {
  id: number;
  tossId: number;
}

// A keyboard action that landed on an unavailable control (Backspace or
// Enter with an empty word). The control acknowledges it with a press dip
// but fires nothing — the same feedback a tap on it gives via CSS :active.
export interface DeniedControl {
  id: number;
  control: 'delete' | 'submit';
}

// How a submitted word left the board: scored, hinted (accepted but worth
// 0), or rejected outright.
export type WordExitOutcome = 'scored' | 'hinted' | 'rejected';

// A submitted word on its way out. The word area animates it away — rising
// when accepted, sinking when rejected — instead of dropping it in place.
export interface WordExit {
  id: number;
  letters: readonly string[];
  outcome: WordExitOutcome;
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
  spentHint: SpentHint | null;
  wordExit: WordExit | null;
  deniedControl: DeniedControl | null;
  celebration: Celebration | null;
  feedback: GameFeedback | null;
  foundWords: readonly FoundWord[];
  wordSlots: readonly WordSlot[];
  lastFoundWord: string | null;
  earnedPoints: number;
  maxPoints: number;
  lostPoints: number;
  earnedPercent: number;
  lostPercent: number;
  winThreshold: number;
  winPoints: number;
  level: string;
  hasWon: boolean;
  // Every word found: nothing is left to type.
  isComplete: boolean;
  lockedOut: boolean;
  canHint: boolean;
  hintCost: number;
  // Taking the offered hint would drop the reachable maximum below the win
  // line — the one irreversible, game-forfeiting choice. Only meaningful
  // while a win is still genuinely at stake.
  hintForfeitsWin: boolean;
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

// A hinted word scores nothing, so its "valid" preview shows 0 points. Valid
// words are otherwise always worth at least 1, so points === 0 uniquely marks
// a hinted word for the Submit badge.
function hintedPreview(preview: WordPreview, isHinted: boolean): WordPreview {
  return isHinted && preview.verdict === 'valid'
    ? { verdict: 'valid', points: 0 }
    : preview;
}

// The word the next hint reveals, and what it costs. A committed word the
// player deleted before submitting re-reveals for free — it was already
// paid for — before any new word is offered. Otherwise it is the shortest
// unfound word not yet committed, at that word's point cost.
function nextHintWord(
  wordSalad: WordSalad,
  hintedWords: ReadonlySet<string>,
): { word: string; cost: number } | null {
  let rehint: string | null = null;
  for (const word of hintedWords) {
    if (!wordSalad.foundWords.has(word)) {
      if (rehint === null || word.length < rehint.length) {
        rehint = word;
      }
    }
  }
  if (rehint !== null) {
    return { word: rehint, cost: 0 };
  }

  let word: string | null = null;
  for (const candidate of wordSalad.remainingWords) {
    if (!hintedWords.has(candidate)) {
      if (word === null || candidate.length < word.length) {
        word = candidate;
      }
    }
  }
  return word === null ? null : { word, cost: wordSalad.pointsFor(word) };
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

// Generate a new game if the URL carries no game params; otherwise load the
// puzzle they describe (?letters=AZIMUTH&required=I&min=4 — min defaults
// to 4), restoring any saved progress for it. New games are started
// explicitly via startNewGame, so a refresh resumes the game; pasting a
// different puzzle URL is a real navigation and boots through here.
function createWordSalad(dictionary: readonly string[]): GameInit {
  const params = new URLSearchParams(window.location.search);
  const letters = params.get('letters');
  const required = params.get('required');
  const minimumLength = params.get('min');

  if (letters === null && required === null && minimumLength === null) {
    return generateGameInit(dictionary);
  }

  try {
    const wordSalad = loadWordSalad(
      dictionary,
      `${letters ?? ''}.${required ?? ''}.${minimumLength ?? '4'}`,
    );
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
  const [spentHint, setSpentHint] = useState<SpentHint | null>(null);
  const [wordExit, setWordExit] = useState<WordExit | null>(null);
  const [deniedControl, setDeniedControl] = useState<DeniedControl | null>(
    null,
  );
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [tossId, setTossId] = useState(0);
  const [deleteId, setDeleteId] = useState(0);

  // Keep the URL shareable: reflect the current puzzle into the query
  // string (min stays implicit at its default of 4). replaceState neither
  // reloads nor grows history — real navigation, like pasting a different
  // puzzle URL, reloads the app and boots from the new params.
  useEffect(() => {
    if (wordSalad === null) {
      return;
    }
    const [letters, required, minimumLength] =
      storeWordSalad(wordSalad).split('.');
    const url = new URL(window.location.href);
    url.searchParams.set('letters', letters);
    url.searchParams.set('required', required);
    if (minimumLength === '4') {
      url.searchParams.delete('min');
    } else {
      url.searchParams.set('min', minimumLength);
    }
    url.hash = '';
    window.history.replaceState(null, '', url.toString());
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
      // latent press that would re-ripple as later letters are typed. It also
      // ends the previous word's exit so the ghost never overlaps new letters.
      setHintReveal(null);
      setWordExit(null);
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
    // A fired action supersedes any lingering denial dip, so the button's
    // remount replays the press, not the dip.
    setDeniedControl(null);
    setDeleteId((previous) => previous + 1);
    setInputLetters((previous) => previous.slice(0, -1));
  }, [inputLetters]);

  // Clear the whole input at once (long-press Delete, or Ctrl/Cmd+Backspace).
  const clearInput = useCallback(() => {
    if (inputLetters.length === 0) {
      return;
    }
    setHintReveal(null);
    setDeniedControl(null);
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

  // Reveal the next hint word and commit it: its points are forfeit whether
  // or not it is submitted. The reveal fills the input so it can still be
  // submitted (and land in the found list) if wanted. Re-revealing a
  // committed word the player deleted charges nothing new.
  const revealHint = useCallback(() => {
    if (wordSalad === null) {
      return;
    }
    const hint = nextHintWord(wordSalad, hintedWords);
    if (hint === null) {
      return;
    }

    const letters = Array.from(hint.word);
    setInputLetters(letters);
    // Drive the reveal animation (letters cascade in, source tiles ripple);
    // clear any stale press so only the hint drives the tiles, and any
    // exiting word so the ghost never overlaps the revealed letters.
    setLastAppended(null);
    setWordExit(null);
    setHintReveal((previous) => ({ id: (previous?.id ?? 0) + 1, letters }));

    // Only a fresh hint spends points and commits; a re-reveal was already
    // paid for when it was first revealed.
    if (hint.cost > 0) {
      // Float the spent cost away from the (vanishing) hint button.
      setSpentHint((previous) => ({
        id: (previous?.id ?? 0) + 1,
        cost: hint.cost,
      }));

      const committed = new Set(hintedWords).add(hint.word);
      setHintedWords(committed);
      saveHintedWords(storeWordSalad(wordSalad), Array.from(committed));
    }
  }, [hintedWords, wordSalad]);

  // Keyboard input aimed at an unavailable control: the button dips in
  // acknowledgment without firing. Pointer taps get the equivalent for free
  // from CSS :active, so only the keyboard paths call this.
  const denyControl = useCallback((control: DeniedControl['control']) => {
    setDeniedControl((previous) => ({
      id: (previous?.id ?? 0) + 1,
      control,
    }));
  }, []);

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
    setSpentHint(null);
    setWordExit(null);
    setDeniedControl(null);
    setCelebration(null);
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
    setSpentHint(null);
    setWordExit(null);
    setDeniedControl(null);
    setCelebration(null);
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
    setDeniedControl(null);

    // The word is hinted if it was already committed via a hint reveal; the
    // engine still records it, but it scores nothing.
    const isHinted = hintedWords.has(word);
    const preview = wordSalad.previewWord(word);
    // Record the badge as it looked at submit time (before the engine
    // mutates), so the view can animate it away — hinted words show +0.
    setLastSubmission((previous) => ({
      id: (previous?.id ?? 0) + 1,
      preview: hintedPreview(preview, isHinted),
    }));

    setInputLetters([]);

    // The word animates out of the word area instead of vanishing: rising
    // when accepted, sinking when rejected.
    setWordExit((previous) => ({
      id: (previous?.id ?? 0) + 1,
      letters: Array.from(word),
      outcome:
        preview.verdict !== 'valid'
          ? 'rejected'
          : isHinted
            ? 'hinted'
            : 'scored',
    }));

    if (preview.verdict !== 'valid') {
      setFeedback({ kind: 'word-rejected', word, reason: preview });
      return;
    }

    // Detect the submission that crosses the win line, so the view can
    // celebrate the moment itself (and never a restored, already-won game).
    const winPoints = completionToPoints(WIN_THRESHOLD, wordSalad.maxPoints);
    const earnedBefore = tallyPoints(wordSalad, hintedWords).earnedPoints;

    const awarded = wordSalad.tryWord(word);
    setFeedback({ kind: 'scored', word, points: isHinted ? 0 : awarded });

    const earnedAfter = tallyPoints(wordSalad, hintedWords).earnedPoints;
    if (earnedBefore < winPoints && earnedAfter >= winPoints) {
      setCelebration((previous) => ({ id: (previous?.id ?? 0) + 1, tossId }));
    }

    const gameKey = storeWordSalad(wordSalad);
    setFoundWords(toFoundWords(wordSalad, hintedWords));
    setLastFoundWord(word);
    saveWords(gameKey, Array.from(wordSalad.foundWords.keys()));
  }, [hintedWords, inputLetters, tossId, wordSalad]);

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
        if (inputLetters.length === 0) {
          denyControl('delete');
        } else {
          clearInput();
        }
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
        if (inputLetters.length === 0) {
          denyControl('delete');
        } else {
          deleteLetter();
        }
      } else if (event.key === 'Enter') {
        if (inputLetters.length === 0) {
          denyControl('submit');
        } else {
          submitWord();
        }
      } else if (event.key === ' ') {
        event.preventDefault(); // don't scroll the page
        tossSalad();
      } else if (event.key === '?') {
        // Take a hint, but only from an empty word area (like the button),
        // so it never overwrites a word in progress.
        if (inputLetters.length === 0) {
          event.preventDefault();
          revealHint();
        }
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
    denyControl,
    inputLetters,
    revealHint,
    submitWord,
    tossSalad,
    wordSalad,
  ]);

  // Every word in the puzzle, alphabetized once per engine instance. Found
  // or not, each word owns a fixed slot for the life of the game.
  const allWords = useMemo(
    () =>
      wordSalad === null
        ? []
        : [...wordSalad.foundWords.keys(), ...wordSalad.remainingWords].sort(),
    [wordSalad],
  );

  const wordSlots = useMemo<readonly WordSlot[]>(() => {
    const found = new Map(foundWords.map((entry) => [entry.word, entry]));
    return allWords.map((word) => ({ found: found.get(word) ?? null }));
  }, [allWords, foundWords]);

  // Record a compact summary for the history view whenever progress
  // changes. Zero-progress games stay out of history (browsing New game
  // would otherwise litter it), and Restart clears the record.
  useEffect(() => {
    if (
      wordSalad === null ||
      (foundWords.length === 0 && hintedWords.size === 0)
    ) {
      return;
    }
    const points = tallyPoints(wordSalad, hintedWords);
    saveSummary(storeWordSalad(wordSalad), {
      earned: points.earnedPoints,
      found: foundWords.length,
      hints: hintedWords.size,
      lost: points.lostPoints,
      max: wordSalad.maxPoints,
      playedAt: Date.now(),
      total: allWords.length,
    });
  }, [allWords, foundWords, hintedWords, wordSalad]);

  if (wordSalad === null) {
    return {
      status: 'error',
      reason:
        'reason' in gameState.init
          ? gameState.init.reason
          : 'invalid-game-data',
    };
  }

  const inputWord = inputLetters.join('');
  const inputPreview =
    inputLetters.length === 0
      ? null
      : hintedPreview(
          wordSalad.previewWord(inputWord),
          hintedWords.has(inputWord),
        );

  const { earnedPoints, lostPoints } = tallyPoints(wordSalad, hintedWords);
  const earnedPercent = earnedPoints / wordSalad.maxPoints;
  const lostPercent = lostPoints / wordSalad.maxPoints;
  // The win line in whole points; the UI reports this number, so deciding
  // the win with it keeps the display and the mechanic in lockstep.
  const winPoints = completionToPoints(WIN_THRESHOLD, wordSalad.maxPoints);
  const hasWon = earnedPoints >= winPoints;
  // Earned points can rise at most to (max - lost); once that ceiling falls
  // below the win line, the level can no longer be won.
  const lockedOut = !hasWon && wordSalad.maxPoints - lostPoints < winPoints;
  const nextHint = nextHintWord(wordSalad, hintedWords);
  const canHint = nextHint !== null;
  const hintCost = nextHint === null ? 0 : nextHint.cost;
  const hintForfeitsWin =
    !hasWon &&
    !lockedOut &&
    hintCost > 0 &&
    wordSalad.maxPoints - lostPoints - hintCost < winPoints;

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
    spentHint,
    wordExit,
    deniedControl,
    celebration,
    feedback,
    foundWords,
    wordSlots,
    lastFoundWord,
    earnedPoints,
    maxPoints: wordSalad.maxPoints,
    lostPoints,
    earnedPercent,
    lostPercent,
    winThreshold: WIN_THRESHOLD,
    winPoints,
    level: getLevel(earnedPercent),
    hasWon,
    isComplete: wordSlots.every((slot) => slot.found !== null),
    lockedOut,
    canHint,
    hintCost,
    hintForfeitsWin,
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
