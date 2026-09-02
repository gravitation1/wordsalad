// Persists per-puzzle progress in localStorage, keyed by the game's encoded
// form (e.g. "WORDTES.T.4"). Storage can be unavailable (blocked site data,
// some private modes), so every access degrades silently to "no
// persistence" — the game must never depend on it.

import type { AchievementId, UnlockRecord } from './game/achievements';
import { isAchievementId } from './game/achievements';

const WORDS_PREFIX = 'wordsalad:';
const HINTED_WORDS_PREFIX = 'wordsalad:hinted:';
const META_PREFIX = 'wordsalad:meta:';
// The word in progress — typed but not yet submitted — so a reload (or a
// browser restoring a tab it unloaded) hands it back.
const DRAFT_PREFIX = 'wordsalad:draft:';
// Legacy key from an earlier hint-count design; still cleared on reset.
const LEGACY_HINTS_PREFIX = 'wordsalad:hints:';
// The game most recently on screen, for the installed app's launch to
// return to (see resume.ts). Not per-puzzle, and never cleared by a reset.
const LAST_GAME_KEY = 'wordsalad:last';
// Settings that belong to the player rather than to a puzzle, so they have
// no game key and no reset touches them.
const SOUND_KEY = 'wordsalad:sound';
const THEME_KEY = 'wordsalad:theme';
const LOCALE_KEY = 'wordsalad:locale';
// The player's achievements, as unlock timestamps by id. They span games,
// so no game key; they are append-only, so no reset touches them.
const ACHIEVEMENTS_KEY = 'wordsalad:achievements';
// Boards that came from the custom-game builder. A fact about the board,
// not progress on it, so no reset touches it either.
const BUILT_PREFIX = 'wordsalad:built:';

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

// The draft is stored as the letters themselves, validated against the
// board by the caller: what the input can hold is the board's business.
export function loadDraft(gameKey: string): string {
  try {
    return window.localStorage.getItem(DRAFT_PREFIX + gameKey) ?? '';
  } catch (_error) {
    return '';
  }
}

// An empty draft is stored as absence, so a puzzle leaves no residue once
// its word is submitted or cleared.
export function saveDraft(gameKey: string, letters: string): void {
  try {
    if (letters === '') {
      window.localStorage.removeItem(DRAFT_PREFIX + gameKey);
    } else {
      window.localStorage.setItem(DRAFT_PREFIX + gameKey, letters);
    }
  } catch (_error) {
    // Play on without persistence.
  }
}

export function loadLastGameKey(): string | null {
  try {
    return window.localStorage.getItem(LAST_GAME_KEY);
  } catch (_error) {
    return null;
  }
}

export function saveLastGameKey(gameKey: string): void {
  try {
    window.localStorage.setItem(LAST_GAME_KEY, gameKey);
  } catch (_error) {
    // Then a launch deals fresh, as it would with nothing to return to.
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

// Sound is off until asked for: a page that makes noise before it is
// invited to is the definition of the thing this feature is trying not to
// be. Anything unreadable therefore means silence.
export function loadSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) === 'on';
  } catch (_error) {
    return false;
  }
}

export function saveSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
  } catch (_error) {
    // The preference lasts as long as the session, then.
  }
}

// 'system' means "follow the OS": stored as absence, so a future rename of
// the default costs nothing and a cleared override leaves no residue.
export type ThemePreference = 'system' | 'light' | 'dark';

export function loadThemePreference(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    return raw === 'light' || raw === 'dark' ? raw : 'system';
  } catch (_error) {
    return 'system';
  }
}

export function saveThemePreference(theme: ThemePreference): void {
  try {
    if (theme === 'system') {
      window.localStorage.removeItem(THEME_KEY);
    } else {
      window.localStorage.setItem(THEME_KEY, theme);
    }
  } catch (_error) {
    // The preference lasts as long as the session, then.
  }
}

// The UI-language override; null means "follow the browser". Stored as a
// bare tag and revalidated by the locale resolver on the way in, so a stale
// value for a dropped locale degrades to the browser's choice.
export function loadLocaleOverride(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_KEY);
  } catch (_error) {
    return null;
  }
}

export function saveLocaleOverride(locale: string | null): void {
  try {
    if (locale === null) {
      window.localStorage.removeItem(LOCALE_KEY);
    } else {
      window.localStorage.setItem(LOCALE_KEY, locale);
    }
  } catch (_error) {
    // The preference lasts as long as the session, then.
  }
}

// Unknown ids (a retired achievement, a hand-edited value) are dropped on
// the way in, so the catalog is the only source of what the case can show.
export function loadUnlocks(): UnlockRecord {
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_KEY);

    if (raw === null) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }
    const unlocks: Partial<Record<AchievementId, number>> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (
        isAchievementId(id) &&
        typeof value === 'number' &&
        Number.isFinite(value)
      ) {
        unlocks[id] = value;
      }
    }
    return unlocks;
  } catch (_error) {
    return {};
  }
}

// Append-only: an achievement already held keeps the date it was earned.
export function recordUnlocks(
  ids: readonly AchievementId[],
  unlockedAt: number,
): void {
  try {
    const unlocks: Partial<Record<AchievementId, number>> = {
      ...loadUnlocks(),
    };
    for (const id of ids) {
      unlocks[id] ??= unlockedAt;
    }
    window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocks));
  } catch (_error) {
    // Play on without persistence.
  }
}

export function loadBuilt(gameKey: string): boolean {
  try {
    return window.localStorage.getItem(BUILT_PREFIX + gameKey) === '1';
  } catch (_error) {
    return false;
  }
}

export function saveBuilt(gameKey: string): void {
  try {
    window.localStorage.setItem(BUILT_PREFIX + gameKey, '1');
  } catch (_error) {
    // Then the board counts as built for this session only.
  }
}

export function clearSavedProgress(gameKey: string): void {
  try {
    window.localStorage.removeItem(WORDS_PREFIX + gameKey);
    window.localStorage.removeItem(HINTED_WORDS_PREFIX + gameKey);
    window.localStorage.removeItem(META_PREFIX + gameKey);
    window.localStorage.removeItem(DRAFT_PREFIX + gameKey);
    window.localStorage.removeItem(LEGACY_HINTS_PREFIX + gameKey);
  } catch (_error) {
    // Nothing to clear if storage is unavailable.
  }
}
