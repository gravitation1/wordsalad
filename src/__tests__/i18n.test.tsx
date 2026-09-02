import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App';
import { CATALOGS, detectLocale, resolveLocale } from '../i18n';

const DICTIONARY = ['TEST', 'ROTTED', 'WORSTED', 'WORD', 'REDO', 'ABLE'];

function typeWord(word: string): void {
  for (const character of word) {
    fireEvent.keyDown(document, { key: character });
  }
}

describe('detectLocale', () => {
  it.each([
    [['fr-FR', 'en-US'], 'fr'],
    [['fr'], 'fr'],
    [['FR-ca'], 'fr'],
    [['en-US'], 'en'],
    [['de-DE', 'fr-FR'], 'de'],
    [['es-MX'], 'es'],
    [['pt-BR'], 'pt'],
    [['zh-TW'], 'zh'],
    [['ja-JP'], 'ja'],
    [['ko-KR'], 'ko'],
    [['km-KH', 'th-TH'], 'en'],
    [[], 'en'],
  ])('maps %j to %s', (languages, locale) => {
    expect(detectLocale(languages)).toBe(locale);
  });
});

describe('resolveLocale', () => {
  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('prefers a ?lang= override over the browser languages', () => {
    window.history.replaceState(null, '', '?lang=ru');
    expect(resolveLocale()).toBe('ru');
  });

  it('ignores an unsupported ?lang= override', () => {
    window.history.replaceState(null, '', '?lang=km');
    // jsdom reports English browser languages.
    expect(resolveLocale()).toBe('en');
  });

  it('prefers a saved override over the browser languages', () => {
    expect(resolveLocale('de')).toBe('de');
  });

  it('lets ?lang= beat a saved override', () => {
    window.history.replaceState(null, '', '?lang=ru');
    expect(resolveLocale('de')).toBe('ru');
  });

  it('falls past an unsupported saved override', () => {
    expect(resolveLocale('km')).toBe('en');
  });
});

describe('plural forms', () => {
  it('handles Russian one/few/many', () => {
    expect(CATALOGS.ru.wordsRemaining(1)).toBe(' (осталось 1 слово)');
    expect(CATALOGS.ru.wordsRemaining(2)).toBe(' (осталось 2 слова)');
    expect(CATALOGS.ru.wordsRemaining(5)).toBe(' (осталось 5 слов)');
    expect(CATALOGS.ru.wordsRemaining(11)).toBe(' (осталось 11 слов)');
    expect(CATALOGS.ru.wordsRemaining(0)).toBe(' (все найдены)');
    // The points word inflects with the max: 21 -> one, 3 -> few, 100 -> many.
    expect(CATALOGS.ru.scoreLabel(1, 21)).toBe('1 / 21 очко');
    expect(CATALOGS.ru.scoreLabel(1, 3)).toBe('1 / 3 очка');
    expect(CATALOGS.ru.scoreLabel(3, 100)).toBe('3 / 100 очков');
    // And with the countdown's delta.
    expect(CATALOGS.ru.pointsToRank(21, 'Гений')).toBe(
      '21 очко до звания «Гений»',
    );
    expect(CATALOGS.ru.pointsToRank(3, 'Гений')).toBe(
      '3 очка до звания «Гений»',
    );
    expect(CATALOGS.ru.pointsToRank(100, 'Гений')).toBe(
      '100 очков до звания «Гений»',
    );
  });

  it('handles German full-word plurals', () => {
    expect(CATALOGS.de.hintsUsed(1, 2)).toBe('1 Tipp (−2 Pkt.)');
    expect(CATALOGS.de.hintsUsed(3, 6)).toBe('3 Tipps (−6 Pkt.)');
    expect(CATALOGS.de.scoreLabel(3, 15)).toBe('3 / 15 Punkte');
  });
});

describe('French UI', () => {
  // The locale rides in on ?lang=, the same override the app documents for
  // spot-checking translations (App resolves its own catalog internally).
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(
      null,
      '',
      '?letters=WORDTES&required=T&lang=fr',
    );
  });

  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('renders controls, feedback, and the scoreboard in French', () => {
    render(<App dictionary={DICTIONARY} />);

    expect(screen.getByRole('button', { name: 'Effacer' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mélanger' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Valider' })).toBeInTheDocument();
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Mots (3 restants)',
    );

    typeWord('test');
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST vous a rapporté 1 point !',
    );
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      'Mots (2 restants)',
    );
    expect(
      screen.getByRole('button', { name: 'Bof · à 1 point de Correct' }),
    ).toBeInTheDocument();
  });

  it('announces letter rejections in French', () => {
    render(<App dictionary={DICTIONARY} />);

    typeWord('q');
    expect(screen.getByRole('status')).toHaveTextContent(
      "Q n'est pas dans la salade de mots !",
    );
  });
});

describe('Japanese UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(
      null,
      '',
      '?letters=WORDTES&required=T&lang=ja',
    );
  });

  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('renders controls and scores in Japanese', () => {
    render(<App dictionary={DICTIONARY} />);

    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'シャッフル' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '決定' })).toBeInTheDocument();

    typeWord('test');
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST で1ポイント獲得！',
    );
    expect(screen.getByTestId('words-header')).toHaveTextContent(
      '単語（残り2語）',
    );
    expect(
      screen.getByRole('button', {
        name: 'いまいち · まあまあまで あと1ポイント',
      }),
    ).toBeInTheDocument();
  });
});
