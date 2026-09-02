import { readFileSync } from 'node:fs';

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App';
import { DICTIONARIES } from '../game/dictionaries';

// The real dictionary, for tests that need New game to actually generate a
// playable puzzle (the tiny DICTIONARY above cannot satisfy generation).
const REAL_DICTIONARY = readFileSync('public/dictionaries/en.txt', 'utf8')
  .split('\n')
  .filter(Boolean);

// With the character set WORDTES and required character T, the valid words
// are TEST (1 point), ROTTED (3 points), and WORSTED (a pangram: 4 points
// + 7 bonus points), for a maximum of 15 points.
const DICTIONARY = ['TEST', 'ROTTED', 'WORSTED', 'WORD', 'REDO', 'ABLE'];

function typeWord(word: string): void {
  for (const character of word) {
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

// The win modal captures the keyboard while open; dismissing it returns the
// board to its normal playing view. "Keep playing" only shows while words
// remain; the ✕ always dismisses.
function keepPlaying(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
}

function closeWin(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
}

function currentWord(): string {
  return screen.getByLabelText('Current word').textContent;
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '?letters=WORDTES&required=T');
  });

  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('renders the salad letters with the required letter marked', () => {
    render(<App dictionary={DICTIONARY} />);

    for (const letter of 'WORDTES') {
      expect(screen.getByRole('button', { name: letter })).toBeInTheDocument();
    }

    expect(screen.getByRole('button', { name: 'T' })).toHaveAttribute(
      'data-required',
      'true',
    );
    expect(screen.getByRole('button', { name: 'W' })).toHaveAttribute(
      'data-required',
      'false',
    );
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (3 remaining)', // was found=0
    );
  });

  it('reflects the game in the query string', () => {
    render(<App dictionary={DICTIONARY} />);
    const params = new URLSearchParams(window.location.search);
    expect(params.get('letters')).toBe('DEORSTW');
    expect(params.get('required')).toBe('T');
    // The default minimum length stays implicit.
    expect(params.get('min')).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('honors an explicit minimum length param', () => {
    window.history.replaceState(null, '', '?letters=WORDTES&required=T&min=5');
    render(<App dictionary={DICTIONARY} />);

    submitWord('test');
    expect(screen.getByRole('status')).toHaveTextContent('TEST is too short!');
    // The non-default min survives the URL rewrite.
    expect(new URLSearchParams(window.location.search).get('min')).toBe('5');
  });

  it('derives a required letter when the URL gives only letters', () => {
    window.history.replaceState(null, '', '?letters=WORDTES');
    render(<App dictionary={DICTIONARY} />);

    // O makes the most words within WORDTES, so it becomes the required
    // letter — and the URL is canonicalized to include it.
    expect(screen.getByRole('button', { name: 'O' })).toHaveAttribute(
      'data-required',
      'true',
    );
    expect(screen.getByRole('button', { name: 'T' })).toHaveAttribute(
      'data-required',
      'false',
    );
    expect(new URLSearchParams(window.location.search).get('required')).toBe(
      'O',
    );

    // Playable: WORD contains the required O.
    submitWord('word');
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (3 remaining)', // was found=1
    );
  });

  it('derives the required letter under a custom minimum length', () => {
    window.history.replaceState(null, '', '?letters=WORDTES&min=6');
    render(<App dictionary={DICTIONARY} />);

    // Only ROTTED and WORSTED are long enough now; TEST is too short.
    submitWord('test');
    expect(screen.getByRole('status')).toHaveTextContent('TEST is too short!');
    submitWord('rotted');
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (1 remaining)', // was found=1
    );
  });

  const letterTiles = () =>
    screen
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('data-letter'));

  it('generates a puzzle around a required letter with no letters given', () => {
    window.history.replaceState(null, '', '?required=A');
    render(<App dictionary={REAL_DICTIONARY} />);

    // A full seven-tile board generates with A pinned as the required letter.
    expect(letterTiles()).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute(
      'data-required',
      'true',
    );
  });

  it('generates a puzzle from only a minimum-length param', () => {
    window.history.replaceState(null, '', '?min=5');
    render(<App dictionary={REAL_DICTIONARY} />);

    // A board generates and the custom min survives canonicalization.
    expect(letterTiles()).toHaveLength(7);
    expect(new URLSearchParams(window.location.search).get('min')).toBe('5');
  });

  it('rejects a malformed required param', () => {
    window.history.replaceState(null, '', '?required=A1');
    render(<App dictionary={DICTIONARY} />);
    expect(screen.getByText('INVALID GAME DATA!')).toBeInTheDocument();
  });

  it('supports multiple required letters via the URL', () => {
    window.history.replaceState(null, '', '?letters=WORDTES&required=RT');
    render(<App dictionary={DICTIONARY} />);

    // Both R and T are marked required; only words with both letters score.
    expect(screen.getByRole('button', { name: 'R' })).toHaveAttribute(
      'data-required',
      'true',
    );
    expect(screen.getByRole('button', { name: 'T' })).toHaveAttribute(
      'data-required',
      'true',
    );
    expect(screen.getByRole('button', { name: 'W' })).toHaveAttribute(
      'data-required',
      'false',
    );

    submitWord('test'); // has T, lacks R
    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST is missing required character!',
    );
    submitWord('rotted'); // has both R and T
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (1 remaining)', // was found=1
    );
    // The required set is canonicalized in the URL.
    expect(new URLSearchParams(window.location.search).get('required')).toBe(
      'RT',
    );
  });

  const openCustomGame = (): void => {
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Custom game' }));
  };

  it('offers the custom game and history from the ⋯ menu', () => {
    render(<App dictionary={DICTIONARY} />);
    expect(
      screen.queryByRole('menuitem', { name: 'Custom game' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(
      screen.getByRole('menuitem', { name: 'Custom game' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'History' }),
    ).toBeInTheDocument();

    // New game stays a plain one-tap button outside the menu.
    expect(
      screen.getByRole('button', { name: 'New game' }),
    ).toBeInTheDocument();
  });

  // The builder opens on "Surprise me"; choosing letters is the other mode.
  const chooseLetters = (value: string): void => {
    fireEvent.click(screen.getByRole('radio', { name: 'Choose letters' }));
    fireEvent.change(screen.getByLabelText('Letters'), {
      target: { value },
    });
  };

  // Required letters are picked by tapping the board tiles.
  const requireTile = (letter: string): void => {
    fireEvent.click(
      within(screen.getByTestId('custom-dialog')).getByRole('button', {
        name: letter,
      }),
    );
  };

  it('keeps focus in custom-game inputs despite the blur-on-click rule', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    fireEvent.click(screen.getByRole('radio', { name: 'Choose letters' }));

    // The document-level blur-on-click (Enter must submit words, not
    // re-press buttons) must not deselect a form field the user just
    // clicked, nor anything inside an open modal.
    const letters = screen.getByLabelText('Letters');
    letters.focus();
    fireEvent.click(letters);
    expect(letters).toHaveFocus();

    // Outside a dialog the rule still applies: a clicked button blurs.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    const toss = screen.getByRole('button', { name: 'Toss' });
    toss.focus();
    fireEvent.click(toss);
    expect(toss).not.toHaveFocus();
  });

  it('describes what the generator will build in Surprise me mode', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();

    // No misleading letters field: the mode says a board will be generated.
    expect(screen.queryByLabelText('Letters')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-preview')).toHaveTextContent(
      'A board with 30–80 words will be generated',
    );
  });

  it('carries the word-count bounds rather than rejecting them', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    const min = screen.getByLabelText('min');
    const max = screen.getByLabelText('max');

    // Pushing min past max takes max along instead of flagging an error.
    fireEvent.change(min, { target: { value: '99' } });
    expect(max).toHaveValue(99);
    expect(screen.getByTestId('custom-preview')).toHaveTextContent(
      'A board with 99–99 words will be generated',
    );
    expect(screen.getByRole('button', { name: 'Create game' })).toBeEnabled();

    // And pulling max below min drags min down with it.
    fireEvent.change(max, { target: { value: '5' } });
    expect(min).toHaveValue(5);
    expect(screen.getByTestId('custom-preview')).toHaveTextContent(
      'A board with 5–5 words will be generated',
    );
  });

  it('starts with no required letter and shows the full board', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    chooseLetters('WORDTES');

    // Nothing lit means exactly that — every word from these letters counts.
    const dialog = screen.getByTestId('custom-dialog');
    for (const letter of 'WORDTES') {
      expect(
        within(dialog).getByRole('button', { name: letter }),
      ).toHaveAttribute('data-required', 'false');
    }
    expect(screen.getByTestId('custom-preview')).toHaveTextContent('5 words');
  });

  it('picks required letters by tapping the board tiles', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    chooseLetters('WORDTES');

    const dialog = screen.getByTestId('custom-dialog');
    const tile = (letter: string) =>
      within(dialog).getByRole('button', { name: letter });

    requireTile('T'); // TEST, ROTTED, WORSTED
    expect(tile('T')).toHaveAttribute('data-required', 'true');
    expect(screen.getByTestId('custom-preview')).toHaveTextContent('3 words');

    requireTile('R'); // both R and T: ROTTED, WORSTED
    expect(screen.getByTestId('custom-preview')).toHaveTextContent('2 words');

    // Tapping releases a letter, all the way back to none required.
    requireTile('R');
    requireTile('T');
    expect(tile('T')).toHaveAttribute('data-required', 'false');
    expect(screen.getByTestId('custom-preview')).toHaveTextContent('5 words');
  });

  it('drops a required letter that leaves the board', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    chooseLetters('WORDTES');
    requireTile('S'); // TEST, WORSTED
    expect(screen.getByTestId('custom-preview')).toHaveTextContent('2 words');

    // Backspace takes the last letter back. S must not stay required behind
    // the scenes — that would be an impossible board — so the selection is
    // dropped, leaving the remaining letters unconstrained.
    fireEvent.keyDown(screen.getByLabelText('Letters'), { key: 'Backspace' });
    expect(
      within(screen.getByTestId('custom-dialog')).queryByRole('button', {
        name: 'S',
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-preview')).toHaveTextContent(
      '3 words · 5 points',
    );
  });

  it('builds the game with exactly the minimum word length shown', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    chooseLetters('WORDTES');

    // The field, the preview and the created game must all agree.
    const minLength = screen.getByLabelText('Minimum word length');
    fireEvent.change(minLength, { target: { value: '2' } });
    expect(minLength).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Create game' })).toBeEnabled();

    const assign = vi.fn();
    vi.stubGlobal('location', { assign, href: 'http://localhost/wordsalad/' });
    fireEvent.click(screen.getByRole('button', { name: 'Create game' }));
    vi.unstubAllGlobals();
    expect(String(assign.mock.calls[0]?.[0])).toContain('min=2');
  });

  it('clamps an out-of-range minimum word length as it is typed', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    chooseLetters('WORDTES');

    // Never display a value the game would not use: the correction happens
    // immediately, not on blur or (worse) silently at create time. The
    // dictionary has no one-letter words, so 2 is the floor.
    const minLength = screen.getByLabelText('Minimum word length');
    fireEvent.change(minLength, { target: { value: '1' } });
    expect(minLength).toHaveValue(2);
    fireEvent.change(minLength, { target: { value: '0' } });
    expect(minLength).toHaveValue(2);
    fireEvent.change(minLength, { target: { value: '42' } });
    expect(minLength).toHaveValue(9);
  });

  it('creates the game when Enter is pressed in the dialog', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    chooseLetters('WORDTES');

    const assign = vi.fn();
    vi.stubGlobal('location', {
      assign,
      href: 'http://localhost/wordsalad/',
    });
    // Enter from a field submits, as the primary action of a dialog should.
    fireEvent.submit(screen.getByLabelText('Letters'));
    vi.unstubAllGlobals();

    expect(String(assign.mock.calls[0]?.[0])).toContain('letters=DEORSTW');
  });

  it('does not create the game on Enter while the settings are invalid', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    fireEvent.click(screen.getByRole('radio', { name: 'Choose letters' }));

    const assign = vi.fn();
    vi.stubGlobal('location', { assign, href: 'http://localhost/wordsalad/' });
    // No letters chosen yet, so there is nothing to create.
    fireEvent.submit(screen.getByLabelText('Letters'));
    vi.unstubAllGlobals();

    expect(assign).not.toHaveBeenCalled();
  });

  it('creates a fixed custom game by navigating to its canonical URL', () => {
    render(<App dictionary={DICTIONARY} />);
    openCustomGame();
    chooseLetters('WORDTES');
    requireTile('R');
    requireTile('T');

    // jsdom's location.assign is not spyable; swap the whole location so the
    // navigation target can be inspected.
    const assign = vi.fn();
    vi.stubGlobal('location', {
      assign,
      href: 'http://localhost/wordsalad/?letters=WORDTES&required=T',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create game' }));
    vi.unstubAllGlobals();

    const target = String(assign.mock.calls[0]?.[0]);
    expect(target).toContain('letters=DEORSTW');
    expect(target).toContain('required=RT');
  });

  it('records a game summary once there is progress', () => {
    render(<App dictionary={DICTIONARY} />);
    expect(
      window.localStorage.getItem('wordsalad:meta:DEORSTW.T.4'),
    ).toBeNull();

    submitWord('test');
    const meta: unknown = JSON.parse(
      window.localStorage.getItem('wordsalad:meta:DEORSTW.T.4') ?? 'null',
    );
    expect(meta).toMatchObject({
      earned: 1,
      found: 1,
      hints: 0,
      lost: 0,
      max: 15,
      total: 3,
    });

    // Restart wipes the record along with the rest of the progress.
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(
      window.localStorage.getItem('wordsalad:meta:DEORSTW.T.4'),
    ).toBeNull();
  });

  it('lists, sorts, and links historical games', () => {
    // A second, older, won game (AZIMUTH at 11/14 crosses its win line).
    window.localStorage.setItem(
      'wordsalad:meta:AZIMUTH.I.4',
      JSON.stringify({
        earned: 11,
        found: 1,
        hints: 0,
        lost: 0,
        max: 14,
        playedAt: 1000,
        total: 4,
      }),
    );
    render(<App dictionary={DICTIONARY} />);
    submitWord('test'); // records the current game with a fresh timestamp

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'History' }));
    const dialog = screen.getByRole('dialog');

    // Aggregates: 2 played, 1 won, 12 lifetime points, 2 words.
    expect(within(dialog).getByTestId('stat-played')).toHaveTextContent('2');
    expect(within(dialog).getByTestId('stat-won')).toHaveTextContent('1');
    expect(within(dialog).getByTestId('stat-points')).toHaveTextContent('12');
    expect(within(dialog).getByTestId('stat-words')).toHaveTextContent('2');

    // Date sort (default): the just-played game first; entries resume via
    // plain puzzle links.
    let links = within(dialog).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '?letters=DEORSTW&required=T');
    expect(links[1]).toHaveAttribute('href', '?letters=AZIMUTH&required=I');
    expect(links[0]).toHaveAttribute('data-status', 'playing');
    expect(links[1]).toHaveAttribute('data-status', 'won');

    // Result sort: the won game leads.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Result' }));
    links = within(dialog).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '?letters=AZIMUTH&required=I');

    // Tapping the active sort again reverses the direction.
    fireEvent.click(within(dialog).getByRole('button', { name: /Result/ }));
    links = within(dialog).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '?letters=DEORSTW&required=T');
    expect(
      within(dialog).getByRole('button', { name: /Result/ }),
    ).toHaveAttribute('data-direction', 'reversed');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('runs a challenge from a shared score link', () => {
    window.history.replaceState(
      null,
      '',
      '?letters=WORDTES&required=T&score=1&hints=0',
    );
    render(<App dictionary={DICTIONARY} />);

    // The challenge params are consumed, not kept in the URL.
    expect(new URLSearchParams(window.location.search).get('score')).toBeNull();

    // A race against the sharer, naming the diamond on the bar: behind,
    // tied (not yet a win — strictly more is needed), then ahead by the
    // margin, which is the finish.
    expect(screen.getByTestId('challenge')).toHaveTextContent(
      '1 point behind ◇',
    );
    expect(screen.getByTestId('challenge')).toHaveTextContent(
      '1 point behind the shared score of 1',
    );
    expect(screen.getByTestId('challenge-mark')).toHaveAttribute(
      'data-state',
      'live',
    );
    submitWord('test'); // 1 point: level, not past
    expect(screen.getByTestId('challenge')).toHaveTextContent('Tied with ◇');
    expect(screen.getByTestId('challenge')).toHaveTextContent(
      'Tied with the shared score of 1',
    );
    expect(screen.getByTestId('challenge')).toHaveAttribute(
      'data-state',
      'live',
    );
    submitWord('rotted'); // 4 points: ahead by 3
    expect(screen.getByTestId('challenge')).toHaveTextContent(
      '3 points ahead of ◆ ✓',
    );
    expect(screen.getByTestId('challenge')).toHaveTextContent(
      'You beat the shared score of 1 by 3 points!',
    );
    expect(screen.getByTestId('challenge-mark')).toHaveAttribute(
      'data-state',
      'done',
    );
  });

  // The fixture board is worth 15: TEST 1, ROTTED 3, WORSTED 4 + 7 pangram.
  it('can only tie a shared score at the board maximum', () => {
    window.history.replaceState(
      null,
      '',
      '?letters=WORDTES&required=T&score=15&hints=0',
    );
    render(<App dictionary={DICTIONARY} />);

    // Getting ahead is impossible, so the tie is the finish. The diamond
    // takes the gold terminus ring's slot so the clause has something to
    // point at.
    expect(screen.getByTestId('challenge')).toHaveTextContent(
      '15 points behind ◇',
    );
    expect(screen.getByTestId('challenge-mark')).toHaveAttribute(
      'data-state',
      'live',
    );
    expect(screen.getByTestId('challenge-mark')).toHaveClass('right-[1.5px]');

    submitWord('test');
    submitWord('rotted');
    expect(screen.getByTestId('challenge')).toHaveTextContent(
      '11 points behind ◇',
    );
    submitWord('worsted');
    expect(screen.getByTestId('challenge')).toHaveTextContent('Tied with ◆ ✓');
    expect(screen.getByTestId('challenge')).toHaveTextContent(
      'You tied the shared score of 15!',
    );
    // A perfect sweep dissolves the whole ladder, diamond included.
    expect(screen.queryByTestId('challenge-mark')).not.toBeInTheDocument();
  });

  it('puts a shared score out of reach once hints burn past it', () => {
    window.history.replaceState(
      null,
      '',
      '?letters=WORDTES&required=T&score=14&hints=0',
    );
    vi.useFakeTimers();
    try {
      render(<App dictionary={DICTIONARY} />);

      // Getting ahead of 14 needs all 15 points: a live promise until a
      // hint spends one, then the same dead gray the burned rungs wear.
      expect(screen.getByTestId('challenge')).toHaveTextContent(
        '14 points behind ◇',
      );
      expect(screen.getByTestId('challenge-mark')).toHaveAttribute(
        'data-state',
        'live',
      );

      // The cost lands on the click; the revealed word lands after its
      // cascade, so the header's countdown moves once the timers run.
      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      expect(screen.getByTestId('challenge')).toHaveTextContent(
        '◆ out of reach',
      );
      expect(screen.getByTestId('challenge')).toHaveTextContent(
        'The shared score of 14 is out of reach',
      );
      expect(screen.getByTestId('challenge-mark')).toHaveAttribute(
        'data-state',
        'unreachable',
      );
      act(() => {
        vi.runAllTimers();
      });
      expect(screen.getByTestId('words-header')).toHaveTextContent(
        'Words (2 remaining)',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('shares a themed snippet with a challenge link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    fireEvent.click(screen.getByRole('button', { name: /Share/ }));

    // Both labels stay mounted so the button keeps its width; the shown
    // one is the only one that names the button.
    expect(
      await screen.findByRole('button', { name: 'Copied!' }),
    ).toBeInTheDocument();
    const text = writeText.mock.calls[0][0] as string;
    // The board as one row of tiles, the required T filled.
    expect(text).toContain('Word Salad\n🄳🄴🄾🅁🅂🆃🅆\n');
    expect(text).toContain('1/15 · Meh');
    expect(text).toContain('letters=DEORSTW&required=T&score=1&hints=0');
  });

  it('shares a trophy for a perfect score', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted'); // 11 of 15
    submitWord('test'); // 12: the win
    keepPlaying();
    submitWord('rotted'); // 15 of 15
    closeWin();
    fireEvent.click(screen.getByRole('button', { name: /Share/ }));

    expect(
      await screen.findByRole('button', { name: 'Copied!' }),
    ).toBeInTheDocument();
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('15/15');
    expect(text).toContain('🏆');
    expect(text).not.toContain('✓');
    expect(text).not.toContain('🟩');
  });

  it('blurs the menu trigger when History closes so Enter cannot re-open it', () => {
    render(<App dictionary={DICTIONARY} />);
    const menuTrigger = screen.getByRole('button', { name: 'More options' });

    fireEvent.click(menuTrigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'History' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Close',
      }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(menuTrigger).not.toHaveFocus();
  });

  it('shows typed letters uppercased in the current word', () => {
    render(<App dictionary={DICTIONARY} />);
    typeWord('tw');
    expect(currentWord()).toBe('TW');
  });

  it('rejects letters that are not in the salad before they display', () => {
    render(<App dictionary={DICTIONARY} />);
    typeWord('tq');

    expect(currentWord()).toBe('T');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Q is not in the word salad!',
    );
  });

  it('clears a stale verdict as soon as the word is edited', () => {
    render(<App dictionary={DICTIONARY} />);
    typeWord('tq');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Q is not in the word salad!',
    );

    // The rejected letter never made it in, so the complaint about it must
    // not linger over the word being typed.
    typeWord('e');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    // Nor over what's left after deleting.
    fireEvent.keyDown(document, { key: 'Backspace', ctrlKey: true });
    submitWord('test');
    expect(screen.getByRole('status')).toHaveTextContent('TEST earned you');
    typeWord('ro');
    pressKey('Backspace');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('removes the last letter on backspace', () => {
    render(<App dictionary={DICTIONARY} />);
    typeWord('te');
    pressKey('Backspace');
    expect(currentWord()).toBe('T');
  });

  it('clears the whole word with Ctrl/Cmd+Backspace', () => {
    render(<App dictionary={DICTIONARY} />);
    typeWord('test');
    expect(currentWord()).toBe('TEST');

    fireEvent.keyDown(document, { key: 'Backspace', ctrlKey: true });
    expect(currentWord()).toBe('');
  });

  it('scores a valid word and updates the scoreboard', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');

    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST earned you 1 point!',
    );
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (2 remaining)', // was found=1
    );
    expect(
      screen.getByRole('button', { name: 'Meh · 1 point to Okay' }),
    ).toBeInTheDocument();
    expect(currentWord()).toBe('');

    const link = screen.getByRole('link', { name: 'TEST' });
    expect(link).toHaveAttribute('href', 'https://en.wiktionary.org/wiki/test');
    expect(
      within(screen.getByTestId('word-drum')).getByText('1'),
    ).toBeInTheDocument();
  });

  it('buries the unfound words in bricks that state only how many', () => {
    render(<App dictionary={DICTIONARY} />);
    const drum = () => within(screen.getByTestId('word-drum'));
    const bricks = () => drum().getAllByTestId('word-brick');

    // Three words exist; the drum says how many but names none of them.
    expect(bricks()).toHaveLength(1);
    expect(bricks()[0]).toHaveAttribute('data-count', '3');
    expect(bricks()[0]).toHaveTextContent('3 words');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    // Finding TEST cuts the run in two (ROTTED · TEST · WORSTED): the word
    // takes its own row, a one-word brick left on either side.
    submitWord('test');
    expect(bricks().map((brick) => brick.getAttribute('data-count'))).toEqual([
      '1',
      '1',
    ]);
    const rows = drum().getAllByTestId('word-slot');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByRole('link', { name: 'TEST' })).toBeVisible();
  });

  it('aims the cursor at the first block the staged letters could break', () => {
    render(<App dictionary={DICTIONARY} />);
    const drum = () => within(screen.getByTestId('word-drum'));
    const bricks = () => drum().getAllByTestId('word-brick');

    submitWord('test'); // ROTTED · TEST · WORSTED: a brick on either side

    // TES could still complete into the first gap (TESD… sorts before
    // TEST), so the hunt starts there.
    typeWord('tes');
    expect(bricks().map((b) => b.getAttribute('data-cursor'))).toEqual([
      'true',
      'false',
    ]);

    // The fourth letter rules the first gap out and the cursor walks down
    // — past the found TEST row, which stays unselected even though the
    // staged letters spell it exactly: the blocks are the hunt, and the
    // rack's badge already says "already found".
    typeWord('t');
    expect(bricks().map((b) => b.getAttribute('data-cursor'))).toEqual([
      'false',
      'true',
    ]);
    expect(drum().queryByTestId('drum-cursor-row')).not.toBeInTheDocument();

    // Deleting widens what admits again, and the cursor walks back up.
    pressKey('Backspace');
    expect(bricks().map((b) => b.getAttribute('data-cursor'))).toEqual([
      'true',
      'false',
    ]);
  });

  it('keeps the cursor on the brick a tap named when two bricks admit the letters', () => {
    // Found TEST, TESTER and TESTS leave two gaps both forced to start
    // with TEST — the letters alone can't say which one a tap meant.
    render(
      <App dictionary={['TEST', 'TESTED', 'TESTER', 'TESTERS', 'TESTS']} />,
    );
    const drum = () => within(screen.getByTestId('word-drum'));
    const cursors = () =>
      drum()
        .getAllByTestId('word-brick')
        .map((brick) => brick.getAttribute('data-cursor'));
    submitWord('test');
    submitWord('tester');
    submitWord('tests');
    const blocks = () =>
      screen.getAllByRole('button', {
        name: 'One unfound word starts with T E S T — fill in these letters',
      });
    expect(blocks()).toHaveLength(2);

    // Typed, the first admitting brick wins, as ever.
    typeWord('test');
    expect(cursors()).toEqual(['true', 'false']);
    pressKey('Backspace');
    pressKey('Backspace');
    pressKey('Backspace');
    pressKey('Backspace');

    // Tapped, the tapped brick wins the tie.
    fireEvent.click(blocks()[1]);
    expect(currentWord()).toBe('TEST');
    expect(cursors()).toEqual(['false', 'true']);

    // Extending the stem keeps the origin while it still admits...
    typeWord('e'); // TESTE: both gaps admit
    expect(cursors()).toEqual(['false', 'true']);
    // ...and hands over when it no longer can, then resumes on the way back.
    typeWord('d'); // TESTED sorts before TESTER: only the upper gap admits
    expect(cursors()).toEqual(['true', 'false']);
    pressKey('Backspace');
    expect(cursors()).toEqual(['false', 'true']);

    // Deleting back into the stem drops the origin for good: retyping the
    // same letters is the player's own work, judged by the pure rule.
    pressKey('Backspace');
    pressKey('Backspace'); // TES
    expect(cursors()).toEqual(['true', 'false']);
    typeWord('t'); // TEST again, typed
    expect(cursors()).toEqual(['true', 'false']);
  });

  it('falls back to the found row once nothing unfound extends the word', () => {
    render(<App dictionary={DICTIONARY} />);
    const drum = () => within(screen.getByTestId('word-drum'));

    submitWord('worsted'); // brick{ROTTED · TEST} · WORSTED
    typeWord('worsted'); // no gap admits any extension of WORSTED
    expect(drum().getByTestId('drum-cursor-row')).toBeInTheDocument();
    expect(drum().getByTestId('word-brick')).toHaveAttribute(
      'data-cursor',
      'false',
    );
  });

  it('shows the dead-end seam when the letters cannot break anything', () => {
    render(<App dictionary={DICTIONARY} />);
    const drum = () => within(screen.getByTestId('word-drum'));

    submitWord('rotted');
    submitWord('test'); // adjacent rows; only WORSTED's brick remains
    typeWord('sort'); // sorts between the rows; no gap admits it
    expect(drum().getByTestId('drum-caret')).toBeInTheDocument();
    expect(drum().getByTestId('word-brick')).toHaveAttribute(
      'data-cursor',
      'false',
    );
  });

  it('reveals the letters a gap logically forces and prefills on tap', () => {
    // CAECAL sits alone between CACAO and CALL, so once those two are
    // found, the sort order alone proves it starts with CA.
    window.history.replaceState(null, '', '?letters=CANOWLE&required=C');
    render(<App dictionary={['CACAO', 'CAECAL', 'CALL', 'CANAL', 'OCEAN']} />);
    const prefixRow = () =>
      screen.getByRole('button', {
        name: 'One unfound word starts with C A — fill in these letters',
      });

    // Nothing found yet: no gap is bounded, so the brick stays anonymous.
    expect(
      screen.queryByRole('button', { name: /unfound word/i }),
    ).not.toBeInTheDocument();

    submitWord('cacao');
    submitWord('call');

    // Only the bounded gap gained a prefix; the open tail after CALL
    // still forces nothing and stays inert.
    expect(
      screen.getAllByRole('button', { name: /unfound word/i }),
    ).toHaveLength(1);

    // Tapping the row types the derived letters into the word area.
    fireEvent.click(prefixRow());
    expect(currentWord()).toBe('CA');

    // A word built on the same stem survives a re-tap: the prefix has
    // nothing to add, and the tap must not destroy typed progress.
    typeWord('ec');
    expect(currentWord()).toBe('CAEC');
    fireEvent.click(prefixRow());
    expect(currentWord()).toBe('CAEC');

    // A word on a different stem is replaced — the tap asked for CA.
    fireEvent.keyDown(document, { key: 'Backspace', ctrlKey: true });
    typeWord('oce');
    fireEvent.click(prefixRow());
    expect(currentWord()).toBe('CA');

    // The prefilled letters submit as part of an ordinary word.
    typeWord('ecal');
    pressKey('Enter');
    expect(screen.getByRole('status')).toHaveTextContent(
      'CAECAL earned you 3 points!',
    );
    expect(
      screen.queryByRole('button', { name: /unfound word/i }),
    ).not.toBeInTheDocument();
  });

  it('answers a second block with its own stem, even a shorter one', () => {
    // CACAO · CAECAL · CALL · CANAL · CANOE · CLEAN · COLA. Finding CACAO,
    // CANAL and COLA leaves two bounded gaps: CAECAL/CALL, whose bounds
    // force CA, and CANOE/CLEAN, where only C is forced.
    window.history.replaceState(null, '', '?letters=CANOWLE&required=C');
    render(
      <App
        dictionary={[
          'CACAO',
          'CAECAL',
          'CALL',
          'CANAL',
          'CANOE',
          'CLEAN',
          'COLA',
        ]}
      />,
    );
    submitWord('cacao');
    submitWord('canal');
    submitWord('cola');
    const block = (letters: string) =>
      screen.getByRole('button', {
        name: `2 unfound words start with ${letters} — fill in these letters`,
      });

    fireEvent.click(block('C A'));
    expect(currentWord()).toBe('CA');

    // The shorter stem belongs to a different block, so it wins: the
    // letters the last tap left are the tap's, not typed work to protect.
    fireEvent.click(block('C'));
    expect(currentWord()).toBe('C');

    // Typed progress is still safe — the input has moved off the stem.
    typeWord('an');
    fireEvent.click(block('C'));
    expect(currentWord()).toBe('CAN');
  });

  it('dims letters that cannot start or continue a new word', () => {
    window.history.replaceState(null, '', '?letters=CANOWLE&required=C');
    render(<App dictionary={['CACAO', 'CAECAL', 'CALL', 'CANAL', 'OCEAN']} />);
    const tile = (letter: string) =>
      screen.getByRole('button', { name: letter });
    const expectLive = (live: string, dimmed: string) => {
      for (const letter of live) {
        expect(tile(letter)).toHaveAttribute('data-live', 'true');
      }
      for (const letter of dimmed) {
        expect(tile(letter)).toHaveAttribute('data-live', 'false');
      }
    };

    // A fresh board is one unbounded gap: every letter stays live.
    expectLive('CANOWLE', '');
    expect(tile('W')).not.toHaveAccessibleDescription();

    submitWord('cacao');
    submitWord('call');
    submitWord('canal');
    submitWord('ocean');

    // Only CAECAL remains, pinned between CACAO and CALL — it must start
    // with C, so every other opening letter is provably wasted.
    expectLive('C', 'ANOWLE');

    // The dim is announced, not just painted: a dead tile describes its
    // state, while the live required letter keeps its standing note.
    expect(tile('A')).toHaveAccessibleDescription(
      'No new word can use this letter next',
    );
    expect(tile('C')).toHaveAccessibleDescription('Required letter');

    // After C the second letter can only be A; after CA the bounds leave
    // C, E, or L.
    typeWord('c');
    expectLive('A', 'CNOWLE');
    // A required letter that goes dead carries both notes.
    expect(tile('C')).toHaveAccessibleDescription(
      'Required letter No new word can use this letter next',
    );
    typeWord('a');
    expectLive('CEL', 'ANOW');

    // The dim is soft: a dead tile still types (retyping a found word to
    // locate it must keep working).
    fireEvent.click(tile('W'));
    expect(currentWord()).toBe('CAW');
    pressKey('Backspace');

    // The last find closes the last gap: nothing can start a new word.
    typeWord('ecal');
    pressKey('Enter');
    expectLive('', 'CANOWLE');
  });

  it('scrolls to a word that was already found when it is resubmitted', () => {
    render(<App dictionary={DICTIONARY} />);
    // The row the drum has brought into view.
    const revealedRow = () =>
      within(screen.getByTestId('word-drum'))
        .getAllByTestId('word-slot')
        .find((slot) => slot.getAttribute('data-spotlight') === 'true')
        ?.textContent ?? '';

    // ROTTED sorts first and TEST second, so the spotlight has somewhere to
    // travel. Together they stay under the win line, leaving the board
    // playable (a win modal would swallow the keyboard).
    submitWord('rotted');
    submitWord('test');
    expect(revealedRow()).toContain('TEST');

    // Re-submitting a found word is a request to be shown where it is: the
    // drum brings it back into view (and says it was already found).
    submitWord('rotted');
    expect(screen.getByRole('status')).toHaveTextContent(
      'ROTTED was already found!',
    );
    expect(revealedRow()).toContain('ROTTED');

    // Asking for the same word twice running still re-spotlights it.
    submitWord('test');
    expect(revealedRow()).toContain('TEST');
    submitWord('test');
    expect(revealedRow()).toContain('TEST');
  });

  it('announces an error for a word that is not in the dictionary', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('toss');
    expect(screen.getByRole('status')).toHaveTextContent('TOSS was not found!');
  });

  it('announces an error for a word that was already found', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    submitWord('test');
    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST was already found!',
    );
  });

  it('keeps the full letter set when tossing with the spacebar', () => {
    render(<App dictionary={DICTIONARY} />);
    pressKey(' ');

    for (const letter of 'WORDTES') {
      expect(screen.getByRole('button', { name: letter })).toBeInTheDocument();
    }
  });

  it('declares victory once every word is found', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    submitWord('rotted');
    submitWord('worsted');
    expect(screen.getByText('YOU WIN!')).toBeInTheDocument();
    // Scoped to the modal: the header carries a New game button of its own.
    expect(
      within(screen.getByTestId('win-banner')).getByRole('button', {
        name: 'New game',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (all found)', // was found=3
    );
    expect(
      screen.getByRole('button', {
        name: 'Super-Duper-Genius · 15 / 15 points',
      }),
    ).toBeInTheDocument();
  });

  it('fires a rank-up flourish when the rating climbs', () => {
    render(<App dictionary={DICTIONARY} />);
    const rating = () => screen.getByTestId('rating-name');
    expect(rating()).toHaveAttribute('data-rank-id', '0');
    expect(screen.queryByTestId('rank-burst')).not.toBeInTheDocument();

    submitWord('test'); // 1 of 15: Idiot -> Meh
    expect(rating()).toHaveAttribute('data-rank-id', '1');
    expect(rating()).toHaveTextContent('Meh');
    expect(screen.getByTestId('rank-burst')).toBeInTheDocument();

    // Winning yields the submission to the full celebration: no rank-up
    // even though the rating also climbed to Genius.
    submitWord('worsted'); // 12 of 15: the win
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
    expect(rating()).toHaveAttribute('data-rank-id', '1');

    // The countdown grammar survives the win: the next rung takes over as
    // the target with no switch to a fraction.
    expect(
      screen.getByRole('button', {
        name: 'Genius · 2 points to Super-Genius',
      }),
    ).toBeInTheDocument();
  });

  it('throws the grand show for a perfect score', () => {
    render(<App dictionary={DICTIONARY} />);

    submitWord('worsted'); // 11 of 15
    submitWord('test'); // 12: the ordinary win celebration
    expect(screen.getByTestId('confetti')).toHaveAttribute(
      'data-perfect',
      'false',
    );

    // Dismiss the win modal and keep going; reaching every point fires a
    // second, gold celebration even though the win already happened.
    keepPlaying();
    submitWord('rotted'); // 15 of 15
    expect(screen.getByTestId('confetti')).toHaveAttribute(
      'data-perfect',
      'true',
    );
    expect(screen.getByTestId('win-banner')).toHaveAttribute(
      'data-perfect',
      'true',
    );
  });

  it('keeps the gold mark for a restored perfect game', () => {
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED', 'WORSTED']),
    );
    render(<App dictionary={DICTIONARY} />);

    // Calm on restore — no fanfare — but the state remembers perfection.
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    expect(screen.queryByTestId('win-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('won-mark')).toHaveAttribute(
      'data-perfect',
      'true',
    );
    expect(screen.getByTestId('won-mark')).toHaveTextContent('🏆');
  });

  it('retires the input once every word is found', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test'); // 12 of 15: the win
    keepPlaying();
    submitWord('rotted'); // 15 of 15: the board is cleared
    closeWin();

    // Letters no longer land, so a found word can't even be staged for a
    // pointless re-submission.
    typeWord('test');
    expect(currentWord()).toBe('');
    expect(screen.queryByTestId('verdict')).not.toBeInTheDocument();

    // Toss retires too — rearranging tiles serves nothing on a cleared
    // board. The space key dips the pill instead of tossing.
    const toss = screen.getByRole('button', { name: /Toss/ });
    expect(toss).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(toss);
    pressKey(' ');
    expect(screen.getByRole('button', { name: /Toss/ })).toHaveAttribute(
      'data-toss-id',
      '0',
    );
    expect(screen.getByRole('button', { name: /Toss/ })).toHaveAttribute(
      'data-denied-id',
      '1',
    );
  });

  it('closes a fully hinted, unwon board without the win green', () => {
    vi.useFakeTimers();
    try {
      render(<App dictionary={DICTIONARY} />);

      // Reveal all three words by hint: the board completes with 0 points,
      // so the closing mark must not wear the win accent.
      for (let i = 0; i < 3; i += 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
        act(() => {
          vi.runAllTimers();
        });
      }

      expect(screen.getByTestId('complete-mark')).toHaveAttribute(
        'data-won',
        'false',
      );
      // Not the ✓ either: a check of any color still implies success.
      expect(screen.getByTestId('complete-mark')).toHaveTextContent('✕');
    } finally {
      vi.useRealTimers();
    }
  });

  it('celebrates only at the moment the win line is crossed', () => {
    render(<App dictionary={DICTIONARY} />);
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();

    submitWord('worsted'); // 11 of the 12 needed — not yet
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();

    submitWord('test'); // 12: the win moment
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
    // The confetti is made of the puzzle's own letters, nothing generic.
    expect(screen.getByTestId('confetti')).toHaveTextContent(/^[WORDTES]+$/);
  });

  it('swaps the cursor for a completion mark once every word is found', () => {
    render(<App dictionary={DICTIONARY} />);

    submitWord('worsted');
    submitWord('test'); // won at 12 of 15, but ROTTED is still out there
    keepPlaying();
    expect(screen.queryByTestId('complete-mark')).not.toBeInTheDocument();

    // Board cleared — the perfect modal opens with no "Keep playing" (there
    // is nothing left to find); the ✕ dismisses to the completed board.
    submitWord('rotted');
    expect(
      screen.queryByRole('button', { name: 'Keep playing' }),
    ).not.toBeInTheDocument();
    closeWin();
    expect(screen.getByTestId('complete-mark')).toBeInTheDocument();
  });

  it('hides "Keep playing" when a win also clears the board', () => {
    render(<App dictionary={DICTIONARY} />);
    // TEST and ROTTED by hand; the last word, WORSTED, both wins and
    // exhausts the board on the same submission.
    submitWord('test');
    submitWord('rotted');
    submitWord('worsted'); // 15/15: win + board cleared at once

    expect(screen.getByTestId('win-banner')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Keep playing' }),
    ).not.toBeInTheDocument();
    // The ✕ still dismisses to the finished board.
    closeWin();
    expect(screen.queryByTestId('win-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('won-mark')).toBeInTheDocument();
  });

  it('opens the custom game builder from the win modal', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test'); // 12 of 15: the win modal opens

    fireEvent.click(
      within(screen.getByTestId('win-banner')).getByRole('button', {
        name: 'Custom game',
      }),
    );

    // The win modal yields to the builder; dismissing the builder returns
    // to the (already-dismissed) normal board.
    expect(screen.queryByTestId('win-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-dialog')).toBeInTheDocument();
  });

  it('does not celebrate a restored, already-won game', () => {
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED', 'WORSTED']),
    );
    render(<App dictionary={DICTIONARY} />);

    // No modal and no confetti — just the quiet mark on the score line.
    expect(screen.queryByText('YOU WIN!')).not.toBeInTheDocument();
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    expect(screen.getByTestId('won-mark')).toBeInTheDocument();
  });

  it('returns to a normal view when the win dialog is dismissed', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test'); // 12 of 15: the win modal opens

    expect(screen.getByTestId('win-banner')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));

    // The board is back to its playing view, marked won but unobstructed.
    expect(screen.queryByTestId('win-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    expect(screen.getByTestId('won-mark')).toHaveAttribute(
      'data-perfect',
      'false',
    );
    expect(screen.getByTestId('won-mark')).toHaveTextContent('✓');

    // The perfect clear reopens the modal for its grander, gold pass.
    submitWord('rotted'); // 15 of 15
    expect(screen.getByTestId('win-banner')).toHaveAttribute(
      'data-perfect',
      'true',
    );
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
  });

  it('persists found words as they are scored', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    submitWord('rotted');

    expect(
      JSON.parse(window.localStorage.getItem('wordsalad:DEORSTW.T.4') ?? '[]'),
    ).toEqual(['TEST', 'ROTTED']);
  });

  it('restores saved progress for a game loaded from the hash', () => {
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED']),
    );
    render(<App dictionary={DICTIONARY} />);

    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (1 remaining)', // was found=2
    );
    expect(screen.getByRole('link', { name: 'TEST' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ROTTED' })).toBeInTheDocument();

    // Finishing the restored game still works end to end.
    submitWord('worsted');
    expect(screen.getByText('YOU WIN!')).toBeInTheDocument();
  });

  it('shows the victory state when a completed game is restored', () => {
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED', 'WORSTED']),
    );
    render(<App dictionary={DICTIONARY} />);

    // The restored win shows as the quiet mark on the score line — no modal.
    expect(screen.queryByTestId('win-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('won-mark')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Super-Duper-Genius · 15 / 15 points',
      }),
    ).toBeInTheDocument();
  });

  it('drops corrupt or stale saved entries on restore', () => {
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'NOTAWORD', 42, 'TAXI']),
    );
    render(<App dictionary={DICTIONARY} />);

    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (2 remaining)', // was found=1
    );
  });

  it('shows the ratings ladder from the progress label', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test'); // 1 of 15 points -> Meh

    fireEvent.click(
      screen.getByRole('button', { name: 'Meh · 1 point to Okay' }),
    );

    const dialog = screen.getByRole('dialog');
    // The exact score moved in here from the score line.
    expect(within(dialog).getByText('1 / 15 points')).toBeInTheDocument();
    const rows = within(dialog).getAllByRole('listitem');
    // The 11 rating rungs plus the win line marker.
    expect(rows).toHaveLength(12);

    const rowFor = (name: string) =>
      rows.find((row) => within(row).queryByText(name) !== null);
    expect(rowFor('Idiot')).toHaveAttribute('data-achieved', 'true');
    expect(rowFor('Meh')).toHaveAttribute('data-current', 'true');
    expect(rowFor('Okay')).toHaveAttribute('data-achieved', 'false');
    expect(rowFor('Super-Duper-Genius')).toHaveTextContent('from 15 pts');

    // The win line marks where victory falls on the ladder (12 of 15).
    expect(within(dialog).getByText('Win at 12 points')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ignores game keys while the ratings dialog is open', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    fireEvent.click(
      screen.getByRole('button', { name: 'Meh · 1 point to Okay' }),
    );

    // Typing must not reach the game behind the modal.
    typeWord('rot');
    expect(currentWord()).toBe('');
  });

  it('reveals the shortest unfound word and submits it by itself', () => {
    vi.useFakeTimers();
    try {
      render(<App dictionary={DICTIONARY} />);

      fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
      expect(currentWord()).toBe('TEST'); // shortest of TEST/ROTTED/WORSTED

      // A hint is a single action: after the reveal cascade and a beat to
      // read the word, it submits itself — scoring nothing (it is hinted)
      // but landing in the found list without a separate Submit press.
      act(() => {
        vi.runAllTimers();
      });
      expect(currentWord()).toBe('');
      expect(screen.getByRole('status')).toHaveTextContent(
        'TEST earned you 0 points!',
      );
      expect(screen.getByRole('link', { name: 'TEST*' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lands the revealed word immediately when deletion is attempted', () => {
    render(<App dictionary={DICTIONARY} />);

    // The word was paid for at the reveal, so deleting can't unravel the
    // pending submission: the edit lands the word on the spot instead.
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    pressKey('Backspace');

    expect(currentWord()).toBe('');
    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST earned you 0 points!',
    );
    expect(screen.getByRole('link', { name: 'TEST*' })).toBeInTheDocument();
  });

  it('lands the revealed word and starts fresh when a letter is typed', () => {
    render(<App dictionary={DICTIONARY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    typeWord('r');

    // TEST landed (hinted) and the typed letter began the next word.
    expect(currentWord()).toBe('R');
    expect(screen.getByRole('link', { name: 'TEST*' })).toBeInTheDocument();
  });

  it('cascades hinted letters and ripples their source tiles', () => {
    render(<App dictionary={DICTIONARY} />);

    // Typed letters do not play the reveal animation.
    typeWord('t');
    expect(screen.getByLabelText('Current word')).toHaveAttribute(
      'data-revealing',
      'false',
    );
    pressKey('Backspace');

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    // The revealed word (TEST) animates in...
    expect(screen.getByLabelText('Current word')).toHaveAttribute(
      'data-revealing',
      'true',
    );
    // ...and its source tiles (T, E, S) are the ones that ripple.
    for (const letter of 'TES') {
      expect(screen.getByRole('button', { name: letter })).toHaveClass(
        'control-press',
      );
    }
    for (const letter of 'WORD') {
      expect(screen.getByRole('button', { name: letter })).not.toHaveClass(
        'control-press',
      );
    }
  });

  it('does not re-ripple a hint letter when a later letter is typed', () => {
    render(<App dictionary={DICTIONARY} />);

    // Reveal TEST (letters T, E, S), then submit it.
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    pressKey('Enter');

    // Typing two former hint letters must ripple only the current one.
    typeWord('s');
    typeWord('e');
    expect(screen.getByRole('button', { name: 'S' })).not.toHaveClass(
      'control-press',
    );
    expect(screen.getByRole('button', { name: 'E' })).toHaveClass(
      'control-press',
    );
  });

  it('marks a hinted word plainly with an asterisk in the found list', () => {
    render(<App dictionary={DICTIONARY} />);

    // Reveal the shortest word (TEST) via hint and submit it -> hinted.
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    pressKey('Enter');
    // Find another word by hand -> not hinted.
    submitWord('rotted');

    expect(screen.getByRole('link', { name: 'TEST*' })).toHaveAttribute(
      'data-hinted',
      'true',
    );
    expect(screen.getByRole('link', { name: 'ROTTED' })).toHaveAttribute(
      'data-hinted',
      'false',
    );
    expect(screen.getByText('* revealed with a hint')).toBeInTheDocument();

    // Hinted words score nothing: only ROTTED's 3 points count.
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (1 remaining)', // was found=2
    );

    // The hinted mark persists per puzzle (committed when revealed).
    expect(
      JSON.parse(
        window.localStorage.getItem('wordsalad:hinted:DEORSTW.T.4') ?? '[]',
      ),
    ).toEqual(['TEST']);
  });

  it('restores hinted marks for a resumed game', () => {
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED']),
    );
    window.localStorage.setItem(
      'wordsalad:hinted:DEORSTW.T.4',
      JSON.stringify(['TEST']),
    );
    render(<App dictionary={DICTIONARY} />);

    expect(screen.getByRole('link', { name: 'TEST*' })).toHaveAttribute(
      'data-hinted',
      'true',
    );
    expect(screen.getByRole('link', { name: 'ROTTED' })).toHaveAttribute(
      'data-hinted',
      'false',
    );
  });

  it('shows the next hint cost on the Hint button', () => {
    render(<App dictionary={DICTIONARY} />);
    const hint = () => screen.getByRole('button', { name: 'Hint' });
    // The next hint reveals the shortest word (TEST, worth 1); the badge
    // trails the button (like a typed word's verdict) and frames the cost
    // as a reduction of the max, not a deduction.
    expect(screen.getByText('−1 max')).toBeInTheDocument();

    // Commit TEST; the next hint would reveal ROTTED (worth 3).
    fireEvent.click(hint());
    // The spent cost floats away from the (now hidden) hint button.
    expect(
      screen.queryByRole('button', { name: 'Hint' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('−1 max')).toBeInTheDocument();

    // Once TEST lands, the next hint is a fresh charge for ROTTED.
    pressKey('Enter');
    expect(hint()).toBeInTheDocument();
    expect(screen.getByText('−3 max')).toBeInTheDocument();
  });

  it('marks the hint that would forfeit the win', () => {
    render(<App dictionary={DICTIONARY} />);
    const hint = () => screen.getByRole('button', { name: 'Hint' });

    // TEST (1 pt) is affordable: 14 of 15 stays reachable, win needs 12.
    expect(hint()).toHaveAttribute('data-forfeits-win', 'false');

    fireEvent.click(hint()); // commit TEST
    pressKey('Enter'); // submit it

    // ROTTED (3 pts) would leave only 11 reachable — below the win line.
    expect(hint()).toHaveAttribute('data-forfeits-win', 'true');
    expect(hint()).toHaveAttribute(
      'title',
      'Reveals a word — your best possible score would drop below the win line',
    );

    // Once actually locked out, the standing note tells the story instead;
    // the next hint offer is no longer a special warning.
    fireEvent.click(hint()); // commit ROTTED — locked out; the modal opens
    keepPlaying(); // dismiss it, returning to the board
    pressKey('Enter'); // submit the revealed ROTTED, clearing the word area
    expect(hint()).toHaveAttribute('data-forfeits-win', 'false');
  });

  it('re-reveals a paid-for word from an interrupted session at no charge', () => {
    // A session that ended during the reveal window leaves the word
    // committed (paid for) but not yet in the found list.
    window.localStorage.setItem(
      'wordsalad:hinted:DEORSTW.T.4',
      JSON.stringify(['TEST']),
    );
    render(<App dictionary={DICTIONARY} />);
    const hint = () => screen.getByRole('button', { name: 'Hint' });

    // Already paid for: the offer carries no cost badge.
    expect(hint()).toBeInTheDocument();
    expect(screen.queryByText(/−\d+ max/u)).not.toBeInTheDocument();

    fireEvent.click(hint()); // the same word, at no new charge
    expect(currentWord()).toBe('TEST');
    pressKey('Enter');

    // Still only one committed word and one point lost.
    expect(
      JSON.parse(
        window.localStorage.getItem('wordsalad:hinted:DEORSTW.T.4') ?? '[]',
      ),
    ).toEqual(['TEST']);
    expect(screen.getByText('1 hint (−1 pt)')).toBeInTheDocument();
  });

  it('shows +0 for a hinted word, not its point value', () => {
    render(<App dictionary={DICTIONARY} />);
    const verdict = () => screen.getByTestId('verdict');

    // A self-typed word shows its real value.
    typeWord('worsted'); // pangram worth 11
    expect(verdict()).toHaveTextContent('+11');
    fireEvent.keyDown(document, { key: 'Backspace', ctrlKey: true });

    // A hinted (committed) word in the input shows +0 instead of its value.
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // reveals TEST
    expect(verdict()).toHaveTextContent('+0');
    expect(verdict()).not.toHaveTextContent('+1');
  });

  it('takes a hint with "?" only when the word area is empty', () => {
    render(<App dictionary={DICTIONARY} />);

    // "?" while typing must not overwrite the word in progress.
    typeWord('wor');
    pressKey('?');
    expect(currentWord()).toBe('WOR');

    // From empty, "?" reveals the shortest word (TEST).
    fireEvent.keyDown(document, { key: 'Backspace', ctrlKey: true });
    pressKey('?');
    expect(currentWord()).toBe('TEST');
  });

  it('offers the hint only when the word area is empty and words remain', () => {
    render(<App dictionary={DICTIONARY} />);
    expect(screen.getByRole('button', { name: 'Hint' })).toBeInTheDocument();

    // Typing hides the hint (the area now shows the word).
    typeWord('t');
    expect(
      screen.queryByRole('button', { name: 'Hint' }),
    ).not.toBeInTheDocument();

    // Clearing brings it back.
    pressKey('Backspace');
    expect(screen.getByRole('button', { name: 'Hint' })).toBeInTheDocument();
  });

  it('counts and persists hints taken', () => {
    render(<App dictionary={DICTIONARY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // commit TEST
    pressKey('Enter'); // submit TEST, word area empties
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // commit ROTTED

    expect(screen.getByText('2 hints (−4 pts)')).toBeInTheDocument();
    // Each hint commits its word the moment it is revealed.
    expect(
      JSON.parse(
        window.localStorage.getItem('wordsalad:hinted:DEORSTW.T.4') ?? '[]',
      ),
    ).toEqual(['TEST', 'ROTTED']);
  });

  it('restores the hint count for a resumed game', () => {
    window.localStorage.setItem(
      'wordsalad:hinted:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED', 'WORSTED']),
    );
    render(<App dictionary={DICTIONARY} />);
    expect(screen.getByText('3 hints (−15 pts)')).toBeInTheDocument();
  });

  it('clears the hint count when the puzzle is restarted', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    pressKey('Enter'); // score so Restart appears
    expect(screen.getByText('1 hint (−1 pt)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.queryByText('1 hint (−1 pt)')).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem('wordsalad:hinted:DEORSTW.T.4'),
    ).toBeNull();
  });

  it('wins at the 75% threshold and lets you keep playing', () => {
    render(<App dictionary={DICTIONARY} />);
    // Max is 15 points; the win line is 12 (75% rounded up).
    submitWord('worsted'); // 11/15 = 73.3% — just below the line
    expect(screen.queryByTestId('win-banner')).not.toBeInTheDocument();

    submitWord('test'); // +1 -> 12/15 = 80% — win
    expect(screen.getByTestId('win-banner')).toBeInTheDocument();

    // Dismissing the modal returns to the board; a further word still scores.
    keepPlaying();
    submitWord('rotted');
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (all found)', // was found=3
    );
  });

  it('warns when too many hints make the win unreachable', () => {
    render(<App dictionary={DICTIONARY} />);
    const note =
      'Too many hints — winning takes 12 points, but only 11 can still be reached.';

    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // commit TEST (1)
    expect(screen.queryByTestId('lockout-dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lockout-note')).not.toBeInTheDocument();

    pressKey('Enter'); // submit TEST so the next hint is a fresh word
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // commit ROTTED (3)

    // 4 of 15 points lost — the earned ceiling (11/15) drops below 75%. The
    // lockout modal announces it with the full note, then a slim reminder
    // stays behind once dismissed.
    expect(screen.getByTestId('lockout-dialog')).toBeInTheDocument();
    expect(screen.getByText(note)).toBeInTheDocument();
    expect(screen.queryByText('YOU WIN!')).not.toBeInTheDocument();

    keepPlaying();
    expect(screen.queryByTestId('lockout-dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('lockout-note')).toBeInTheDocument();
  });

  it('celebrates again when the same puzzle is won after a restart', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test'); // 12 of 15: the win
    expect(screen.getByTestId('win-banner')).toBeInTheDocument();

    closeWin();
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (3 remaining)', // was found=0
    );

    // Restart rewinds the celebration counter without remounting the board,
    // so this second win arrives wearing the same id as the dismissed one.
    submitWord('worsted');
    submitWord('test');
    expect(screen.getByTestId('win-banner')).toBeInTheDocument();
  });

  it('warns again when the restarted puzzle is hinted into lockout', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // TEST
    pressKey('Enter');
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // ROTTED
    expect(screen.getByTestId('lockout-dialog')).toBeInTheDocument();

    keepPlaying();
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    pressKey('Enter');
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(screen.getByTestId('lockout-dialog')).toBeInTheDocument();
  });

  it('shows the lockout reminder without a modal on restore', () => {
    // A locked game restored from storage: TEST + ROTTED both hinted (0 pts
    // earned, 4 lost) leaves only 11 of 15 reachable, below the win line.
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED']),
    );
    window.localStorage.setItem(
      'wordsalad:hinted:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED']),
    );
    render(<App dictionary={DICTIONARY} />);

    // Calm on restore: the reminder shows, the modal never opens.
    expect(screen.queryByTestId('lockout-dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('lockout-note')).toBeInTheDocument();
  });

  it('hides the hint once every word is found', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    submitWord('rotted');
    submitWord('worsted');
    expect(
      screen.queryByRole('button', { name: 'Hint' }),
    ).not.toBeInTheDocument();
  });

  it('only enables Restart once there is progress to clear', () => {
    render(<App dictionary={DICTIONARY} />);
    const restart = screen.getByRole('button', { name: 'Restart' });
    expect(restart).toHaveAttribute('aria-disabled', 'true');
    // Sharing is equally pointless with nothing found.
    expect(screen.getByRole('button', { name: 'Share' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // A tap on the idle button absorbs without resetting anything.
    fireEvent.click(restart);

    submitWord('test');
    expect(restart).toHaveAttribute('aria-disabled', 'false');
    expect(screen.getByRole('button', { name: 'Share' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  it('restarts the current puzzle, clearing its saved progress', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    submitWord('rotted');
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (1 remaining)', // was found=2
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (3 remaining)', // was found=0
    );
    expect(window.localStorage.getItem('wordsalad:DEORSTW.T.4')).toBeNull();

    // Same puzzle: the letters are unchanged and TEST scores again.
    expect(screen.getByRole('button', { name: 'T' })).toHaveAttribute(
      'data-required',
      'true',
    );
    submitWord('test');
    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST earned you 1 point!',
    );
  });

  it('does not ripple the control buttons when a new game deals in', () => {
    render(<App dictionary={REAL_DICTIONARY} />);
    // The hash game is WORDTES, so T is a valid letter; advance the delete
    // counter by typing then deleting it.
    typeWord('t');
    pressKey('Backspace');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'data-delete-id',
      '1',
    );

    // A fresh game remounts the whole board; the press counters must reset so
    // the Delete button does not replay its ripple on mount.
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    const freshDelete = screen.getByRole('button', { name: 'Delete' });
    expect(freshDelete).toHaveAttribute('data-delete-id', '0');
    expect(freshDelete).not.toHaveClass('control-press');
  });

  // The meta row's shortcuts: plain digits, numbered left to right. Digits
  // are the one key family no dictionary's words can claim, so they never
  // collide with typing.
  it('starts a new game from the 1 key', () => {
    render(<App dictionary={REAL_DICTIONARY} />);
    expect(screen.getByTestId('game-board')).toHaveAttribute(
      'data-game-id',
      '0',
    );

    pressKey('1');

    expect(screen.getByTestId('game-board')).toHaveAttribute(
      'data-game-id',
      '1',
    );
  });

  it('restarts the puzzle from the 2 key', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (2 remaining)', // was found=1
    );

    pressKey('2');

    // Progress cleared without remounting: same puzzle, same board.
    expect(screen.getByTestId('game-board')).toHaveAttribute(
      'data-game-id',
      '0',
    );
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (3 remaining)', // was found=0
    );
  });

  it('shares from the 3 key once there is something to share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');

    pressKey('3');

    expect(
      await screen.findByRole('button', { name: 'Copied!' }),
    ).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  // A gated shortcut is acknowledged the way the play controls acknowledge
  // a denied Backspace or Enter: the pill dips, nothing fires.
  it('dips the gated pills when 2 or 3 fire without progress', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<App dictionary={DICTIONARY} />);
    const restart = () => screen.getByRole('button', { name: 'Restart' });
    const share = () => screen.getByRole('button', { name: 'Share' });
    expect(restart()).toHaveAttribute('data-denied-id', '0');
    expect(share()).toHaveAttribute('data-denied-id', '0');

    pressKey('2');
    expect(restart()).toHaveAttribute('data-denied-id', '1');
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (3 remaining)', // was found=0
    );

    pressKey('3');
    expect(share()).toHaveAttribute('data-denied-id', '2');
    expect(restart()).toHaveAttribute('data-denied-id', '0');
    expect(writeText).not.toHaveBeenCalled();
  });

  // The digit shortcuts follow their actions into the end-game modals,
  // which show the same hints their board pills do.
  it('answers the digit shortcuts inside the win dialog', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test'); // 12 of 15: the win, and the modal
    expect(screen.getByTestId('win-banner')).toBeInTheDocument();

    // 3 shares, exactly like the dialog's Share button.
    pressKey('3');
    expect(
      await within(screen.getByTestId('win-banner')).findByRole('button', {
        name: 'Copied!',
      }),
    ).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledTimes(1);

    // 1 deals the next game — with this tiny dictionary generation
    // deterministically fails, which proves the key reached startNewGame.
    pressKey('1');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('answers the 2 key inside the lockout dialog', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // TEST
    pressKey('Enter');
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // ROTTED
    expect(screen.getByTestId('lockout-dialog')).toBeInTheDocument();

    pressKey('2');

    expect(screen.queryByTestId('lockout-dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (3 remaining)', // was found=0
    );
  });

  // Layouts whose digit row is shifted (French AZERTY types symbols there
  // unshifted) still reach the shortcuts through the physical position —
  // unless that position types a letter, which stays game input.
  it('matches digit shortcuts by physical position on shifted layouts', () => {
    render(<App dictionary={REAL_DICTIONARY} />);
    submitWord('test');
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (181 remaining)', // was found=1
    );

    // AZERTY's unshifted 2 key types 'é' — a letter, so it stays letter
    // input (rejected on this board) rather than firing Restart: the
    // found word survives.
    fireEvent.keyDown(document, { key: 'é', code: 'Digit2' });
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (181 remaining)', // was found=1
    );

    // AZERTY's unshifted 1 key types '&': the position deals a new game.
    fireEvent.keyDown(document, { key: '&', code: 'Digit1' });
    expect(screen.getByTestId('game-board')).toHaveAttribute(
      'data-game-id',
      '1',
    );
  });

  // Restart's absorb: ghosts of the wiped rows fly up toward the Restart
  // pill, which replays its press ring as it receives them — the visual
  // line from the button to what it took.
  it('flies the wiped rows toward Restart when the board resets', () => {
    render(<App dictionary={DICTIONARY} />);
    const restart = () => screen.getByRole('button', { name: 'Restart' });
    expect(restart()).toHaveAttribute('data-restart-id', '0');
    submitWord('test');
    submitWord('rotted');

    fireEvent.click(restart());

    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (3 remaining)', // was found=0
    );
    expect(screen.getAllByTestId('word-exit-ghost')).toHaveLength(2);
    expect(restart()).toHaveAttribute('data-restart-id', '1');
    expect(restart()).toHaveClass('control-press');
  });

  // The window is reserved from the first deal — as many rows as the whole
  // list could ever need — and the blocks take up whatever the found rows
  // leave, in proportion to how much each buries. So the drum is always
  // exactly full, and finding a word never resizes it under the composer.
  it('sizes blocks by what they bury, so the window is always full', () => {
    render(<App dictionary={DICTIONARY} />);
    const grow = () =>
      screen.getAllByTestId('word-brick').map((brick) => brick.style.flexGrow);

    // Three words, all buried in one block, in a window reserved for three.
    expect(
      screen.getByTestId('word-drum').style.getPropertyValue('--drum-slots'),
    ).toBe('3');
    expect(grow()).toEqual(['3']);

    // ROTTED · TEST · WORSTED: the find takes a row of its own and leaves a
    // one-word block on either side, which together give back exactly the
    // row it took.
    submitWord('test');
    expect(grow()).toEqual(['1', '1']);
    expect(screen.getByTestId('word-slot')).toHaveStyle({ height: '32px' });
  });

  it('resumes the hash game instead of regenerating, until New game is used', () => {
    render(<App dictionary={DICTIONARY} />);
    // The tiny test dictionary cannot satisfy generation (15+ words), so
    // still being in a playable state proves the hash game was loaded.
    expect(screen.getByRole('button', { name: 'T' })).toBeInTheDocument();

    // New game regenerates instead of reusing the hash; with this
    // dictionary that deterministically fails, proving the wiring.
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Failed to generate a game!',
    );
  });

  it('reports invalid game data in the query params', () => {
    window.history.replaceState(null, '', '?letters=WOR5TES&required=T');
    render(<App dictionary={DICTIONARY} />);
    expect(screen.getByRole('alert')).toHaveTextContent('INVALID GAME DATA!');
  });

  it('ignores keyboard shortcuts with modifier keys', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.keyDown(document, { key: 'w', metaKey: true });
    fireEvent.keyDown(document, { key: 'o', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'r', altKey: true });
    expect(currentWord()).toBe('');
  });

  it('shows an error instead of crashing when generation fails', () => {
    window.history.replaceState(null, '', window.location.pathname);
    render(<App dictionary={[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Failed to generate a game!',
    );
  });

  it('plays a word by tapping letter buttons', () => {
    render(<App dictionary={DICTIONARY} />);

    for (const letter of 'TEST') {
      fireEvent.click(screen.getByRole('button', { name: letter }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST earned you 1 point!',
    );
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (2 remaining)', // was found=1
    );
  });

  it('removes the last tapped letter with the Delete button', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'T' }));
    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(currentWord()).toBe('T');
  });

  it('previews the current word beside the staged word', () => {
    render(<App dictionary={DICTIONARY} />);
    const submit = () => screen.getByRole('button', { name: 'Submit' });
    const verdict = () => screen.getByTestId('verdict');
    const clearInput = () => {
      while (currentWord().length > 0) {
        pressKey('Backspace');
      }
    };

    typeWord('tes');
    expect(submit()).toHaveAttribute('data-verdict', 'too-short');
    expect(verdict()).toHaveTextContent('…');

    typeWord('t');
    expect(submit()).toHaveAttribute('data-verdict', 'valid');
    expect(verdict()).toHaveTextContent('+1');

    clearInput();
    typeWord('worsted');
    expect(verdict()).toHaveTextContent('+11');

    clearInput();
    typeWord('toss');
    expect(submit()).toHaveAttribute('data-verdict', 'not-a-word');
    expect(verdict()).toHaveTextContent('?');

    clearInput();
    typeWord('word');
    expect(submit()).toHaveAttribute('data-verdict', 'missing-required');

    clearInput();
    submitWord('test');
    typeWord('test');
    expect(submit()).toHaveAttribute('data-verdict', 'already-found');
    expect(verdict()).toHaveTextContent('✓');
  });

  it('floats the submitted badge off the staged word', () => {
    render(<App dictionary={DICTIONARY} />);

    submitWord('test');
    // The input has cleared — no live verdict — but the ghost badge carries
    // the submitted word's verdict while it animates away.
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute(
      'data-readiness',
      'empty',
    );
    expect(screen.queryByTestId('verdict')).not.toBeInTheDocument();
    expect(screen.getByTestId('verdict-ghost')).toHaveTextContent('+1');

    submitWord('toss');
    expect(screen.getByTestId('verdict-ghost')).toHaveTextContent('?');
  });

  it('animates the submitted word out of the word area', () => {
    render(<App dictionary={DICTIONARY} />);

    // A rejected word sinks away, tinted as a rejection.
    submitWord('toss');
    expect(screen.getByTestId('word-exit')).toHaveAttribute(
      'data-word-exit',
      'rejected',
    );
    expect(screen.getByTestId('word-exit')).toHaveTextContent('TOSS');

    // A scoring word departs marked as scored.
    submitWord('test');
    expect(screen.getByTestId('word-exit')).toHaveAttribute(
      'data-word-exit',
      'scored',
    );
    expect(screen.getByTestId('word-exit')).toHaveTextContent('TEST');

    // Typing ends the exit so the ghost never overlaps the new word.
    typeWord('r');
    expect(screen.queryByTestId('word-exit')).not.toBeInTheDocument();
    pressKey('Backspace');

    // A hinted word (revealed via "?", worth 0) departs as hinted instead.
    pressKey('?');
    pressKey('Enter');
    expect(screen.getByTestId('word-exit')).toHaveAttribute(
      'data-word-exit',
      'hinted',
    );
  });

  it('leaves the exit ghost alone when a letter is rejected', () => {
    render(<App dictionary={DICTIONARY} />);

    submitWord('toss'); // rejected: the ghost sinks away
    const ghost = screen.getByTestId('word-exit');

    // A rejected letter shakes the word area, but the ghost must not
    // remount with it — a remount replays the exit animation, and the
    // shake's transform would hijack the ghost's fixed positioning.
    pressKey('q');
    expect(screen.getByTestId('word-exit')).toBe(ghost);
  });

  it('signals submit readiness through the button state', () => {
    render(<App dictionary={DICTIONARY} />);
    const submit = () => screen.getByRole('button', { name: 'Submit' });

    // No letters: unavailable (aria-disabled keeps the tap press feedback
    // working cross-browser; the action itself no-ops).
    expect(submit()).toHaveAttribute('aria-disabled', 'true');
    expect(submit()).toHaveAttribute('data-readiness', 'empty');

    // Clicking the unavailable button fires nothing real.
    fireEvent.click(submit());
    expect(screen.queryByTestId('word-exit')).not.toBeInTheDocument();

    // Too short (minimum length is 4).
    typeWord('tes');
    expect(submit()).toHaveAttribute('aria-disabled', 'false');
    expect(submit()).toHaveAttribute('data-readiness', 'partial');

    // Structurally valid.
    typeWord('t');
    expect(submit()).toHaveAttribute('data-readiness', 'ready');

    // A letter outside the salad is rejected, so readiness is unchanged.
    typeWord('q');
    expect(submit()).toHaveAttribute('data-readiness', 'ready');

    // Long enough with valid letters, but missing the required T.
    for (let i = 0; i < 4; ++i) {
      pressKey('Backspace');
    }
    typeWord('word');
    expect(submit()).toHaveAttribute('data-readiness', 'partial');
  });

  it('signals the Toss button when a toss happens via the keyboard', () => {
    render(<App dictionary={DICTIONARY} />);
    const toss = () => screen.getByRole('button', { name: 'Toss' });
    expect(toss()).toHaveAttribute('data-toss-id', '0');

    // Enter is strictly Submit now: with no letters it does nothing.
    pressKey('Enter');
    expect(toss()).toHaveAttribute('data-toss-id', '0');

    // The spacebar tosses the salad; the button takes credit.
    pressKey(' ');
    expect(toss()).toHaveAttribute('data-toss-id', '1');
  });

  it('signals the letter tile that was typed or tapped', () => {
    render(<App dictionary={DICTIONARY} />);
    const tile = (letter: string) =>
      screen.getByRole('button', { name: letter });

    expect(tile('T')).toHaveAttribute('data-pressed', 'false');

    typeWord('t');
    expect(tile('T')).toHaveAttribute('data-pressed', 'true');
    expect(tile('W')).toHaveAttribute('data-pressed', 'false');

    fireEvent.click(tile('W'));
    expect(tile('W')).toHaveAttribute('data-pressed', 'true');
    expect(tile('T')).toHaveAttribute('data-pressed', 'false');

    // A rejected letter is not an activation.
    typeWord('q');
    expect(tile('W')).toHaveAttribute('data-pressed', 'true');

    // Tossing remounts the tiles; the press marker must not survive it,
    // or the last-pressed tile would replay its ripple alongside the toss.
    pressKey(' ');
    expect(tile('W')).toHaveAttribute('data-pressed', 'false');
    expect(tile('T')).toHaveAttribute('data-pressed', 'false');
  });

  it('disables Delete while there are no letters', () => {
    render(<App dictionary={DICTIONARY} />);
    const deleteButton = () => screen.getByRole('button', { name: 'Delete' });

    expect(deleteButton()).toHaveAttribute('aria-disabled', 'true');
    typeWord('t');
    expect(deleteButton()).toHaveAttribute('aria-disabled', 'false');
    pressKey('Backspace');
    expect(deleteButton()).toHaveAttribute('aria-disabled', 'true');

    // Clicking the unavailable button deletes nothing and fires no signal.
    fireEvent.click(deleteButton());
    expect(deleteButton()).toHaveAttribute('data-delete-id', '1');
  });

  it('acknowledges keyboard input aimed at unavailable controls', () => {
    render(<App dictionary={DICTIONARY} />);
    const deleteButton = () => screen.getByRole('button', { name: 'Delete' });
    const submit = () => screen.getByRole('button', { name: 'Submit' });

    // With an empty word, Backspace and Enter land on unavailable buttons:
    // each denial dips the matching button (one shared counter).
    pressKey('Backspace');
    expect(deleteButton()).toHaveAttribute('data-denied-id', '1');
    expect(submit()).toHaveAttribute('data-denied-id', '0');

    pressKey('Enter');
    expect(submit()).toHaveAttribute('data-denied-id', '2');
    expect(deleteButton()).toHaveAttribute('data-denied-id', '0');

    // Ctrl/Cmd+Backspace on an empty word is a Delete denial too.
    fireEvent.keyDown(document, { key: 'Backspace', metaKey: true });
    expect(deleteButton()).toHaveAttribute('data-denied-id', '3');

    // A fired action supersedes the lingering denial.
    typeWord('t');
    pressKey('Backspace');
    expect(deleteButton()).toHaveAttribute('data-denied-id', '0');
    expect(deleteButton()).toHaveAttribute('data-delete-id', '1');
  });

  it('signals the Delete button only when a letter is actually deleted', () => {
    render(<App dictionary={DICTIONARY} />);
    const deleteButton = () => screen.getByRole('button', { name: 'Delete' });

    // Backspace with no letters deletes nothing: no signal.
    pressKey('Backspace');
    expect(deleteButton()).toHaveAttribute('data-delete-id', '0');

    typeWord('te');
    pressKey('Backspace');
    expect(deleteButton()).toHaveAttribute('data-delete-id', '1');

    fireEvent.click(deleteButton());
    expect(deleteButton()).toHaveAttribute('data-delete-id', '2');

    // Empty again: a further Backspace does not signal.
    pressKey('Backspace');
    expect(deleteButton()).toHaveAttribute('data-delete-id', '2');
  });

  it('keeps the full letter set when tapping Toss', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Toss' }));

    for (const letter of 'WORDTES') {
      expect(screen.getByRole('button', { name: letter })).toBeInTheDocument();
    }
  });

  it('reorders (not remounts) the tiles on Toss, so they can fly', () => {
    render(<App dictionary={DICTIONARY} />);

    // The flight animation moves each tile from its old slot to its new
    // one, which requires the same DOM nodes to survive the shuffle.
    const before = Object.fromEntries(
      Array.from('WORDTES', (letter) => [
        letter,
        screen.getByRole('button', { name: letter }),
      ]),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Toss' }));
    for (const letter of 'WORDTES') {
      expect(screen.getByRole('button', { name: letter })).toBe(before[letter]);
    }
  });

  it('cycles the theme override from the ⋯ menu and persists it', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    const themeRow = () => screen.getByRole('menuitem', { name: /Theme/ });

    // The default follows the OS: no override on <html>, nothing stored.
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(themeRow()).toHaveTextContent('System');

    // Each tap advances System → Light → Dark → System; the menu stays
    // open so the change can be watched (and taken back).
    fireEvent.click(themeRow());
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('wordsalad:theme')).toBe('light');
    expect(themeRow()).toHaveTextContent('Light');

    fireEvent.click(themeRow());
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('wordsalad:theme')).toBe('dark');

    fireEvent.click(themeRow());
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem('wordsalad:theme')).toBeNull();
  });

  it('restores a saved theme override on boot', () => {
    window.localStorage.setItem('wordsalad:theme', 'dark');
    render(<App dictionary={DICTIONARY} />);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('switches the UI language from the ⋯ menu and persists it', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    const select = screen.getByRole('combobox', { name: 'UI language' });
    fireEvent.change(select, { target: { value: 'fr' } });

    // The whole app rewords in place — including the menu itself — and
    // the document advertises the new language.
    expect(screen.getByRole('menuitem', { name: 'Historique' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Succès' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Valider' })).toBeVisible();
    expect(document.documentElement.lang).toBe('fr');
    expect(window.localStorage.getItem('wordsalad:locale')).toBe('fr');

    // Auto returns to following the browser (English under jsdom).
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Langue de l’interface' }),
      { target: { value: '' } },
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
    expect(window.localStorage.getItem('wordsalad:locale')).toBeNull();
  });

  it('restores a saved UI language on boot', () => {
    window.localStorage.setItem('wordsalad:locale', 'de');
    render(<App dictionary={DICTIONARY} />);
    expect(screen.getByRole('button', { name: 'Tipp' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('de');
  });

  it('lets ?lang= outrank the saved UI language for spot-checks', () => {
    window.localStorage.setItem('wordsalad:locale', 'de');
    window.history.replaceState(
      null,
      '',
      '?letters=WORDTES&required=T&lang=fr',
    );
    render(<App dictionary={DICTIONARY} />);
    expect(screen.getByRole('button', { name: 'Indice' })).toBeInTheDocument();
  });

  it('ignores a stale UI-language override for a dropped locale', () => {
    window.localStorage.setItem('wordsalad:locale', 'tlh');
    render(<App dictionary={DICTIONARY} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    // The picker reports Auto, not a phantom selection.
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByRole('combobox', { name: 'UI language' })).toHaveValue(
      '',
    );
  });

  it('starts a game in another word list from the ⋯ menu', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    // Lists are named in their own language, current one selected.
    const picker = screen.getByRole('combobox', { name: 'Word list' });
    expect(picker).toHaveValue('en');
    expect(
      within(picker).getByRole('option', { name: 'Français' }),
    ).toBeInTheDocument();
    // The registry drives the picker: all seven lists appear.
    expect(within(picker).getAllByRole('option')).toHaveLength(7);

    // Choosing one navigates to a fresh game there: bare of puzzle params
    // (a new board generates at boot) but carrying the dictionary.
    const assign = vi.fn();
    vi.stubGlobal('location', {
      assign,
      href: 'http://localhost/wordsalad/?letters=DEORSTW&required=T',
      search: '?letters=DEORSTW&required=T',
    });
    fireEvent.change(picker, { target: { value: 'fr' } });
    vi.unstubAllGlobals();

    const target = new URL(String(assign.mock.calls[0]?.[0]));
    expect(target.searchParams.get('dict')).toBe('fr');
    expect(target.searchParams.get('letters')).toBeNull();
  });

  it('marks non-English games in History and links them with their dict', () => {
    // A finished French game alongside the English one about to be played.
    window.localStorage.setItem(
      'wordsalad:meta:fr:CEOST.T.4',
      JSON.stringify({
        earned: 3,
        found: 4,
        hints: 0,
        lost: 0,
        max: 7,
        playedAt: 1000,
        total: 6,
      }),
    );
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'History' }));
    const dialog = screen.getByRole('dialog');

    // Exactly one row carries a word-list chip — the French one; English
    // stays implicit, as everywhere else.
    const chips = within(dialog).getAllByTestId('history-dict');
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent('FR');

    // The French row resumes with its dictionary aboard.
    const links = within(dialog).getAllByRole('link');
    expect(links[1]).toHaveAttribute(
      'href',
      '?dict=fr&letters=CEOST&required=T',
    );
  });

  it('does not navigate when re-choosing the current word list', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    const assign = vi.fn();
    vi.stubGlobal('location', {
      assign,
      href: 'http://localhost/wordsalad/',
      search: '',
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Word list' }), {
      target: { value: 'en' },
    });
    vi.unstubAllGlobals();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('App with the French dictionary', () => {
  // Board CEOST, required T: one four-sibling key group (COTE) plus two
  // singletons. Six surface entries, five distinct keys.
  const FRENCH = ['CÔTE', 'CÔTÉ', 'COTE', 'COTÉ', 'ÉTÉS', 'TÊTES'];
  const frApp = () => <App dictionary={FRENCH} spec={DICTIONARIES.fr} />;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '?letters=COTES&required=T');
  });

  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('reveals every accented sibling as its own row on one submission', () => {
    render(frApp());
    submitWord('cote');

    // One typed key, four French words found — each row its own entry.
    expect(screen.getByRole('status')).toHaveTextContent(
      'COTE earned you 4 points!',
    );
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (2 remaining)', // was found=4
    );
    for (const word of ['CÔTE', 'CÔTÉ', 'COTE', 'COTÉ']) {
      expect(screen.getByRole('link', { name: word })).toBeInTheDocument();
    }
  });

  it('links each surface form to its own French definition', () => {
    render(frApp());
    submitWord('cote');

    // UI is English here, so definitions come from the English Wiktionary's
    // French section, keyed by the exact accented spelling.
    expect(screen.getByRole('link', { name: 'CÔTÉ' })).toHaveAttribute(
      'href',
      'https://en.wiktionary.org/wiki/c%C3%B4t%C3%A9#French',
    );
    expect(screen.getByRole('link', { name: 'COTE' })).toHaveAttribute(
      'href',
      'https://en.wiktionary.org/wiki/cote#French',
    );
  });

  it('folds accented typing into the play key', () => {
    render(frApp());
    typeWord('côté');
    expect(currentWord()).toBe('COTE');
    pressKey('Enter');
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (2 remaining)', // was found=4
    );
  });

  it('carries the dictionary in the shareable URL and storage keys', () => {
    render(frApp());
    expect(new URLSearchParams(window.location.search).get('dict')).toBe('fr');

    submitWord('etes');
    expect(
      JSON.parse(window.localStorage.getItem('wordsalad:fr:CEOST.T.4') ?? '[]'),
    ).toEqual(['ÉTÉS']);
  });

  it('prices and commits a hinted key group as one unit', () => {
    render(frApp());
    const hint = () => screen.getByRole('button', { name: 'Hint' });

    // The next hint is the COTE group: four one-point siblings, −4 max.
    expect(screen.getByText('−4 max')).toBeInTheDocument();
    fireEvent.click(hint());
    expect(currentWord()).toBe('COTE');
    // Spending 4 of 7 points drops the win out of reach: dismiss the
    // lockout notice, then land the revealed group.
    keepPlaying();
    pressKey('Enter');

    // All four siblings land, hinted and worth nothing.
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (2 remaining)', // was found=4
    );
    expect(screen.getByRole('link', { name: 'CÔTÉ*' })).toHaveAttribute(
      'data-hinted',
      'true',
    );
    expect(screen.getByText('4 hints (−4 pts)')).toBeInTheDocument();
  });

  it('restores accented progress from storage', () => {
    window.localStorage.setItem(
      'wordsalad:fr:CEOST.T.4',
      JSON.stringify(['CÔTE']),
    );
    render(frApp());
    // Replaying one sibling restores its whole group, as found together.
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (2 remaining)', // was found=4
    );
  });

  it('offers the way back to English from the word-list picker', () => {
    render(frApp());
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    const picker = screen.getByRole('combobox', { name: 'Word list' });
    expect(picker).toHaveValue('fr');

    const assign = vi.fn();
    vi.stubGlobal('location', {
      assign,
      href: 'http://localhost/wordsalad/?letters=COTES&required=T&dict=fr',
      search: '?letters=COTES&required=T&dict=fr',
    });
    fireEvent.change(picker, { target: { value: 'en' } });
    vi.unstubAllGlobals();

    // English is the default: the fresh-game URL carries no dict at all.
    const target = new URL(String(assign.mock.calls[0]?.[0]));
    expect(target.searchParams.get('dict')).toBeNull();
    expect(target.searchParams.get('letters')).toBeNull();
  });
});

