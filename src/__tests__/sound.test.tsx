import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App';

// Same puzzle the App tests use: WORDTES with a required T, so TEST scores 1
// point and WORSTED is the 11-point pangram.
const DICTIONARY = ['TEST', 'ROTTED', 'WORSTED', 'WORD', 'REDO', 'ABLE'];

// Every oscillator the engine starts, by frequency. jsdom has no Web Audio,
// so the fake below is both the stand-in and the microphone.
let notes: number[] = [];

// Tossing is the one voice with no pitch — filtered noise, counted apart.
let sweeps = 0;

// The engine throttles repeated typing against the audio clock, so the tests
// own that clock.
let clock = 0;

// iOS creates every context suspended until a gesture resumes it; the fake
// starts the same way so the unlock path is what the tests exercise. The
// engine keeps one context for the life of the page — the module singleton
// outlives each test — so its state lives here beside the other counters,
// where tests can reach it without holding the instance.
let contextState = 'suspended';
let resumes = 0;

// Wiring the graph up is not what these tests are about.
const noop = vi.fn();

function audioParam() {
  return {
    value: 0,
    setValueAtTime(value: number) {
      this.value = value;
      return this;
    },
    exponentialRampToValueAtTime() {
      return this;
    },
  };
}

class FakeAudioContext {
  sampleRate = 44100;
  destination = {};

  get currentTime() {
    return clock;
  }

  get state() {
    return contextState;
  }

  constructor() {
    contextState = 'suspended';
  }

  resume() {
    resumes++;
    contextState = 'running';
    return Promise.resolve();
  }

  suspend() {
    contextState = 'suspended';
    return Promise.resolve();
  }

  createGain() {
    return { gain: audioParam(), connect: noop };
  }

  createOscillator() {
    const frequency = audioParam();
    return {
      type: 'sine',
      frequency,
      onended: null as (() => void) | null,
      connect: noop,
      start() {
        notes.push(frequency.value);
      },
      // A stopped node is a finished node, which is what releases the
      // engine's voice slot.
      stop(this: { onended: (() => void) | null }) {
        this.onended?.();
      },
    };
  }

  createBiquadFilter() {
    return {
      type: '',
      Q: { value: 0 },
      frequency: audioParam(),
      connect: noop,
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: noop,
      start() {
        sweeps++;
      },
      stop: noop,
    };
  }

  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

function typeWord(word: string): void {
  for (const character of word) {
    // Past the engine's anti-machine-gun window, so each letter is heard.
    clock += 0.1;
    fireEvent.keyDown(document, { key: character });
  }
}

function pressKey(key: string): void {
  fireEvent.keyDown(document, { key });
}

function submitWord(word: string): void {
  typeWord(word);
  pressKey('Enter');
}

// Sound lives in the ⋯ menu now; open it on the way if it isn't up.
// Toggling keeps the menu open (a settings row), so repeated calls find
// it already showing.
function soundToggle(): HTMLElement {
  if (screen.queryByRole('menu') === null) {
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
  }
  return screen.getByRole('menuitemcheckbox', { name: 'Sound' });
}

function enableSound(): void {
  fireEvent.click(soundToggle());
  notes = [];
}

describe('sound', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '?letters=WORDTES&required=T');
    vi.stubGlobal('AudioContext', FakeAudioContext);
    notes = [];
    sweeps = 0;
    resumes = 0;
    // Well clear of the previous test's last note.
    clock += 10;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (navigator as { audioSession?: unknown }).audioSession;
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('makes no sound until the player asks for it', () => {
    render(<App dictionary={DICTIONARY} />);

    expect(soundToggle()).toHaveAttribute('aria-checked', 'false');

    typeWord('test');
    pressKey('Enter');
    pressKey(' ');

    expect(notes).toHaveLength(0);
    expect(sweeps).toBe(0);
  });

  it('sounds typing, tossing, and scoring once enabled', () => {
    render(<App dictionary={DICTIONARY} />);
    enableSound();

    typeWord('tes');
    // The pitch climbs the scale as the word grows.
    expect(notes).toHaveLength(3);
    expect(notes[0]).toBeLessThan(notes[1]);
    expect(notes[1]).toBeLessThan(notes[2]);

    notes = [];
    pressKey('Backspace');
    expect(notes).toHaveLength(1);

    notes = [];
    pressKey(' ');
    // A toss scatters rather than sounding a note.
    expect(sweeps).toBe(1);
    expect(notes).toHaveLength(0);

    typeWord('st'); // back to TEST
    notes = [];
    pressKey('Enter');
    // The two-note chime for a scored word, and — since the first word off
    // zero also climbs a rung — the three-note rank-up run behind it.
    expect(notes).toHaveLength(5);
  });

