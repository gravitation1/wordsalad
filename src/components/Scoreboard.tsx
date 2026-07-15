import { useMessages } from '../i18n';
import type { FoundWord } from '../useWordSaladGame';

interface ScoreboardProps {
  foundWords: readonly FoundWord[];
  lastFoundWord: string | null;
  currentPoints: number;
  completionPercent: number;
  level: string;
  hasWon: boolean;
  onPlayAgain: () => void;
  onRestart: () => void;
}

export function Scoreboard({
  foundWords,
  lastFoundWord,
  currentPoints,
  completionPercent,
  level,
  hasWon,
  onPlayAgain,
  onRestart,
}: ScoreboardProps) {
  const t = useMessages();

  return (
    <section className="w-full space-y-3">
      {hasWon ? (
        <div className="space-y-2 rounded-xl bg-accent-soft p-3 text-center dark:bg-accent/15">
          <p className="font-semibold text-accent">{t.victory}</p>
          <button
            className="min-h-11 touch-manipulation rounded-full bg-accent px-5 py-2 font-medium text-white transition hover:bg-accent/90 active:scale-95"
            onClick={onPlayAgain}
            type="button"
          >
            {t.playAgainButton}
          </button>
        </div>
      ) : null}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t.foundSummary(foundWords.length, currentPoints)}
        </p>
        {foundWords.length > 0 ? (
          <button
            className="-m-2 flex touch-manipulation items-center gap-1 p-2 text-xs font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
            onClick={onRestart}
            type="button"
          >
            <span aria-hidden="true">⟲</span>
            {t.restartButton}
          </button>
        ) : null}
      </div>
      <div
        aria-label={t.completionLabel}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Number((completionPercent * 100).toFixed(2))}
        className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${completionPercent * 100}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t.progressLabel(completionPercent, level)}
      </p>
      {foundWords.length > 0 ? (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-500 dark:text-gray-400">
              <th className="py-1 font-medium">{t.wordsHeader}</th>
              <th className="w-16 py-1 text-right font-medium">
                {t.pointsHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {foundWords.map(({ word, points }) => (
              <tr key={word}>
                <td className="py-0.5">
                  <a
                    className={`italic text-accent hover:underline ${
                      word === lastFoundWord ? 'font-bold' : ''
                    }`}
                    href={`https://www.merriam-webster.com/dictionary/${word}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {word}
                  </a>
                </td>
                <td className="py-0.5 text-right">{points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