// The first-run coach: the rules speak in the feedback row until this
// device has scored a word, yielding to verdicts in between.
describe('first-run coach', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '?letters=WORDTES&required=T');
  });

  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('states the rules on a first-ever board and retires on the first scored word', () => {
    render(<App dictionary={DICTIONARY} />);

    const coach = screen.getByTestId('coach');
    expect(coach).toHaveTextContent('Spell words of 4+ letters');
    expect(coach).toHaveTextContent('Every word must use T.');
    expect(coach).toHaveTextContent('Use all 7 letters for a bonus.');

    submitWord('TEST');

    expect(screen.queryByTestId('coach')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('TEST');
  });

  it('yields the row to a verdict and returns once the word is edited', () => {
    render(<App dictionary={DICTIONARY} />);

    submitWord('WORD');
    expect(screen.queryByTestId('coach')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('WORD');

    typeWord('T');
    expect(screen.getByTestId('coach')).toBeInTheDocument();
  });

  it('is not retired by a hint, only by a score', () => {
    vi.useFakeTimers();
    try {
      render(<App dictionary={DICTIONARY} />);

      fireEvent.click(screen.getByRole('button', { name: /^Hint/ }));
      act(() => {
        vi.runAllTimers();
      });
      expect(screen.queryByTestId('coach')).not.toBeInTheDocument();

      // The hint's own feedback holds the row; the next edit hands it back.
      typeWord('W');
      expect(screen.getByTestId('coach')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays retired on later boards once any word has ever scored here', () => {
    const view = render(<App dictionary={DICTIONARY} />);
    submitWord('TEST');
    view.unmount();

    window.history.replaceState(null, '', '?letters=WORDTES&required=D');
    render(<App dictionary={DICTIONARY} />);

    expect(screen.queryByTestId('coach')).not.toBeInTheDocument();
    expect(screen.getByTestId('words-header')).toHaveTextContent(/^Words/);
  });

  it('opens the rules from the menu and quotes the live puzzle', () => {
    render(<App dictionary={DICTIONARY} />);

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'How to play' }));

    const dialog = screen.getByTestId('how-to-play-dialog');
    expect(dialog).toHaveTextContent('4 or more letters from the 7');
    expect(dialog).toHaveTextContent('required letter T.');
    expect(dialog).toHaveTextContent('Reach 75% to win');
    expect(dialog).toHaveTextContent('7-point bonus');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('how-to-play-dialog')).not.toBeInTheDocument();
  });

  it('restores a half-typed word after a reload', () => {
    const view = render(<App dictionary={DICTIONARY} />);
    typeWord('ROT');
    expect(window.localStorage.getItem('wordsalad:draft:DEORSTW.T.4')).toBe(
      'ROT',
    );
    view.unmount();

    render(<App dictionary={DICTIONARY} />);
    expect(currentWord()).toBe('ROT');
    // The restored word is live: it finishes into a score.
    submitWord('TED');
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Words (2 remaining)', // was found=1
    );
  });

  it('keeps a draft with the puzzle it was typed on', () => {
    const view = render(<App dictionary={DICTIONARY} />);
    typeWord('ROT');
    view.unmount();

    window.history.replaceState(null, '', '?letters=WORDTES&required=D');
    render(<App dictionary={DICTIONARY} />);
    expect(currentWord()).toBe('');
  });

  it('drops a draft made of letters not on the board', () => {
    window.localStorage.setItem('wordsalad:draft:DEORSTW.T.4', 'ZAP');
    render(<App dictionary={DICTIONARY} />);
    expect(currentWord()).toBe('');
  });

  it('clears the draft once the word is submitted or deleted', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('TEST');
    expect(
      window.localStorage.getItem('wordsalad:draft:DEORSTW.T.4'),
    ).toBeNull();

    typeWord('RO');
    pressKey('Backspace');
    expect(window.localStorage.getItem('wordsalad:draft:DEORSTW.T.4')).toBe(
      'R',
    );
    pressKey('Backspace');
    expect(
      window.localStorage.getItem('wordsalad:draft:DEORSTW.T.4'),
    ).toBeNull();
  });

  it('does not save a hint reveal as the draft', () => {
    render(<App dictionary={DICTIONARY} />);
    pressKey('?');
    expect(currentWord()).toBe('TEST');
    expect(
      window.localStorage.getItem('wordsalad:draft:DEORSTW.T.4'),
    ).toBeNull();
  });

  it('records the game on screen as the one to return to', () => {
    render(<App dictionary={REAL_DICTIONARY} />);
    expect(window.localStorage.getItem('wordsalad:last')).toBe('DEORSTW.T.4');

    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    const key = new URLSearchParams(window.location.search);
    expect(window.localStorage.getItem('wordsalad:last')).toBe(
      `${key.get('letters')}.${key.get('required')}.4`,
    );
  });

  it('skips a history entry whose key no longer parses', () => {
    window.localStorage.setItem(
      'wordsalad:meta:not-a-key',
      JSON.stringify({
        earned: 1,
        found: 1,
        hints: 0,
        lost: 0,
        max: 15,
        playedAt: 1000,
        total: 3,
      }),
    );
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'History' }));
    const dialog = screen.getByRole('dialog');
    const links = within(dialog).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '?letters=DEORSTW&required=T');
  });
});

