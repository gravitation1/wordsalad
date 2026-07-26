import { useRef, useState } from 'react';

import { CustomGameModal } from './components/CustomGameModal';
import { FeedbackLine } from './components/FeedbackLine';
import { GameControls } from './components/GameControls';
import { HistoryDialog } from './components/HistoryDialog';
import { OverflowMenu } from './components/OverflowMenu';
import { SaladLetters } from './components/SaladLetters';
import { Scoreboard } from './components/Scoreboard';
import { WordInput } from './components/WordInput';
import { useMessages } from './i18n';
import type { HistoryEntry } from './progressStore';
import { loadSummaries } from './progressStore';
import { useWordSaladGame } from './useWordSaladGame';

// Loaded in the History button's click handler (reading storage and the
// clock are event-time work; render stays pure).
interface HistorySnapshot {
  entries: readonly HistoryEntry[];
  langParam: string | null;
  now: number;
}

export function App({ dictionary }: { dictionary: readonly string[] }) {
  const t = useMessages();
  const game = useWordSaladGame(dictionary);
  const [history, setHistory] = useState<HistorySnapshot | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

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
        <OverflowMenu
          onCustomGame={openCustom}
          onHistory={openHistory}
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
        <CustomGameModal dictionary={dictionary} onClose={closeCustom} />
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
          earnedPercent={game.earnedPercent}
          requiredCharacters={game.requiredCharacters}
          saladLetters={game.saladLetters}
          earnedPoints={game.earnedPoints}
          hasWon={game.hasWon}
          hintCount={game.hintCount}
          lastFoundWord={game.lastFoundWord}
          level={game.level}
          lockedOut={game.lockedOut}
          lockout={game.lockout}
          lostPercent={game.lostPercent}
          lostPoints={game.lostPoints}
          maxPoints={game.maxPoints}
          onCustomGame={openCustom}
          onPlayAgain={game.startNewGame}
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
