import type { CSSProperties } from 'react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useMessages } from '../i18n';
import type {
  FoundWord,
  RestartExit,
  RestartExitRow,
  WordSlot,
  WordSpotlight,
} from '../useWordSaladGame';
import type { WordOrigin } from './tiles';
import { miniTileClass } from './tiles';

interface WordDrumProps {
  // Start slots of the gaps the staged input could still break (computed
  // beside the rack dimming, from the same dictionary-blind test). The
  // cursor targets the first of them — unless a tap named one.
  admittingGaps: ReadonlySet<number>;
  // The admitting gap a block tap named, if the staged letters still stand
  // on its stem: it wins the cursor over the first admitting gap. The one
  // piece of history the cursor consults, and only to break a tie the
  // letters alone cannot (two gaps forced to the same prefix).
  huntOrigin: number | null;
  // Where a found word's definition lives (dictionary- and UI-language
  // aware; the rows are surface forms, exactly what definitions key on).
  definitionUrl: (word: string) => string;
  // The rows a restart wiped, as a one-shot: their ghosts fly up out of
  // the drum toward the Restart pill that took them.
  restartExit: RestartExit | null;
  // Surface letter -> play key, so an accented tile (É in CAFÉ) still
  // recognizes itself as the required letter it folds to.
  foldLetter: (letter: string) => string;
  // The letters typed so far, exactly as they stand in the input. The drum
  // follows them: each keystroke rolls the window to where that string
  // would sit in the alphabetized list. Empty leaves the drum parked.
  inputWord: string;
  // Types an unfound row's derived prefix into the word area.
  onPrefill: (prefix: string, origin: number) => void;
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
  pangram: boolean;
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

// The drum's rendering units: found words as single rows, and each run of
// unfound slots collapsed into one brick that states its two public facts
// — forced prefix and word count — outright. Rows inside a run are
// informationally identical (they share the gap's one prefix), so the run
// gets one body instead of one indistinguishable row per word.
type DrumItem =
  | { kind: 'word'; slotIndex: number; found: FoundWord }
  | { kind: 'brick'; start: number; count: number; prefix: string };

// How the drum follows the typing (an experiment with two candidate
// feels — flip the word to compare):
//   'center'  every keystroke rolls the target to mid-window, so the eye
//             always checks one spot;
//   'reveal'  minimum motion — nothing moves while the target is already
//             legible, and when it is not, the drum slides just far
//             enough to tuck it inside the edge fade.
const PURSUIT_MODE: 'center' | 'reveal' = 'reveal';

// The beat between newly forced letters as they settle into a brick.
const TILE_ARRIVAL_MS = 70;

// The flight takes at least this long even when the drum has no rolling to
// do — a word snapping instantly into a nearby slot reads as a glitch.
const MIN_FLIGHT_MS = 350;
// Kept in step with .slot-reveal in styles.css: once the flight reaches the
// slot, the ghost and row cross-fade in place. The row must not appear while
// the word is still traveling.
const SLOT_REVEAL_MS = 120;

export function WordDrum({
  admittingGaps,
  huntOrigin,
  definitionUrl,
  foldLetter,
  inputWord,
  onPrefill,
  restartExit,
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
  // Until when a submission's roll-and-flight owns the drum's position:
  // the typing pursuit below yields to it, so letters typed while a word
  // is still landing cannot yank the slot out from under the flight.
  const rollUntil = useRef(0);

  // Slots folded into the drum's rendering units. A find replaces one
  // brick with up to three items (brick · word · brick), so item indices
  // shift between renders while a found word's slotIndex never does.
  const items = useMemo(() => {
    const list: DrumItem[] = [];
    let index = 0;
    while (index < slots.length) {
      const found = slots[index].found;
      if (found !== null) {
        list.push({ found, kind: 'word', slotIndex: index });
        index += 1;
        continue;
      }
      let end = index;
      while (end < slots.length && slots[end].found === null) {
        end += 1;
      }
      list.push({
        count: end - index,
        kind: 'brick',
        // Uniform per gap: every slot of a run carries the gap's one
        // prefix (see slotPrefixes), so the first speaks for all.
        prefix: slots[index].prefix,
        start: index,
      });
      index = end;
    }
    return list;
  }, [slots]);

  // The drum's cursor: while letters are staged, it marks the hunt's
  // target — the first brick the staged letters could still break
  // (admittingGaps: the gaps that admit the input as a prefix, all of
  // which sit inside the input's prefix range). Nobody re-submits a found
  // word; the blocks are what staged letters are for, so blocks get the
  // cursor by default. Target, not verdict: the pill at the rack says
  // what the letters are worth; this says where their work is. Adding a
  // letter only narrows which gaps admit it, so the cursor walks down
  // the list as the word grows and back up as it is deleted. Only when
  // no block admits the letters does the cursor fall back to where the
  // string as typed sorts — a highlighted row when it spells a found
  // word nothing unfound extends, or a hairline caret at the seam it
  // would vanish into (a dead end: nothing unfound can sort there).
  // Derived from public knowledge only (found rows and the bricks
  // between them), like the pursuit that keeps it in view — plus one
  // remembered tap: when two bricks admit the same letters because a tap
  // laid them down, the tapped brick is the target, not the first.
  const cursor = useMemo<
    | { kind: 'brick' | 'row'; index: number }
    | { kind: 'seam'; before: number }
    | null
  >(() => {
    if (inputWord === '' || items.length === 0) {
      return null;
    }
    if (huntOrigin !== null && admittingGaps.has(huntOrigin)) {
      const origin = items.findIndex(
        (item) => item.kind === 'brick' && item.start === huntOrigin,
      );
      if (origin >= 0) {
        return { index: origin, kind: 'brick' };
      }
    }
    const hunt = items.findIndex(
      (item) => item.kind === 'brick' && admittingGaps.has(item.start),
    );
    if (hunt >= 0) {
      return { index: hunt, kind: 'brick' };
    }
    const foldWord = (word: string) =>
      Array.from(word).map(foldLetter).join('');
    const staged = foldWord(inputWord);
    const index = items.findIndex(
      (item) => item.kind === 'word' && foldWord(item.found.word) >= staged,
    );
    if (index < 0) {
      // Past every found word: the trailing brick if the list has one,
      // else the seam below the last row.
      const last = items[items.length - 1];
      return last.kind === 'brick'
        ? { index: items.length - 1, kind: 'brick' }
        : { before: items.length, kind: 'seam' };
    }
    const boundary = items[index];
    if (boundary.kind === 'word' && foldWord(boundary.found.word) === staged) {
      return { index, kind: 'row' };
    }
    return items[index - 1]?.kind === 'brick'
      ? { index: index - 1, kind: 'brick' }
      : { before: index, kind: 'seam' };
  }, [admittingGaps, foldLetter, huntOrigin, inputWord, items]);

  // Where the found rows sat, refreshed whenever the list changes shape:
  // the drum's own box plus each row's offset within the scrolling content.
  // A restart wipes every found word at once, collapsing the drum to a
  // single brick — by the time the ghosts mount there is nothing left to
  // measure, so the layout they fly from is remembered rather than read.
  const rowLayout = useRef<{
    drumBottom: number;
    drumLeft: number;
    drumTop: number;
    drumWidth: number;
    scrollTop: number;
    tops: ReadonlyMap<number, number>;
  } | null>(null);

  // Restart's absorb: ghosts of the wiped rows, flown up toward the
  // Restart pill, then cleared once the flight is over. Fixed to the
  // viewport rather than parked in the list: the collapsed drum is far too
  // short to hold them, and its edge-fade mask would paint them out.
  // A layout effect, declared ahead of the capture below, so it reads the
  // layout as it stood before the wipe.
  const [exitGhosts, setExitGhosts] = useState<{
    id: number;
    rows: readonly (RestartExitRow & { left: number; top: number })[];
    width: number;
  } | null>(null);
  const seenRestart = useRef(restartExit?.id ?? 0);
  useLayoutEffect(() => {
    const previous = seenRestart.current;
    seenRestart.current = restartExit?.id ?? 0;
    const layout = rowLayout.current;
    if (restartExit === null || restartExit.id <= previous || layout === null) {
      return;
    }
    // Only the rows the player could actually see leave ghosts — one
    // scrolled out of the drum would otherwise fly across the scoreboard
    // above it. jsdom measures every box as zero, where the visible band
    // cannot be told from an empty one, so there the test is skipped.
    const measurable = layout.drumBottom > layout.drumTop;
    const rows = restartExit.rows
      .map((row) => ({
        ...row,
        left: layout.drumLeft,
        top:
          layout.drumTop + (layout.tops.get(row.index) ?? 0) - layout.scrollTop,
      }))
      .filter(
        (row) =>
          !measurable ||
          (row.top + ROW_HEIGHT > layout.drumTop &&
            row.top < layout.drumBottom),
      );
    setExitGhosts({ id: restartExit.id, rows, width: layout.drumWidth });
    const timer = window.setTimeout(() => {
      setExitGhosts(null);
    }, 700);
    return () => {
      window.clearTimeout(timer);
    };
  }, [restartExit]);

  // The layout the ghosts above will need, captured after every reshaping
  // of the list. Declared after that effect so a restart's commit still
  // finds the outgoing layout in place.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const tops = new Map<number, number>();
    for (const node of container.querySelectorAll('[data-slot-index]')) {
      if (node instanceof HTMLElement) {
        tops.set(Number(node.dataset.slotIndex), node.offsetTop);
      }
    }
    rowLayout.current = {
      drumBottom: rect.bottom,
      drumLeft: rect.left,
      drumTop: rect.top,
      drumWidth: rect.width,
      scrollTop: container.scrollTop,
      tops,
    };
  }, [items]);

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
    const container = containerRef.current;
    // Keeps the remembered layout's scroll offset live, so a restart after
    // scrolling still knows where on screen the rows had come to rest.
    if (container !== null && rowLayout.current !== null) {
      rowLayout.current.scrollTop = container.scrollTop;
    }
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
    // Any earlier flight's animations must stop BEFORE the tiles are
    // measured: a live transform scales what getBoundingClientRect
    // reports, and a launch computed from a mid-animation box launches at
    // the wrong size. (StrictMode's dev remount re-runs this very callback
    // on a node it already animated, which is exactly that trap.)
    for (const animation of flightAnimations.current) {
      animation.cancel();
    }
    const tiles = node.firstElementChild?.getBoundingClientRect();
    // Launch no larger than the letters being replaced. Matching their
    // height alone made the ghost wider than the word (tile boxes carry
    // padding the bare letters don't), so it briefly swelled over whatever
    // trailed the word — the verdict pill — before shrinking. The word is
    // bound for a 32px row regardless: its journey only ever shrinks it,
    // so the width cap costs nothing and the takeoff stays inside the
    // word's own footprint.
    const scale =
      tiles !== undefined && tiles.height > 0 && tiles.width > 0
        ? Math.min(
            path.from.height / tiles.height,
            path.from.width / tiles.width,
          )
        : 1.6;
    const dx = path.from.left - path.toLeft;
    const dy =
      path.from.top + path.from.height / 2 - (path.toTop + ROW_HEIGHT / 2);
    const handoffDuration = path.duration + SLOT_REVEAL_MS;
    const handoffOffset = path.duration / handoffDuration;
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
    const index = items.findIndex(
      (item) => item.kind === 'word' && item.found.word === spotlight.word,
    );
    if (index < 0) {
      return;
    }
    const landing = items[index];
    if (landing.kind !== 'word') {
      return; // findIndex only matches words; TypeScript needs telling
    }
    // One deliberate submission, one response — never replayed for the
    // renders that follow it.
    if (spotlight.id === handledSpotlight.current) {
      return;
    }
    handledSpotlight.current = spotlight.id;
    // Center the slot in the window the drum currently has (it flexes with
    // the viewport; jsdom measures 0, so fall back to the design height).
    // The row's own offset is the authority on where it sits: bricks take
    // whatever height the window has left over, so there is no arithmetic
    // that could predict it — and by now the list has already been laid
    // out with the new word in place.
    const height = container.clientHeight || DRUM_HEIGHT;
    const row = container.querySelector('[data-spotlight="true"]');
    const rowTop = row instanceof HTMLElement ? row.offsetTop : 0;
    const centered = rowTop - (height - ROW_HEIGHT) / 2;
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
    const slotRow = row;
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
        hinted: landing.found.hinted,
        id: spotlight.id,
        pangram: landing.found.pangram,
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
    rollUntil.current =
      performance.now() +
      Math.max(scrollDuration, spotlight.requested ? 0 : MIN_FLIGHT_MS);
    easeScrollTo(container, target, scrollDuration);
  }, [easeScrollTo, items, spotlight, wordOriginRef]);

  // The drum follows the typing: each keystroke rolls the window to the
  // cursor's target — the first block the typed string could still
  // break, or where it sorts once nothing admits it. Only public
  // knowledge steers this — found rows and the bricks between them — so
  // it surfaces nothing a scrub of the drum would not; it just does the
  // scrubbing.
  // An empty input parks the drum where it last was: snapping home on
  // every clear would double the motion for nothing.
  useEffect(() => {
    const container = containerRef.current;
    if (cursor === null || container === null) {
      return;
    }
    if (performance.now() < rollUntil.current) {
      return;
    }
    // The camera chases the cursor: its row or brick directly, or for a
    // seam the item just after it (the caret rides that item's top edge).
    const index =
      cursor.kind === 'seam'
        ? Math.min(cursor.before, items.length - 1)
        : cursor.index;
    const target = items[index];
    const node = container.querySelector(
      target.kind === 'word'
        ? `[data-slot-index="${String(target.slotIndex)}"]`
        : `[data-brick-start="${String(target.start)}"]`,
    );
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const height = container.clientHeight || DRUM_HEIGHT;
    let desired: number;
    if (PURSUIT_MODE === 'center') {
      desired = node.offsetTop - (height - node.offsetHeight) / 2;
    } else {
      // Legible means clear of the edge fades, so the safe band insets by
      // the fade's grown depth. A row counts as in view when all of it is
      // legible; a brick (which can be taller than the window) when at
      // least a row's worth is.
      const margin = Math.min(FADE_PX, height / 4);
      const reveal = Math.min(node.offsetHeight || ROW_HEIGHT, ROW_HEIGHT);
      const top = node.offsetTop;
      const bottom = top + node.offsetHeight;
      const safeTop = container.scrollTop + margin;
      const safeBottom = container.scrollTop + height - margin;
      const visible = Math.min(bottom, safeBottom) - Math.max(top, safeTop);
      if (visible >= reveal) {
        return; // already in view: the whole point of this mode
      }
      // Slide just far enough: a target above tucks its tail in under the
      // top fade, one below raises its head over the bottom fade.
      desired =
        top + node.offsetHeight / 2 < container.scrollTop + height / 2
          ? bottom - reveal - margin
          : top + reveal + margin - height;
    }
    if (
      container.clientHeight === 0 ||
      typeof container.scrollTo !== 'function'
    ) {
      container.scrollTop = Math.max(0, desired); // jsdom: no layout to ease
      return;
    }
    const to = Math.min(
      Math.max(0, desired),
      Math.max(0, container.scrollHeight - container.clientHeight),
    );
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.scrollTop = to;
      return;
    }
    const distance = Math.abs(to - container.scrollTop);
    if (distance < 1) {
      return;
    }
    // The spotlight's pacing: short hops brisk, long ones unhurried.
    easeScrollTo(container, to, Math.min(650, Math.max(280, distance * 0.45)));
  }, [cursor, easeScrollTo, items]);

  // What each brick last said, so the drum can tell a shrunken block from
  // one that now names more than it could before. A narrowed gap forces
  // longer prefixes (see gapPrefixes), and those extra letters are the
  // most useful thing a find hands the player — so they are lit as they
  // arrive rather than appearing as if they had always been there. Only
  // the drum can know which tiles are new: the label alone cannot say.
  const previousBricks = useRef<
    readonly { end: number; prefix: string; start: number }[] | null
  >(null);
  useLayoutEffect(() => {
    const bricks: { end: number; prefix: string; start: number }[] = [];
    for (const item of items) {
      if (item.kind === 'brick') {
        bricks.push({
          end: item.start + item.count,
          prefix: item.prefix,
          start: item.start,
        });
      }
    }
    const previous = previousBricks.current;
    previousBricks.current = bricks;
    const container = containerRef.current;
    // Nothing to compare against on a board's first paint, and nothing to
    // play where motion is unwelcome or unavailable (jsdom, for one, has
    // neither matchMedia nor the Web Animations API).
    if (
      previous === null ||
      container === null ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    // Chained onto the same flight the cleave is timed against, landing
    // the letters as the block finishes sealing around the new word.
    const flight = Number.parseFloat(
      container.style.getPropertyValue('--spotlight-delay'),
    );
    const startAt = (Number.isNaN(flight) ? 0 : flight) + 180;
    for (const brick of bricks) {
      // The block this one came out of: whatever run used to cover its
      // first slot. Slot numbers are fixed for the life of the puzzle, so
      // this holds across any number of finds.
      const parent = previous.find(
        (old) => old.start <= brick.start && brick.start < old.end,
      );
      if (parent === undefined || brick.prefix.length <= parent.prefix.length) {
        continue;
      }
      const scope = `[data-brick-start="${String(brick.start)}"]`;
      const tiles = container.querySelectorAll(`${scope} [data-prefix-tile]`);
      // The letters that just became derivable, and the dash that closes
      // the strip behind them.
      const arriving: Element[] = [];
      for (let index = parent.prefix.length; index < tiles.length; index++) {
        arriving.push(tiles[index]);
      }
      const dash = container.querySelector(`${scope} [data-prefix-dash]`);
      if (dash !== null) {
        arriving.push(dash);
      }
      arriving.forEach((node, rank) => {
        const animate = (node as { animate?: Element['animate'] }).animate;
        if (animate === undefined) {
          return;
        }
        // Backwards fill holds each letter out of sight until its turn:
        // they are absent while the word flies, then settle in one by
        // one. The dash rides with the last of them.
        animate.call(
          node,
          [
            { opacity: 0, transform: 'scale(1.6)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            delay:
              startAt +
              Math.min(rank, Math.max(0, arriving.length - 2)) *
                TILE_ARRIVAL_MS,
            duration: 420,
            easing: 'cubic-bezier(0.34, 1.28, 0.64, 1)',
            fill: 'backwards',
          },
        );
      });
    }
  }, [items]);

  // True when the item at this index is the word a fresh find just landed
  // in — the neighbor test that tells a brick its identity just changed.
  const spotlightWordAt = (index: number): boolean => {
    if (spotlight === null || spotlight.requested) {
      return false;
    }
    if (index < 0 || index >= items.length) {
      return false;
    }
    const item = items[index];
    return item.kind === 'word' && item.found.word === spotlight.word;
  };

  // Whether material stands at this index at all.
  const brickAt = (index: number): boolean =>
    index >= 0 && index < items.length && items[index].kind === 'brick';

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
        // px-2 buffers row content from the block slabs' edges; the slabs
        // themselves reach back over the padding (negative insets below),
        // so they keep the drum's full width. Rows move with the padding,
        // so the flight's landing measurement needs no correction.
        className="word-drum relative flex min-h-24 w-full flex-col overflow-y-auto overscroll-contain px-2 [scrollbar-width:none]"
        data-testid="word-drum"
        // The window this puzzle reserves, in rows: as many as the whole
        // list could ever occupy, capped in CSS at the eight-row ceiling.
        // Reserved up front so finding a word never resizes the drum and
        // pushes the letters and buttons down the screen (see .word-drum).
        style={{ '--drum-slots': slots.length } as CSSProperties}
        onScroll={handleScroll}
        ref={containerRef}
      >
        {items.map((item, index) => {
          // mt-auto on the first item bottom-anchors a list shorter than
          // its window, chat-style — the words hug the composer below;
          // once the list overflows, the auto margin resolves to zero and
          // scrolling is unchanged.
          const anchored = index === 0 ? ' mt-auto' : '';
          // The cursor's hairline: a seam carries no material to
          // highlight, so the caret straddles the boundary — drawn at
          // this item's top edge, or under the last item for a seam past
          // the end of the list. It rides the item, so it scrolls (and
          // bottom-anchors) with the rows it sits between.
          const caret = (edge: 'top' | 'bottom') => (
            <span
              aria-hidden="true"
              className={`absolute -inset-x-2 z-10 h-0.5 rounded-full bg-gray-400 dark:bg-gray-500 ${
                edge === 'top' ? '-top-px' : '-bottom-px'
              }`}
              data-testid="drum-caret"
            />
          );
          const seamTop =
            cursor?.kind === 'seam' && cursor.before === index
              ? caret('top')
              : null;
          const seamBottom =
            cursor?.kind === 'seam' &&
            cursor.before === items.length &&
            index === items.length - 1
              ? caret('bottom')
              : null;
          if (item.kind === 'brick') {
            // A fresh find splits its brick: the halves it leaves behind
            // start extended toward each other (together still covering
            // the landing row, so the material reads as unbroken while
            // the word is in flight), then part from its center and seal
            // their caps once it lands. Alternating names replay a repeat
            // split of a surviving brick without a remount.
            //
            // Only a genuine split, though: the halves meet mid-row, so
            // each one's reach is a promise that the other half is coming
            // to meet it. A word landing at the list's head or tail — or
            // against a word already found — leaves material on one side
            // only, and there the same animation reads as the block
            // briefly swelling and squaring its cap against nothing. Such
            // a block was trimmed, not cut, and says so by holding still.
            const splitBelow = spotlightWordAt(index + 1) && brickAt(index + 2);
            const splitAbove = spotlightWordAt(index - 1) && brickAt(index - 2);
            const cleave =
              spotlight === null
                ? ''
                : splitBelow
                  ? spotlight.id % 2 === 1
                    ? 'block-cleave-bottom'
                    : 'block-cleave-bottom-alt'
                  : splitAbove
                    ? spotlight.id % 2 === 1
                      ? 'block-cleave-top'
                      : 'block-cleave-top-alt'
                    : '';
            // The brick's body: solid, uncut material — a hairline edge in
            // the app's border grammar and a faint 45° hatch (drafting
            // notation for solid matter). -z-10 sinks it below every row's
            // in-flow content within the drum's stacking context (the
            // edge-fade mask establishes one before first paint), so a
            // splitting half extending over the landing row slides under
            // its tiles, never over them. The whole brick is one object,
            // so its hover answers as one (interactive bricks only).
            // Under the cursor the edge firms to the keycap gray — the
            // staged letters sort into this material.
            const isCursor = cursor?.kind === 'brick' && cursor.index === index;
            const chipClass = `block-hatch absolute -inset-x-2 inset-y-0.5 -z-10 rounded-lg border ${
              isCursor
                ? 'border-gray-400 dark:border-gray-500'
                : 'border-gray-200 dark:border-gray-800'
            } bg-gray-100 dark:bg-gray-900${
              item.prefix === ''
                ? ''
                : ' transition group-hover:border-gray-300 group-hover:bg-gray-200 dark:group-hover:border-gray-700 dark:group-hover:bg-gray-800'
            }${cleave === '' ? '' : ` ${cleave}`}`;
            // Exactly the bricks the landing word touches are the ones
            // whose identity just changed: a find works on its own gap
            // and leaves every other one alone. Their counts flash as the
            // block settles — whether it was cut in two or merely
            // trimmed, it no longer says what it used to.
            const relabel =
              spotlight === null ||
              !(spotlightWordAt(index + 1) || spotlightWordAt(index - 1))
                ? ''
                : spotlight.id % 2 === 1
                  ? ' block-relabel'
                  : ' block-relabel-alt';
            return (
              <li
                className={`relative${anchored}`}
                // The run's first slot, stable for as long as the run
                // keeps its head: how the effect above finds this brick's
                // tiles again after a find rewrote the list.
                data-brick-start={item.start}
                data-count={item.count}
                data-cursor={isCursor ? 'true' : 'false'}
                data-testid="word-brick"
                key={`brick-${String(item.start)}`}
                // The material takes up whatever the found rows leave, in
                // proportion to how much it buries — so the window is full
                // from the first deal and stays exactly full as words are
                // cut out of it, and a block's size tells you how much of
                // the list is still in there. One row is the floor, so a
                // brick can always state its count.
                style={{
                  flexBasis: ROW_HEIGHT,
                  flexGrow: item.count,
                  minHeight: ROW_HEIGHT,
                }}
              >
                {seamTop}
                {seamBottom}
                {item.prefix === '' ? (
                  // The count belongs to the Words column the header names;
                  // what a brick's words are worth is exactly what it does
                  // not say, so the points column keeps its question mark.
                  <div className="flex h-full items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-500">
                    <span aria-hidden="true" className={chipClass} />
                    <span className={relabel.trim()}>
                      {t.unfoundCountLabel(item.count)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="w-16 text-right text-gray-300 dark:text-gray-700"
                    >
                      ?
                    </span>
                  </div>
                ) : (
                  // The letters the alphabetized list itself gives away,
                  // spelled in ghost tiles; every buried word here shares
                  // them, so the tap — anywhere on the brick — types them
                  // into the word area, sparing the player the bookkeeping.
                  <button
                    aria-label={t.unfoundBlockLabel(
                      item.count,
                      Array.from(item.prefix).join(' '),
                    )}
                    className="group flex h-full w-full touch-manipulation items-center justify-between gap-4 text-sm text-gray-300 dark:text-gray-700"
                    onClick={() => {
                      onPrefill(item.prefix, item.start);
                    }}
                    type="button"
                  >
                    <span aria-hidden="true" className={chipClass} />
                    {/* Words column: the letters every word in here shares,
                        then how many are buried. */}
                    <span
                      aria-hidden="true"
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`flex items-center ${
                          item.prefix.length > 9 ? 'gap-0.5' : 'gap-1'
                        }`}
                      >
                        {Array.from(item.prefix).map((letter, tileIndex) => (
                          <span
                            className={miniTileClass(
                              letter,
                              requiredCharacters,
                              {
                                compact: item.prefix.length > 9,
                                ghost: true,
                              },
                            )}
                            data-prefix-tile=""
                            key={tileIndex}
                          >
                            {letter}
                          </span>
                        ))}
                        {/* The strip's terminator: it arrives with the
                            last of any newly forced letters, so the trail
                            is never left hanging without them. */}
                        <span data-prefix-dash="">—</span>
                      </span>
                      <span
                        className={`text-gray-400 dark:text-gray-500${relabel}`}
                      >
                        {t.unfoundCountLabel(item.count)}
                      </span>
                    </span>
                    <span aria-hidden="true" className="w-16 text-right">
                      ?
                    </span>
                  </button>
                )}
              </li>
            );
          }
          const found = item.found;
          return (
            <li
              className={`relative shrink-0${anchored}`}
              data-found="true"
              // The slot this row occupies in the full word list, so a
              // restart can find where it sat after the list has collapsed.
              data-slot-index={item.slotIndex}
              data-spotlight={found.word === spotlight?.word ? 'true' : 'false'}
              data-testid="word-slot"
              key={`word-${String(item.slotIndex)}`}
              style={{ height: ROW_HEIGHT }}
            >
              {seamTop}
              {seamBottom}
              {/* The cursor as a row selection: the staged letters spell
                  this very word. The slab wears the bricks' geometry with
                  the keycap gray's edge — same cursor, solid ground. */}
              {cursor?.kind === 'row' && cursor.index === index ? (
                <span
                  aria-hidden="true"
                  className="absolute -inset-x-2 inset-y-0.5 -z-10 rounded-lg border border-gray-400 dark:border-gray-500"
                  data-testid="drum-cursor-row"
                />
              ) : null}
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
                            // A hinted pangram stays muted: the bonus was
                            // forfeited with the reveal, so there is no
                            // outsized number left to explain.
                            pangram: found.pangram && !found.hinted,
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
            </li>
          );
        })}
      </ul>
      {/* The wiped rows' ghosts, hanging where the rows last were and
          flying up toward the Restart pill — the same tiles the rows wore,
          staggered top-first so the nearest leave first. Fixed and outside
          the drum, like the flight below: the wipe leaves the list too
          short to hold them, and its edge-fade mask would paint them out.
          px-2 mirrors the drum's own padding, so a ghost lines up with the
          row it stands in for. */}
      {exitGhosts === null
        ? null
        : exitGhosts.rows.map((row, rank) => (
            <div
              aria-hidden="true"
              className="row-exit pointer-events-none fixed flex items-center px-2"
              data-testid="word-exit-ghost"
              key={`${exitGhosts.id}-${row.word}`}
              style={{
                animationDelay: `${Math.min(rank * 30, 240)}ms`,
                height: ROW_HEIGHT,
                left: row.left,
                top: row.top,
                width: exitGhosts.width,
              }}
            >
              <span
                className={`flex items-center ${
                  row.word.length > 9 ? 'gap-0.5' : 'gap-1'
                }`}
              >
                {Array.from(row.word).map((letter, tileIndex) => (
                  <span
                    className={miniTileClass(
                      foldLetter(letter),
                      requiredCharacters,
                      {
                        compact: row.word.length > 9,
                        muted: row.hinted,
                        pangram: row.pangram && !row.hinted,
                      },
                    )}
                    key={tileIndex}
                  >
                    {letter}
                  </span>
                ))}
              </span>
            </div>
          ))}
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
                    pangram: flight.pangram && !flight.hinted,
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