describe('achievements', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '?letters=WORDTES&required=T');
  });

  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  function openCase(): HTMLElement {
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Achievements/ }));
    return screen.getByTestId('achievements-dialog');
  }

  function recapIds(dialog: HTMLElement): (string | null)[] {
    return within(within(dialog).getByTestId('achievement-recap'))
      .getAllByRole('listitem')
      .map((chip) => chip.getAttribute('data-achievement'));
  }

  function row(dialog: HTMLElement, id: string): HTMLElement {
    const match = within(dialog)
      .getAllByTestId('achievement-row')
      .find((element) => element.getAttribute('data-achievement') === id);
    if (match === undefined) {
      throw new Error(`no row for ${id}`);
    }
    return match;
  }

  function unlocked(): Record<string, number> {
    return JSON.parse(
      window.localStorage.getItem('wordsalad:achievements') ?? '{}',
    ) as Record<string, number>;
  }

  // A stored summary for some other board — a won one (12 of 15) unless
  // overridden. Keys carry a dictionary prefix for non-English boards.
  function seedGame(
    gameKey: string,
    summary: Partial<{
      earned: number;
      found: number;
      hints: number;
      max: number;
    }> = {},
  ): void {
    window.localStorage.setItem(
      `wordsalad:meta:${gameKey}`,
      JSON.stringify({
        earned: 12,
        found: 3,
        hints: 0,
        lost: 0,
        max: 15,
        playedAt: 1000,
        total: 3,
        ...summary,
      }),
    );
  }

  // Distinct English keys: seven letters, the required A among them.
  const seedKey = (index: number, dict = '') =>
    `${dict}ABCDEF${String.fromCharCode(71 + index)}.A.4`;

  it('lists the whole catalog, locked, before anything is earned', () => {
    render(<App dictionary={DICTIONARY} />);
    const dialog = openCase();

    expect(
      within(dialog).getByRole('heading', { name: 'Achievements' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('0 of 21 earned')).toBeInTheDocument();

    // Every achievement shows, named and described, so the empty case is
    // the catalog: a ☆ row per entry in catalog order.
    const rows = within(dialog).getAllByTestId('achievement-row');
    expect(rows).toHaveLength(21);
    expect(rows[0]).toHaveAttribute('data-achievement', 'first-win');
    expect(rows[0]).toHaveAttribute('data-earned', 'false');
    expect(rows[0]).toHaveTextContent('☆');
    expect(rows[0]).toHaveTextContent('First win');
    expect(rows[0]).toHaveTextContent('Win a game');
    expect(rows[0]).toHaveTextContent('Locked');
    expect(rows[20]).toHaveAttribute('data-achievement', 'polyglot');
    // The lifetime tracks show their standing; the feats say nothing.
    expect(row(dialog, 'ten-wins')).toHaveTextContent('0 / 10');
    expect(row(dialog, 'polyglot')).toHaveTextContent('0 / 7');
    expect(
      within(row(dialog, 'first-win')).queryByTestId('achievement-progress'),
    ).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('achievements-dialog')).not.toBeInTheDocument();
    // Closing hands focus back to the menu trigger and blurs it, so Enter
    // goes to the game rather than re-opening the menu.
    pressKey('Enter');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows how far along the lifetime tracks are', () => {
    seedGame(seedKey(0));
    seedGame(seedKey(1));
    seedGame(seedKey(2), { earned: 3 }); // played, not won
    render(<App dictionary={DICTIONARY} />);
    const dialog = openCase();
    expect(row(dialog, 'ten-wins')).toHaveTextContent('2 / 10');
    expect(row(dialog, 'bilingual')).toHaveTextContent('1 / 2');
  });

  it('recaps the winning word’s unlocks in the win dialog', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted'); // the pangram: Pangrammer, with no dialog to show it
    expect(unlocked()).toEqual({ pangrammer: expect.any(Number) as number });
    submitWord('test'); // 12 of 15: the win

    // The recap tells the whole board's story, in the order it happened.
    const banner = screen.getByTestId('win-banner');
    expect(within(banner).getByTestId('achievement-recap')).toHaveTextContent(
      'Unlocked',
    );
    expect(recapIds(banner)).toEqual([
      'pangrammer',
      'first-win',
      'no-help-needed',
    ]);

    closeWin();
    const dialog = openCase();
    expect(within(dialog).getByText('3 of 21 earned')).toBeInTheDocument();
    const rows = within(dialog).getAllByTestId('achievement-row');
    // Earned rows lead; the pangram came first or in the same instant.
    expect(
      rows
        .slice(0, 3)
        .map((element) => element.getAttribute('data-achievement')),
    ).toEqual(
      expect.arrayContaining(['pangrammer', 'first-win', 'no-help-needed']),
    );
    for (const earned of rows.slice(0, 3)) {
      expect(earned).toHaveAttribute('data-earned', 'true');
      expect(earned).toHaveTextContent('★');
      expect(earned).toHaveTextContent('Earned');
    }
    expect(rows[3]).toHaveAttribute('data-earned', 'false');
  });

  it('recaps everything a perfect first word earns, in catalog order', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    submitWord('rotted');
    submitWord('worsted'); // 15/15: win, perfect, complete, pangram at once

    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'first-win',
      'no-help-needed',
      'first-perfect',
      'completionist',
      'super-genius',
      'pangrammer',
    ]);
  });

  it('recaps the whole board, and starts the story over on a restart', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test'); // the win
    closeWin();
    submitWord('rotted'); // 15/15: the perfect, celebrated on its own

    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'pangrammer',
      'first-win',
      'no-help-needed',
      'first-perfect',
      'completionist',
      'super-genius',
    ]);
    closeWin();

    // A repeat of the win on the same board earns nothing, so no recap.
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    submitWord('worsted');
    submitWord('test');
    expect(
      within(screen.getByTestId('win-banner')).queryByTestId(
        'achievement-recap',
      ),
    ).not.toBeInTheDocument();
  });

  it('carries earned achievements across reloads and never re-awards them', () => {
    // Noon UTC, so the day survives any timezone the test runs in.
    const earnedAt = Date.UTC(2026, 0, 5, 12);
    window.localStorage.setItem(
      'wordsalad:achievements',
      JSON.stringify({
        'first-win': earnedAt,
        'no-help-needed': earnedAt,
        pangrammer: earnedAt,
      }),
    );
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test'); // a win, but not the first

    expect(
      within(screen.getByTestId('win-banner')).queryByTestId(
        'achievement-recap',
      ),
    ).not.toBeInTheDocument();
    expect(unlocked()).toEqual({
      'first-win': earnedAt,
      'no-help-needed': earnedAt,
      pangrammer: earnedAt,
    });

    closeWin();
    const dialog = openCase();
    expect(within(dialog).getByText('3 of 21 earned')).toBeInTheDocument();
    expect(row(dialog, 'first-win')).toHaveTextContent('Jan 5');
  });

  it('awards Overreach from the lockout dialog', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // TEST
    pressKey('Enter');
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // ROTTED

    expect(recapIds(screen.getByTestId('lockout-dialog'))).toEqual([
      'overreach',
    ]);
  });

  it('counts the current board into the lifetime tracks', () => {
    // Nine wins on record: this board's win is the tenth, and it must count
    // even though its summary is not written until after the event.
    for (let index = 0; index < 9; index++) {
      seedGame(seedKey(index));
    }
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test');

    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'pangrammer',
      'first-win',
      'no-help-needed',
      'ten-wins',
    ]);
    closeWin();
    const dialog = openCase();
    expect(row(dialog, 'ten-wins')).toHaveAttribute('data-earned', 'true');
    expect(row(dialog, 'fifty-wins')).toHaveTextContent('10 / 50');
  });

  it('awards the whole win track at once when the record already crosses it', () => {
    for (let index = 0; index < 99; index++) {
      seedGame(seedKey(index % 20).replace('.A.4', `.A.${4 + index}`));
    }
    render(<App dictionary={DICTIONARY} />);
    // Ten and fifty are already true of the record, so the first scored
    // word awards them quietly; the hundredth win is this board's.
    submitWord('worsted');
    expect(Object.keys(unlocked())).toEqual([
      'pangrammer',
      'ten-wins',
      'fifty-wins',
    ]);
    submitWord('test');
    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'pangrammer',
      'ten-wins',
      'fifty-wins',
      'first-win',
      'no-help-needed',
      'century',
    ]);
  });

  it('awards Bilingual on the win that makes a second word list', () => {
    seedGame(seedKey(0, 'fr:'));
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test'); // the English win: a second list

    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'pangrammer',
      'first-win',
      'no-help-needed',
      'bilingual',
    ]);
  });

  it('awards Polyglot once every word list has a win', () => {
    for (const dict of ['fr:', 'es:', 'it:', 'nl:', 'pt:', 'de:']) {
      seedGame(seedKey(0, dict));
    }
    render(<App dictionary={DICTIONARY} />);
    // Six lists already won: Bilingual is true from the first word, and
    // waits in the case; the English win is what completes the set.
    submitWord('worsted');
    expect(unlocked()).toHaveProperty('bilingual');
    submitWord('test');

    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'pangrammer',
      'bilingual',
      'first-win',
      'no-help-needed',
      'polyglot',
    ]);
  });

  it('awards Wordsmith on the word that reaches a thousand', () => {
    seedGame(seedKey(0), { earned: 3, found: 999 });
    render(<App dictionary={DICTIONARY} />);
    submitWord('test'); // no dialog for it: the case shows it
    expect(unlocked()).toEqual({ wordsmith: expect.any(Number) as number });
    const dialog = openCase();
    expect(row(dialog, 'wordsmith')).toHaveAttribute('data-earned', 'true');
  });

  it('awards Perfectionist on the tenth perfect game', () => {
    for (let index = 0; index < 9; index++) {
      seedGame(seedKey(index), { earned: 15 });
    }
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    submitWord('rotted');
    submitWord('worsted');
    expect(recapIds(screen.getByTestId('win-banner'))).toEqual(
      expect.arrayContaining(['first-perfect', 'ten-wins', 'perfectionist']),
    );
  });

  it('awards Challenger on the word that beats a shared score', () => {
    window.history.replaceState(
      null,
      '',
      '?letters=WORDTES&required=T&score=8',
    );
    render(<App dictionary={DICTIONARY} />);
    submitWord('test'); // 1: behind
    expect(unlocked()).toEqual({});
    submitWord('worsted'); // 12: ahead, and the win
    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'first-win',
      'no-help-needed',
      'pangrammer',
      'challenger',
    ]);
  });

  it('awards Hard mode for a win at a longer minimum length', () => {
    window.history.replaceState(null, '', '?letters=WORDTES&required=T&min=5');
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted'); // 11 of 14: the win
    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'first-win',
      'no-help-needed',
      'pangrammer',
      'hard-mode',
    ]);
  });

  it('awards Double duty for a win with two required letters', () => {
    window.history.replaceState(null, '', '?letters=WORDTES&required=TS');
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted'); // 11 of 12: the win, and Super-Genius
    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'first-win',
      'no-help-needed',
      'super-genius',
      'pangrammer',
      'double-duty',
    ]);
  });

  it('awards Builder for a board that arrived from the builder, even after a reload', () => {
    window.history.replaceState(
      null,
      '',
      '?letters=WORDTES&required=T&built=1',
    );
    const view = render(<App dictionary={DICTIONARY} />);
    // The flag is kept per board and stripped from the shareable URL.
    expect(window.localStorage.getItem('wordsalad:built:DEORSTW.T.4')).toBe(
      '1',
    );
    expect(window.location.search).not.toContain('built');
    view.unmount();

    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test');
    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'pangrammer',
      'first-win',
      'no-help-needed',
      'builder',
    ]);
  });

  it('does not treat a forwarded board as built', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test');
    expect(recapIds(screen.getByTestId('win-banner'))).not.toContain('builder');
  });

  it('awards Host on a share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    fireEvent.click(screen.getByRole('button', { name: /Share/ }));
    expect(
      await screen.findByRole('button', { name: 'Copied!' }),
    ).toBeInTheDocument();

    expect(unlocked()).toEqual({ host: expect.any(Number) as number });
    const dialog = openCase();
    expect(row(dialog, 'host')).toHaveAttribute('data-earned', 'true');
  });

  it('appends Host to the open win dialog when shared from there', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted');
    submitWord('test'); // the win
    const banner = screen.getByTestId('win-banner');
    fireEvent.click(within(banner).getByRole('button', { name: /Share/ }));
    expect(
      await within(banner).findByRole('button', { name: 'Copied!' }),
    ).toBeInTheDocument();

    // The dialog is open, so it recaps the share in place: no card.
    expect(recapIds(banner)).toEqual([
      'pangrammer',
      'first-win',
      'no-help-needed',
      'host',
    ]);
    expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
  });

  it('keeps the board’s story across a reload for the recap', () => {
    const view = render(<App dictionary={DICTIONARY} />);
    submitWord('worsted'); // Pangrammer, mid-board
    view.unmount();

    render(<App dictionary={DICTIONARY} />);
    submitWord('test'); // the win, on the restored board
    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'pangrammer',
      'first-win',
      'no-help-needed',
    ]);
  });

  it('awards Long haul for a word of ten letters', () => {
    window.history.replaceState(null, '', '?letters=AEMNSTX&required=S');
    render(<App dictionary={['ASSESSMENT', 'TEST', 'MASS']} />);
    submitWord('assessment'); // 7 of 9: the win as well
    expect(recapIds(screen.getByTestId('win-banner'))).toEqual([
      'first-win',
      'no-help-needed',
      'long-haul',
    ]);
  });

  it('awards Marathon on the 25th word of one board', () => {
    window.history.replaceState(null, '', '?letters=AEINRST&required=A');
    const words = REAL_DICTIONARY.filter(
      (word) =>
        word.length >= 4 &&
        word.includes('A') &&
        Array.from(word).every((letter) => 'AEINRST'.includes(letter)),
    ).slice(0, 25);
    expect(words).toHaveLength(25);
    render(<App dictionary={REAL_DICTIONARY} />);
    for (const word of words.slice(0, 24)) {
      submitWord(word.toLowerCase());
    }
    expect(unlocked()).not.toHaveProperty('marathon');
    submitWord(words[24].toLowerCase());
    expect(unlocked()).toHaveProperty('marathon');
  });
});

