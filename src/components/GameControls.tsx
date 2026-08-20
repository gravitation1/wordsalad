import { useRef } from 'react';

import { useMessages } from '../i18n';
import type {
  DeniedControl,
  SubmitReadiness,
  WordPreview,
} from '../useWordSaladGame';
import { KEYCAP_CLASS, KEYCAP_TINTED_CLASS } from './tiles';

interface GameControlsProps {
  canDelete: boolean;
  canToss: boolean;
  deleteId: number;
  denied: DeniedControl | null;
  onClearAll: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  onToss: () => void;
  preview: WordPreview | null;
  submitReadiness: SubmitReadiness;
  tossId: number;
}

const LONG_PRESS_MS = 450;

const BASE_CLASS =
  'min-h-11 w-full touch-manipulation rounded-full border px-2 font-medium transition active:scale-95';

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

// A keyboard action aimed at this control while it was unavailable: dip in
// acknowledgment without a ring. The two identical animations alternate by
// denial parity so repeated denials replay without remounting the button
// (a remount would replay the fly-away ghosts and entrance animations).
function denyClass(
  denied: DeniedControl | null,
  control: DeniedControl['control'],
): string {
  if (denied?.control !== control) {
    return '';
  }
  return denied.id % 2 === 1 ? 'control-deny' : 'control-deny-alt';
}

export function GameControls({
  canDelete,
  canToss,
  deleteId,
  denied,
  onClearAll,
  onDelete,
  onSubmit,
  onToss,
  preview,
  submitReadiness,
  tossId,
}: GameControlsProps) {
  const t = useMessages();

  // Long-pressing Delete clears the whole word; a normal tap deletes one
  // letter. A fired long-press suppresses the trailing click.
  const longPressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = () => {
    longPressed.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      onClearAll();
    }, LONG_PRESS_MS);
  };

  const handleDeleteClick = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onDelete();
  };

  return (
    <div className="game-controls grid w-full max-w-xs grid-cols-3 gap-2">
      {/* Remounts on every deletion (key) so the button signals it caused
          the deletion — even when triggered by Backspace. aria-disabled
          (not disabled) keeps CSS :active press feedback working on taps in
          every browser; the action itself already no-ops in the hook. */}
      <button
        aria-disabled={!canDelete}
        className={`relative ${canDelete ? NEUTRAL_CLASS : DISABLED_CLASS} ${deleteId > 0 ? 'control-press' : ''} ${denyClass(denied, 'delete')}`}
        data-delete-id={deleteId}
        data-denied-id={denied?.control === 'delete' ? denied.id : 0}
        key={`delete-${deleteId}`}
        onClick={handleDeleteClick}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
        onPointerCancel={cancelLongPress}
        onPointerDown={startLongPress}
        onPointerLeave={cancelLongPress}
        onPointerUp={cancelLongPress}
        type="button"
      >
        <span className="flex flex-col items-center leading-tight">
          {t.deleteButton}
          <span
            aria-hidden="true"
            className={canDelete ? KEYCAP_CLASS : KEYCAP_TINTED_CLASS}
          >
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
          toss — even when triggered by Enter on an empty word. Retired
          (aria-disabled, same bargain as Delete) once the board is cleared:
          there is nothing left to hunt for in a rearrangement. */}
      <button
        aria-disabled={!canToss}
        className={`relative ${canToss ? NEUTRAL_CLASS : DISABLED_CLASS} ${tossId > 0 ? 'control-press' : ''} ${denyClass(denied, 'toss')}`}
        data-denied-id={denied?.control === 'toss' ? denied.id : 0}
        data-toss-id={tossId}
        key={`toss-${tossId}`}
        onClick={onToss}
        type="button"
      >
        <span className="flex flex-col items-center leading-tight">
          {t.tossButton}
          <span
            aria-hidden="true"
            className={canToss ? KEYCAP_CLASS : KEYCAP_TINTED_CLASS}
          >
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
        aria-describedby={preview === null ? undefined : 'submit-preview-note'}
        aria-disabled={submitReadiness === 'empty'}
        className={`relative ${SUBMIT_CLASS[submitReadiness]} ${denyClass(denied, 'submit')}`}
        data-denied-id={denied?.control === 'submit' ? denied.id : 0}
        data-readiness={submitReadiness}
        data-verdict={preview?.verdict}
        onClick={onSubmit}
        type="button"
      >
        <span className="flex flex-col items-center leading-tight">
          {t.submitButton}
          <span aria-hidden="true" className={KEYCAP_TINTED_CLASS}>
            ⏎
          </span>
        </span>
      </button>
      {/* The verdict badge in words, as Submit's accessible description —
          outside the button so it doesn't join the accessible name. */}
      {preview === null ? null : (
        <span className="sr-only" id="submit-preview-note">
          {t.submitPreviewLabel(preview)}
        </span>
      )}
    </div>
  );
}
