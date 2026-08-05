import { useLayoutEffect, useRef } from 'react';

import { useMessages } from '../i18n';
import type {
  Celebration,
  HintReveal,
  LetterActivation,
} from '../useWordSaladGame';
import { TILE_FACE } from './tiles';

interface SaladLettersProps {
  celebration: Celebration | null;
  hintReveal: HintReveal | null;
  lastAppended: LetterActivation | null;
  letters: readonly string[];
  onLetter: (letter: string) => void;
  requiredCharacters: string;
  tossId: number;
}

// Source-tile ripples during a hint cascade in word order, matching the
// letter reveal's stagger.
const HINT_STAGGER_MS = 45;

// A tossed tile flies to its new slot in one leap: airborne this long,
// rising by a base hop plus a cut of the distance it must cover.
const TOSS_FLIGHT_MS = 480;
const TOSS_BASE_LIFT_PX = 14;

interface TilePress {
  key: string;
  delayMs: number;
}

// A tile ripples because it was just tapped/typed, or because it is a source
// letter of a freshly revealed hint (staggered by its place in the word).
function tilePress(
  letter: string,
  lastAppended: LetterActivation | null,
  hintReveal: HintReveal | null,
): TilePress | null {
  if (lastAppended?.letter === letter) {
    return { key: `append-${lastAppended.id}`, delayMs: 0 };
  }
  const hintIndex = hintReveal?.letters.indexOf(letter) ?? -1;
  if (hintIndex >= 0) {
    return {
      key: `hint-${hintReveal?.id ?? 0}`,
      delayMs: hintIndex * HINT_STAGGER_MS,
    };
  }
  return null;
}

