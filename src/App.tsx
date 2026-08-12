import { useEffect, useRef, useState } from 'react';

import { CustomGameModal } from './components/CustomGameModal';
import { FeedbackLine } from './components/FeedbackLine';
import { GameControls } from './components/GameControls';
import { HistoryDialog } from './components/HistoryDialog';
import { OverflowMenu } from './components/OverflowMenu';
import { SaladLetters } from './components/SaladLetters';
import { Scoreboard } from './components/Scoreboard';
import { SoundToggle } from './components/SoundToggle';
import { WordInput } from './components/WordInput';
import type { DictionarySpec } from './game/dictionaries';
import { DEFAULT_DICTIONARY } from './game/dictionaries';
import type { Locale } from './i18n';
import {
  MessagesProvider,
  resolveLocale,
  SUPPORTED_LOCALES,
  useMessages,
} from './i18n';
import type { HistoryEntry, ThemePreference } from './progressStore';
import {
  loadLocaleOverride,
  loadSoundEnabled,
  loadSummaries,
  loadThemePreference,
  saveLocaleOverride,
  saveSoundEnabled,
  saveThemePreference,
} from './progressStore';
import { soundEnabled as playSoundEnabled } from './sound';
import { useGameSounds } from './useGameSounds';
import { useWordSaladGame } from './useWordSaladGame';

// Loaded in the History button's click handler (reading storage and the
// clock are event-time work; render stays pure).
interface HistorySnapshot {
  entries: readonly HistoryEntry[];
  langParam: string | null;
  now: number;
}

interface Settings {
  localeOverride: Locale | null;
  onLocaleOverride: (locale: Locale | null) => void;
  onTheme: (theme: ThemePreference) => void;
  theme: ThemePreference;
}

