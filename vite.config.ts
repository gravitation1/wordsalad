import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Cmd+clickable puzzle links printed under Vite's own URLs on `dev`, each a
// shortcut to a particular game state. Query strings are the app's own URL
// params: letters, required, min, score/hints (a shared challenge), lang.
const FIXTURES: { note: string; query: string }[] = [
  { note: 'A fresh random puzzle each load.', query: '' },
  {
    note: 'A fixed puzzle (14 points) — the everyday case.',
    query: '?letters=AZIMUTH&required=I',
  },
  {
    note: 'Letters only — the required letter is derived (the richest choice) and filled into the URL.',
    query: '?letters=AZIMUTH',
  },
  {
    note: 'Required letter only — a random board is generated around it.',
    query: '?required=Z',
  },
  {
    note: 'Multiple required letters — every valid word must contain them all.',
    query: '?letters=AZIMUTH&required=IM',
  },
  {
    note: 'Minimum length only — a random board with the rest defaulted.',
    query: '?min=6',
  },
  {
    note: 'Tiny puzzle (8 words, 1 pt each): win or perfect it by hand to see the win modal.',
    query: '?letters=BFHKLOU&required=K',
  },
  {
    note: 'Tiny puzzle (max 7): take three hints to trigger the lockout modal.',
    query: '?letters=DGHLNUY&required=G',
  },
  {
    note: 'Custom minimum word length (5 instead of the default 4).',
    query: '?letters=SECGNKI&required=K&min=5',
  },
  {
    note: "Arrives as a shared challenge — shows the 'score to beat' banner.",
    query: '?letters=AZIMUTH&required=I&score=8',
  },
  {
    note: 'French UI via ?lang (swap fr for de, es, it, ja, ko, nl, pt, ru, zh).',
    query: '?letters=AZIMUTH&required=I&lang=fr',
  },
];

// Prints the fixture links after the dev server reports its own URLs, by
// wrapping server.printUrls (which runs once the server is listening, so
// resolvedUrls — base path and actual port included — is populated).
function fixtureLinks(): Plugin {
  const ESC = String.fromCharCode(27);
  // Colorize only for an interactive terminal, so piped/redirected output
  // (and NO_COLOR) stays plain.
  const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
  const dim = (text: string) =>
    useColor ? `${ESC}[2m${text}${ESC}[22m` : text;
  const cyan = (text: string) =>
    useColor ? `${ESC}[36m${text}${ESC}[39m` : text;
  return {
    name: 'fixture-links',
    apply: 'serve',
    configureServer(server) {
      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        printUrls();
        const base = server.resolvedUrls?.local[0];
        if (base === undefined) {
          return;
        }
        // Call through the logger so `info` keeps its `this`.
        const { logger } = server.config;
        logger.info(`  ${dim('➜')}  ${dim('Fixtures:')}`);
        for (const { note, query } of FIXTURES) {
          logger.info(`     ${cyan(`${base}${query}`)}`);
          logger.info(`       ${dim(note)}`);
        }
      };
    },
  };
}

// The deployed page may talk to exactly one origin: its own. Every fetch,
// script, style, image, font, frame and worker is confined to 'self' by the
// browser itself, so no dependency or future edit can quietly reach a third
// party — the guarantee holds by construction, not by review. Inline style
// attributes (React's style props) are the one relaxation; scripts get none
// (the theme stamp is an external file for exactly this reason). Build-only:
// the dev server injects its own inline HMR preamble, which this would
// block. Navigation is not a CSP concern — outbound links stay allowed and
// carry nothing (no-referrer, above in index.html).
//
// The one worker is the service worker (src/sw.js), same-origin like all
// the rest. Note the limit of this policy's reach: a worker's CSP comes
// from its own response headers, not the page's, so inside sw.js the
// same-origin rule holds by that file's own construction — it declines to
// handle any cross-origin request, and has no dependencies to drift.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "connect-src 'self'",
  "font-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: CONTENT_SECURITY_POLICY,
          },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

