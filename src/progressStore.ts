// Persists per-puzzle progress in localStorage, keyed by the same string that
// the URL hash carries (e.g. "WORDTES.T.4"). Storage can be unavailable
// (blocked site data, some private modes), so every access degrades silently
// to "no persistence" — the game must never depend on it.

const WORDS_PREFIX = 'wordsalad:';
const HINTS_PREFIX = 'wordsalad:hints:';

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

export function loadHintCount(gameKey: string): number {
  try {
    const raw = window.localStorage.getItem(HINTS_PREFIX + gameKey);

    if (raw === null) {
      return 0;
    }

    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'number' && Number.isInteger(parsed) && parsed >= 0
      ? parsed
      : 0;
  } catch (_error) {
    return 0;
  }
}

export function saveHintCount(gameKey: string, count: number): void {
  try {
    window.localStorage.setItem(HINTS_PREFIX + gameKey, JSON.stringify(count));
  } catch (_error) {
    // Play on without persistence.
  }
}

export function clearSavedProgress(gameKey: string): void {
  try {
    window.localStorage.removeItem(WORDS_PREFIX + gameKey);
    window.localStorage.removeItem(HINTS_PREFIX + gameKey);
  } catch (_error) {
    // Nothing to clear if storage is unavailable.
  }
}
