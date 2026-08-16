import type { KeyboardEvent, RefObject } from 'react';
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

// The header's ⋯ menu: the home for everything that is not the play loop —
// meta actions (the custom-game builder, history) and, below a divider, the
// device settings (theme, UI language). Sits at the header's edge so it
// cannot be misread as belonging to a neighboring control. Keyboard-
// navigable (arrows/Home/End/Esc), closes on outside click. The settings
// rows deliberately keep the menu open: their feedback is the app restyling
// or rewording itself in place.
interface OverflowMenuProps {
  localeOverride: Locale | null;
  onCustomGame: () => void;
  onHistory: () => void;
  onLocaleOverride: (locale: Locale | null) => void;
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
  onCustomGame,
  onHistory,
  onLocaleOverride,
  onTheme,
  onWordList,
  theme,
  wordList,
  triggerRef,
}: OverflowMenuProps) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Glyph icons in the same vocabulary as the meta row's ↻/↗/⟲: ✎ for
  // authoring a puzzle, ↺ for looking back.
  const items = [
    { action: onCustomGame, icon: '✎', label: t.customGameButton },
    { action: onHistory, icon: '↺', label: t.historyButton },
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
    // The buttons cycle with the arrows; the select stays out of the ring.
    const count = items.length + 1;
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
        className="-m-1 flex touch-manipulation items-center justify-center p-2.5 text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
        onClick={() => {
          setOpen((previous) => !previous);
        }}
        ref={triggerRef}
        type="button"
      >
        {/* Sized with the ♪ beside it; the padding (only partly clawed
            back by the negative margin) keeps the tap target finger-sized. */}
        <span aria-hidden="true" className="text-xl leading-none">
          ⋯
        </span>
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
          {/* Theme cycles in place — System → Light → Dark — showing the
              state it is in, not the one it would switch to. */}
          <button
            className={ROW_CLASS}
            data-theme-preference={theme}
            onClick={() => {
              onTheme(NEXT_THEME[theme]);
            }}
            ref={(element) => {
              itemRefs.current[items.length] = element;
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
        </div>
      ) : null}
    </div>
  );
}
