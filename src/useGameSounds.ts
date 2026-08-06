import { useEffect, useRef } from 'react';

import {
  hinted,
  letterAdded,
  letterDeleted,
  letterRejected,
  primeAudio,
  rankedUp,
  tossed,
  won,
  wordRejected,
  wordScored,
} from './sound';
import type { WordSaladGame } from './useWordSaladGame';

// Sound is a pure listener: the game already publishes every moment worth
// hearing as a one-shot carrying an id that advances each time it happens,
// so nothing here reaches back into the game, and muting changes nothing
// about how it plays.

// Fires when a one-shot's id advances. Two things it must never do: sound on
// mount (a restored game arrives with its whole history already in state —
// fifty found words would replay as fifty chimes), or sound when a counter
// resets to 0 for a fresh game.
function useSignal(
  id: number | null | undefined,
  enabled: boolean,
  run: () => void,
): void {
  const latest = useRef(run);
  const seen = useRef(id ?? 0);

  // Declared before the firing effect, so on any given commit this one has
  // already stored the current render's callback by the time it runs.
  useEffect(() => {
    latest.current = run;
  });

  useEffect(() => {
    const previous = seen.current;
    // Tracked whether or not sound is on, so turning it on mid-game plays
    // what happens next rather than a backlog of what already did.
    seen.current = id ?? 0;

    if (enabled && id !== undefined && id !== null && id > previous) {
      latest.current();
    }
  }, [enabled, id]);
}

// The signals below fire from effects, which run after the gesture that
// caused them — too late for iOS, which only lets audio start from inside a
// user gesture's call stack. So while sound is on, the raw gestures prime
// the context directly: created and resumed in-stack, it is already running
// by the time the effects speak. The listeners stay attached rather than
// firing once, because iOS also suspends the context across phone calls and
// tab switches, and the next tap is the cure. While sound is off nothing is
// attached, keeping audio strictly opt-in.
const UNLOCK_EVENTS = ['pointerup', 'keydown', 'click'] as const;

function useAudioUnlock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    for (const type of UNLOCK_EVENTS) {
      window.addEventListener(type, primeAudio, { capture: true });
    }
    return () => {
      for (const type of UNLOCK_EVENTS) {
        window.removeEventListener(type, primeAudio, { capture: true });
      }
    };
  }, [enabled]);
}

export function useGameSounds(game: WordSaladGame, enabled: boolean): void {
  useAudioUnlock(enabled);

  // A game that failed to build has no signals; the hooks below still run in
  // a fixed order, they just never fire.
  const playing = game.status === 'playing' ? game : null;
  const letterCount = playing?.inputLetters.length ?? 0;
  const submission = playing?.lastSubmission ?? null;
  const celebration = playing?.celebration ?? null;

  useSignal(playing?.lastAppended?.id, enabled, () => {
    // The letter is already in the word by the time this runs, so the count
    // is its position in it.
    letterAdded(letterCount - 1);
  });

  useSignal(playing?.lastRejection?.id, enabled, letterRejected);

  useSignal(playing?.deleteId, enabled, () => {
    letterDeleted(letterCount);
  });

  useSignal(playing?.tossId, enabled, tossed);

  useSignal(playing?.hintReveal?.id, enabled, hinted);

  useSignal(submission?.id, enabled, () => {
    if (submission === null) {
      return;
    }
    if (submission.preview.verdict === 'valid') {
      wordScored(submission.preview.points);
    } else {
      wordRejected();
    }
  });

  // The game raises either a rank-up or a celebration for a submission,
  // never both, so these two can't collide.
  useSignal(playing?.rankUp?.id, enabled, rankedUp);

  useSignal(celebration?.id, enabled, () => {
    won(celebration?.perfect ?? false);
  });
}
