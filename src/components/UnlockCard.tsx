import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { UnlockMoment } from '../useWordSaladGame';
import { AchievementRecap } from './AchievementRecap';

// The mid-board unlock's moment: a card over the verdict row carrying the
// recap's own chips, which appears a beat after the scored word has landed
// (so it covers a sentence already read, never one just arriving), holds
// for a moment, then shrinks and flies into the ⋯ menu — the way a found
// word flies into its slot and a restarted board flies into the Restart
// pill. Things go where they live, and this one lives in the menu's
// Achievements row, which the parent emphasizes on landing. Never shown
// for an unlock a dialog is about to recap: the parent withholds it.
interface UnlockCardProps {
  moment: UnlockMoment;
  // Called once the flight has landed (or the card has faded, under
  // reduced motion): the parent retires the moment and pulses the target.
  onDone: () => void;
  // The ⋯ menu trigger, the flight's destination.
  targetRef: RefObject<HTMLElement | null>;
}

// The beat before the card shows: past the word's flight into the drum and
// the verdict's first read. Then the hold, then the flight.
const BEAT_MS = 650;
const HOLD_MS = 2000;
const FLIGHT_MS = 450;

type Phase = 'pending' | 'shown' | 'flying';

export function UnlockCard({ moment, onDone, targetRef }: UnlockCardProps) {
  const [phase, setPhase] = useState<Phase>('pending');
  const cardRef = useRef<HTMLDivElement>(null);
  // Latest-callback ref, so a parent re-render never restarts the flight.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const beat = window.setTimeout(() => {
      setPhase('shown');
    }, BEAT_MS);
    return () => {
      window.clearTimeout(beat);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'shown') {
      return;
    }
    const hold = window.setTimeout(() => {
      setPhase('flying');
    }, HOLD_MS);
    return () => {
      window.clearTimeout(hold);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'flying') {
      return;
    }
    const card = cardRef.current;
    const target = targetRef.current;
    const animate = (card as { animate?: HTMLElement['animate'] } | null)
      ?.animate;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (card === null || target === null || animate === undefined || reduced) {
      // No flight: the card simply goes, and the menu still gets its mark.
      const done = window.setTimeout(() => {
        onDoneRef.current();
      }, 0);
      return () => {
        window.clearTimeout(done);
      };
    }
    const from = card.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const flight = animate.call(
      card,
      [
        { opacity: 1, transform: 'translate(0, 0) scale(1)' },
        {
          opacity: 0.25,
          transform: `translate(${dx}px, ${dy}px) scale(0.12)`,
        },
      ],
      {
        duration: FLIGHT_MS,
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        fill: 'forwards',
      },
    );
    const land = () => {
      onDoneRef.current();
    };
    flight.addEventListener('finish', land);
    return () => {
      flight.removeEventListener('finish', land);
      flight.cancel();
    };
  }, [phase, targetRef]);

  if (phase === 'pending') {
    return null;
  }

  return (
    // Centered on the verdict row it overlays; taller than the row, so it
    // spills evenly above and below. Inert to the pointer: nothing under
    // it is tappable while it shows, and it needs no tap of its own — the
    // flight says where to look.
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        className={`rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-xl dark:border-gray-700 dark:bg-gray-900 ${
          phase === 'shown' ? 'unlock-card-enter' : ''
        }`}
        data-phase={phase}
        data-testid="unlock-card"
        ref={cardRef}
        role="status"
      >
        <AchievementRecap unlocked={moment.ids} />
      </div>
    </div>
  );
}
