import { useMessages } from '../i18n';
import type { GameFeedback } from '../useWordSaladGame';
import { miniTileClass } from './tiles';

interface FeedbackLineProps {
  feedback: GameFeedback | null;
  requiredCharacter: string;
}

export function FeedbackLine({
  feedback,
  requiredCharacter,
}: FeedbackLineProps) {
  const t = useMessages();
  const isSuccess = feedback?.kind === 'scored';

  // A scored word celebrates in the game's miniature tiles, spliced into
  // the localized sentence wherever the word sits in it; the full sentence
  // stays for screen readers. Rejections remain plain text.
  const renderMessage = () => {
    if (feedback === null) {
      return null;
    }
    const message = t.feedbackText(feedback);
    if (feedback.kind !== 'scored' || !message.includes(feedback.word)) {
      return <span>{message}</span>;
    }
    const at = message.indexOf(feedback.word);
    const prefix = message.slice(0, at).trim();
    const suffix = message.slice(at + feedback.word.length).trim();
    const compact = feedback.word.length > 9;
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
            {Array.from(feedback.word).map((letter, index) => (
              <span
                className={miniTileClass(letter, requiredCharacter, {
                  compact,
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
