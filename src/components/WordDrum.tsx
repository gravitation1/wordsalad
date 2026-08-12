import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useMessages } from '../i18n';
import type { WordSlot, WordSpotlight } from '../useWordSaladGame';
import type { WordOrigin } from './tiles';
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
  // Where the found word last sat in the input — the flight's launch pad.
  wordOriginRef: { current: WordOrigin | null };
}

// A freshly found word in transit from the input to its slot: what flies,
// and (in the ref alongside) where from, where to and for how long.
interface WordFlight {
  hinted: boolean;
  id: number;
  word: string;
}

interface FlightPath {
  duration: number;
  from: WordOrigin;
  toLeft: number;
  toTop: number;
}

// The drum is a scrolling window onto the full word list, so the scoreboard
// never grows with the puzzle: it flexes to whatever height the app frame
// has left over (never fewer than three rows). Native overflow scrolling
// supplies the physics, free of scroll snapping — mandatory snap intercepted
// every flick and made the motion feel like it was grabbing at rows. A
// scroll-sized mask fades rows in and out at the edges.
const ROW_HEIGHT = 32;
const VISIBLE_ROWS = 7;
// The centering fallback where layout cannot be measured (jsdom).
const DRUM_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

// How deep the edge fade grows once content is scrolled out behind it.
const FADE_PX = 56;

// The flight takes at least this long even when the drum has no rolling to
// do — a word snapping instantly into a nearby slot reads as a glitch.
const MIN_FLIGHT_MS = 350;
// Kept in step with .slot-reveal in styles.css: once the flight reaches the
// slot, the ghost and row cross-fade in place. The row must not appear while
// the word is still traveling.
const SLOT_REVEAL_MS = 120;

