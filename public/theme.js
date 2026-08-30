// Stamp any saved theme override before first paint, so the loading screen
// doesn't flash the OS theme. The app keeps it in sync after.
try {
  const theme = localStorage.getItem('wordsalad:theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  }
} catch {
  // No storage means no override to honor.
}
