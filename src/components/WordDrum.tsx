import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import type { WordSlot } from '../useWordSaladGame';
import { miniTileClass } from './tiles';

interface WordDrumProps {
  lastFoundWord: string | null;
  requiredCharacter: string;
  slots: readonly WordSlot[];
}

// A fixed-height drum: a snap-scrolling window onto the full word list, so
// the scoreboard never grows with the puzzle. Native overflow scrolling
// supplies the physics; a scroll-sized mask fades rows in and out at the
// edges.
const ROW_HEIGHT = 32;
const VISIBLE_ROWS = 7;
const DRUM_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

// A find never yanks the drum away from a player who is browsing it.
const INTERACTION_GRACE_MS = 1500;

// How deep the edge fade grows once content is scrolled out behind it.
const FADE_PX = 56;

export function WordDrum({
  lastFoundWord,
  requiredCharacter,
  slots,
}: WordDrumProps) {
  const containerRef = useRef<HTMLUListElement>(null);
  const interactedAt = useRef(0);
  const frame = useRef(0);

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
    container.style.webkitMaskImage = fade;
  }, []);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(updateEdgeFade);
  }, [updateEdgeFade]);

  useLayoutEffect(() => {
    updateEdgeFade();
  }, [updateEdgeFade, slots.length]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // A fresh find spins the drum to its slot; the reveal plays there. If the
  // player interacted with the drum moments ago, skip the spin — the row
  // still reveals wherever it happens to be.
  useEffect(() => {
    const container = containerRef.current;
    if (lastFoundWord === null || container === null) {
      return;
    }
    const index = slots.findIndex((slot) => slot.found?.word === lastFoundWord);
    if (index < 0 || Date.now() - interactedAt.current < INTERACTION_GRACE_MS) {
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
    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    container.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [lastFoundWord, slots]);

  const markInteraction = () => {
    interactedAt.current = Date.now();
  };

  return (
    <ul
      className="w-full snap-y snap-mandatory overflow-y-auto [scrollbar-width:none]"
      data-testid="word-drum"
      onPointerDown={markInteraction}
      onScroll={handleScroll}
      onWheel={markInteraction}
      ref={containerRef}
      style={{ height: DRUM_HEIGHT }}
    >
      {slots.map((slot, index) => {
        const found = slot.found;
        return (
          <li
            // Placeholders are visual scaffolding; screen readers hear only
            // the found words, as with the old flat table.
            aria-hidden={found === null ? true : undefined}
            className="snap-center"
            data-found={found === null ? 'false' : 'true'}
            data-testid="word-slot"
            key={index}
            style={{ height: ROW_HEIGHT }}
          >
            {found === null ? (
              <div className="flex h-full items-center justify-between gap-4 text-sm text-gray-300 dark:text-gray-700">
                <span>—</span>
                <span className="w-16 text-right">?</span>
              </div>
            ) : (
              <div
                className={`flex h-full items-center justify-between gap-2 text-sm ${
                  found.word === lastFoundWord ? 'slot-reveal' : ''
                }`}
              >
                {/* The word spelled in the game's miniature tiles, as in the
                    history rows (long words in the compact cut, so even the
                    dictionary's deepest reach fits a phone); the plain text
                    stays for screen readers. */}
                <a
                  className="touch-manipulation transition hover:opacity-70"
                  data-hinted={found.hinted}
                  href={`https://www.merriam-webster.com/dictionary/${found.word}`}
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
                        className={miniTileClass(letter, requiredCharacter, {
                          compact: found.word.length > 9,
                          muted: found.hinted,
                        })}
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