describe('unlock moments', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '?letters=WORDTES&required=T');
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '', window.location.pathname);
  });

  const menuTrigger = () =>
    screen.getByRole('button', { name: 'More options' });

  function cardIds(): (string | null)[] {
    return within(screen.getByTestId('unlock-card'))
      .getAllByRole('listitem')
      .map((chip) => chip.getAttribute('data-achievement'));
  }

  it('announces a mid-board unlock with a card, a beat after the word lands', () => {
    vi.useFakeTimers();
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted'); // Pangrammer, with no dialog to recap it

    // The verdict has the row to itself first.
    expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByTestId('unlock-card')).toHaveTextContent('Unlocked');
    expect(cardIds()).toEqual(['pangrammer']);
    expect(screen.getByTestId('unlock-card')).toHaveAttribute(
      'data-phase',
      'shown',
    );

    // It holds, then flies into the ⋯ menu (no Web Animations here, so the
    // flight lands at once), and the trigger acknowledges the landing.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
    expect(menuTrigger()).toHaveAttribute('data-pulse', '1');
    expect(menuTrigger()).toHaveClass('control-press');

    // The menu row says what flew in, until the case is opened.
    fireEvent.click(menuTrigger());
    expect(screen.getByTestId('achievements-fresh')).toHaveTextContent('★ 1');
    expect(
      screen.getByRole('menuitem', { name: 'Achievements 1 new' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Achievements/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(menuTrigger());
    expect(screen.queryByTestId('achievements-fresh')).not.toBeInTheDocument();
  });

  it('shows several unlocks as one card', () => {
    for (let index = 0; index < 9; index++) {
      window.localStorage.setItem(
        `wordsalad:meta:ABCDEF${String.fromCharCode(71 + index)}.A.4`,
        JSON.stringify({
          earned: 12,
          found: index === 0 ? 998 : 3,
          hints: 0,
          lost: 0,
          max: 15,
          playedAt: 1000,
          total: 3,
        }),
      );
    }
    vi.useFakeTimers();
    render(<App dictionary={DICTIONARY} />);
    submitWord('test'); // the 1,000th word on the record: Wordsmith, mid-board
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(cardIds()).toEqual(['wordsmith']);
  });

  it('withholds the card when the word opens a dialog, and takes it down when one opens', () => {
    vi.useFakeTimers();
    render(<App dictionary={DICTIONARY} />);
    submitWord('worsted'); // Pangrammer: a moment is pending
    submitWord('test'); // the win, before the beat
    act(() => {
      vi.advanceTimersByTime(650);
    });
    // The dialog owns the moment: no card, and its recap has the pangram.
    expect(screen.queryByTestId('unlock-card')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('win-banner')).getByTestId('achievement-recap'),
    ).toHaveTextContent('Pangrammer');
  });

  it('announces Host from the meta row with the card', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    fireEvent.click(screen.getByRole('button', { name: /Share/ }));
    expect(
      await screen.findByRole('button', { name: 'Copied!' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('unlock-card', {}, { timeout: 3000 }),
    ).toHaveTextContent('Host');
  });
});
