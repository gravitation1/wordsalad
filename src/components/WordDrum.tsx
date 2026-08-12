import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { useMessages } from '../i18n';
import type { WordSlot, WordSpotlight } from '../useWordSaladGame';
import { miniTileClass } from './tiles';

interface WordDrumProps {
  // Where a found word's definition lives (dictionary- and UI-language
  // aware; the rows are surface forms, exactly what definitions key on).
  definitionUrl: (word: string) => string;
  // Surface letter -> play key, so an accented tile (É in CAFÉ) still
  // recognizes itself as the required letter it folds to.
  foldLetter: (letter: string) => string;
  // Types an unfound row's derived prefix into the word area.
  onPrefill: (prefix: string) => void;
  // The word to bring into view, if any. A new id re-triggers the scroll,
  // so asking for the same word twice works.
  spotlight: WordSpotlight | null;
  requiredCharacters: string;
  slots: readonly WordSlot[];
}

// A fixed-height drum: a scrolling window onto the full word list, so the
// scoreboard never grows with the puzzle. Native overflow scrolling supplies
// the physics, free of scroll snapping — mandatory snap intercepted every
// flick and made the motion feel like it was grabbing at rows. A scroll-sized
// mask fades rows in and out at the edges.
const ROW_HEIGHT = 32;
const VISIBLE_ROWS = 7;
const DRUM_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

// How deep the edge fade grows once content is scrolled out behind it.
const FADE_PX = 56;

