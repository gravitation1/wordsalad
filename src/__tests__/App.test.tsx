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
    expect(screen.getByText('Found 0 words')).toBeInTheDocument();
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

  it('rejects an incomplete puzzle query', () => {
    window.history.replaceState(null, '', '?letters=WORDTES');
    render(<App dictionary={DICTIONARY} />);
    expect(screen.getByText('INVALID GAME DATA!')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
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

  it('blurs the History trigger on close so Enter cannot re-open it', () => {
    render(<App dictionary={DICTIONARY} />);
    const historyButton = screen.getByRole('button', { name: 'History' });

    fireEvent.click(historyButton);
    // Browsers hand focus back to the trigger when a modal dialog closes.
    historyButton.focus();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Close',
      }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(historyButton).not.toHaveFocus();
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
    expect(screen.getByText('Found 1 word')).toBeInTheDocument();
    expect(screen.getByText('1 / 15 points · Meh')).toBeInTheDocument();
    expect(currentWord()).toBe('');

    const link = screen.getByRole('link', { name: 'TEST' });
    expect(link).toHaveAttribute(
      'href',
      'https://www.merriam-webster.com/dictionary/TEST',
    );
    expect(
      within(screen.getByTestId('word-drum')).getByText('1'),
    ).toBeInTheDocument();
  });

  it('shows an anonymous slot for every word in the puzzle', () => {
    render(<App dictionary={DICTIONARY} />);
    const slots = () =>
      within(screen.getByTestId('word-drum')).getAllByTestId('word-slot');

    // Three words exist; the drum knows the count but names none of them.
    expect(slots()).toHaveLength(3);
    for (const slot of slots()) {
      expect(slot).toHaveAttribute('data-found', 'false');
      expect(slot).toHaveTextContent('?');
    }
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    // Finding TEST fills its alphabetical slot (ROTTED, TEST, WORSTED).
    submitWord('test');
    expect(slots()[1]).toHaveAttribute('data-found', 'true');
    expect(
      within(slots()[1]).getByRole('link', { name: 'TEST' }),
    ).toBeInTheDocument();
    expect(slots()[0]).toHaveAttribute('data-found', 'false');
    expect(slots()[2]).toHaveAttribute('data-found', 'false');
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
    expect(
      screen.getByRole('button', { name: 'Play again' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Found 3 words')).toBeInTheDocument();
    expect(
      screen.getByText('15 / 15 points · Super-Duper-Genius'),
    ).toBeInTheDocument();
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
    expect(screen.queryByTestId('complete-mark')).not.toBeInTheDocument();

    submitWord('rotted'); // board cleared
    expect(screen.getByTestId('complete-mark')).toBeInTheDocument();
  });

  it('does not celebrate a restored, already-won game', () => {
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'ROTTED', 'WORSTED']),
    );
    render(<App dictionary={DICTIONARY} />);

    expect(screen.getByText('YOU WIN!')).toBeInTheDocument();
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
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

    expect(screen.getByText('Found 2 words')).toBeInTheDocument();
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

    expect(screen.getByText('YOU WIN!')).toBeInTheDocument();
    expect(
      screen.getByText('15 / 15 points · Super-Duper-Genius'),
    ).toBeInTheDocument();
  });

  it('drops corrupt or stale saved entries on restore', () => {
    window.localStorage.setItem(
      'wordsalad:DEORSTW.T.4',
      JSON.stringify(['TEST', 'NOTAWORD', 42, 'TAXI']),
    );
    render(<App dictionary={DICTIONARY} />);

    expect(screen.getByText('Found 1 word')).toBeInTheDocument();
  });

  it('shows the ratings ladder from the progress label', () => {
    render(<App dictionary={DICTIONARY} />);
    submitWord('test'); // 1 of 15 points -> Meh

    fireEvent.click(
      screen.getByRole('button', { name: '1 / 15 points · Meh' }),
    );

    const dialog = screen.getByRole('dialog');
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
      screen.getByRole('button', { name: '1 / 15 points · Meh' }),
    );

    // Typing must not reach the game behind the modal.
    typeWord('rot');
    expect(currentWord()).toBe('');
  });

  it('reveals the shortest unfound word as a hint, ready to submit', () => {
    render(<App dictionary={DICTIONARY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(currentWord()).toBe('TEST'); // shortest of TEST/ROTTED/WORSTED

    // The revealed word is submittable, but scores nothing (it is hinted).
    pressKey('Enter');
    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST earned you 0 points!',
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
    expect(screen.getByText('Found 2 words')).toBeInTheDocument();

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
    // frames the cost as a reduction of the max, not a deduction.
    expect(hint()).toHaveTextContent('−1 max');

    // Commit TEST; the next hint would reveal ROTTED (worth 3).
    fireEvent.click(hint());
    // The spent cost floats away from the (now hidden) hint button.
    expect(
      screen.queryByRole('button', { name: 'Hint' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('−1 max')).toBeInTheDocument();

    // Deleting the reveal leaves TEST paid-for but unfound: the next hint
    // re-reveals it for free, so no cost chip is shown.
    fireEvent.keyDown(document, { key: 'Backspace', ctrlKey: true });
    expect(hint()).not.toHaveTextContent('max');

    // Once the paid word is submitted, the next hint is a fresh charge.
    fireEvent.click(hint()); // re-reveals TEST
    pressKey('Enter');
    expect(hint()).toHaveTextContent('−3 max');
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
    fireEvent.click(hint()); // commit ROTTED — locked out now
    pressKey('Enter');
    expect(hint()).toHaveAttribute('data-forfeits-win', 'false');
  });

  it('re-reveals a deleted hint instead of charging for a new word', () => {
    render(<App dictionary={DICTIONARY} />);
    const hint = () => screen.getByRole('button', { name: 'Hint' });

    fireEvent.click(hint()); // reveals and commits TEST
    expect(currentWord()).toBe('TEST');

    fireEvent.keyDown(document, { key: 'Backspace', ctrlKey: true });
    fireEvent.click(hint()); // the word was already paid for: same word
    expect(currentWord()).toBe('TEST');

    // Still only one committed word and one point lost.
    expect(
      JSON.parse(
        window.localStorage.getItem('wordsalad:hinted:DEORSTW.T.4') ?? '[]',
      ),
    ).toEqual(['TEST']);
    expect(screen.getByText('· 1 hint (−1 pt)')).toBeInTheDocument();
  });

  it('shows +0 on Submit for a hinted word, not its point value', () => {
    render(<App dictionary={DICTIONARY} />);
    const submit = () => screen.getByRole('button', { name: 'Submit' });

    // A self-typed word shows its real value.
    typeWord('worsted'); // pangram worth 11
    expect(submit()).toHaveTextContent('+11');
    fireEvent.keyDown(document, { key: 'Backspace', ctrlKey: true });

    // A hinted (committed) word in the input shows +0 instead of its value.
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // reveals TEST
    expect(submit()).toHaveTextContent('+0');
    expect(submit()).not.toHaveTextContent('+1');
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

    expect(screen.getByText('· 2 hints (−4 pts)')).toBeInTheDocument();
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
    expect(screen.getByText('· 3 hints (−15 pts)')).toBeInTheDocument();
  });

  it('clears the hint count when the puzzle is restarted', () => {
    render(<App dictionary={DICTIONARY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    pressKey('Enter'); // score so Restart appears
    expect(screen.getByText('· 1 hint (−1 pt)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.queryByText('· 1 hint (−1 pt)')).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem('wordsalad:hinted:DEORSTW.T.4'),
    ).toBeNull();
  });

  it('wins at the 75% threshold and lets you keep playing', () => {
    render(<App dictionary={DICTIONARY} />);
    // Max is 15 points; the win line is 12 (75% rounded up).
    submitWord('worsted'); // 11/15 = 73.3% — just below the line
    expect(screen.queryByText('YOU WIN!')).not.toBeInTheDocument();

    submitWord('test'); // +1 -> 12/15 = 80% — win
    expect(screen.getByText('YOU WIN!')).toBeInTheDocument();

    // The game continues: a further word still scores.
    submitWord('rotted');
    expect(screen.getByText('Found 3 words')).toBeInTheDocument();
  });

  it('warns when too many hints make the win unreachable', () => {
    render(<App dictionary={DICTIONARY} />);
    const note =
      'Too many hints — winning takes 12 points, but only 11 can still be reached.';

    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // commit TEST (1)
    expect(screen.queryByText(note)).not.toBeInTheDocument();

    pressKey('Enter'); // submit TEST so the next hint is a fresh word
    fireEvent.click(screen.getByRole('button', { name: 'Hint' })); // commit ROTTED (3)

    // 4 of 15 points lost — the earned ceiling (11/15) drops below 75%.
    expect(screen.getByText(note)).toBeInTheDocument();
    expect(screen.queryByText('YOU WIN!')).not.toBeInTheDocument();
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
    expect(screen.getByText('Found 2 words')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

    expect(screen.getByText('Found 0 words')).toBeInTheDocument();
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
    expect(screen.getByText('Found 1 word')).toBeInTheDocument();
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
});
