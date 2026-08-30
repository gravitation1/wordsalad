import type { ReactNode } from 'react';

import { useMessages } from '../i18n';
import { miniTileClass } from './tiles';

// Splice the required letters, set as the game's mini tiles, into a
// localized sentence at its {letters} token — the same device the feedback
// line uses for a word, so the rule and the tile it talks about wear the
// same teal. align-top, not a baseline nudge: the tile is exactly one
// text-sm line tall, so pinning it to the line box's top centers it on the
// text the way the feedback line's flex row does (measured identical in
// Chromium and WebKit); baseline-relative values drift with the tile's
// own glyph metrics and sit visibly low.
export function TiledText({
  requiredCharacters,
  text,
}: {
  requiredCharacters: string;
  text: string;
}): ReactNode {
  const parts = text.split('{letters}');
  if (parts.length < 2) {
    return text;
  }
  const [before, after] = parts;
  return (
    <>
      {before}
      <span className="inline-flex items-center gap-1 align-top">
        {Array.from(requiredCharacters).map((letter, index) => (
          <span
            className={miniTileClass(letter, requiredCharacters)}
            key={index}
          >
            {letter}
          </span>
        ))}
      </span>
      {after}
    </>
  );
}

interface CoachProps {
  letterCount: number;
  minimumLength: number;
  requiredCharacters: string;
}

// The first-run coach: the three rules the board cannot show, spoken in the
// feedback row's own voice before it has anything to react to. Ordinary
// text in reading order (not a live region), retired by the first scored
// word. Short viewports get the one-line form (styles.css swaps them).
export function Coach({
  letterCount,
  minimumLength,
  requiredCharacters,
}: CoachProps) {
  const t = useMessages();
  const hasRequired = requiredCharacters.length > 0;
  return (
    <div
      className="coach w-full text-center text-sm text-gray-600 dark:text-gray-300"
      data-testid="coach"
    >
      <div className="coach-full flex flex-col items-center gap-0.5">
        <p>{t.coachLength(minimumLength)}</p>
        {hasRequired ? (
          <p>
            <TiledText
              requiredCharacters={requiredCharacters}
              text={t.coachRequired}
            />
          </p>
        ) : null}
        <p>{t.coachPangram(letterCount)}</p>
      </div>
      <p className="coach-compact items-center justify-center">
        {hasRequired ? (
          <TiledText
            requiredCharacters={requiredCharacters}
            text={t.coachCompact(minimumLength)}
          />
        ) : (
          t.coachCompactFree(minimumLength)
        )}
      </p>
    </div>
  );
}