// Everything the service worker keeps as the app shell, out of public/:
// all of it but the word lists, which are cached as they are played.
function publicShellFiles(publicDir: string, dir = publicDir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'dictionaries' && dir === publicDir
        ? []
        : publicShellFiles(publicDir, path);
    }
    return [relative(publicDir, path).split('\\').join('/')];
  });
}

const APP_NAME = 'Word Salad';
const APP_DESCRIPTION =
  'A word game: build as many words as you can from a salad of seven letters.';
// The splash and chrome colors of the installed app, before the page's own
// theme-color metas take over; the light page background (index.html).
const APP_COLOR = '#ffffff';

// The installable, offline-capable app: the web app manifest and the
// service worker (src/sw.js), both emitted by the build so they share
// this config's base path with everything else. The worker gets the
// shell's files stamped in, plus a hash of all their contents — any
// change to the shell, even one that leaves every file name intact, makes
// a new worker, and the new worker caches the new shell (see sw.js).
// A post plugin, so the final index.html is in the bundle by the time
// the hash is taken.
function progressiveWebApp(): Plugin {
  let base = '/';
  let publicDir = 'public';
  return {
    name: 'progressive-web-app',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base;
      publicDir = config.publicDir;
    },
    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: { rel: 'manifest', href: `${base}manifest.webmanifest` },
          injectTo: 'head',
        },
      ];
    },
    generateBundle(_options, bundle) {
      const html = Object.hasOwn(bundle, 'index.html')
        ? bundle['index.html']
        : undefined;
      if (html?.type !== 'asset') {
        throw new Error('index.html is not in the bundle yet');
      }
      const manifest = {
        name: APP_NAME,
        short_name: APP_NAME,
        description: APP_DESCRIPTION,
        // A launch is a return to the game, not a request for a new one:
        // ?resume lands on the puzzle last played (src/resume.ts).
        id: base,
        start_url: `${base}?resume`,
        scope: base,
        display: 'standalone',
        background_color: APP_COLOR,
        theme_color: APP_COLOR,
        lang: 'en',
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      };
      const manifestSource = JSON.stringify(manifest, null, 2);
      const template = readFileSync('src/sw.js', 'utf8');

      const hash = createHash('sha256');
      // The page itself is cached under the base URL: one document serves
      // every puzzle (the puzzle lives in the query string).
      const shell: { url: string; hashed: boolean }[] = [
        { url: base, hashed: false },
      ];
      hash.update(html.source);
      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName === 'index.html') {
          continue;
        }
        // Vite's own outputs carry a content hash in their names; nothing
        // else does.
        shell.push({
          url: `${base}${fileName}`,
          hashed: fileName.startsWith('assets/'),
        });
        hash.update(fileName);
        hash.update(output.type === 'chunk' ? output.code : output.source);
      }
      for (const file of publicShellFiles(publicDir)) {
        shell.push({ url: `${base}${file}`, hashed: false });
        hash.update(file);
        hash.update(readFileSync(join(publicDir, file)));
      }
      shell.push({ url: `${base}manifest.webmanifest`, hashed: false });
      hash.update(manifestSource);
      hash.update(template);
      const version = hash.digest('hex').slice(0, 12);

      const stamps: Record<string, string> = {
        "'__BASE__'": JSON.stringify(base),
        "'__VERSION__'": JSON.stringify(version),
        "'__SHELL__'": JSON.stringify(JSON.stringify(shell)),
      };
      let worker = template;
      for (const [placeholder, value] of Object.entries(stamps)) {
        if (!worker.includes(placeholder)) {
          throw new Error(`src/sw.js lacks the ${placeholder} placeholder`);
        }
        worker = worker.replace(placeholder, value);
      }

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: manifestSource,
      });
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker });
    },
  };
}

export default defineConfig({
  base: '/wordsalad/',
  plugins: [
    react(),
    tailwindcss(),
    fixtureLinks(),
    contentSecurityPolicy(),
    progressiveWebApp(),
  ],
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
