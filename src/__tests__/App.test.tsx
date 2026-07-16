import { readFileSync } from 'node:fs';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App';

// The real dictionary, for tests that need New game to actually generate a
// playable puzzle (the tiny DICTIONARY above cannot satisfy generation).
const REAL_DICTIONARY = readFileSync('public/dictionary.txt', 'utf8')
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

function currentWord(): string {
  return screen.getByLabelText('Current word').textContent ?? '';
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '#WORDTES.T.4');
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
    expect(screen.getByText('Found 0 words · 0 points')).toBeInTheDocument();
  });

  it('stores the game in the location hash', () => {
    render(<App dictionary={DICTIONARY} />);
    expect(window.location.hash).toBe('#WORDTES.T.4');
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

  it('removes the last letter on backspace', () => {
    render(<App dictionary={DICTIONARY} />);
    typeWord('te');
    pressKey('Backspace');
    expect(currentWord()).toBe('T');
  });

  it('scores a valid word and updates the scoreboard', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');

    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST earned you 1 point!',
    );
    expect(screen.getByText('Found 1 word · 1 point')).toBeInTheDocument();
    expect(screen.getByText('6.67% · Meh')).toBeInTheDocument();
    expect(currentWord()).toBe('');

    const link = screen.getByRole('link', { name: 'TEST' });
    expect(link).toHaveAttribute(
      'href',
      'https://www.merriam-webster.com/dictionary/TEST',
    );
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument();
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
    expect(
      screen.getByText('FOUND ALL THE WORDS! YOU WIN!'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Play again' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Found 3 words · 15 points')).toBeInTheDocument();
    expect(
      screen.getByText('100.00% · Super-Duper-Genius'),
    ).toBeInTheDocument();
  });

  it('persists found words as they are scored', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    submitWord('rotted');

    expect(
      JSON.parse(window.localStorage.getItem('wordsalad:WORDTES.T.4') ?? '[]'),
    ).toEqual(['TEST', 'ROTTED']);
  });

  it('restores saved progress for a game loaded from the hash', () => {
    window.localStorage.setItem(
      'wordsalad:WORDTES.T.4',
      JSON.stringify(['TEST', 'ROTTED']),
    );
    render(<App dictionary={DICTIONARY} />);

    expect(screen.getByText('Found 2 words · 4 points')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TEST' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ROTTED' })).toBeInTheDocument();

    // Finishing the restored game still works end to end.
    submitWord('worsted');
    expect(
      screen.getByText('FOUND ALL THE WORDS! YOU WIN!'),
    ).toBeInTheDocument();
  });

  it('shows the victory state when a completed game is restored', () => {
    window.localStorage.setItem(
      'wordsalad:WORDTES.T.4',
      JSON.stringify(['TEST', 'ROTTED', 'WORSTED']),
    );
    render(<App dictionary={DICTIONARY} />);

    expect(
      screen.getByText('FOUND ALL THE WORDS! YOU WIN!'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('100.00% · Super-Duper-Genius'),
    ).toBeInTheDocument();
  });

  it('drops corrupt or stale saved entries on restore', () => {
    window.localStorage.setItem(
      'wordsalad:WORDTES.T.4',
      JSON.stringify(['TEST', 'NOTAWORD', 42, 'TAXI']),
    );
    render(<App dictionary={DICTIONARY} />);

    expect(screen.getByText('Found 1 word · 1 point')).toBeInTheDocument();
  });

  it('shows the ratings ladder from the progress label', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test'); // 6.67% -> Meh

    fireEvent.click(screen.getByRole('button', { name: '6.67% · Meh' }));

    const dialog = screen.getByRole('dialog');
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows).toHaveLength(11);

    const rowFor = (name: string) =>
      rows.find((row) => within(row).queryByText(name) !== null);
    expect(rowFor('Idiot')).toHaveAttribute('data-achieved', 'true');
    expect(rowFor('Meh')).toHaveAttribute('data-current', 'true');
    expect(rowFor('Okay')).toHaveAttribute('data-achieved', 'false');
    expect(rowFor('Super-Duper-Genius')).toHaveTextContent('from 100%');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ignores game keys while the ratings dialog is open', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    fireEvent.click(screen.getByRole('button', { name: '6.67% · Meh' }));

    // Typing must not reach the game behind the modal.
    typeWord('rot');
    expect(currentWord()).toBe('');
  });

  it('reveals the shortest unfound word as a hint, ready to submit', () => {
    render(<App dictionary={DICTIONARY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(currentWord()).toBe('TEST'); // shortest of TEST/ROTTED/WORSTED

    // The revealed word is submittable as usual.
    pressKey('Enter');
    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST earned you 1 point!',
    );
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

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    pressKey('Enter'); // submit TEST, word area empties
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // reveal ROTTED

    expect(screen.getByText('· 2 hints')).toBeInTheDocument();
    expect(window.localStorage.getItem('wordsalad:hints:WORDTES.T.4')).toBe(
      '2',
    );
  });

  it('restores the hint count for a resumed game', () => {
    window.localStorage.setItem('wordsalad:hints:WORDTES.T.4', '3');
    render(<App dictionary={DICTIONARY} />);
    expect(screen.getByText('· 3 hints')).toBeInTheDocument();
  });

  it('clears the hint count when the puzzle is restarted', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    pressKey('Enter'); // score so Restart appears
    expect(screen.getByText('· 1 hint')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.queryByText('· 1 hint')).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem('wordsalad:hints:WORDTES.T.4'),
    ).toBeNull();
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

  it('only offers Restart once there is progress to clear', () => {
    render(<App dictionary={DICTIONARY} />);
    expect(
      screen.queryByRole('button', { name: 'Restart' }),
    ).not.toBeInTheDocument();

    submitWord('test');
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument();
  });

  it('restarts the current puzzle, clearing its saved progress', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test');
    submitWord('rotted');
    expect(screen.getByText('Found 2 words · 4 points')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

    expect(screen.getByText('Found 0 words · 0 points')).toBeInTheDocument();
    expect(window.localStorage.getItem('wordsalad:WORDTES.T.4')).toBeNull();

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

  it('reports invalid game data in the hash', () => {
    window.history.replaceState(null, '', '#NONSENSE');
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
    expect(screen.getByText('Found 1 word · 1 point')).toBeInTheDocument();
  });

  it('removes the last tapped letter with the Delete button', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'T' }));
    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(currentWord()).toBe('T');
  });

  it('previews the current word on the Submit button badge', () => {
    render(<App dictionary={DICTIONARY} />);
    const submit = () => screen.getByRole('button', { name: 'Submit' });
    const clearInput = () => {
      while (currentWord().length > 0) {
        pressKey('Backspace');
      }
    };

    typeWord('tes');
    expect(submit()).toHaveAttribute('data-verdict', 'too-short');
    expect(submit()).toHaveTextContent('…');

    typeWord('t');
    expect(submit()).toHaveAttribute('data-verdict', 'valid');
    expect(submit()).toHaveTextContent('+1');

    clearInput();
    typeWord('worsted');
    expect(submit()).toHaveTextContent('+11');

    clearInput();
    typeWord('toss');
    expect(submit()).toHaveAttribute('data-verdict', 'not-a-word');
    expect(submit()).toHaveTextContent('?');

    clearInput();
    typeWord('word');
    expect(submit()).toHaveAttribute('data-verdict', 'missing-required');

    clearInput();
    submitWord('test');
    typeWord('test');
    expect(submit()).toHaveAttribute('data-verdict', 'already-found');
    expect(submit()).toHaveTextContent('✓');
  });

  it('floats the submitted badge off the button', () => {
    render(<App dictionary={DICTIONARY} />);
    const submit = () => screen.getByRole('button', { name: 'Submit' });

    submitWord('test');
    // The input has cleared, but the ghost badge carries the submitted
    // word's verdict while it animates away.
    expect(submit()).toHaveAttribute('data-readiness', 'empty');
    expect(submit()).toHaveTextContent('+1');

    submitWord('toss');
    expect(submit()).toHaveTextContent('?');
  });

  it('signals submit readiness through the button state', () => {
    render(<App dictionary={DICTIONARY} />);
    const submit = () => screen.getByRole('button', { name: 'Submit' });

    // No letters: disabled outright.
    expect(submit()).toBeDisabled();
    expect(submit()).toHaveAttribute('data-readiness', 'empty');

    // Too short (minimum length is 4).
    typeWord('tes');
    expect(submit()).toBeEnabled();
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

    expect(deleteButton()).toBeDisabled();
    typeWord('t');
    expect(deleteButton()).toBeEnabled();
    pressKey('Backspace');
    expect(deleteButton()).toBeDisabled();
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
});
