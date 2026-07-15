# Word Salad

A word game: build as many words as you can from a salad of seven letters,
every word using the highlighted required letter. Each puzzle is encoded in
the URL hash (`#CHARACTERS.REQUIRED_CHARACTER.MINIMUM_LENGTH`), so a game can
be shared by sharing the URL. Refreshing resumes the current puzzle — found
words are kept in localStorage — while the "New game" button deals a fresh
salad and "Restart" clears progress for the current one. The UI follows the
browser language (11 locales; override with `?lang=`, e.g. `?lang=fr`); the
words themselves are always English.

Built with React, TypeScript, and Vite. Deployed to GitHub Pages.

## Dictionary

`public/dictionary.txt` is a subset of the public-domain ENABLE word list
(Enhanced North American Benchmark Lexicon, mirrored at
[norvig.com/ngrams/enable1.txt](https://norvig.com/ngrams/enable1.txt)),
filtered to alphabetic words with British-only spellings removed.

## License

[MIT](LICENSE)

## Development

```sh
pnpm install
pnpm run dev
```

## Checks

```sh
pnpm run typecheck
pnpm run lint
pnpm run format
pnpm test
```

## Build and deploy

`pnpm run build` runs the typecheck and lint, then emits the static site into
`dist/`. Every push to `main` deploys automatically via the GitHub Actions
workflow in `.github/workflows/deploy.yml` (the repo's Pages source must be
set to "GitHub Actions").
