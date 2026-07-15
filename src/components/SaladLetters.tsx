import { useMessages } from '../i18n';

interface SaladLettersProps {
  letters: readonly string[];
  onLetter: (letter: string) => void;
  requiredCharacter: string;
  tossId: number;
}

export function SaladLetters({
  letters,
  onLetter,
  requiredCharacter,
  tossId,
}: SaladLettersProps) {
  const t = useMessages();

  return (
    // Remounts on every toss (key) so the letters replay the toss animation
    // as they land in their new order.
    <div className="flex flex-wrap justify-center gap-2" key={tossId}>
      {letters.map((letter, index) => {
        const isRequired = letter === requiredCharacter;
        return (
          <button
            className={`letter-toss h-12 w-12 touch-manipulation rounded-xl border text-xl font-semibold transition active:scale-90 ${
              isRequired
                ? 'border-accent bg-accent text-white'
                : 'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
            }`}
            data-letter={letter}
            data-required={isRequired ? 'true' : 'false'}
            key={`${letter}${index}`}
            onClick={() => {
              onLetter(letter);
            }}
            style={{ animationDelay: `${index * 45}ms` }}
            title={isRequired ? t.requiredLetterTitle : undefined}
            type="button"
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
