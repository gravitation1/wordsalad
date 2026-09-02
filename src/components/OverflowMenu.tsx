import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import { DICTIONARIES } from '../game/dictionaries';
import type { Locale } from '../i18n';
import {
  detectLocale,
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
  useMessages,
} from '../i18n';
import type { ThemePreference } from '../progressStore';
import { countFreshUnlocks } from '../progressStore';

// The header's ⋯ menu: the home for everything that is not the play loop —
// meta actions (the custom-game builder, history) and, below a divider, the
// device settings (theme, UI language). Sits at the header's edge so it
// cannot be misread as belonging to a neighboring control. Keyboard-
// navigable (arrows/Home/End/Esc), closes on outside click. The settings
// rows deliberately keep the menu open: their feedback is the app restyling
// or rewording itself in place.
interface OverflowMenuProps {
  localeOverride: Locale | null;
  onAchievements: () => void;
  onCustomGame: () => void;
  onHistory: () => void;
  onHowToPlay: () => void;
  onLocaleOverride: (locale: Locale | null) => void;
  // Toggles the game sounds; the row stays open like the other settings —
  // its feedback is the confirmation chime and the strike over the note.
  onSound: () => void;
  soundOn: boolean;
  onTheme: (theme: ThemePreference) => void;
  // Start a new game drawing from another dictionary (a navigation: the
  // current board stays resumable from History).
  onWordList: (id: string) => void;
  theme: ThemePreference;
  // The current dictionary's id — the word-list picker's value.
  wordList: string;
  // Owned by the parent so it can restore focus here after a dialog opened
  // from the menu closes (the menu items themselves unmount on close).
  triggerRef: RefObject<HTMLButtonElement | null>;
  // Counts the unlock cards that have flown into this menu; each landing
  // presses the trigger and rings it, the acknowledgment a control gives
  // when it fires.
  pulse: number;
}

// Each tap advances the override one step, ending back at "follow the OS".
const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const ROW_CLASS =
  'flex w-full touch-manipulation items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800';

// The language row stacks its label over the picker, and hands focus to
// the select rather than taking any itself.
const PICKER_ROW_CLASS =
  'flex w-full cursor-pointer touch-manipulation flex-col items-stretch gap-1 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800';

const ICON_CLASS = 'w-4 text-center text-gray-400 dark:text-gray-500';

