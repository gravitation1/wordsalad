// Persists per-puzzle progress in localStorage, keyed by the game's encoded
// form (e.g. "WORDTES.T.4"). Storage can be unavailable (blocked site data,
// some private modes), so every access degrades silently to "no
// persistence" — the game must never depend on it.

const WORDS_PREFIX = 'wordsalad:';
const HINTED_WORDS_PREFIX = 'wordsalad:hinted:';
const META_PREFIX = 'wordsalad:meta:';
// Legacy key from an earlier hint-count design; still cleared on reset.
const LEGACY_HINTS_PREFIX = 'wordsalad:hints:';

// A compact per-game record for the history view: everything the list and
// its aggregate statistics need, without re-solving the puzzle.
export interface GameSummary {
  playedAt: number;
  earned: number;
  lost: number;
  max: number;
  hints: number;
  found: number;
  total: number;
}

export interface HistoryEntry {
  gameKey: string;
  summary: GameSummary;
}

function isGameSummary(value: unknown): value is GameSummary {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return ['playedAt', 'earned', 'lost', 'max', 'hints', 'found', 'total'].every(
    (field) =>
      typeof record[field] === 'number' && Number.isFinite(record[field]),
  );
}

export function loadSavedWords(gameKey: string): readonly string[] {
  try {
    const raw = window.localStorage.getItem(WORDS_PREFIX + gameKey);

    if (raw === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((word): word is string => typeof word === 'string')
      : [];
  } catch (_error) {
    return [];
  }
}

export function saveWords(gameKey: string, words: readonly string[]): void {
  try {
    window.localStorage.setItem(WORDS_PREFIX + gameKey, JSON.stringify(words));
  } catch (_error) {
    // Play on without persistence.
  }
}

export function loadHintedWords(gameKey: string): readonly string[] {
  try {
    const raw = window.localStorage.getItem(HINTED_WORDS_PREFIX + gameKey);

    if (raw === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((word): word is string => typeof word === 'string')
      : [];
  } catch (_error) {
    return [];
  }
}

export function saveHintedWords(
  gameKey: string,
  words: readonly string[],
): void {
  try {
    window.localStorage.setItem(
      HINTED_WORDS_PREFIX + gameKey,
      JSON.stringify(words),
    );
  } catch (_error) {
    // Play on without persistence.
  }
}

export function saveSummary(gameKey: string, summary: GameSummary): void {
  try {
    window.localStorage.setItem(META_PREFIX + gameKey, JSON.stringify(summary));
  } catch (_error) {
    // Play on without persistence.
  }
}

// Every recorded game, unordered; corrupt entries are skipped. History
// starts when the summaries do — games saved before this layer existed have
// word lists but no record here, and are deliberately not backfilled.
export function loadSummaries(): readonly HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(META_PREFIX)) {
        continue;
      }
      try {
        const parsed: unknown = JSON.parse(
          window.localStorage.getItem(key) ?? 'null',
        );
        if (isGameSummary(parsed)) {
          entries.push({
            gameKey: key.slice(META_PREFIX.length),
            summary: parsed,
          });
        }
      } catch (_error) {
        // Skip the corrupt entry.
      }
    }
  } catch (_error) {
    // No storage, no history.
  }
  return entries;
}

export function clearSavedProgress(gameKey: string): void {
  try {
    window.localStorage.removeItem(WORDS_PREFIX + gameKey);
    window.localStorage.removeItem(HINTED_WORDS_PREFIX + gameKey);
    window.localStorage.removeItem(META_PREFIX + gameKey);
    window.localStorage.removeItem(LEGACY_HINTS_PREFIX + gameKey);
  } catch (_error) {
    // Nothing to clear if storage is unavailable.
  }
}