  it('answers with a chime when sound is switched on', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(soundToggle());

    expect(notes).toHaveLength(2);
    expect(soundToggle()).toHaveAttribute('aria-checked', 'true');
    expect(window.localStorage.getItem('wordsalad:sound')).toBe('on');
  });

  it('remembers the preference across sessions', () => {
    window.localStorage.setItem('wordsalad:sound', 'on');
    render(<App dictionary={DICTIONARY} />);

    expect(soundToggle()).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(soundToggle());
    expect(window.localStorage.getItem('wordsalad:sound')).toBe('off');

    notes = [];
    typeWord('te');
    expect(notes).toHaveLength(0);
  });

  // The game's sounds play from effects, which run after the gesture that
  // caused them — outside the call stack where iOS is willing to start
  // audio. The gesture itself must be what wakes the context.
  it('resumes a suspended context from the raw gesture while sound is on', () => {
    window.localStorage.setItem('wordsalad:sound', 'on');
    render(<App dictionary={DICTIONARY} />);

    contextState = 'suspended';
    resumes = 0;

    fireEvent.pointerUp(document.body);

    expect(resumes).toBeGreaterThan(0);
    expect(contextState).toBe('running');
  });

  // iOS mutes the default (ambient) audio session — the one Web Audio
  // rides in — whenever the ring/silent switch is set, while media
  // elements play from 'playback' sessions the switch does not touch:
  // the reason a silenced phone sounds on other sites but not here.
  // Claiming 'playback' lifts the game out from under the switch once
  // the player has asked for sound.
  it('claims the playback audio session while sound is on', () => {
    const session = { type: 'auto' };
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: session,
    });

    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(soundToggle());
    expect(session.type).toBe('playback');

    // Toggling off hands the session back and stops the render loop, so
    // the game's silence does not hold the phone's exclusive playback
    // slot against backgrounded music.
    fireEvent.click(soundToggle());
    expect(session.type).toBe('auto');
    expect(contextState).toBe('suspended');
  });

  // WebKit renegotiates the native session on every assignment to type,
  // whether or not the value changed — and priming runs on every gesture.
  // Unguarded, each tap would pay for that renegotiation as latency
  // between the press and its sound.
  it('claims the audio session once, not on every gesture', () => {
    let sets = 0;
    let type = 'auto';
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: {
        get type() {
          return type;
        },
        set type(value: string) {
          type = value;
          sets++;
        },
      },
    });

    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(soundToggle());
    expect(type).toBe('playback');
    expect(sets).toBe(1);

    typeWord('test');
    fireEvent.pointerUp(document.body);
    expect(sets).toBe(1);
  });

  // A context left running renders silence forever, and iOS — told via
  // 'playback' that the page is a media player — keeps its session
  // registered, showing the site on the lock screen with phantom media
  // controls. Leaving the screen parks the context; the next gesture is
  // the unlock, as everywhere else.
  it('parks the context when the page is hidden while sound is on', () => {
    window.localStorage.setItem('wordsalad:sound', 'on');
    render(<App dictionary={DICTIONARY} />);

    fireEvent.pointerUp(document.body);
    expect(contextState).toBe('running');

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    fireEvent(document, new Event('visibilitychange'));
    delete (document as { visibilityState?: unknown }).visibilityState;

    expect(contextState).toBe('suspended');
  });

  it('leaves audio untouched by gestures while sound is off', () => {
    render(<App dictionary={DICTIONARY} />);
    resumes = 0;

    fireEvent.pointerUp(document.body);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(resumes).toBe(0);
  });

  it('restores a finished game in silence', () => {
    window.localStorage.setItem('wordsalad:sound', 'on');
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED', 'WORSTED']),
    );
    render(<App dictionary={DICTIONARY} />);

    // A perfect game's worth of history is state on arrival, not events:
    // none of it replays as fanfare.
    expect(screen.getByText('Found 3 words')).toBeInTheDocument();
    expect(notes).toHaveLength(0);
  });

  it('does not replay what happened while it was muted', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted'); // the pangram, silently

    fireEvent.click(soundToggle());
    // Only the toggle's own two-note confirmation — no backlog.
    expect(notes).toHaveLength(2);
  });

  it('stays quiet when a restart resets the game', () => {
    render(<App dictionary={DICTIONARY} />);
    enableSound();
    submitWord('test');
    typeWord('ro');
    pressKey('Backspace');

    notes = [];
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

    // Restart rewinds the toss and delete counters to zero; a counter going
    // backwards is not an event.
    expect(screen.getByText('Found 0 words')).toBeInTheDocument();
    expect(notes).toHaveLength(0);
  });

  it('gives the perfect game a bigger sound than an ordinary win', () => {
    render(<App dictionary={DICTIONARY} />);
    enableSound();

    submitWord('worsted'); // 11 points — one short of the win line

    // Measure the submissions themselves, with the typing already done.
    typeWord('rotted');
    notes = [];
    pressKey('Enter'); // crosses the line: chime, then the fanfare
    const win = notes.length;

    // The win dialog owns the keyboard until it is dismissed.
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));

    typeWord('test'); // the last point on the board
    notes = [];
    pressKey('Enter');
    const perfect = notes.length;

    expect(win).toBeGreaterThan(0);
    expect(perfect).toBeGreaterThan(win);
  });
});