export function WordDrum({
  definitionUrl,
  foldLetter,
  onPrefill,
  spotlight,
  requiredCharacters,
  slots,
  wordOriginRef,
}: WordDrumProps) {
  const t = useMessages();
  const containerRef = useRef<HTMLUListElement>(null);
  const frame = useRef(0);
  const scrollFrame = useRef(0);

  // The word in flight (state, so the ghost renders) and its path (a ref,
  // read imperatively when the ghost mounts).
  const [flight, setFlight] = useState<WordFlight | null>(null);
  const flightPath = useRef<FlightPath | null>(null);
  const flightAnimations = useRef<Animation[]>([]);
  // The spotlight already acted on: the effect below re-runs whenever the
  // drum re-renders with new derivations, and without this it would re-aim
  // the roll and relaunch the flight of a word already shelved on every
  // subsequent keystroke.
  const handledSpotlight = useRef(0);

  // The drum eases to a word itself rather than asking for a native smooth
  // scroll, which cannot be given a duration (long hops crawled, and the
  // row's own animation was over before it arrived) and is cancelled outright
  // by trackpad momentum landing mid-flight. Driving it frame by frame keeps
  // it short, and each frame overwrites any momentum still arriving, so it
  // always lands.
  const easeScrollTo = useCallback(
    (container: HTMLElement, to: number, duration: number) => {
      cancelAnimationFrame(scrollFrame.current);
      const from = container.scrollTop;
      const distance = to - from;
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
    },
    [],
  );

  // An edge only fades when content is actually scrolled out behind it, and
  // the fade grows with the overflow — so the list sits flush and fully
  // visible at its ends instead of dissolving into empty space. Capped at a
  // quarter of the window so a squeezed phone drum keeps most of its rows
  // legible (at the design height the cap works out to FADE_PX exactly).
  const updateEdgeFade = useCallback(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const maxFade = Math.min(FADE_PX, container.clientHeight / 4);
    const topFade = Math.min(container.scrollTop, maxFade);
    const bottomGap =
      container.scrollHeight - container.clientHeight - container.scrollTop;
    const bottomFade = Math.min(Math.max(bottomGap, 0), maxFade);
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

  // The drum's height follows the viewport on phones, so the edge fade must
  // track resizes — rotation, toolbars, banners coming and going — not just
  // scrolls. Progressive: jsdom has no ResizeObserver, and without one the
  // fade simply waits for the next scroll.
  useEffect(() => {
    const container = containerRef.current;
    if (container === null || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(handleScroll);
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [handleScroll]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(scrollFrame.current);
      for (const animation of flightAnimations.current) {
        animation.cancel();
      }
    },
    [],
  );

  // Sends the mounting ghost from the input's captured spot to the slot's
  // landing spot. A ref callback runs at commit (before paint), where
  // reading refs and animating imperatively is allowed — render stays pure.
  // The ghost starts word-sized (the scale morph: typed letters solidify
  // into tiles as they take off) and glides in on the same curve the roll
  // eases with, arriving as one motion; it holds no final style, so once
  // the animation ends it reverts to its base opacity-0 and the real row —
  // already fading in underneath — is all that remains.
  // useCallback matters here: React re-invokes a ref callback whose
  // identity changed, so an inline function would relaunch the flight on
  // every render the ghost lives through — each keystroke replaying the
  // last word's arrival. Stable, it fires only when a flight (re)mounts.
  const launchFlight = useCallback((node: HTMLSpanElement | null) => {
    if (node === null) {
      return;
    }
    const path = flightPath.current;
    if (path === null) {
      node.style.display = 'none';
      return;
    }
    node.style.left = `${String(path.toLeft)}px`;
    node.style.top = `${String(path.toTop)}px`;
    const animate = (node as { animate?: HTMLElement['animate'] }).animate;
    if (animate === undefined) {
      return;
    }
    const tiles = node.firstElementChild?.getBoundingClientRect();
    const scale =
      tiles !== undefined && tiles.height > 0
        ? path.from.height / tiles.height
        : 1.6;
    const dx = path.from.left - path.toLeft;
    const dy =
      path.from.top + path.from.height / 2 - (path.toTop + ROW_HEIGHT / 2);
    const handoffDuration = path.duration + SLOT_REVEAL_MS;
    const handoffOffset = path.duration / handoffDuration;
    for (const animation of flightAnimations.current) {
      animation.cancel();
    }
    flightAnimations.current = [
      animate.call(
        node,
        [
          {
            transform: `translate(${String(dx)}px, ${String(dy)}px) scale(${String(scale)})`,
          },
          { transform: 'none' },
        ],
        {
          duration: path.duration,
          easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
        },
      ),
      animate.call(
        node,
        [{ opacity: 1 }, { offset: handoffOffset, opacity: 1 }, { opacity: 0 }],
        { duration: handoffDuration, easing: 'linear' },
      ),
    ];
  }, []);

  // A fresh find — or a word the player re-submitted to locate — brings the
  // drum to its slot, where the reveal plays. Every spotlight comes from a
  // deliberate submission, so this always runs: making it conditional on
  // recent scrolling only made the behaviour look random. Fresh finds also
  // launch the flight: the word itself travels from the input into the
  // slot, timed to land as the drum stops rolling.
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
    // One deliberate submission, one response — never replayed for the
    // renders that follow it.
    if (spotlight.id === handledSpotlight.current) {
      return;
    }
    handledSpotlight.current = spotlight.id;
    // Center the slot in the window the drum currently has (it flexes with
    // the viewport; jsdom measures 0, so fall back to the design height).
    const height = container.clientHeight || DRUM_HEIGHT;
    const centered = index * ROW_HEIGHT - (height - ROW_HEIGHT) / 2;
    if (
      container.clientHeight === 0 ||
      typeof container.scrollTo !== 'function'
    ) {
      container.scrollTop = Math.max(0, centered); // no layout/smooth scrolling (jsdom)
      return;
    }
    // Clamped to what the list can actually scroll — the flight needs the
    // real landing spot, not the browser's silent correction. At the ends
    // the dynamic edge fade leaves the row fully visible anyway.
    const target = Math.min(
      Math.max(0, centered),
      Math.max(0, container.scrollHeight - container.clientHeight),
    );
    // Reached only in a real browser: the guard above returns early wherever
    // scrollTo is missing, which is the same environment (jsdom) that lacks
    // matchMedia.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.style.setProperty('--spotlight-delay', '0ms');
      container.scrollTop = target;
      return;
    }
    // Short hops stay brisk, long ones take their time, and neither runs
    // away with the eye.
    const distance = Math.abs(target - container.scrollTop);
    const scrollDuration =
      distance === 0 ? 0 : Math.min(650, Math.max(280, distance * 0.45));
    const origin = wordOriginRef.current;
    const slotRow = container.querySelector('[data-spotlight="true"]');
    // The Web Animations API is a progressive enhancement (jsdom, for one,
    // lacks it); without it the row simply settles in after the roll. The
    // input's exit ghost mirrors these guards, so exactly one of the two
    // farewells plays.
    const animate = (slotRow as { animate?: Element['animate'] } | null)
      ?.animate;
    if (
      !spotlight.requested &&
      origin !== null &&
      slotRow !== null &&
      animate !== undefined
    ) {
      const duration = Math.max(scrollDuration, MIN_FLIGHT_MS);
      // The row starts hidden and finishes revealing as the flight ends; no
      // second copy appears while the word is still traveling.
      container.style.setProperty(
        '--spotlight-delay',
        `${String(Math.round(duration))}ms`,
      );
      // The slot's landing spot: where its row sits now, corrected by how
      // far the roll is about to carry it.
      const slotRect = slotRow.getBoundingClientRect();
      flightPath.current = {
        duration,
        from: origin,
        toLeft: slotRect.left,
        toTop: slotRect.top - (target - container.scrollTop),
      };
      setFlight({
        hinted: slots[index].found?.hinted ?? false,
        id: spotlight.id,
        word: spotlight.word,
      });
    } else {
      // No flight (a located word, or nothing can animate): the row's own
      // emphasis just waits out the travel, slightly less than the full
      // duration — the eased tail is imperceptible, and matching it exactly
      // left a dead beat between arriving and being shown the word.
      container.style.setProperty(
        '--spotlight-delay',
        `${String(Math.max(0, Math.round(scrollDuration - SLOT_REVEAL_MS)))}ms`,
      );
    }
    easeScrollTo(container, target, scrollDuration);
  }, [easeScrollTo, slots, spotlight, wordOriginRef]);

  return (
    <>
      <ul
        // relative: the rows' sr-only spans are absolutely positioned, and an
        // absolute element only gets clipped by an overflow ancestor that is
        // also its containing block. Without this the drum cannot clip them
        // and they stretch the page far below the fold.
        // flex-1 soaks up the app frame's spare height; min-h-24 is the
        // three-row floor below which the frame gives up and the page
        // scrolls instead. overscroll-contain keeps a flick that hits the
        // list's end from rubber-banding the (unscrollable) page behind it.
        className="word-drum relative flex min-h-24 w-full flex-1 flex-col overflow-y-auto overscroll-contain [scrollbar-width:none]"
        data-testid="word-drum"
        onScroll={handleScroll}
        ref={containerRef}
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
              // shrink-0: fixed-height rows must overflow into scroll, not
              // compress to fit. mt-auto on the first row bottom-anchors a
              // list shorter than its window, chat-style — the words hug
              // the composer below; once the list overflows, the auto
              // margin resolves to zero and scrolling is unchanged.
              className={`shrink-0${index === 0 ? ' mt-auto' : ''}`}
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
                  // A fresh find's row materializes as the flown word lands
                  // on it (slot-reveal is timed to the flight); being taken
                  // to one already found swells the word itself (below),
                  // which leaves the points column and neighbouring rows
                  // alone.
                  className={`flex h-full items-center justify-between gap-2 text-sm ${
                    found.word === spotlight?.word && !spotlight.requested
                      ? 'slot-reveal'
                      : ''
                  }`}
                  // Remounting on each spotlight replays the reveal, so
                  // asking for the same word twice still flags where it
                  // landed.
                  key={
                    found.word === spotlight?.word
                      ? `reveal-${String(spotlight.id)}`
                      : 'idle'
                  }
                >
                  {/* The word spelled in the game's miniature tiles, as in
                      the history rows (long words in the compact cut, so
                      even the dictionary's deepest reach fits a phone); the
                      plain text stays for screen readers. */}
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
      {/* The word in flight, dressed exactly as the row it will become —
          the same tiles at the same size — so the landing is a cross-fade
          between identical pixels. Fixed and outside the drum: the drum's
          edge-fade mask would paint over anything inside it. Keyed per
          flight so a rapid second find relaunches cleanly. */}
      {flight === null ? null : (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed z-10 flex origin-left items-center opacity-0"
          data-testid="word-flight"
          key={`flight-${String(flight.id)}`}
          ref={launchFlight}
          style={{ height: ROW_HEIGHT }}
        >
          <span
            className={`flex items-center ${
              flight.word.length > 9 ? 'gap-0.5' : 'gap-1'
            }`}
          >
            {Array.from(flight.word).map((letter, tileIndex) => (
              <span
                className={miniTileClass(
                  foldLetter(letter),
                  requiredCharacters,
                  {
                    compact: flight.word.length > 9,
                    muted: flight.hinted,
                  },
                )}
                key={tileIndex}
              >
                {letter}
              </span>
            ))}
            {flight.hinted ? (
              <span className="text-gray-500 dark:text-gray-400">*</span>
            ) : null}
          </span>
        </span>
      )}
    </>
  );
}
