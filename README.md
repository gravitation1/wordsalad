# Word Salad

A word game: build as many words as you can from a salad of seven letters,
every word using the highlighted required letter. Each puzzle is encoded in
the URL query string (`?letters=AZIMUTH&required=I&min=4`; `min` defaults
to 4), so a game can be shared by sharing the URL. Letter order does not
matter: the URL rewrites to its canonical alphabetized form on load, so
every ordering of the same charset is the same game — same progress, same
history entry (and shared URLs don't spell out the word they were built
from). Refreshing resumes the
current puzzle — found words are kept in localStorage — while the "New game"
button deals a fresh salad and "Restart" clears progress for the current
one. The UI follows the
browser language (11 locales; override with `?lang=`, e.g. `?lang=fr`); the
words themselves are always English.

Built with React, TypeScript, and Vite. Deployed to GitHub Pages.

## Dictionary

`public/dictionaries/en.txt` is derived from two public-domain word lists: the
ENABLE list (Enhanced North American Benchmark Lexicon, mirrored at
[norvig.com/ngrams/enable1.txt](https://norvig.com/ngrams/enable1.txt))
restricted to the common-word list
[12dicts `3of6all`](http://wordlist.aspell.net/12dicts/) (words appearing in at
least three of six dictionaries, inflections included). It is filtered to
American, alphabetic words, and a small blocklist is removed: slurs and crude
vulgarities, plus British and Commonwealth dialect words (NOWT, BAIRN,
GAZUMP) that read as gotchas rather than words to the American players the
list is tuned for. The result favors words people actually know over obscure
but technically-valid entries.

`public/dictionaries/fr.txt` is derived from
[Lexique 3.83](http://www.lexique.org) (New, Pallier, Brysbaert; CC BY-SA),
keeping alphabetic words whose film-subtitle or book frequency reaches 0.3
per million, with a blocklist of group-targeting slurs removed. Entries keep
their real accented spellings; the game folds them to A–Z for play, as
French word games traditionally do. A dictionary is selected per puzzle
with `?dict=fr` and rides along in share links.

The Spanish, Italian, Portuguese (Brazilian), Dutch, and German lists
follow the same recipe — an authority lexicon intersected with a
0.3-per-million corpus-frequency floor, minus group-targeting slurs. The
authority for es/it/pt/de is the corresponding
[LibreOffice hunspell dictionary](https://github.com/LibreOffice/dictionaries)
expanded to all inflected forms; for nl it is the
[OpenTaal word list](https://github.com/OpenTaal/opentaal-wordlist). The
frequency signal is the OpenSubtitles-derived
[FrequencyWords](https://github.com/hermitdave/FrequencyWords) counts.
Spanish keeps Ñ as a first-class board letter; German keeps true case
(nouns capitalized) and folds Ä/Ö/Ü/ß to AE/OE/UE/SS for play, with common
person and place names filtered out.

Each derived word list carries its own source license — attribution or
file-scoped copyleft, none reaching the game code — documented in
[public/dictionaries/LICENSES.md](public/dictionaries/LICENSES.md).

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

## Fixture puzzles

Because the query string encodes the whole puzzle, a rigged charset makes
end-game states reachable in seconds for manual testing:

- `?letters=ACHYQJX&required=C` — contains exactly one word, `ACHY`.
  Submitting it wins and completes the board in a single move: use it to
  check the win fanfare, the completion mark, and (via Restart) to replay
  the celebration on a loop.
- `?letters=AZIMUTH&required=I` — the pangram `AZIMUTH` alone crosses the
  75% win line (11 of 14 points), leaving `IMAM`, `MAIM`, and `MITT`
  unsolved: use it to check the "celebrate but keep playing" state —
  post-win finds, post-win hints, and finishing the board after the banner
  is already up.

A refresh after winning shows the calm restored-win state (banner, no
fanfare). The fanfare only fires on the submission that crosses the line.

## Build and deploy

`pnpm run build` runs the typecheck and lint, then emits the static site into
`dist/`. Every push to `main` deploys automatically via the GitHub Actions
workflow in `.github/workflows/deploy.yml` (the repo's Pages source must be
set to "GitHub Actions").
