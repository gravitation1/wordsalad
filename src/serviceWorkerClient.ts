// The page's half of the offline story (the worker's half is sw.js). The
// worker caches the app shell on install, but the word list this page
// used was fetched before the worker existed, so the page names it: the
// worker keeps it, and the game reopens without a network from then on.
// Registration waits for the load event so it never competes with the
// first paint or the word list for bandwidth. No service worker support
// (some private windows) means the game simply plays online, as before.
export function registerServiceWorker({
  dictionaryUrl,
  scriptUrl,
}: {
  dictionaryUrl: string;
  scriptUrl: string;
}): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  const { serviceWorker } = navigator;
  const register = () => {
    serviceWorker.register(scriptUrl).then(
      () => {
        void serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({
            type: 'keep-dictionary',
            url: dictionaryUrl,
          });
        });
      },
      () => {
        // Registration can be refused (storage blocked, an insecure
        // context); the game plays online without it.
      },
    );
  };
  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}
