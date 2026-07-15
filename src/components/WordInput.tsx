import { useMessages } from '../i18n';
import type { LetterRejection } from '../useWordSaladGame';

interface WordInputProps {
  inputLetters: readonly string[];
  rejection: LetterRejection | null;
  requiredCharacter: string;
  isValidCharacter: (character: string) => boolean;
}

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

export function WordInput({
  inputLetters,
  rejection,
  requiredCharacter,
  isValidCharacter,
}: WordInputProps) {
  const t = useMessages();

  return (
    <p
      className={`flex h-10 items-center text-3xl font-semibold tracking-widest ${
        rejection === null ? '' : 'input-shake'
      }`}
      // Remounts on every rejection (key) to replay the shake.
      key={rejection?.id ?? 0}
    >
      <span aria-label={t.currentWordLabel}>
        {inputLetters.map((letter, index) => (
          <span
            className={letterClass(letter, requiredCharacter, isValidCharacter)}
            key={`${letter}${index}`}
          >
            {letter}
          </span>
        ))}
      </span>
      <span
        aria-hidden="true"
        className="animate-pulse font-light text-gray-400"
      >
        |
      </span>
    </p>
  );
}
