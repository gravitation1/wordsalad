import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { dictionaryById, dictionaryFile } from './game/dictionaries';
import { CATALOGS, resolveLocale } from './i18n';
import {
  loadLastGameKey,
  loadLocaleOverride,
  loadSummaries,
} from './progressStore';
import { resumedSearch } from './resume';
import { registerServiceWorker } from './serviceWorkerClient';

// App owns the live locale (it can change from the ⋯ menu); this boot-time
// resolution only covers what renders before or instead of it: the html
// lang attribute during load, and the dictionary-failure message.
const locale = resolveLocale(loadLocaleOverride());
document.documentElement.lang = locale;

// The installed app launches at ?resume, which stands for the last game
// played: rewrite it to that game's own URL before anything reads the
// query string, so the boot below is the ordinary one (and the dictionary
// it picks is that game's).
const resumed = resumedSearch(
  window.location.search,
  loadLastGameKey(),
  loadSummaries(),
);
if (resumed !== null) {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${resumed}`,
  );
}

// The dictionary is a property of the puzzle, carried by ?dict= (absent
// means English); an unknown id falls back to the default rather than
// wedging the app on a typo.
const spec = dictionaryById(
  new URLSearchParams(window.location.search).get('dict'),
);
const dictionaryUrl = `${import.meta.env.BASE_URL}${dictionaryFile(spec)}`;

async function loadDictionary(): Promise<string[]> {
  const response = await fetch(dictionaryUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();
  return text.split('\n').filter((word) => word.length > 0);
}

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Missing the root element!');
}

const root = createRoot(rootElement);

// Production only: the dev server has no worker to serve, and a worker
// caching dev builds would hide every edit behind a stale shell.
if (import.meta.env.PROD) {
  registerServiceWorker({
    dictionaryUrl,
    scriptUrl: `${import.meta.env.BASE_URL}sw.js`,
  });
}

void loadDictionary().then(
  (dictionary) => {
    root.render(
      <StrictMode>
        <App dictionary={dictionary} spec={spec} />
      </StrictMode>,
    );
  },
  (error: unknown) => {
    root.render(
      <p className="p-4 font-bold text-red-600 dark:text-red-400" role="alert">
        {CATALOGS[locale].dictionaryLoadFailed(
          error instanceof Error ? error.message : String(error),
        )}
      </p>,
    );
  },
);
