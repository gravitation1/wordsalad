import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { CATALOGS, resolveLocale } from './i18n';
import { loadLocaleOverride } from './progressStore';

// App owns the live locale (it can change from the ⋯ menu); this boot-time
// resolution only covers what renders before or instead of it: the html
// lang attribute during load, and the dictionary-failure message.
const locale = resolveLocale(loadLocaleOverride());
document.documentElement.lang = locale;

async function loadDictionary(): Promise<string[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}dictionary.txt`);

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

void loadDictionary().then(
  (dictionary) => {
    root.render(
      <StrictMode>
        <App dictionary={dictionary} />
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
