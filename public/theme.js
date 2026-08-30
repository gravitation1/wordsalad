// Stamp any saved theme override before first paint, so the loading screen
// doesn't flash the OS theme. The app keeps it in sync after.
try {
  const theme = localStorage.getItem('wordsalad:theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
    // The browser chrome's tint follows the override the same way the app
    // will keep it (themeColor.ts): the chosen scheme's theme-color meta
    // gated to every medium, the other's to none.
    for (const meta of document.querySelectorAll(
      'meta[name="theme-color"][data-scheme]',
    )) {
      meta.media = meta.dataset.scheme === theme ? 'all' : 'not all';
    }
  }
} catch {
  // No storage means no override to honor.
}
