import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DictionarySpec } from './game/dictionaries';
import { alphabetPattern, DEFAULT_DICTIONARY } from './game/dictionaries';
import type { WordGap } from './game/gapPrefixes';
import {
  liveNextLetters,
  rankedLetters,
  slotPrefixes,
  wordGaps,
  wordListOrder,
} from './game/gapPrefixes';
import {
  bestRequiredCharacter,
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

// Hint-revealed letters cascade into the word area, position i delayed by
// this much (typed letters appear at once). Lives here rather than in the
// view because the hint's auto-submit timer must wait out the same cascade.
export const REVEAL_STAGGER_MS = 45;

// How long one revealed letter's entrance runs (letter-reveal in
// styles.css), and the reading pause the completed word gets before it
// submits itself.
const REVEAL_LETTER_MS = 220;
const REVEAL_READ_MS = 500;

export type GameFeedback =
  | { kind: 'letter-rejected'; letter: string }
  | { kind: 'scored'; word: string; points: number; pangram: boolean }
  | {
      kind: 'word-rejected';
      word: string;
      reason: Exclude<WordPreview, { verdict: 'valid' }>;
    };

export interface FoundWord {
  word: string;
  points: number;
  hinted: boolean;
  // Used every letter on the board, and scored the bonus for it. The view
  // lights all of a pangram's tiles so the outsized number explains itself.
  pangram: boolean;
}

// One row of the alphabetized word list. Unfound slots stay anonymous —
// the view learns that a word exists (and where it sorts), never what it
// is — except for the prefix the ordering itself gives away.
export interface WordSlot {
  found: FoundWord | null;
  // The play-key letters the sort order forces on an unfound word (see
  // gapPrefixes). Empty when nothing is forced, and always for found
  // slots. Free to show: it reveals nothing a player couldn't derive.
  prefix: string;
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

// The moment a submission pushes earned points across the win line — or all
// the way to a perfect score, which gets the grand (gold) show even when
// the win itself happened earlier. Never fires for a restored game. The
// tossId lets the tile wave skip replaying after a post-win toss remount.
export interface Celebration {
  id: number;
  perfect: boolean;
  tossId: number;
}

// A submission that climbed the ratings ladder. Fires only during play —
// never on restore — and yields to the win celebration when both happen on
// the same submission.
export interface RankUp {
  id: number;
  level: string;
}

// The word the drum should bring into view: a freshly found one, or one the
// player re-submitted to locate. Carries an id (rather than being a bare
// string) so re-submitting the same word spotlights it again.
export interface WordSpotlight {
  id: number;
  word: string;
  // True when the player named the word themselves (re-submitting one they
  // had already found) rather than simply finding it. Locating is the whole
  // point of that submission, so it outranks the drum's browsing grace.
  requested: boolean;
}

// The hint that spent the win out of reach — the reachable maximum just fell
// below the win line. Fires once, on that crossing, during play only (never
// on restore of an already-locked game).
export interface Lockout {
  id: number;
}

// A keyboard action that landed on an unavailable control (Backspace or
// Enter with an empty word; 2 or 3 with nothing found). The control
// acknowledges it with a press dip but fires nothing — the same feedback a
// tap on it gives via CSS :active.
export interface DeniedControl {
  id: number;
  control: 'delete' | 'submit' | 'share' | 'restart';
}

// The 3 key asked to share. Sharing lives outside this hook (it reads the
// URL and drives the share sheet/clipboard), so the keystroke is published
// as a one-shot signal for the scoreboard to act on.
export interface ShareRequest {
  id: number;
}

// One row wiped by a restart: which slot it sat in and what it showed, so
// the drum can fly a ghost of it toward the Restart button that took it.
export interface RestartExitRow {
  index: number;
  word: string;
  hinted: boolean;
  pangram: boolean;
}

// Restart's absorb, published as a one-shot: the found rows captured at
// the moment they were wiped. Null until the first restart with progress.
export interface RestartExit {
  id: number;
  rows: readonly RestartExitRow[];
}

// True when the event is this digit — by typed character, or by physical
// position for layouts whose digit row is shifted (French AZERTY's
// unshifted top row types symbols, so key is never '1'). A letter living
// on a digit position (AZERTY's é on the 2 key) is never claimed: letters
// are game input everywhere the game listens.
export function matchesDigitKey(event: KeyboardEvent, digit: string): boolean {
  return (
    event.key === digit ||
    (event.code === `Digit${digit}` && !/^\p{L}$/u.test(event.key))
  );
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
  requiredCharacters: string;
  inputLetters: readonly string[];
  isValidCharacter: (character: string) => boolean;
  // The board letters that could still extend the typed word into a new
  // (unfound) word, derived the same dictionary-blind way as the slot
  // prefixes; the rack softly dims the rest.
  liveLetters: ReadonlySet<string>;
  inputPreview: WordPreview | null;
  submitReadiness: SubmitReadiness;
  lastSubmission: SubmittedPreview | null;
  lastRejection: LetterRejection | null;
  lastAppended: LetterActivation | null;
  hintReveal: HintReveal | null;
  spentHint: SpentHint | null;
  wordExit: WordExit | null;
  deniedControl: DeniedControl | null;
  shareRequest: ShareRequest | null;
  restartExit: RestartExit | null;
  celebration: Celebration | null;
  rankUp: RankUp | null;
  lockout: Lockout | null;
  feedback: GameFeedback | null;
  foundWords: readonly FoundWord[];
  wordSlots: readonly WordSlot[];
  spotlight: WordSpotlight | null;
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
  // Every point earned — the perfect game. Steady state, unlike the
  // celebration one-shot, so a restored perfect game still shows gold.
  isPerfect: boolean;
  lockedOut: boolean;
  canHint: boolean;
  hintCost: number;
  // Taking the offered hint would drop the reachable maximum below the win
  // line — the one irreversible, game-forfeiting choice. Only meaningful
  // while a win is still genuinely at stake.
  hintForfeitsWin: boolean;
  hintCount: number;
  // A score carried in by a shared URL, to beat on this puzzle. Null when
  // the game was not opened from a share link.
  challengeScore: number | null;
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
  // Fill the word area with an unfound slot's derived prefix (WordSlot's
  // prefix), replacing anything shorter that was typed.
  prefillWord: (prefix: string) => void;
}

export type FailureReason = 'generation-failed' | 'invalid-game-data';

export interface FailedGame {
  status: 'error';
  reason: FailureReason;
}

export type WordSaladGame = FailedGame | PlayingGame;

type GameInit = { reason: FailureReason } | { wordSalad: WordSalad };

// Storage keys carry the dictionary id so equal boards in different
// languages never share progress; English stays bare so saves that predate
// multiple dictionaries keep working.
function storageKey(spec: DictionarySpec, wordSalad: WordSalad): string {
  const encoded = storeWordSalad(wordSalad);
  return spec.id === 'en' ? encoded : `${spec.id}:${encoded}`;
}

// Hinted (committed) words score nothing, so they show 0 points. Sorting
// uses the word list's one display order (wordListOrder) so this list and
// the slot map can never disagree about where a word files.
function toFoundWords(
  wordSalad: WordSalad,
  hintedWords: ReadonlySet<string>,
  compareWords: (a: string, b: string) => number,
): readonly FoundWord[] {
  return Array.from(wordSalad.foundWords, ([word, points]) => ({
    word,
    points: hintedWords.has(word) ? 0 : points,
    hinted: hintedWords.has(word),
    pangram: wordSalad.pangramWords.has(word),
  })).sort((a, b) => compareWords(a.word, b.word));
}

// A hinted word scores nothing, so its "valid" preview shows 0 points. Valid
// words are otherwise always worth at least 1, so points === 0 uniquely marks
// a hinted word for the Submit badge.
function hintedPreview(preview: WordPreview, isHinted: boolean): WordPreview {
  return isHinted && preview.verdict === 'valid'
    ? { verdict: 'valid', points: 0 }
    : preview;
}

// The word the next hint reveals, and what it costs. A committed word that
// never landed (a session closed during the reveal, or a save from before
// hints submitted themselves) re-reveals for free — it was already paid
// for — before any new word is offered. Otherwise it is the shortest
// unfound word not yet committed, at that word's point cost.
function nextHintWord(
  wordSalad: WordSalad,
  hintedWords: ReadonlySet<string>,
): { word: string; cost: number } | null {
  const keyLength = (word: string) => wordSalad.keyOf(word).length;
  let rehint: string | null = null;
  for (const word of hintedWords) {
    if (!wordSalad.foundWords.has(word)) {
      if (rehint === null || keyLength(word) < keyLength(rehint)) {
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
      if (word === null || keyLength(candidate) < keyLength(word)) {
        word = candidate;
      }
    }
  }
  if (word === null) {
    return null;
  }
  // A hint spends the whole key group: submission can only find côte and
  // côté together, so the reveal prices (and commits) them together.
  const cost = wordSalad
    .wordsMatching(word)
    .reduce((total, sibling) => total + wordSalad.pointsFor(sibling), 0);
  return { word, cost };
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
// stale or corrupt entries simply fail and are dropped. (Saved words are
// surface forms; replaying one restores its whole key group, exactly as
// the submission that saved it found the group.)
function restoreProgress(spec: DictionarySpec, wordSalad: WordSalad): void {
  for (const word of loadSavedWords(storageKey(spec, wordSalad))) {
    try {
      wordSalad.tryWord(word);
    } catch (_error) {
      // Not a valid word for this puzzle (anymore); skip it.
    }
  }
}

function generateGameInit(
  dictionary: readonly string[],
  spec: DictionarySpec,
): GameInit {
  try {
    const wordSalad = generateWordSalad(dictionary, {}, spec);
    // An explicitly new game starts with a clean slate, even if the same
    // puzzle was played before.
    clearSavedProgress(storageKey(spec, wordSalad));
    return { wordSalad };
  } catch (_error) {
    return { reason: 'generation-failed' };
  }
}

// Build the game from the URL's puzzle params, each of which is independently
// optional: whatever is supplied constrains the puzzle and the rest is filled
// in. `letters` makes a deterministic puzzle (its required letter derived when
// omitted); without `letters` a puzzle is generated around the supplied
// `required`/`min`. With no params at all, a fresh curated random game. The
// URL-write effect then canonicalizes to ?letters=…&required=…&min, so a
// partial link resolves to a concrete, shareable one. New games are started
// explicitly via startNewGame, so a refresh resumes; pasting a different
// puzzle URL is a real navigation and boots through here.
function createWordSalad(
  dictionary: readonly string[],
  spec: DictionarySpec,
): GameInit {
  const params = new URLSearchParams(window.location.search);
  const lettersParam = params.get('letters');
  const requiredParam = params.get('required');
  const minParam = params.get('min');

  if (lettersParam === null && requiredParam === null && minParam === null) {
    return generateGameInit(dictionary, spec);
  }

  // URL params fold into play-key space, so a hand-typed accented charset
  // resolves to the board it means; validity is judged against the
  // dictionary's own alphabet.
  const letterPattern = alphabetPattern(spec);
  const letters = lettersParam === null ? null : spec.fold(lettersParam);
  const requiredRaw = requiredParam === null ? null : spec.fold(requiredParam);
  const minimumLength = minParam === null ? 4 : Number(minParam);

  if (
    (letters !== null && !letterPattern.test(letters)) ||
    (requiredRaw !== null &&
      requiredRaw !== '' &&
      !letterPattern.test(requiredRaw)) ||
    !Number.isInteger(minimumLength) ||
    minimumLength < 1
  ) {
    return { reason: 'invalid-game-data' };
  }

  // Canonicalize the required letters — distinct and sorted — so IA, AI, and
  // AA all describe the one puzzle whose words must contain A and I.
  const required =
    requiredRaw === null
      ? null
      : Array.from(new Set(requiredRaw)).sort().join('');

  try {
    if (letters !== null) {
      // Explicit letters: a deterministic puzzle. Derive the required letter
      // when the URL omits it, then load and restore any saved progress.
      // An omitted `required` derives a good letter; an explicitly empty
      // one (?required=) is a deliberate no-required-letter puzzle.
      const requiredCharacters =
        required ??
        bestRequiredCharacter(dictionary, letters, minimumLength, spec);
      const wordSalad = loadWordSalad(
        dictionary,
        `${letters}.${requiredCharacters}.${minimumLength}`,
        spec,
      );
      restoreProgress(spec, wordSalad);
      return { wordSalad };
    }
    // No letters: generate a puzzle around the supplied constraints (pinned
    // required letters and/or a custom minimum length), as a fresh game.
    const wordSalad = generateWordSalad(
      dictionary,
      {
        minimumLength,
        requiredCharacters: required ?? undefined,
      },
      spec,
    );
    clearSavedProgress(storageKey(spec, wordSalad));
    return { wordSalad };
  } catch (_error) {
    return { reason: 'invalid-game-data' };
  }
}

// The controller for a game session: owns the WordSalad engine instance and
// all UI-facing state, and wires up document-level keyboard input. Components
// stay purely presentational.
export function useWordSaladGame(
  dictionary: readonly string[],
  spec: DictionarySpec = DEFAULT_DICTIONARY,
): WordSaladGame {
  // The one order every word list in the hook uses: play keys first, the
  // dictionary's collation among equal keys. Key order is what makes the
  // gap prefixes below provable, so nothing here may sort words any other
  // way.
  const collate = useMemo(() => wordListOrder(spec), [spec]);
  const [gameState, setGameState] = useState<{ id: number; init: GameInit }>(
    () => ({ id: 0, init: createWordSalad(dictionary, spec) }),
  );
  const wordSalad =
    'wordSalad' in gameState.init ? gameState.init.wordSalad : null;
  const [saladLetters, setSaladLetters] = useState(() =>
    wordSalad === null ? [] : shuffled(Array.from(wordSalad.characterSet)),
  );
  const [inputLetters, setInputLetters] = useState<readonly string[]>([]);
  // The stem the last block tap laid down. While the input still reads
  // exactly this, it is the tap's letters rather than the player's work —
  // which is what lets another block replace them (see prefillWord). Any
  // edit, in either direction, moves the input off it.
  const prefilledStem = useRef<string | null>(null);
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const [hintedWords, setHintedWords] = useState<ReadonlySet<string>>(() =>
    wordSalad === null
      ? new Set()
      : new Set(loadHintedWords(storageKey(spec, wordSalad))),
  );
  const [foundWords, setFoundWords] = useState<readonly FoundWord[]>(() =>
    wordSalad === null ? [] : toFoundWords(wordSalad, hintedWords, collate),
  );
  const [spotlight, setSpotlight] = useState<WordSpotlight | null>(null);
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
  const [shareRequest, setShareRequest] = useState<ShareRequest | null>(null);
  const [restartExit, setRestartExit] = useState<RestartExit | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [rankUp, setRankUp] = useState<RankUp | null>(null);
  const [lockout, setLockout] = useState<Lockout | null>(null);
  // Read once at boot; the URL-write effect strips it so re-sharing never
  // carries a stale challenge along.
  const [challengeScore, setChallengeScore] = useState<number | null>(() => {
    const raw = new URLSearchParams(window.location.search).get('score');
    const score = raw === null ? Number.NaN : Number(raw);
    return Number.isInteger(score) && score > 0 ? score : null;
  });
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
    // The dictionary is part of the puzzle's identity, so it rides in the
    // shareable URL (English stays implicit as the default).
    if (spec.id === 'en') {
      url.searchParams.delete('dict');
    } else {
      url.searchParams.set('dict', spec.id);
    }
    // Share-link challenge params are consumed at boot, not kept.
    url.searchParams.delete('score');
    url.searchParams.delete('hints');
    url.hash = '';
    window.history.replaceState(null, '', url.toString());
  }, [spec, wordSalad]);

  // Blur on any click so that Enter submits the current word instead of
  // re-triggering the last focused button or link. An open modal owns its
  // own focus (the same rule the keyboard handler follows), and a clicked
  // form field must keep the focus it just received — without these guards
  // the custom-game inputs would deselect the instant they were clicked.
  useEffect(() => {
    const blurActiveElement = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('dialog[open], input, textarea, select') !== null
      ) {
        return;
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    document.addEventListener('click', blurActiveElement);
    return () => {
      document.removeEventListener('click', blurActiveElement);
    };
  }, []);

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

    // Everything this input names: one key group, found (and hinted, and
    // scored) together. The input is hinted if its group was committed via
    // a hint reveal; the engine still records it, but it scores nothing.
    const matches = wordSalad.wordsMatching(word);
    const isHinted = matches.some((match) => hintedWords.has(match));
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
      // Submitting a word you already found is a way of asking where it is,
      // so bring it into view rather than only reporting the rejection. The
      // drum's rows are surface forms, so spotlight the group's first.
      if (preview.verdict === 'already-found') {
        setSpotlight((previous) => ({
          id: (previous?.id ?? 0) + 1,
          requested: true,
          word: matches[0] ?? word,
        }));
      }
      return;
    }

    // Detect the submission that crosses the win line, so the view can
    // celebrate the moment itself (and never a restored, already-won game).
    const winPoints = completionToPoints(WIN_THRESHOLD, wordSalad.maxPoints);
    const earnedBefore = tallyPoints(wordSalad, hintedWords).earnedPoints;

    const awarded = wordSalad.tryWord(word);
    setFeedback({
      kind: 'scored',
      word,
      points: isHinted ? 0 : awarded,
      pangram: wordSalad.pangramWords.has(word) && !isHinted,
    });

    const earnedAfter = tallyPoints(wordSalad, hintedWords).earnedPoints;
    const crossedWin = earnedBefore < winPoints && earnedAfter >= winPoints;
    const perfect = earnedAfter === wordSalad.maxPoints;
    if (crossedWin || perfect) {
      setCelebration((previous) => ({
        id: (previous?.id ?? 0) + 1,
        perfect,
        tossId,
      }));
    } else {
      // Climbing a rung gets its own (smaller) moment — but the win
      // celebration owns the submission when both land at once.
      const levelAfter = getLevel(earnedAfter / wordSalad.maxPoints);
      if (levelAfter !== getLevel(earnedBefore / wordSalad.maxPoints)) {
        setRankUp((previous) => ({
          id: (previous?.id ?? 0) + 1,
          level: levelAfter,
        }));
      }
    }

    const gameKey = storageKey(spec, wordSalad);
    setFoundWords(toFoundWords(wordSalad, hintedWords, collate));
    setSpotlight((previous) => ({
      id: (previous?.id ?? 0) + 1,
      requested: false,
      word: matches[0] ?? word,
    }));
    saveWords(gameKey, Array.from(wordSalad.foundWords.keys()));
  }, [collate, hintedWords, inputLetters, spec, tossId, wordSalad]);

  const appendLetter = useCallback(
    (character: string) => {
      // Typed characters fold into play-key space, so an AZERTY é lands as
      // E (and a typed œ as the two letters OE) instead of being rejected
      // as foreign.
      const letters = Array.from(spec.fold(character));
      const letter = letters.join('') || character.toUpperCase();

      // Reject letters outside the salad right away instead of letting the
      // player build a word that can never score.
      if (
        wordSalad !== null &&
        (letters.length === 0 ||
          letters.some((entry) => !wordSalad.characterSet.has(entry)))
      ) {
        setLastRejection((previous) => ({
          id: (previous?.id ?? 0) + 1,
          letter,
        }));
        setFeedback({ kind: 'letter-rejected', letter });
        return;
      }

      // A revealed hint is a submission in waiting: typing lands it right
      // now — the word can't be unraveled once paid for — and the typed
      // letter starts the next word from a clean slate. (Landing it also
      // ends the reveal, so its source tiles stop carrying a latent press
      // that would re-ripple as later letters are typed.)
      if (hintReveal !== null) {
        submitWord();
      }
      // End the previous word's exit so the ghost never overlaps new letters.
      setWordExit(null);
      // The feedback line speaks for the word as it stands; editing it makes
      // the last verdict history, and a stale one would misread as the reason
      // the word in progress can't be submitted.
      setFeedback(null);
      setLastAppended((previous) => ({
        id: (previous?.id ?? 0) + 1,
        letter: letters[0],
      }));
      setInputLetters((previous) => [...previous, ...letters]);
    },
    [hintReveal, spec, submitWord, wordSalad],
  );

  const deleteLetter = useCallback(() => {
    // Only signal a deletion when there is actually a letter to delete.
    if (inputLetters.length === 0) {
      return;
    }
    // Deleting can't reclaim a revealed hint — the word was paid for the
    // moment it was revealed — so the edit lands it immediately instead of
    // leaving it committed but unfound.
    if (hintReveal !== null) {
      submitWord();
      return;
    }
    setFeedback(null);
    // A fired action supersedes any lingering denial dip, so the button's
    // remount replays the press, not the dip.
    setDeniedControl(null);
    setDeleteId((previous) => previous + 1);
    setInputLetters((previous) => previous.slice(0, -1));
  }, [hintReveal, inputLetters, submitWord]);

  // Clear the whole input at once (long-press Delete, or Ctrl/Cmd+Backspace).
  const clearInput = useCallback(() => {
    if (inputLetters.length === 0) {
      return;
    }
    // As with deleteLetter: a revealed hint lands rather than unravels.
    if (hintReveal !== null) {
      submitWord();
      return;
    }
    setFeedback(null);
    setDeniedControl(null);
    setDeleteId((previous) => previous + 1);
    setInputLetters([]);
  }, [hintReveal, inputLetters, submitWord]);

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

  // Reveal the next hint word and commit it: its points are forfeit from
  // this moment. The reveal fills the input and the word then submits
  // itself (the auto-submit effect below), so a hint is a single action.
  // Re-revealing a committed word the player deleted charges nothing new.
  const revealHint = useCallback(() => {
    if (wordSalad === null) {
      return;
    }
    const hint = nextHintWord(wordSalad, hintedWords);
    if (hint === null) {
      return;
    }

    // The input carries the play key — the letters one would type — while
    // the found list will show the real spellings the reveal pays for.
    const letters = Array.from(wordSalad.keyOf(hint.word));
    setInputLetters(letters);
    // The revealed word replaces whatever was typed, so the last verdict no
    // longer describes what's in the word area.
    setFeedback(null);
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

      // Detect the hint that spends the win out of reach: the reachable
      // maximum falls below the win line for the first time. Fires only
      // here (during play), so a restored already-locked game stays calm.
      const winPoints = completionToPoints(WIN_THRESHOLD, wordSalad.maxPoints);
      const { earnedPoints, lostPoints } = tallyPoints(wordSalad, hintedWords);
      const reachableBefore = wordSalad.maxPoints - lostPoints;
      const reachableAfter = reachableBefore - hint.cost;
      const hasWon = earnedPoints >= winPoints;
      if (
        !hasWon &&
        reachableBefore >= winPoints &&
        reachableAfter < winPoints
      ) {
        setLockout((previous) => ({ id: (previous?.id ?? 0) + 1 }));
      }

      // Commit the whole key group: submission finds côte and côté
      // together, so the hint pays for them together.
      const committed = new Set(hintedWords);
      for (const sibling of wordSalad.wordsMatching(hint.word)) {
        committed.add(sibling);
      }
      setHintedWords(committed);
      saveHintedWords(storageKey(spec, wordSalad), Array.from(committed));
    }
  }, [hintedWords, spec, wordSalad]);

  // Fill the word area with a gap row's derivable prefix. The tap spares
  // the typing, nothing more — unlike a hint, nothing is paid or
  // committed, because the letters were already the player's to know.
  const prefillWord = useCallback(
    (prefix: string) => {
      if (wordSalad === null || prefix.length === 0) {
        return;
      }
      // A revealed hint is a submission in waiting: it lands first (the
      // word can't be unraveled once paid for) and the prefill starts the
      // next word, exactly as typing over a reveal would.
      if (hintReveal !== null) {
        submitWord();
      } else {
        const current = inputLetters.join('');
        // A word already built on this very stem survives the tap; the
        // prefix has nothing to add, and a re-tap must not destroy it.
        // Letters a tap put there are not that work, though: asking one
        // block for CI and then another for C must answer with C, not sit
        // on the longer stem as if the player had typed it.
        if (
          current !== prefilledStem.current &&
          current.length >= prefix.length &&
          current.startsWith(prefix)
        ) {
          return;
        }
      }
      // Untouched, this marks the input as the tap's doing rather than the
      // player's; any edit moves the input off it, and it is then typed
      // work again.
      prefilledStem.current = prefix;
      setFeedback(null);
      setWordExit(null);
      // One press signal for the whole fill: the last letter ticks and its
      // salad tile ripples, as if it had just been typed.
      setLastAppended((previous) => ({
        id: (previous?.id ?? 0) + 1,
        letter: prefix[prefix.length - 1],
      }));
      setInputLetters(Array.from(prefix));
    },
    [hintReveal, inputLetters, submitWord, wordSalad],
  );

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
    const init = generateGameInit(dictionary, spec);
    setGameState((previous) => ({ id: previous.id + 1, init }));
    setSaladLetters(
      'wordSalad' in init
        ? shuffled(Array.from(init.wordSalad.characterSet))
        : [],
    );
    setInputLetters([]);
    setFeedback(null);
    setFoundWords([]);
    setSpotlight(null);
    setLastSubmission(null);
    setLastRejection(null);
    setLastAppended(null);
    setHintReveal(null);
    setSpentHint(null);
    setWordExit(null);
    setDeniedControl(null);
    setCelebration(null);
    setRankUp(null);
    setLockout(null);
    // A shared challenge belongs to the puzzle it arrived with.
    setChallengeScore(null);
    // Reset the press counters so the control buttons don't replay a ripple
    // when the board remounts for the fresh game.
    setTossId(0);
    setDeleteId(0);
    setHintedWords(new Set());
  }, [dictionary, spec]);

  // The slot map, mirrored through a ref: restartGame reads it to capture
  // the rows a restart wipes, but the memo deriving it sits later in this
  // file — a plain dependency would be read before initialization.
  const latestWordSlots = useRef<readonly WordSlot[]>([]);

  // Same salad, clean slate: rebuild the engine from the same parameters
  // and drop the saved progress.
  const restartGame = useCallback(() => {
    if (wordSalad === null) {
      return;
    }
    // Capture what the wipe takes, for the drum to fly out toward the
    // Restart button — the absorb that makes the button's effect legible.
    const exitRows = latestWordSlots.current
      .map((slot: WordSlot, index: number) =>
        slot.found === null
          ? null
          : {
              index,
              word: slot.found.word,
              hinted: slot.found.hinted,
              pangram: slot.found.pangram,
            },
      )
      .filter((row): row is RestartExitRow => row !== null);
    if (exitRows.length > 0) {
      setRestartExit((previous) => ({
        id: (previous?.id ?? 0) + 1,
        rows: exitRows,
      }));
    }
    clearSavedProgress(storageKey(spec, wordSalad));
    const fresh = new WordSalad(
      wordSalad.characterSet,
      wordSalad.requiredCharacters,
      wordSalad.minimumLength,
      dictionary,
      spec.fold,
    );
    setGameState((previous) => ({
      id: previous.id,
      init: { wordSalad: fresh },
    }));
    setInputLetters([]);
    setFeedback(null);
    setFoundWords([]);
    setSpotlight(null);
    setLastSubmission(null);
    setLastRejection(null);
    setLastAppended(null);
    setHintReveal(null);
    setSpentHint(null);
    setWordExit(null);
    setDeniedControl(null);
    setCelebration(null);
    setRankUp(null);
    setLockout(null);
    setTossId(0);
    setDeleteId(0);
    setHintedWords(new Set());
  }, [dictionary, spec, wordSalad]);

  // A hint is a single action: once the reveal cascade has played out and
  // the player has had a beat to read the word, it submits itself. A manual
  // submit or an edit lands the word sooner; either clears the reveal, and
  // this timer with it, so the word never submits twice.
  useEffect(() => {
    if (hintReveal === null) {
      return;
    }
    const cascade =
      hintReveal.letters.length * REVEAL_STAGGER_MS + REVEAL_LETTER_MS;
    const timer = window.setTimeout(submitWord, cascade + REVEAL_READ_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [hintReveal, submitWord]);

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

      // Any single letter key, in any script: appendLetter folds it into
      // play-key space and rejects what the board can't use.
      if (/^\p{L}$/u.test(event.key)) {
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
      } else if (matchesDigitKey(event, '1')) {
        // The meta row's shortcuts: plain digits, numbered left to right —
        // digits are the one key family no dictionary's words can claim.
        startNewGame();
      } else if (matchesDigitKey(event, '2')) {
        // Restart and Share stay gated exactly like their buttons — with
        // nothing found there is nothing to clear or share — and a gated
        // keystroke dips the pill in acknowledgment.
        if (foundWords.length > 0) {
          restartGame();
        } else {
          denyControl('restart');
        }
      } else if (matchesDigitKey(event, '3')) {
        if (foundWords.length > 0) {
          setShareRequest((previous) => ({ id: (previous?.id ?? 0) + 1 }));
        } else {
          denyControl('share');
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
    foundWords,
    inputLetters,
    restartGame,
    revealHint,
    startNewGame,
    submitWord,
    tossSalad,
    wordSalad,
  ]);

  // Every word in the puzzle, alphabetized once per engine instance in the
  // list's display order. Found or not, each word owns a fixed slot for
  // the life of the game.
  const allWords = useMemo(
    () =>
      wordSalad === null
        ? []
        : [...wordSalad.foundWords.keys(), ...wordSalad.remainingWords].sort(
            collate,
          ),
    [collate, wordSalad],
  );

  // The board's letters in the dictionary's own order, shared by every
  // derivation below.
  const boardAlphabet = useMemo(
    () =>
      wordSalad === null
        ? []
        : rankedLetters(wordSalad.characterSet, spec.lang),
    [spec.lang, wordSalad],
  );

  // The slot map and the gaps between finds, rebuilt together: each find
  // splits a gap in two, so every prefix is recomputed from the fresh
  // neighbors — the list comes into focus as the game goes.
  const { wordSlots, gaps } = useMemo(() => {
    if (wordSalad === null) {
      return {
        wordSlots: [] as readonly WordSlot[],
        gaps: [] as readonly WordGap[],
      };
    }
    const found = new Map(foundWords.map((entry) => [entry.word, entry]));
    const isFound = (word: string) => found.has(word);
    const keyOf = (word: string) => wordSalad.keyOf(word);
    const prefixes = slotPrefixes({
      words: allWords,
      isFound,
      keyOf,
      alphabet: boardAlphabet,
      minimumLength: wordSalad.minimumLength,
    });
    return {
      wordSlots: allWords.map((word, index) => ({
        found: found.get(word) ?? null,
        prefix: prefixes[index],
      })),
      gaps: wordGaps({ words: allWords, isFound, keyOf }),
    };
  }, [allWords, boardAlphabet, foundWords, wordSalad]);

  useEffect(() => {
    latestWordSlots.current = wordSlots;
  }, [wordSlots]);

  // The board letters that could still extend the typed word into a new
  // find; the rack dims the rest. A hint reveal suspends the dimming: the
  // rack is a spectacle during the cascade, not an input surface, and the
  // revealed word is being committed rather than explored.
  const liveLetters = useMemo<ReadonlySet<string>>(() => {
    if (wordSalad === null) {
      return new Set();
    }
    if (hintReveal !== null) {
      return new Set(wordSalad.characterSet);
    }
    return liveNextLetters({
      gaps,
      alphabet: boardAlphabet,
      minimumLength: wordSalad.minimumLength,
      prefix: inputLetters.join(''),
    });
  }, [boardAlphabet, gaps, hintReveal, inputLetters, wordSalad]);

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
    saveSummary(storageKey(spec, wordSalad), {
      earned: points.earnedPoints,
      found: foundWords.length,
      hints: hintedWords.size,
      lost: points.lostPoints,
      max: wordSalad.maxPoints,
      playedAt: Date.now(),
      total: allWords.length,
    });
  }, [allWords, foundWords, hintedWords, spec, wordSalad]);

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
          wordSalad
            .wordsMatching(inputWord)
            .some((match) => hintedWords.has(match)),
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
    requiredCharacters: wordSalad.requiredCharacters,
    inputLetters,
    isValidCharacter,
    liveLetters,
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
    rankUp,
    lockout,
    feedback,
    foundWords,
    wordSlots,
    spotlight,
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
    isPerfect: earnedPoints === wordSalad.maxPoints,
    lockedOut,
    canHint,
    hintCost,
    hintForfeitsWin,
    hintCount: hintedWords.size,
    challengeScore,
    tossId,
    deleteId,
    gameId: gameState.id,
    shareRequest,
    restartExit,
    appendLetter,
    deleteLetter,
    clearInput,
    tossSalad,
    submitWord,
    startNewGame,
    restartGame,
    revealHint,
    prefillWord,
  };
}
