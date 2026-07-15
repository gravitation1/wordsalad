import { useMessages } from '../i18n';
import type {
  SubmitReadiness,
  SubmittedPreview,
  WordPreview,
} from '../useWordSaladGame';

interface GameControlsProps {
  canDelete: boolean;
  deleteId: number;
  lastSubmission: SubmittedPreview | null;
  onDelete: () => void;
  onSubmit: () => void;
  onToss: () => void;
  preview: WordPreview | null;
  submitReadiness: SubmitReadiness;
  tossId: number;
}

const BASE_CLASS =
  'min-h-11 w-full touch-manipulation rounded-full border px-2 py-2 font-medium transition active:scale-95';

const NEUTRAL_CLASS = `${BASE_CLASS} border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800`;

// Shared look for any control whose action currently does nothing.
const DISABLED_CLASS = `${BASE_CLASS} cursor-not-allowed border-dashed border-gray-300 text-gray-300 dark:border-gray-700 dark:text-gray-700`;

// Submit ramps up with the input: disabled when empty, orange while the word
// will not score, filled green when it will.
const SUBMIT_CLASS: Record<SubmitReadiness, string> = {
  empty: DISABLED_CLASS,
  partial: `${BASE_CLASS} border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-orange-400/40 dark:bg-orange-400/10 dark:text-orange-400 dark:hover:bg-orange-400/20`,
  ready: `${BASE_CLASS} border-accent bg-accent text-white hover:bg-accent/90`,
};

const BADGE_BASE_CLASS =
  'absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border px-1 text-xs font-bold';

const BADGE_CLASS: Record<WordPreview['verdict'], string> = {
  'already-found': `${BADGE_BASE_CLASS} border-orange-300 bg-white text-orange-600 dark:bg-gray-950 dark:text-orange-400`,
  'invalid-letters': `${BADGE_BASE_CLASS} border-red-300 bg-white text-red-500 dark:border-red-400/40 dark:bg-gray-950 dark:text-red-400`,
  'missing-required': `${BADGE_BASE_CLASS} border-orange-300 bg-white text-orange-600 dark:bg-gray-950 dark:text-orange-400`,
  'not-a-word': `${BADGE_BASE_CLASS} border-orange-300 bg-white text-orange-600 dark:bg-gray-950 dark:text-orange-400`,
  'too-short': `${BADGE_BASE_CLASS} border-orange-300 bg-white text-orange-600 dark:bg-gray-950 dark:text-orange-400`,
  valid: `${BADGE_BASE_CLASS} border-accent bg-white text-accent dark:bg-gray-950`,
};

// Keyboard hints only make sense on devices with a precise pointer (i.e.
// not phones/tablets), detected purely via CSS media query.
const HINT_CLASS =
  'hidden pointer-fine:block text-xs font-normal leading-none opacity-60';

function badgeText(preview: WordPreview): string {
  switch (preview.verdict) {
    case 'already-found':
      return '✓';
    case 'invalid-letters':
      return '✕';
    case 'missing-required':
      return preview.requiredCharacter;
    case 'not-a-word':
      return '?';
    case 'too-short':
      return '…';
    case 'valid':
      return `+${preview.points}`;
  }
}

export function GameControls({
  canDelete,
  deleteId,
  lastSubmission,
  onDelete,
  onSubmit,
  onToss,
  preview,
  submitReadiness,
  tossId,
}: GameControlsProps) {
  const t = useMessages();

  return (
    <div className="grid w-full max-w-xs grid-cols-3 gap-2">
      {/* Remounts on every deletion (key) so the button signals it caused
          the deletion — even when triggered by Backspace. */}
      <button
        className={`relative ${canDelete ? NEUTRAL_CLASS : DISABLED_CLASS} ${deleteId > 0 ? 'control-press' : ''}`}
        data-delete-id={deleteId}
        disabled={!canDelete}
        key={`delete-${deleteId}`}
        onClick={onDelete}
        type="button"
      >
        <span className="flex flex-col items-center leading-tight">
          {t.deleteButton}
          <span aria-hidden="true" className={HINT_CLASS}>
            ⌫
          </span>
        </span>
        {deleteId > 0 ? (
          <span
            aria-hidden="true"
            className="control-ring pointer-events-none absolute inset-0 rounded-full"
          />
        ) : null}
      </button>
      {/* Remounts on every toss (key) so the button signals it caused the
          toss — even when triggered by Enter on an empty word. */}
      <button
        className={`relative ${NEUTRAL_CLASS} ${tossId > 0 ? 'control-press' : ''}`}
        data-toss-id={tossId}
        key={`toss-${tossId}`}
        onClick={onToss}
        type="button"
      >
        <span className="flex flex-col items-center leading-tight">
          {t.tossButton}
          <span aria-hidden="true" className={HINT_CLASS}>
            ␣
          </span>
        </span>
        {tossId > 0 ? (
          <span
            aria-hidden="true"
            className="control-ring pointer-events-none absolute inset-0 rounded-full"
          />
        ) : null}
      </button>
      <button
        className={`relative ${SUBMIT_CLASS[submitReadiness]}`}
        data-readiness={submitReadiness}
        data-verdict={preview?.verdict}
        disabled={submitReadiness === 'empty'}
        onClick={onSubmit}
        type="button"
      >
        <span className="flex flex-col items-center leading-tight">
          {t.submitButton}
          <span aria-hidden="true" className={HINT_CLASS}>
            ⏎
          </span>
        </span>
        {preview === null ? null : (
          <span aria-hidden="true" className={BADGE_CLASS[preview.verdict]}>
            {badgeText(preview)}
          </span>
        )}
        {lastSubmission === null ? null : (
          // Remounts on every submission (key) to replay the animation.
          <span
            aria-hidden="true"
            className={`badge-fly-away pointer-events-none ${BADGE_CLASS[lastSubmission.preview.verdict]}`}
            key={lastSubmission.id}
          >
            {badgeText(lastSubmission.preview)}
          </span>
        )}
      </button>
    </div>
  );
}
