// Persists per-puzzle progress in localStorage, keyed by the same string that
// the URL hash carries (e.g. "WORDTES.T.4"). Storage can be unavailable
// (blocked site data, some private modes), so every access degrades silently
// to "no persistence" — the game must never depend on it.

const WORDS_PREFIX = 'wordsalad:';
const HINTED_WORDS_PREFIX = 'wordsalad:hinted:';
// Legacy key from an earlier hint-count design; still cleared on reset.
const LEGACY_HINTS_PREFIX = 'wordsalad:hints:';

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

export function clearSavedProgress(gameKey: string): void {
  try {
    window.localStorage.removeItem(WORDS_PREFIX + gameKey);
    window.localStorage.removeItem(HINTED_WORDS_PREFIX + gameKey);
    window.localStorage.removeItem(LEGACY_HINTS_PREFIX + gameKey);
  } catch (_error) {
    // Nothing to clear if storage is unavailable.
  }
}
