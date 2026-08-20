import { useMessages } from '../i18n';
import type { GameFeedback } from '../useWordSaladGame';
import { miniTileClass } from './tiles';

interface FeedbackLineProps {
  feedback: GameFeedback | null;
  requiredCharacters: string;
}

export function FeedbackLine({
  feedback,
  requiredCharacters,
}: FeedbackLineProps) {
  const t = useMessages();
  const isSuccess = feedback?.kind === 'scored';

  // Every message names something the player just typed — a word, or the
  // stray letter they reached for. That subject is set in the game's
  // miniature tiles and spliced back into the localized sentence wherever it
  // sits in it, so a rejected word is as legible as a scored one; the full
  // sentence stays for screen readers.
  const renderMessage = () => {
    if (feedback === null) {
      return null;
    }
    const message = t.feedbackText(feedback);
    const subject =
      feedback.kind === 'letter-rejected' ? feedback.letter : feedback.word;
    const at = message.indexOf(subject);
    if (at < 0) {
      return <span>{message}</span>;
    }
    const prefix = message.slice(0, at).trim();
    const suffix = message.slice(at + subject.length).trim();
    const compact = subject.length > 9;
    return (
      <>
        <span className="sr-only">{message}</span>
        <span
          aria-hidden="true"
          className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1"
        >
          {prefix === '' ? null : <span>{prefix}</span>}
          <span
            className={`flex items-center ${compact ? 'gap-0.5' : 'gap-1'}`}
          >
            {Array.from(subject).map((letter, index) => (
              <span
                className={miniTileClass(letter, requiredCharacters, {
                  compact,
                  // A scored pangram announces itself fully lit, exactly
                  // as its row on the drum will render.
                  pangram: feedback.kind === 'scored' && feedback.pangram,
                })}
                key={index}
              >
                {letter}
              </span>
            ))}
          </span>
          {suffix === '' ? null : <span>{suffix}</span>}
        </span>
      </>
    );
  };

  return (
    <p
      className={`flex min-h-6 items-center gap-1.5 text-sm font-medium ${
        isSuccess ? 'text-accent' : 'text-red-600 dark:text-red-400'
      }`}
      role="status"
    >
      {feedback === null ? null : (
        <>
          <span aria-hidden="true">{isSuccess ? '✓' : '✕'}</span>
          {renderMessage()}
        </>
      )}
    </p>
  );
}