export function WordDrum({
  definitionUrl,
  foldLetter,
  onPrefill,
  spotlight,
  requiredCharacters,
  slots,
}: WordDrumProps) {
  const t = useMessages();
  const containerRef = useRef<HTMLUListElement>(null);
  const frame = useRef(0);
  const scrollFrame = useRef(0);

  // The drum eases to a word itself rather than asking for a native smooth
  // scroll, which cannot be given a duration (long hops crawled, and the
  // row's own animation was over before it arrived) and is cancelled outright
  // by trackpad momentum landing mid-flight. Driving it frame by frame keeps
  // it short, and each frame overwrites any momentum still arriving, so it
  // always lands.
  const easeScrollTo = useCallback((container: HTMLElement, to: number) => {
    cancelAnimationFrame(scrollFrame.current);
    const from = container.scrollTop;
    const distance = to - from;
    // Short hops stay brisk, long ones take their time, and neither runs away
    // with the eye.
    const duration = Math.min(650, Math.max(280, Math.abs(distance) * 0.45));
    // The row's own emphasis waits out the travel, so the two read as one
    // move rather than overlapping. Slightly less than the full duration:
    // the eased tail is imperceptible, and matching it exactly left a dead
    // beat between arriving and being shown the word.
    container.style.setProperty(
      '--spotlight-delay',
      `${String(Math.round(distance === 0 ? 0 : duration * 0.85))}ms`,
    );
    if (distance === 0) {
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // Ease in and out: an ease-out alone leaves at full speed, which is
      // what made a long jump feel like a lurch.
      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      container.scrollTop = from + distance * eased;
      if (progress < 1) {
        scrollFrame.current = requestAnimationFrame(step);
      }
    };
    scrollFrame.current = requestAnimationFrame(step);
  }, []);

  // An edge only fades when content is actually scrolled out behind it, and
  // the fade grows with the overflow — so the list sits flush and fully
  // visible at its ends instead of dissolving into empty space.
  const updateEdgeFade = useCallback(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const topFade = Math.min(container.scrollTop, FADE_PX);
    const bottomGap =
      container.scrollHeight - container.clientHeight - container.scrollTop;
    const bottomFade = Math.min(Math.max(bottomGap, 0), FADE_PX);
    const fade = `linear-gradient(to bottom, transparent, black ${topFade}px, black calc(100% - ${bottomFade}px), transparent)`;
    container.style.maskImage = fade;
    // The prefixed alias is deliberate: Safari still needs it for masks.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    container.style.webkitMaskImage = fade;
  }, []);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(updateEdgeFade);
  }, [updateEdgeFade]);

  useLayoutEffect(() => {
    updateEdgeFade();
  }, [updateEdgeFade, slots.length]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(scrollFrame.current);
    },
    [],
  );

  // A fresh find — or a word the player re-submitted to locate — brings the
  // drum to its slot, where the reveal plays. Every spotlight comes from a
  // deliberate submission, so this always runs: making it conditional on
  // recent scrolling only made the behaviour look random.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (spotlight === null || container === null) {
      return;
    }
    const index = slots.findIndex(
      (slot) => slot.found?.word === spotlight.word,
    );
    if (index < 0) {
      return;
    }
    // Center the slot; the browser clamps at the list's ends, where the
    // dynamic edge fade leaves the row fully visible anyway.
    const top = index * ROW_HEIGHT - (DRUM_HEIGHT - ROW_HEIGHT) / 2;
    if (
      container.clientHeight === 0 ||
      typeof container.scrollTo !== 'function'
    ) {
      container.scrollTop = Math.max(0, top); // no layout/smooth scrolling (jsdom)
      return;
    }
    // Reached only in a real browser: the guard above returns early wherever
    // scrollTo is missing, which is the same environment (jsdom) that lacks
    // matchMedia.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.style.setProperty('--spotlight-delay', '0ms');
      container.scrollTop = Math.max(0, top);
      return;
    }
    easeScrollTo(container, Math.max(0, top));
  }, [easeScrollTo, slots, spotlight]);

  return (
    <ul
      // relative: the rows' sr-only spans are absolutely positioned, and an
      // absolute element only gets clipped by an overflow ancestor that is
      // also its containing block. Without this the drum cannot clip them and
      // they stretch the page far below the fold.
      className="relative w-full overflow-y-auto [scrollbar-width:none]"
      data-testid="word-drum"
      onScroll={handleScroll}
      ref={containerRef}
      style={{ height: DRUM_HEIGHT }}
    >
      {slots.map((slot, index) => {
        const found = slot.found;
        return (
          <li
            // Bare placeholders are visual scaffolding; screen readers hear
            // the found words and the rows with something to say (a derived
            // prefix carries information and an action).
            aria-hidden={
              found === null && slot.prefix === '' ? true : undefined
            }
            data-found={found === null ? 'false' : 'true'}
            data-spotlight={
              found !== null && found.word === spotlight?.word
                ? 'true'
                : 'false'
            }
            data-testid="word-slot"
            key={index}
            style={{ height: ROW_HEIGHT }}
          >
            {found === null ? (
              slot.prefix === '' ? (
                <div className="flex h-full items-center justify-between gap-4 text-sm text-gray-300 dark:text-gray-700">
                  <span>—</span>
                  <span className="w-16 text-right">?</span>
                </div>
              ) : (
                // The letters the alphabetized list itself gives away,
                // spelled in ghost tiles; the tap types them into the word
                // area, sparing the player the bookkeeping.
                <button
                  aria-label={t.unfoundPrefixLabel(
                    Array.from(slot.prefix).join(' '),
                  )}
                  className="flex h-full w-full touch-manipulation items-center justify-between gap-4 text-sm text-gray-300 transition hover:opacity-70 dark:text-gray-700"
                  onClick={() => {
                    onPrefill(slot.prefix);
                  }}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={`flex items-center ${
                      slot.prefix.length > 9 ? 'gap-0.5' : 'gap-1'
                    }`}
                  >
                    {Array.from(slot.prefix).map((letter, tileIndex) => (
                      <span
                        className={miniTileClass(letter, requiredCharacters, {
                          compact: slot.prefix.length > 9,
                          ghost: true,
                        })}
                        key={tileIndex}
                      >
                        {letter}
                      </span>
                    ))}
                    <span>—</span>
                  </span>
                  <span aria-hidden="true" className="w-16 text-right">
                    ?
                  </span>
                </button>
              )
            ) : (
              <div
                // Finding a word flips the whole row into place; being taken
                // to one already found swells the word itself (below), which
                // leaves the points column and neighbouring rows alone.
                className={`flex h-full items-center justify-between gap-2 text-sm ${
                  found.word === spotlight?.word && !spotlight.requested
                    ? 'slot-reveal'
                    : ''
                }`}
                // Remounting on each spotlight replays the reveal, so asking
                // for the same word twice still flags where it landed.
                key={
                  found.word === spotlight?.word
                    ? `reveal-${String(spotlight.id)}`
                    : 'idle'
                }
              >
                {/* The word spelled in the game's miniature tiles, as in the
                    history rows (long words in the compact cut, so even the
                    dictionary's deepest reach fits a phone); the plain text
                    stays for screen readers. */}
                <a
                  className={`touch-manipulation transition hover:opacity-70 ${
                    found.word === spotlight?.word && spotlight.requested
                      ? 'slot-locate'
                      : ''
                  }`}
                  data-hinted={found.hinted}
                  href={definitionUrl(found.word)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="sr-only">
                    {found.word}
                    {found.hinted ? '*' : ''}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex items-center ${
                      found.word.length > 9 ? 'gap-0.5' : 'gap-1'
                    }`}
                  >
                    {Array.from(found.word).map((letter, tileIndex) => (
                      <span
                        className={miniTileClass(
                          foldLetter(letter),
                          requiredCharacters,
                          {
                            compact: found.word.length > 9,
                            muted: found.hinted,
                          },
                        )}
                        key={tileIndex}
                      >
                        {letter}
                      </span>
                    ))}
                    {found.hinted ? (
                      <span className="text-gray-500 dark:text-gray-400">
                        *
                      </span>
                    ) : null}
                  </span>
                </a>
                <span className="w-16 text-right">{found.points}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
