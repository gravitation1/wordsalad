import { useMessages } from '../i18n';
import type { GameFeedback } from '../useWordSaladGame';

interface FeedbackLineProps {
  feedback: GameFeedback | null;
}

export function FeedbackLine({ feedback }: FeedbackLineProps) {
  const t = useMessages();
  const isSuccess = feedback?.kind === 'scored';

  return (
    <p
      className={`flex h-6 items-center gap-1.5 text-sm font-medium ${
        isSuccess ? 'text-accent' : 'text-red-600 dark:text-red-400'
      }`}
      role="status"
    >
      {feedback === null ? null : (
        <>
          <span aria-hidden="true">{isSuccess ? '✓' : '✕'}</span>
          <span>{t.feedbackText(feedback)}</span>
        </>
      )}
    </p>
  );
}
