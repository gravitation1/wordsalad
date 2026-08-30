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
  "worker-src 'none'",
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

export default defineConfig({
  base: '/wordsalad/',
  plugins: [react(), tailwindcss(), fixtureLinks(), contentSecurityPolicy()],
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