export function SaladLetters({
  celebration,
  hintReveal,
  lastAppended,
  letters,
  onLetter,
  requiredCharacters,
  tossId,
}: SaladLettersProps) {
  const t = useMessages();

  // The win moment sends a staggered wave through the tiles. It replaces
  // the (long finished) entrance on the same element, and only for the
  // toss generation the win happened under — a later toss drops the wave
  // rather than replaying it.
  const cheering = celebration !== null && celebration.tossId === tossId;

  // Tiles keep their identity across a toss (keyed by letter), so a toss
  // is a reorder, not a remount — and each tile can fly from its old slot
  // to its new one. Only the previous ORDER is remembered between renders:
  // slots don't move when tiles trade places, so a tile's takeoff point is
  // wherever the current occupant of its old slot sits — measured fresh at
  // toss time (offsetLeft/Top, immune to in-flight transforms). Deriving
  // both ends from one live measurement means a window resize can never
  // stale the geometry.
  const movers = useRef(new Map<string, HTMLSpanElement>());
  const flights = useRef(new Map<string, Animation>());
  const lastOrder = useRef<readonly string[]>([]);
  const lastTossId = useRef(tossId);

  useLayoutEffect(() => {
    const previousOrder = lastOrder.current;
    lastOrder.current = letters;
    const tossed = tossId !== lastTossId.current && tossId > 0;
    lastTossId.current = tossId;

    if (
      !tossed ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ) {
      return;
    }

    const spots = new Map<string, { left: number; top: number }>();
    for (const [letter, node] of movers.current) {
      spots.set(letter, { left: node.offsetLeft, top: node.offsetTop });
    }

    // Every tile leaps at once: movers arc between slots, tilting into
    // their direction of travel; a tile whose slot didn't change still
    // hops in place so the whole board jumps together.
    for (const [letter, node] of movers.current) {
      const to = spots.get(letter);
      const previousSlot = previousOrder.indexOf(letter);
      const from =
        previousSlot === -1 ? undefined : spots.get(letters[previousSlot]);
      if (from === undefined || to === undefined) {
        continue;
      }
      // The Web Animations API is a progressive enhancement (jsdom, for
      // one, lacks it) — without it the tiles simply swap in place.
      const animate = (node as { animate?: HTMLElement['animate'] }).animate;
      if (animate === undefined) {
        continue;
      }
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      const lift = TOSS_BASE_LIFT_PX + Math.min(Math.abs(dx) * 0.25, 26);
      const tilt = Math.max(-10, Math.min(10, -dx * 0.06));
      // A ballistic arc, sampled: horizontal speed constant (linear
      // timing), height and tilt on the 4t(1−t) parabola — zero at both
      // ends, peaking mid-flight. Sampling beats keyframe easing here: an
      // eased midpoint keyframe stalls the horizontal motion at the apex.
      const steps = 8;
      const frames = Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        const hop = 4 * t * (1 - t);
        const x = dx * (1 - t);
        const y = dy * (1 - t) - lift * hop;
        return {
          transform: `translate(${x}px, ${y}px) rotate(${tilt * hop}deg)`,
        };
      });
      flights.current.get(letter)?.cancel();
      flights.current.set(
        letter,
        animate.call(node, frames, {
          duration: TOSS_FLIGHT_MS,
          easing: 'linear',
        }),
      );
    }
  });

  return (
    // On small screens the width is capped to four tiles so seven letters
    // wrap into a balanced, centered 4+3 instead of an awkward 6+1 (the
    // cap matches the tile size: 4 tiles + 3 gaps at each size).
    // `relative` pins the tiles' offsetParent to this container: without
    // it, an animating ancestor transform (the board's deal-in) becomes
    // the measuring origin mid-flight and the first toss's takeoff spots
    // land in the wrong coordinate space.
    <div className="relative flex max-w-[13.5rem] flex-wrap justify-center gap-2 pointer-coarse:max-w-[15.5rem] sm:max-w-none">
      {letters.map((letter, index) => {
        const isRequired = requiredCharacters.includes(letter);
        const press = tilePress(letter, lastAppended, hintReveal);
        return (
          // Outermost span: the flight mover, driven imperatively above —
          // it carries no CSS animation so the arcs never fight one.
          <span
            className="inline-block"
            key={letter}
            ref={(node) => {
              if (node === null) {
                movers.current.delete(letter);
              } else {
                movers.current.set(letter, node);
              }
            }}
          >
            {/* The middle span owns the entrance (fresh boards only:
                tosses fly instead) and the win wave; the inner button
                remounts per activation (key) to replay the press —
                whether the letter was tapped, typed, or hint-revealed. */}
            <span
              // Alternating cheer names so a second celebration (the
              // perfect score after an earlier win) replays the wave
              // without remount.
              className={`${
                cheering
                  ? celebration.id % 2 === 1
                    ? 'tile-cheer'
                    : 'tile-cheer-alt'
                  : tossId === 0
                    ? 'letter-toss'
                    : ''
              } inline-block`}
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <button
                // Describes rather than renames: the accessible name stays
                // the bare letter, matching the visible tile.
                aria-describedby={
                  isRequired ? 'required-letter-note' : undefined
                }
                // Touch devices get larger tiles: bigger targets and wider
                // tap-center spacing, the two levers against mis-taps.
                className={`relative h-12 w-12 touch-manipulation rounded-xl text-xl font-semibold transition active:scale-90 pointer-coarse:h-14 pointer-coarse:w-14 pointer-coarse:text-2xl ${
                  isRequired
                    ? `border border-accent ${TILE_FACE.accent}`
                    : `${TILE_FACE.plain} hover:bg-gray-50 dark:hover:bg-gray-800`
                } ${press === null ? '' : 'control-press'}`}
                data-letter={letter}
                data-pressed={
                  lastAppended?.letter === letter ? 'true' : 'false'
                }
                data-required={isRequired ? 'true' : 'false'}
                key={press?.key ?? 'idle'}
                onClick={() => {
                  onLetter(letter);
                }}
                style={
                  press === null
                    ? undefined
                    : { animationDelay: `${press.delayMs}ms` }
                }
                title={isRequired ? t.requiredLetterTitle : undefined}
                type="button"
              >
                {letter}
                {press === null ? null : (
                  <span
                    aria-hidden="true"
                    className="control-ring pointer-events-none absolute inset-0 rounded-xl"
                    style={{ animationDelay: `${press.delayMs}ms` }}
                  />
                )}
              </button>
            </span>
          </span>
        );
      })}
      <span className="sr-only" id="required-letter-note">
        {t.requiredLetterTitle}
      </span>
    </div>
  );
}
