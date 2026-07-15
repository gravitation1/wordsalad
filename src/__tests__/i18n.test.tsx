import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App';
import {
  CATALOGS,
  detectLocale,
  MessagesProvider,
  resolveLocale,
} from '../i18n';

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
});

describe('plural forms', () => {
  it('handles Russian one/few/many', () => {
    expect(CATALOGS.ru.foundSummary(1, 1)).toBe('Найдено 1 слово · 1 очко');
    expect(CATALOGS.ru.foundSummary(2, 3)).toBe('Найдено 2 слова · 3 очка');
    expect(CATALOGS.ru.foundSummary(5, 21)).toBe('Найдено 5 слов · 21 очко');
    expect(CATALOGS.ru.foundSummary(11, 100)).toBe(
      'Найдено 11 слов · 100 очков',
    );
  });

  it('handles German full-word plurals', () => {
    expect(CATALOGS.de.foundSummary(1, 1)).toBe('1 Wort gefunden · 1 Punkt');
    expect(CATALOGS.de.foundSummary(3, 7)).toBe('3 Wörter gefunden · 7 Punkte');
  });
});

describe('French UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '#WORDTES.T.4');
  });

  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('renders controls, feedback, and the scoreboard in French', () => {
    render(
      <MessagesProvider locale="fr">
        <App dictionary={DICTIONARY} />
      </MessagesProvider>,
    );

    expect(screen.getByRole('button', { name: 'Effacer' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mélanger' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Valider' })).toBeInTheDocument();
    expect(screen.getByText('0 mot trouvé · 0 point')).toBeInTheDocument();

    typeWord('test');
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('status')).toHaveTextContent(
      'TEST vous a rapporté 1 point !',
    );
    expect(screen.getByText('1 mot trouvé · 1 point')).toBeInTheDocument();
    // French percent formatting uses a comma decimal separator.
    expect(screen.getByText(/6,67\s%\s·\sBof/)).toBeInTheDocument();
  });

  it('announces letter rejections in French', () => {
    render(
      <MessagesProvider locale="fr">
        <App dictionary={DICTIONARY} />
      </MessagesProvider>,
    );

    typeWord('q');
    expect(screen.getByRole('status')).toHaveTextContent(
      "Q n'est pas dans la salade de mots !",
    );
  });
});

describe('Japanese UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '#WORDTES.T.4');
  });

  afterEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('renders controls and scores in Japanese', () => {
    render(
      <MessagesProvider locale="ja">
        <App dictionary={DICTIONARY} />
      </MessagesProvider>,
    );

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
    expect(screen.getByText('1個の単語 · 1ポイント')).toBeInTheDocument();
  });
});
