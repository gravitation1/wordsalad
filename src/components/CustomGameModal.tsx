import { useEffect, useMemo, useRef, useState } from 'react';

import { generateWordSalad, storeWordSalad } from '../game/generation';
import { WordSalad } from '../game/wordSalad';
import { useMessages } from '../i18n';
import { TILE_FACE } from './tiles';

// Build-a-puzzle dialog. The two ways to get a game are genuinely different
// tasks, so they are an explicit choice rather than an implicit mode the form
// slips into: "Surprise me" hands the levers to the generator, "Choose
// letters" pins an exact board (previewed exactly, one dictionary pass per
// edit). Either way "Create" leaves via a real navigation to the canonical
// puzzle URL, which boots the game.
interface CustomGameModalProps {
  dictionary: readonly string[];
  onClose: () => void;
}

type Mode = 'random' | 'letters';

type PreviewState =
  | { kind: 'stats'; words: number; points: number; pangram: boolean }
  | { kind: 'error'; error: 'no-words' }
  | { kind: 'random' }
  | null;

const MAX_LETTERS = 7;

// The dictionary's shortest words are two letters, so anything below that
// only inflates scores without changing the game; nine is past the longest
// word these boards produce. Entries outside the range are clamped as they
// are typed, so the field never shows a value the game will not actually use.
const MIN_LENGTH_FLOOR = 2;
const MIN_LENGTH_CEILING = 9;
const MIN_WORDS_FLOOR = 1;

function clamp(value: number, low: number, high: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, low), high) : low;
}

// Keep an input to distinct uppercase letters, capped at `max`.
function sanitizeLetters(value: string, max: number): string {
  return Array.from(new Set(value.toUpperCase().replace(/[^A-Z]/g, '')))
    .join('')
    .slice(0, max);
}

// A deterministic puzzle from the chosen letters. An empty required set is
// taken at face value — a board where every word from the letters counts —
// rather than quietly standing in a derived letter the tiles do not show.
function buildFixedGame(
  dictionary: readonly string[],
  letters: string,
  required: string,
  minLength: number,
): WordSalad {
  return new WordSalad(new Set(letters), required, minLength, dictionary);
}