// Owns the device settings (theme, UI language) and provides the resolved
// message catalog, so a language change rewords the whole app in place.
// The body lives below the provider because it consumes the catalog itself.
// The word list and its spec arrive together: the dictionary is a property
// of the puzzle (selected by ?dict= at boot), not a device setting.
export function App({
  dictionary,
  spec = DEFAULT_DICTIONARY,
}: {
  dictionary: readonly string[];
  spec?: DictionarySpec;
}) {
  const [theme, setTheme] = useState<ThemePreference>(loadThemePreference);
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(() => {
    // Revalidate the stored tag: a stale override for a locale that no
    // longer exists degrades to following the browser.
    const stored = loadLocaleOverride();
    return (SUPPORTED_LOCALES as readonly string[]).includes(stored ?? '')
      ? (stored as Locale)
      : null;
  });
  const locale = resolveLocale(localeOverride);

  // Reflect the settings onto <html>: data-theme drives the dark: variant
  // (the boot script in index.html stamps the same attribute before first
  // paint), and lang follows the resolved locale.
  useEffect(() => {
    if (theme === 'system') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const settings: Settings = {
    localeOverride,
    onLocaleOverride: (value) => {
      setLocaleOverride(value);
      saveLocaleOverride(value);
    },
    onTheme: (value) => {
      setTheme(value);
      saveThemePreference(value);
    },
    theme,
  };

  return (
    <MessagesProvider locale={locale}>
      <AppBody dictionary={dictionary} settings={settings} spec={spec} />
    </MessagesProvider>
  );
}

function AppBody({
  dictionary,
  settings,
  spec,
}: {
  dictionary: readonly string[];
  settings: Settings;
  spec: DictionarySpec;
}) {
  const t = useMessages();
  const game = useWordSaladGame(dictionary, spec);
  const [history, setHistory] = useState<HistorySnapshot | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(loadSoundEnabled);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useGameSounds(game, soundOn);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    saveSoundEnabled(next);
    if (next) {
      // Answer in the medium being switched on, so the player hears the
      // volume before a word depends on it.
      playSoundEnabled();
    }
  };

  const openHistory = () => {
    setHistory({
      entries: loadSummaries(),
      langParam: new URLSearchParams(window.location.search).get('lang'),
      now: Date.now(),
    });
  };

  const openCustom = () => {
    setCustomOpen(true);
  };

  // Start a fresh game drawing from another word list. A real navigation:
  // the dictionary is a boot-level property, and the abandoned board's
  // progress is already saved, so it stays resumable from History.
  const switchWordList = (id: string) => {
    const url = new URL(window.location.href);
    const lang = url.searchParams.get('lang');
    url.search = '';
    if (lang !== null) {
      url.searchParams.set('lang', lang);
    }
    if (id !== 'en') {
      url.searchParams.set('dict', id);
    }
    window.location.assign(url.toString());
  };

  // Both dialogs open from the ⋯ menu, whose items unmount on close — so
  // restore focus to the menu trigger, then blur it (Enter should submit a
  // word, not re-open the menu).
  const closeHistory = () => {
    setHistory(null);
    menuTriggerRef.current?.focus();
    menuTriggerRef.current?.blur();
  };

  const closeCustom = () => {
    setCustomOpen(false);
    menuTriggerRef.current?.focus();
    menuTriggerRef.current?.blur();
  };

  if (game.status === 'error') {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <p className="font-bold text-red-600 dark:text-red-400" role="alert">
          {game.reason === 'invalid-game-data'
            ? t.invalidGameData
            : t.generationFailed}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-8">
      <header className="flex items-baseline gap-3">
        <h1 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
          {t.appTitle}
        </h1>
        <button
          className="-m-2 flex touch-manipulation items-center gap-1 p-2 text-xs font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
          onClick={game.startNewGame}
          type="button"
        >
          <span
            aria-hidden="true"
            className={`inline-block ${game.gameId > 0 ? 'spin-once' : ''}`}
            key={game.gameId}
          >
            ↻
          </span>
          {t.newGameButton}
        </button>
        <SoundToggle enabled={soundOn} onToggle={toggleSound} />
        <OverflowMenu
          localeOverride={settings.localeOverride}
          onCustomGame={openCustom}
          onHistory={openHistory}
          onLocaleOverride={settings.onLocaleOverride}
          onTheme={settings.onTheme}
          onWordList={switchWordList}
          theme={settings.theme}
          wordList={spec.id}
          triggerRef={menuTriggerRef}
        />
      </header>
      {history === null ? null : (
        <HistoryDialog
          entries={history.entries}
          langParam={history.langParam}
          now={history.now}
          onClose={closeHistory}
        />
      )}
      {customOpen ? (
        <CustomGameModal
          dictionary={dictionary}
          onClose={closeCustom}
          spec={spec}
        />
      ) : null}
      {/* Remounts on every new game (key) so the board deals in fresh. */}
      <div
        className="game-enter flex w-full flex-col items-center gap-5"
        data-game-id={game.gameId}
        key={game.gameId}
      >
        <WordInput
          wordExit={game.wordExit}
          canHint={game.canHint}
          isComplete={game.isComplete}
          isPerfect={game.isPerfect}
          hintCost={game.hintCost}
          hintForfeitsWin={game.hintForfeitsWin}
          hintReveal={game.hintReveal}
          spentHint={game.spentHint}
          inputLetters={game.inputLetters}
          isValidCharacter={game.isValidCharacter}
          onHint={game.revealHint}
          rejection={game.lastRejection}
          requiredCharacters={game.requiredCharacters}
        />
        <SaladLetters
          celebration={game.celebration}
          hintReveal={game.hintReveal}
          lastAppended={game.lastAppended}
          letters={game.saladLetters}
          liveLetters={game.liveLetters}
          onLetter={game.appendLetter}
          requiredCharacters={game.requiredCharacters}
          tossId={game.tossId}
        />
        <GameControls
          canDelete={game.inputLetters.length > 0}
          deleteId={game.deleteId}
          denied={game.deniedControl}
          lastSubmission={game.lastSubmission}
          onClearAll={game.clearInput}
          onDelete={game.deleteLetter}
          onSubmit={game.submitWord}
          onToss={game.tossSalad}
          preview={game.inputPreview}
          submitReadiness={game.submitReadiness}
          tossId={game.tossId}
        />
        <FeedbackLine
          feedback={game.feedback}
          requiredCharacters={game.requiredCharacters}
        />
        <Scoreboard
          celebration={game.celebration}
          challengeScore={game.challengeScore}
          definitionUrl={(word) => spec.definitionUrl(word, t.locale)}
          foldLetter={spec.fold}
          earnedPercent={game.earnedPercent}
          requiredCharacters={game.requiredCharacters}
          saladLetters={game.saladLetters}
          earnedPoints={game.earnedPoints}
          hasWon={game.hasWon}
          hintCount={game.hintCount}
          spotlight={game.spotlight}
          level={game.level}
          lockedOut={game.lockedOut}
          lockout={game.lockout}
          lostPercent={game.lostPercent}
          lostPoints={game.lostPoints}
          maxPoints={game.maxPoints}
          onCustomGame={openCustom}
          onNewGame={game.startNewGame}
          onPrefill={game.prefillWord}
          onRestart={game.restartGame}
          rankUp={game.rankUp}
          winPoints={game.winPoints}
          winThreshold={game.winThreshold}
          wordSlots={game.wordSlots}
        />
      </div>
    </main>
  );
}
