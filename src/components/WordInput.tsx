import { useMessages } from '../i18n';
import type { HintReveal, LetterRejection } from '../useWordSaladGame';

interface WordInputProps {
  canHint: boolean;
  hintReveal: HintReveal | null;
  inputLetters: readonly string[];
  onHint: () => void;
  rejection: LetterRejection | null;
  requiredCharacter: string;
  isValidCharacter: (character: string) => boolean;
}

// Letters cascade in when they arrive from a hint; typed letters appear at
// once. Position i is delayed proportionally so it reads as a reveal.
const REVEAL_STAGGER_MS = 45;

function letterClass(
  letter: string,
  requiredCharacter: string,
  isValidCharacter: (character: string) => boolean,
): string {
  if (letter === requiredCharacter) {
    return 'text-accent';
  } else if (isValidCharacter(letter)) {
    return '';
  }
  return 'text-red-500';
}

// The reveal is active while the untouched hinted word fills the input. This
// stays false for typed letters, and turns itself off the moment the player
// edits (the input no longer matches the hint).
function isHintReveal(
  hintReveal: HintReveal | null,
  inputLetters: readonly string[],
): boolean {
  return (
    hintReveal !== null &&
    hintReveal.letters.length === inputLetters.length &&
    hintReveal.letters.every((letter, index) => letter === inputLetters[index])
  );
}

export function WordInput({
  canHint,
  hintReveal,
  inputLetters,
  onHint,
  rejection,
  requiredCharacter,
  isValidCharacter,
}: WordInputProps) {
  const t = useMessages();
  const isRevealing = isHintReveal(hintReveal, inputLetters);

  // When nothing is typed, the word area offers a hint instead of a cursor.
  const showHint = inputLetters.length === 0 && canHint;

  return (
    <p
      className={`flex h-10 items-center text-3xl font-semibold tracking-widest ${
        rejection === null ? '' : 'input-shake'
      }`}
      // Remounts on every rejection (key) to replay the shake.
      key={rejection?.id ?? 0}
    >
      <span aria-label={t.currentWordLabel} data-revealing={isRevealing}>
        {inputLetters.map((letter, index) => (
          <span
            className={`${letterClass(letter, requiredCharacter, isValidCharacter)} ${
              isRevealing ? 'letter-reveal' : ''
            }`}
            key={`${letter}${index}`}
            style={
              isRevealing
                ? { animationDelay: `${index * REVEAL_STAGGER_MS}ms` }
                : undefined
            }
          >
            {letter}
          </span>
        ))}
      </span>
      {showHint ? (
        <button
          className="h-10 touch-manipulation rounded-full px-4 text-sm font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          onClick={onHint}
          type="button"
        >
          {t.hintButton}
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="animate-pulse font-light text-gray-400"
        >
          |
        </span>
      )}
    </p>
  );
}