export function OverflowMenu({
  localeOverride,
  onAchievements,
  onCustomGame,
  onHistory,
  onHowToPlay,
  onLocaleOverride,
  onSound,
  soundOn,
  onTheme,
  onWordList,
  theme,
  wordList,
  triggerRef,
  pulse,
}: OverflowMenuProps) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  // Achievements earned since the case was last opened, read when the
  // menu opens (event-time storage, like the dialogs' snapshots).
  const [fresh, setFresh] = useState(0);
  // The pulse whose ring has finished, so the press class comes off again.
  const [ended, setEnded] = useState(0);
  const pulsing = pulse > 0 && pulse !== ended;
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Glyph icons in the same vocabulary as the meta row's ↻/↗/⟲: ✎ for
  // authoring a puzzle, ↺ for looking back, ★ for the trophy case (the
  // filled star is what an earned achievement wears inside it).
  const items: {
    action: () => void;
    icon: string;
    label: string;
    trailing?: ReactNode;
  }[] = [
    { action: onCustomGame, icon: '✎', label: t.customGameButton },
    { action: onHistory, icon: '↺', label: t.historyButton },
    {
      action: onAchievements,
      icon: '★',
      label: t.achievementsButton,
      // What has flown in here since the case was last opened, in the
      // Theme row's trailing-value idiom; the case clears it.
      trailing:
        fresh > 0 ? (
          <>
            <span
              aria-hidden="true"
              className="ml-auto pl-3 text-accent"
              data-testid="achievements-fresh"
            >
              ★ {fresh}
            </span>
            <span className="sr-only"> {t.achievementsNew(fresh)}</span>
          </>
        ) : undefined,
    },
  ];

  const themeName = {
    system: t.themeSystem,
    light: t.themeLight,
    dark: t.themeDark,
  }[theme];

  // Dismiss on a click outside the menu.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current !== null &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (open) {
      itemRefs.current[0]?.focus();
    }
  }, [open]);

  const closeToTrigger = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // The language select owns its keys: closed selects change value with
    // the arrows on some platforms, so hijacking them for roving focus
    // would fight the control. Tab and Shift+Tab still move past it.
    if (event.target instanceof HTMLSelectElement) {
      return;
    }
    // The buttons cycle with the arrows (the action items, then the sound
    // and theme rows, then help); the selects stay out of the ring.
    const count = items.length + 3;
    const active = itemRefs.current.findIndex(
      (element) => element === document.activeElement,
    );
    if (event.key === 'Escape') {
      event.preventDefault();
      closeToTrigger();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      itemRefs.current[(active + 1) % count]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      itemRefs.current[(active - 1 + count) % count]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      itemRefs.current[count - 1]?.focus();
    }
  };

  return (
    <div className="relative flex items-center" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.moreMenuLabel}
        className={`relative -m-1 flex touch-manipulation items-center justify-center rounded-full p-2.5 text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 ${
          pulsing ? 'control-press' : ''
        }`}
        data-pulse={pulse}
        onClick={() => {
          setOpen((previous) => !previous);
          setFresh(countFreshUnlocks());
        }}
        ref={triggerRef}
        type="button"
      >
        {/* Sized with the ♪ beside it; the padding (only partly clawed
            back by the negative margin) keeps the tap target finger-sized. */}
        <span aria-hidden="true" className="text-xl leading-none">
          ⋯
        </span>
        {/* The landing's ring, keyed per pulse so each flight replays it;
            its end (the longer of the two animations) retires both. */}
        {pulsing ? (
          <span
            aria-hidden="true"
            className="control-ring pointer-events-none absolute inset-0 rounded-full"
            key={pulse}
            onAnimationEnd={() => {
              setEnded(pulse);
            }}
          />
        ) : null}
      </button>
      {open ? (
        // Anchored to the right edge: the trigger sits at the header's end,
        // so a left-anchored panel could overflow narrow screens.
        <div
          className="absolute right-0 top-full z-10 mt-2 min-w-52 rounded-lg border border-gray-200 bg-white py-1 text-left shadow-lg focus:outline-none dark:border-gray-700 dark:bg-gray-900"
          onKeyDown={onMenuKeyDown}
          role="menu"
          // The menu container owns the arrow-key handling, so it must be a
          // focus target itself (roving focus lives on the items).
          tabIndex={-1}
        >
          {items.map((item, index) => (
            <button
              className={ROW_CLASS}
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.action();
              }}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              role="menuitem"
              type="button"
            >
              {/* Fixed-width icon column keeps the labels aligned. */}
              <span aria-hidden="true" className={ICON_CLASS}>
                {item.icon}
              </span>
              {item.label}
              {item.trailing}
            </button>
          ))}
          {/* The word list is a property of the puzzle, not of the device,
              so it sits with the actions: picking a language starts a new
              game there (the current board stays resumable from History).
              Each list is named in its own language. */}
          <label className={PICKER_ROW_CLASS}>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={ICON_CLASS}>
                ☷
              </span>
              {t.wordListLabel}
            </span>
            <select
              className="ml-6 cursor-pointer rounded border border-gray-200 bg-transparent py-0.5 pl-1 pr-6 text-sm dark:border-gray-700"
              onChange={(event) => {
                if (event.target.value !== wordList) {
                  onWordList(event.target.value);
                }
              }}
              value={wordList}
            >
              {Object.values(DICTIONARIES).map((dictionary) => (
                <option key={dictionary.id} value={dictionary.id}>
                  {dictionary.label}
                </option>
              ))}
            </select>
          </label>
          <div
            className="mx-3 my-1 border-t border-gray-200 dark:border-gray-700"
            role="separator"
          />
          {/* Sound sits with the device settings, and — like them — keeps
              the menu open: its feedback is the confirmation chime, and
              the strike appearing over the note. */}
          <button
            aria-checked={soundOn}
            className={ROW_CLASS}
            onClick={onSound}
            ref={(element) => {
              itemRefs.current[items.length] = element;
            }}
            role="menuitemcheckbox"
            type="button"
          >
            <span aria-hidden="true" className={ICON_CLASS}>
              {/* The mute strike leans against the note's flag so it reads
                  as a strike rather than part of the glyph. */}
              <span className="relative inline-block">
                ♪
                {soundOn ? null : (
                  <span className="absolute left-1/2 top-1/2 h-px w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
                )}
              </span>
            </span>
            {t.soundLabel}
          </button>
          {/* Theme cycles in place — System → Light → Dark — showing the
              state it is in, not the one it would switch to. */}
          <button
            className={ROW_CLASS}
            data-theme-preference={theme}
            onClick={() => {
              onTheme(NEXT_THEME[theme]);
            }}
            ref={(element) => {
              itemRefs.current[items.length + 1] = element;
            }}
            role="menuitem"
            type="button"
          >
            <span aria-hidden="true" className={ICON_CLASS}>
              ◐
            </span>
            {t.themeLabel}
            <span className="ml-auto pl-3 text-gray-400 dark:text-gray-500">
              {themeName}
            </span>
          </button>
          {/* A native select, so the platform's own picker carries the
              12-entry list (menus within menus travel poorly on phones).
              Each language shows in its own tongue: a reader lost in the
              wrong UI language must still recognize their way home. */}
          <label className={PICKER_ROW_CLASS}>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={ICON_CLASS}>
                Ⓐ
              </span>
              {t.uiLanguageLabel}
            </span>
            <select
              className="ml-6 cursor-pointer rounded border border-gray-200 bg-transparent py-0.5 pl-1 pr-6 text-sm dark:border-gray-700"
              onChange={(event) => {
                const value = event.target.value;
                onLocaleOverride(value === '' ? null : (value as Locale));
              }}
              value={localeOverride ?? ''}
            >
              <option value="">
                {t.uiLanguageAuto(LOCALE_NAMES[detectLocale()])}
              </option>
              {SUPPORTED_LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {LOCALE_NAMES[locale]}
                </option>
              ))}
            </select>
          </label>
          <div
            className="mx-3 my-1 border-t border-gray-200 dark:border-gray-700"
            role="separator"
          />
          {/* Help is app-scoped, so it lives here rather than on the
              game's meta row; last, where help conventionally sits. The ?
              is the Hint button's glyph: the same "unknown" vocabulary. */}
          <button
            className={ROW_CLASS}
            onClick={() => {
              setOpen(false);
              onHowToPlay();
            }}
            ref={(element) => {
              itemRefs.current[items.length + 2] = element;
            }}
            role="menuitem"
            type="button"
          >
            <span aria-hidden="true" className={ICON_CLASS}>
              ?
            </span>
            {t.howToPlayButton}
          </button>
        </div>
      ) : null}
    </div>
  );
}