export function CustomGameModal({ dictionary, onClose }: CustomGameModalProps) {
  const t = useMessages();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>('random');
  const lettersInputRef = useRef<HTMLInputElement>(null);
  const [letters, setLetters] = useState('');
  // Required letters are picked by tapping tiles (so they can never fall
  // outside the board), while the generator's are typed (no board yet).
  const [requiredTiles, setRequiredTiles] = useState('');
  const [minLength, setMinLength] = useState(4);
  const [minWords, setMinWords] = useState(15);
  const [maxWords, setMaxWords] = useState(60);

  // A range that cannot invert: pushing one bound past the other carries it
  // along, so there is no invalid pair to scold the user about.
  const changeMinWords = (value: number) => {
    setMinWords(value);
    setMaxWords((previous) => Math.max(previous, value));
  };

  const changeMaxWords = (value: number) => {
    setMaxWords(value);
    setMinWords((previous) => Math.min(previous, value));
  };
  const [requirePangram, setRequirePangram] = useState(true);
  const [createFailed, setCreateFailed] = useState(false);

  // Editing the letters silently drops any selection no longer on the board.
  // Nothing lit means exactly that: a board with no required letter, which is
  // a legitimate (easier) puzzle rather than a state to paper over.
  const required = Array.from(requiredTiles)
    .filter((letter) => letters.includes(letter))
    .join('');

  const toggleRequired = (letter: string) => {
    setRequiredTiles(
      required.includes(letter)
        ? Array.from(required)
            .filter((each) => each !== letter)
            .join('')
        : required + letter,
    );
  };

  // Focus lands on the letters caret whenever that mode is showing — the
  // field the dialog exists to collect.
  useEffect(() => {
    if (mode === 'letters') {
      lettersInputRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) {
      // jsdom lacks showModal in some versions; fall back to plain open.
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }
  }, []);

  // Exact for a chosen board — word count, max points, whether it has a
  // pangram — recomputed on every edit (a dictionary pass is a few ms).
  const preview: PreviewState = useMemo(() => {
    if (mode === 'letters') {
      if (letters.length === 0) {
        return null;
      }
      try {
        const wordSalad = buildFixedGame(
          dictionary,
          letters,
          required,
          minLength,
        );
        return {
          kind: 'stats',
          words: wordSalad.remainingWords.size,
          points: wordSalad.maxPoints,
          pangram: wordSalad.pangramWords.size > 0,
        };
      } catch (_error) {
        return { kind: 'error', error: 'no-words' };
      }
    }
    return { kind: 'random' };
  }, [dictionary, letters, minLength, mode, required]);

  const canCreate = preview !== null && preview.kind !== 'error';

  const handleCreate = () => {
    setCreateFailed(false);
    let wordSalad: WordSalad;
    try {
      wordSalad =
        mode === 'letters'
          ? buildFixedGame(dictionary, letters, required, minLength)
          : generateWordSalad(dictionary, {
              minimumLength: minLength,
              minWords,
              maxWords,
              requirePangram,
            });
    } catch (_error) {
      setCreateFailed(true);
      return;
    }
    // Navigate to the canonical puzzle URL (a real load boots the game),
    // preserving any language override.
    const [gameLetters, gameRequired, gameMin] =
      storeWordSalad(wordSalad).split('.');
    const url = new URL(window.location.href);
    const lang = url.searchParams.get('lang');
    url.search = '';
    if (lang !== null) {
      url.searchParams.set('lang', lang);
    }
    url.searchParams.set('letters', gameLetters);
    url.searchParams.set('required', gameRequired);
    if (gameMin !== '4') {
      url.searchParams.set('min', gameMin);
    }
    window.location.assign(url.toString());
  };

  const numberClass =
    'w-16 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-accent focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';
  const labelClass = 'text-sm font-medium text-gray-700 dark:text-gray-300';
  const hintClass = 'text-xs text-gray-400 dark:text-gray-500';
  const subLabelClass = 'text-xs text-gray-500 dark:text-gray-400';

  const modes: { label: string; value: Mode }[] = [
    { label: t.customModeRandom, value: 'random' },
    { label: t.customModeLetters, value: 'letters' },
  ];

  return (
    // Backdrop click closes the dialog. The keyboard equivalent the a11y
    // rules ask for is built into <dialog> itself — Esc fires onClose —
    // so the handler needs no key listener of its own.
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
       jsx-a11y/no-noninteractive-element-interactions */
    <dialog
      aria-labelledby="custom-title"
      className="m-auto w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/40 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      data-testid="custom-dialog"
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      onClose={onClose}
      ref={dialogRef}
      tabIndex={-1}
    >
      <button
        aria-label={t.closeButton}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-95 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        onClick={onClose}
        type="button"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <h2
        className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
        id="custom-title"
      >
        {t.customGameTitle}
      </h2>

      {/* A real form, so Enter from any field creates the game. Not
          method="dialog": that would close the dialog instead of submitting. */}
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (canCreate) {
            handleCreate();
          }
        }}
      >
        {/* Real radios: the browser supplies arrow-key navigation and the
            grouping semantics a pair of toggle buttons would have to fake. */}
        <fieldset>
          <legend className="sr-only">{t.customModeLegend}</legend>
          <div className="flex gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
            {modes.map((option) => (
              <label className="flex-1" key={option.value}>
                <input
                  checked={mode === option.value}
                  className="peer sr-only"
                  name="custom-mode"
                  onChange={() => {
                    setMode(option.value);
                    setCreateFailed(false);
                  }}
                  type="radio"
                  value={option.value}
                />
                <span className="block cursor-pointer rounded-full px-3 py-1.5 text-center text-sm font-medium text-gray-500 transition peer-checked:bg-white peer-checked:text-accent peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-accent dark:text-gray-400 dark:peer-checked:bg-gray-900">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {mode === 'letters' ? (
          // One control, not two: the letters are shown once — as the game's
          // own tiles — and typing feeds the same row. Tapping a tile marks
          // it required, so a required letter can never sit off the board.
          <div className="space-y-1">
            <label className={labelClass} htmlFor="custom-letters">
              {t.customLettersLabel}
            </label>
            <div className="flex min-h-12 flex-wrap items-center gap-1 rounded-lg border border-gray-300 bg-white p-1.5 focus-within:border-accent dark:border-gray-700 dark:bg-gray-900">
              {Array.from(letters).map((letter) => {
                const isRequired = required.includes(letter);
                return (
                  <button
                    aria-pressed={isRequired}
                    className={`flex h-9 w-9 touch-manipulation items-center justify-center rounded-lg text-base font-bold transition active:scale-90 ${
                      isRequired ? TILE_FACE.accent : TILE_FACE.plain
                    }`}
                    data-letter={letter}
                    data-required={isRequired ? 'true' : 'false'}
                    key={letter}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleRequired(letter);
                    }}
                    type="button"
                  >
                    {letter}
                  </button>
                );
              })}
              {/* A caret that consumes what you type: its own value stays
                  empty, so each letter lands as a tile. It stays mounted at
                  the cap (where typing is simply ignored) so Backspace can
                  always take the last tile back. */}
              <input
                aria-label={t.customLettersLabel}
                className="h-9 min-w-6 flex-1 bg-transparent px-1 text-base uppercase tracking-widest text-gray-900 focus:outline-none dark:text-gray-100"
                id="custom-letters"
                inputMode="text"
                onChange={(event) => {
                  setLetters((previous) =>
                    sanitizeLetters(previous + event.target.value, MAX_LETTERS),
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && letters.length > 0) {
                    setLetters((previous) => previous.slice(0, -1));
                  }
                }}
                ref={lettersInputRef}
                value=""
              />
            </div>
            <p className={hintClass}>{t.customLettersHint}</p>
          </div>
        ) : (
          <>
            {/* A range, shown as one: a labelled group with min and max
                sub-labels rather than two bare boxes and a dash. */}
            <fieldset className="space-y-1.5">
              <legend className={labelClass}>{t.customWordCountLabel}</legend>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <label className={subLabelClass} htmlFor="custom-min-words">
                    {t.customMinLabel}
                  </label>
                  <input
                    className={numberClass}
                    id="custom-min-words"
                    min={MIN_WORDS_FLOOR}
                    onBlur={() => {
                      changeMinWords(Math.max(minWords, MIN_WORDS_FLOOR));
                    }}
                    onChange={(event) => {
                      changeMinWords(Number(event.target.value));
                    }}
                    type="number"
                    value={minWords}
                  />
                </span>
                <span aria-hidden="true" className={hintClass}>
                  —
                </span>
                <span className="flex items-center gap-1.5">
                  <label className={subLabelClass} htmlFor="custom-max-words">
                    {t.customMaxLabel}
                  </label>
                  <input
                    className={numberClass}
                    id="custom-max-words"
                    min={MIN_WORDS_FLOOR}
                    onBlur={() => {
                      changeMaxWords(Math.max(maxWords, MIN_WORDS_FLOOR));
                    }}
                    onChange={(event) => {
                      changeMaxWords(Number(event.target.value));
                    }}
                    type="number"
                    value={maxWords}
                  />
                </span>
              </div>
            </fieldset>

            <label className="flex items-center justify-between gap-4">
              <span className={labelClass}>{t.customPangramLabel}</span>
              <input
                checked={requirePangram}
                className="h-5 w-5 touch-manipulation accent-accent"
                onChange={(event) => {
                  setRequirePangram(event.target.checked);
                }}
                type="checkbox"
              />
            </label>
          </>
        )}

        {/* Applies to both kinds of game, so it sits outside the split. */}
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          <label className={labelClass} htmlFor="custom-min-length">
            {t.customMinLengthLabel}
          </label>
          <input
            className={numberClass}
            id="custom-min-length"
            max={MIN_LENGTH_CEILING}
            min={MIN_LENGTH_FLOOR}
            onChange={(event) => {
              setMinLength(
                clamp(
                  Number(event.target.value),
                  MIN_LENGTH_FLOOR,
                  MIN_LENGTH_CEILING,
                ),
              );
            }}
            type="number"
            value={minLength}
          />
        </div>

        {/* Exact stats for a chosen board, or what the generator will make;
            announced politely for screen readers. */}
        <p
          aria-live="polite"
          className="min-h-5 text-sm"
          data-testid="custom-preview"
        >
          {preview === null ? null : preview.kind === 'error' ? (
            <span className="font-medium text-red-600 dark:text-red-400">
              {t.customError(preview.error)}
            </span>
          ) : preview.kind === 'random' ? (
            <span className="text-gray-500 dark:text-gray-400">
              {t.customPreviewRandom(minWords, maxWords)}
            </span>
          ) : (
            <span className="font-medium text-accent">
              {t.customPreview(preview.words, preview.points, preview.pangram)}
            </span>
          )}
        </p>

        {createFailed ? (
          <p
            className="text-sm font-medium text-red-600 dark:text-red-400"
            role="alert"
          >
            {t.customError('generate-failed')}
          </p>
        ) : null}

        <button
          className="min-h-11 w-full touch-manipulation rounded-full bg-accent px-5 py-2 font-medium text-white transition hover:bg-accent/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canCreate}
          type="submit"
        >
          {t.customCreateButton}
        </button>
      </form>
    </dialog>
  );
}
