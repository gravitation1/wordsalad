import type { ThemePreference } from './progressStore';

// The browser chrome's tint — the status bar of the installed app, the
// tab bar in mobile Safari — follows the page background. index.html
// carries one <meta name="theme-color"> per color scheme, each gated by a
// prefers-color-scheme media query, which covers "follow the system" with
// no script at all. A manual override can't be expressed as a media query,
// so it is applied by regating the pair: the chosen scheme's meta to every
// medium, the other's to none. (theme.js does the same before first paint;
// the colors themselves live only in index.html.)
export function syncThemeColor(theme: ThemePreference): void {
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"][data-scheme]',
  )) {
    const scheme = meta.dataset.scheme;
    meta.media =
      theme === 'system'
        ? `(prefers-color-scheme: ${scheme})`
        : scheme === theme
          ? 'all'
          : 'not all';
  }
}
