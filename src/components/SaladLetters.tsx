import { useMessages } from '../i18n';
import type { LetterActivation } from '../useWordSaladGame';

interface SaladLettersProps {
  lastAppended: LetterActivation | null;
  letters: readonly string[];
  onLetter: (letter: string) => void;
  requiredCharacter: string;
  tossId: number;
}

export function SaladLetters({
  lastAppended,
  letters,
  onLetter,
  requiredCharacter,
  tossId,
}: SaladLettersProps) {
  const t = useMessages();

  return (
    // Remounts on every toss (key) so the letters replay the toss animation
    // as they land in their new order. On small screens the width is capped
    // to four tiles (4 x 3rem + 3 x 0.5rem gaps) so seven letters wrap into
    // a balanced, centered 4+3 instead of an awkward 6+1.
    <div
      className="flex max-w-[13.5rem] flex-wrap justify-center gap-2 sm:max-w-none"
      key={tossId}
    >
      {letters.map((letter, index) => {
        const isRequired = letter === requiredCharacter;
        const isJustAppended = lastAppended?.letter === letter;
        return (
          // The stable outer span owns the toss-in entrance; the inner
          // button remounts per activation (key) to replay the press —
          // whether the letter was tapped or typed on the keyboard.
          <span
            className="letter-toss inline-block"
            key={`${letter}${index}`}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <button
              className={`relative h-12 w-12 touch-manipulation rounded-xl border text-xl font-semibold transition active:scale-90 ${
                isRequired
                  ? 'border-accent bg-accent text-white'
                  : 'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
              } ${isJustAppended ? 'control-press' : ''}`}
              data-letter={letter}
              data-pressed={isJustAppended ? 'true' : 'false'}
              data-required={isRequired ? 'true' : 'false'}
              key={isJustAppended ? `pressed-${lastAppended?.id ?? 0}` : 'idle'}
              onClick={() => {
                onLetter(letter);
              }}
              title={isRequired ? t.requiredLetterTitle : undefined}
              type="button"
            >
              {letter}
              {isJustAppended ? (
                <span
                  aria-hidden="true"
                  className="control-ring pointer-events-none absolute inset-0 rounded-xl"
                />
              ) : null}
            </button>
          </span>
        );
      })}
    </div>
  );
}
