// Persists found words per puzzle in localStorage, keyed by the same string
// that the URL hash carries (e.g. "WORDTES.T.4"). Storage can be unavailable
// (blocked site data, some private modes), so every access degrades silently
// to "no persistence" — the game must never depend on it.

const KEY_PREFIX = 'wordsalad:';

export function loadSavedWords(gameKey: string): readonly string[] {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + gameKey);

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
    window.localStorage.setItem(KEY_PREFIX + gameKey, JSON.stringify(words));
  } catch (_error) {
    // Play on without persistence.
  }
}

export function clearSavedWords(gameKey: string): void {
  try {
    window.localStorage.removeItem(KEY_PREFIX + gameKey);
  } catch (_error) {
    // Nothing to clear if storage is unavailable.
  }
}
