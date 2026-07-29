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
  state = 'running';
  sampleRate = 44100;
  destination = {};

  get currentTime() {
    return clock;
  }

  resume() {
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

function soundToggle(): HTMLElement {
  return screen.getByRole('button', { name: 'Sound' });
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
    // Well clear of the previous test's last note.
    clock += 10;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('makes no sound until the player asks for it', () => {
    render(<App dictionary={DICTIONARY} />);

    expect(soundToggle()).toHaveAttribute('aria-pressed', 'false');

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
    expect(soundToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('wordsalad:sound')).toBe('on');
  });

  it('remembers the preference across sessions', () => {
    window.localStorage.setItem('wordsalad:sound', 'on');
    render(<App dictionary={DICTIONARY} />);

    expect(soundToggle()).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(soundToggle());
    expect(window.localStorage.getItem('wordsalad:sound')).toBe('off');

    notes = [];
    typeWord('te');
    expect(notes).toHaveLength(0);
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
