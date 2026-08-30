import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// The app links out to exactly one family of hosts — Wiktionary, for
// definitions — and requests nothing from anyone. This scans everything that
// ships (source, the HTML shell, public assets, the Vite config) for URLs, so
// a stray analytics tag, CDN font, or new dictionary host fails CI rather
// than reaching players. Tests are excluded: they may name hosts to assert
// against.
function shippedFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === '__tests__' || name === 'dictionaries') {
      return [];
    }
    return statSync(path).isDirectory() ? shippedFiles(path) : [path];
  });
}

const FILES = [
  ...shippedFiles('src'),
  ...shippedFiles('public'),
  'index.html',
  'vite.config.ts',
];
const URL_PATTERN = /https?:\/\/[^\s'"`)<>]+/g;
// The SVG namespace identifier is spelled as a URL but is never fetched.
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

describe('external hosts', () => {
  it('references no host other than Wiktionary', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const url of readFileSync(file, 'utf8').match(URL_PATTERN) ?? []) {
        if (url === SVG_NAMESPACE) {
          continue;
        }
        if (!/^https:\/\/(\$\{lang\}|[a-z]{2})\.wiktionary\.org\//.test(url)) {
          offenders.push(`${file}: ${url}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('serves the service worker from its own origin only', () => {
    const worker = readFileSync('src/sw.js', 'utf8');
    // Same-origin by construction: every request from another origin is
    // left to the browser before any handler runs.
    expect(worker).toContain('url.origin !== self.location.origin');
    expect(worker).not.toMatch(/importScripts/);
  });

  it('has no inline scripts for the CSP to make exceptions for', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/);
    expect(html).toContain('<meta name="referrer" content="no-referrer" />');
  });
});
