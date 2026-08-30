// The service worker: keeps the game playable with no network at all.
//
// The app shell — the HTML, the script and stylesheet, the boot script, the
// icons and the manifest — is cached in full when a version of this worker
// installs, and served from that cache ever after: every navigation into
// the app, including a tab the browser unloaded and is now restoring,
// answers from the cache whether or not the network is reachable. A new
// deploy produces a new worker (the build stamps a hash of everything in
// the shell into it), which caches the new shell completely before taking
// over — the swap is atomic, so no player is ever served a page whose
// assets are missing. The visit that discovers a deploy still plays the
// old build; the next navigation plays the new one.
//
// Word lists are large and only one is played at a time, so they are
// cached as they are used (the page names the one it loaded, see
// serviceWorkerClient.ts) and refreshed in the background whenever the
// network allows — a curation change lands one visit late, exactly like a
// deploy. Nothing here ever fetches from another origin: cross-origin
// requests are not handled at all, and the page's CSP does not reach into
// a worker, so this file is the whole of its policy.
//
// To retire the worker some day, ship one that unregisters itself and
// clears its caches — a missing sw.js only unregisters after the
// browser's next update check.

// Stamped by the build (see vite.config.ts): the site base, a hash of the
// shell, and the shell's files — each marked whether its name carries a
// content hash (then any cached copy is the right copy) or not (then the
// fetch must bypass the HTTP cache, or a copy up to ten minutes stale
// could be captured as the current shell).
const BASE = '__BASE__';
const VERSION = '__VERSION__';
const SHELL = JSON.parse('__SHELL__');

// A cached file is the file, whatever request headers the browser sent
// for it: the Cache API otherwise honors a response's Vary header, and a
// host that varies on Origin (as Vite's preview server does) would then
// refuse a module script's request — sent with an Origin header — the
// copy that the worker's own fetch, sent without one, put away.
const MATCH_OPTIONS = { ignoreVary: true };

const SHELL_CACHE_PREFIX = 'wordsalad-shell-';
const SHELL_CACHE = `${SHELL_CACHE_PREFIX}${VERSION}`;
const DICTIONARY_CACHE = 'wordsalad-dictionaries';
const DICTIONARY_PATH = `${BASE}dictionaries/`;

async function cacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(
    SHELL.map(async ({ url, hashed }) => {
      const response = await fetch(
        new Request(url, { cache: hashed ? 'default' : 'reload' }),
      );
      if (!response.ok) {
        throw new Error(`${url}: HTTP ${response.status}`);
      }
      await cache.put(url, response);
    }),
  );
}

async function dropOldShells() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(SHELL_CACHE_PREFIX))
      .filter((name) => name !== SHELL_CACHE)
      .map((name) => caches.delete(name)),
  );
}

// The shell page, whatever the navigation's query string: the puzzle lives
// in the URL and the page reads it, so one cached document serves every
// puzzle. The network is the fallback only for a cache that was evicted.
async function shellPage(request) {
  const cached = await caches.match(BASE, MATCH_OPTIONS);
  return cached ?? fetch(request);
}

async function cacheFirst(request) {
  const cached = await caches.match(request, MATCH_OPTIONS);
  return cached ?? fetch(request);
}

// Answer from the cache at once and refresh it behind the answer; a word
// list never seen before comes from the network and is kept.
async function staleWhileRevalidate(event) {
  const cache = await caches.open(DICTIONARY_CACHE);
  const cached = await cache.match(event.request, MATCH_OPTIONS);
  const refresh = fetch(event.request).then(async (response) => {
    if (response.ok) {
      await cache.put(event.request, response.clone());
    }
    return response;
  });
  if (cached === undefined) {
    return refresh;
  }
  event.waitUntil(
    refresh.catch(() => {
      // Offline: the cached copy stands.
    }),
  );
  return cached;
}

async function keepDictionary(url) {
  const cache = await caches.open(DICTIONARY_CACHE);
  if ((await cache.match(url, MATCH_OPTIONS)) !== undefined) {
    return;
  }
  const response = await fetch(url);
  if (response.ok) {
    await cache.put(url, response);
  }
}

self.addEventListener('install', (event) => {
  // Take over on the next navigation rather than after every old tab has
  // closed: the page loads everything it needs up front, so a running
  // page never comes back for an asset the new shell cache lacks.
  event.waitUntil(cacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(dropOldShells().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) {
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(shellPage(request));
  } else if (url.pathname.startsWith(DICTIONARY_PATH)) {
    event.respondWith(staleWhileRevalidate(event));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener('message', (event) => {
  const { data } = event;
  if (
    typeof data === 'object' &&
    data !== null &&
    data.type === 'keep-dictionary' &&
    typeof data.url === 'string' &&
    new URL(data.url, self.location.href).pathname.startsWith(DICTIONARY_PATH)
  ) {
    event.waitUntil(keepDictionary(data.url));
  }
});
