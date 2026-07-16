import { FeedbackLine } from './components/FeedbackLine';
import { GameControls } from './components/GameControls';
import { SaladLetters } from './components/SaladLetters';
import { Scoreboard } from './components/Scoreboard';
import { WordInput } from './components/WordInput';
import { useMessages } from './i18n';
import { useWordSaladGame } from './useWordSaladGame';

export function App({ dictionary }: { dictionary: readonly string[] }) {
  const t = useMessages();
  const game = useWordSaladGame(dictionary);

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
      </header>
      {/* Remounts on every new game (key) so the board deals in fresh. */}
      <div
        className="game-enter flex w-full flex-col items-center gap-5"
        data-game-id={game.gameId}
        key={game.gameId}
      >
        <WordInput
          acceptedWord={game.acceptedWord}
          canHint={game.canHint}
          hintCost={game.hintCost}
          hintReveal={game.hintReveal}
          spentHint={game.spentHint}
          inputLetters={game.inputLetters}
          isValidCharacter={game.isValidCharacter}
          onHint={game.revealHint}
          rejection={game.lastRejection}
          requiredCharacter={game.requiredCharacter}
        />
        <SaladLetters
          hintReveal={game.hintReveal}
          lastAppended={game.lastAppended}
          letters={game.saladLetters}
          onLetter={game.appendLetter}
          requiredCharacter={game.requiredCharacter}
          tossId={game.tossId}
        />
        <GameControls
          canDelete={game.inputLetters.length > 0}
          deleteId={game.deleteId}
          lastSubmission={game.lastSubmission}
          onClearAll={game.clearInput}
          onDelete={game.deleteLetter}
          onSubmit={game.submitWord}
          onToss={game.tossSalad}
          preview={game.inputPreview}
          submitReadiness={game.submitReadiness}
          tossId={game.tossId}
        />
        <FeedbackLine feedback={game.feedback} />
        <Scoreboard
          earnedPercent={game.earnedPercent}
          earnedPoints={game.earnedPoints}
          foundWords={game.foundWords}
          hasWon={game.hasWon}
          hintCount={game.hintCount}
          lastFoundWord={game.lastFoundWord}
          level={game.level}
          lockedOut={game.lockedOut}
          lostPercent={game.lostPercent}
          onPlayAgain={game.startNewGame}
          onRestart={game.restartGame}
          winThreshold={game.winThreshold}
        />
      </div>
    </main>
  );
}
