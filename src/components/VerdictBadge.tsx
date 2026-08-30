import { useLayoutEffect, useRef } from 'react';

import type { SubmittedPreview, WordPreview } from '../useWordSaladGame';
import { NOT_READY_TINT_CLASS } from './tiles';

// The staged word's standing verdict, worn at its trailing edge: what the
// letters are worth, or why they are worth nothing yet. It belongs to the
// word rather than to Submit — it changes with every keystroke, while the
// button's meaning never does — and it rides where the eye already is,
// beside the caret, rather than in a corner of the screen.
// A pill rather than a disc, in the shape the app's buttons wear: it reads
// as a control's sibling rather than another letter. The width is held wide
// enough for the longest verdict ("+11") so switching between them never
// nudges the word it hangs off. The height is a couple of pixels short of
// the neighbouring letters' cap height (about 21px at this size), so the
// pill sits inside their band rather than flush against it.
// tracking-normal: the word line spaces its letters widely, and the badge
// is text of its own, not part of the word.
const BADGE_BASE_CLASS =
  'flex h-[17px] min-w-9 items-center justify-center rounded-full border px-1.5 text-xs font-bold tracking-normal';

// A legitimate word that yields nothing — hinted (valid, 0 points) or
// already found — is inert, not wrong: the gray the hinted rows wear in the
// drum, rather than the orange of a word that can't be accepted as it
// stands. The glyph carries the difference (+0 vs ✓).
const WORTHLESS_BADGE_CLASS = `${BADGE_BASE_CLASS} border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-500`;

// The "not yet" verdicts wear Submit's own not-ready tint (tiles.ts): same
// border and fill in both themes, so the pill reads as the button's
// miniature rather than a different shade of the same warning.
const BADGE_CLASS: Record<WordPreview['verdict'], string> = {
  'already-found': WORTHLESS_BADGE_CLASS,
  'invalid-letters': `${BADGE_BASE_CLASS} border-red-300 bg-white text-red-500 dark:border-red-400/40 dark:bg-gray-950 dark:text-red-400`,
  'missing-required': `${BADGE_BASE_CLASS} ${NOT_READY_TINT_CLASS}`,
  'not-a-word': `${BADGE_BASE_CLASS} ${NOT_READY_TINT_CLASS}`,
  'too-short': `${BADGE_BASE_CLASS} ${NOT_READY_TINT_CLASS}`,
  valid: `${BADGE_BASE_CLASS} border-accent bg-white text-accent dark:bg-gray-950`,
};

export function badgeClass(preview: WordPreview): string {
  if (preview.verdict === 'valid' && preview.points === 0) {
    return WORTHLESS_BADGE_CLASS;
  }
  return BADGE_CLASS[preview.verdict];
}

export function badgeText(preview: WordPreview): string {
  switch (preview.verdict) {
    case 'already-found':
      return '✓';
    case 'invalid-letters':
      return '✕';
    case 'missing-required':
      return preview.requiredCharacters;
    case 'not-a-word':
      return '?';
    case 'too-short':
      return '…';
    case 'valid':
      return `+${String(preview.points)}`;
  }
}

// Where the live badge last stood on screen. The word clears the moment it
// is submitted, so by the time the departing ghost mounts the line has
// re-centered around the returning hint button and the badge's old spot is
// gone with it — hence a captured position rather than a measured one, the
// same bargain the exiting word and the spent hint strike.
export interface BadgeSpot {
  left: number;
  top: number;
}

export function VerdictBadge({
  preview,
  spotRef,
}: {
  preview: WordPreview | null;
  spotRef: { current: BadgeSpot | null };
}) {
  const badgeRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (badgeRef.current !== null) {
      const rect = badgeRef.current.getBoundingClientRect();
      spotRef.current = { left: rect.left, top: rect.top };
    }
  }, [preview, spotRef]);

  if (preview === null) {
    return null;
  }
  return (
    // In flow at the end of the word, so it moves with the letters as they
    // are typed, close enough to read as part of it. The line's wide letter
    // spacing already trails the last letter, so the margin here is the
    // smaller half of the gap.
    // translate-y: centering here means centering on the line box, which
    // includes the room reserved for descenders and so sits fractionally
    // below the middle of the capital letters the pill sits beside. Nudged
    // back down onto their band, so the space above and below it matches.
    <span
      aria-hidden="true"
      className="pointer-events-none relative ml-1 flex translate-y-[0.5px] items-center"
    >
      <span
        className={badgeClass(preview)}
        data-testid="verdict"
        ref={badgeRef}
      >
        {badgeText(preview)}
      </span>
    </span>
  );
}

// The submitted word's badge, floating up from exactly where it stood.
// Fixed to the viewport and mounted outside the word's shake wrapper: a
// transformed ancestor would become its containing block and throw the
// captured coordinates off.
export function VerdictGhost({
  lastSubmission,
  spotRef,
}: {
  lastSubmission: SubmittedPreview | null;
  spotRef: { current: BadgeSpot | null };
}) {
  // A ref callback runs at commit, before paint, where reading refs and
  // positioning imperatively is allowed — render itself stays pure.
  const place = (node: HTMLSpanElement | null) => {
    if (node === null) {
      return;
    }
    const spot = spotRef.current;
    if (spot === null) {
      node.style.display = 'none';
      return;
    }
    node.style.left = `${String(spot.left)}px`;
    node.style.top = `${String(spot.top)}px`;
  };

  if (lastSubmission === null) {
    return null;
  }
  return (
    // Remounts on every submission (key) to replay the animation.
    <span
      aria-hidden="true"
      className={`badge-fly-away pointer-events-none fixed ${badgeClass(lastSubmission.preview)}`}
      data-testid="verdict-ghost"
      key={lastSubmission.id}
      ref={place}
    >
      {badgeText(lastSubmission.preview)}
    </span>
  );
}
