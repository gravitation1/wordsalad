import type { DictionarySpec } from './dictionaries';

// The word list is public in outline: every word owns a slot, alphabetized,
// and found neighbors bound each run of unfound slots. Whatever that
// ordering alone forces about an unfound word's play key — between CACAO
// and CALL, every word starts with CA — is information a careful player
// could derive with pencil and paper, so the list may show it outright.
//
// The derivation is deliberately dictionary-blind: it quantifies over
// arbitrary strings of board letters, never the answer list. Deriving from
// the answers would leak what was never derivable — in a one-word gap, the
// common prefix of the remaining answers is the entire word.
//
// Soundness rests on the display order and the derivation agreeing letter
// for letter, so the list orders by play key (the letters actually typed),
// with the dictionary's collation only breaking ties among equal keys
// (côte files by COTE, beside cote). For most languages this is exactly
// what collating the surface forms produced anyway; German is the
// exception — its collation files Bär as if it were Bar, while the player
// types BAER — and there key order is the one the game can stand behind.

// The board's letters in the dictionary's own order — es files Ñ between
// N and O, where its code point would land it after Z.
export function rankedLetters(
  letters: Iterable<string>,
  lang: string,
): readonly string[] {
  const collator = new Intl.Collator(lang);
  return Array.from(letters).sort((a, b) => collator.compare(a, b));
}

// Lexicographic comparison of play keys under a ranked alphabet. A letter
// the alphabet does not know sorts first — it cannot occur in a valid
// word's key, so the choice never matters.
function keyComparator(
  alphabet: readonly string[],
): (a: string, b: string) => number {
  const rank = new Map(alphabet.map((letter, index) => [letter, index]));
  return (a, b) => {
    const length = Math.min(a.length, b.length);
    for (let index = 0; index < length; index++) {
      const difference =
        (rank.get(a[index]) ?? -1) - (rank.get(b[index]) ?? -1);
      if (difference !== 0) {
        return difference;
      }
    }
    return a.length - b.length;
  };
}

// The word list's display order: play keys first, the dictionary's own
// collation as tiebreak among equal keys.
export function wordListOrder(
  spec: DictionarySpec,
): (a: string, b: string) => number {
  const collator = new Intl.Collator(spec.lang);
  const compareKeys = keyComparator(rankedLetters(spec.letters, spec.lang));
  // Sorting folds each word O(n log n) times without a cache.
  const keys = new Map<string, string>();
  const keyOf = (word: string): string => {
    let key = keys.get(word);
    if (key === undefined) {
      key = spec.fold(word);
      keys.set(word, key);
    }
    return key;
  };
  return (a, b) => compareKeys(keyOf(a), keyOf(b)) || collator.compare(a, b);
}

export interface GapBounds {
  // Board letters in the dictionary's order (rankedLetters).
  alphabet: readonly string[];
  // Play key of the found word just below / above the gap; null at the
  // list's ends.
  lower: string | null;
  upper: string | null;
  minimumLength: number;
}

// Whether any string of board letters could occupy the gap with this
// prefix: start with it, sort strictly between the bounds, and reach the
// minimum length. Exact, by construction: build the smallest string that
// starts with the prefix and clears `lower`, and ask whether that one
// witness also fits under `upper` — joint constraints, one construction.
export function gapAdmits(
  { alphabet, lower, upper, minimumLength }: GapBounds,
  prefix: string,
): boolean {
  if (alphabet.length === 0) {
    return false;
  }
  const compare = keyComparator(alphabet);
  const first = alphabet[0];
  let least: string;
  if (lower === null || compare(prefix, lower) > 0) {
    // Everything with this prefix already clears the bound; the least,
    // padded out to the minimum length, is prefix + smallest letters.
    least = prefix;
  } else if (lower.startsWith(prefix)) {
    // The prefix rides along `lower`: the only way past is to extend
    // `lower` itself, and its immediate successor appends the smallest
    // letter.
    least = lower + first;
  } else {
    return false; // sorts below `lower` at some letter; no extension recovers
  }
  if (least.length < minimumLength) {
    least = least + first.repeat(minimumLength - least.length);
  }
  return upper === null || compare(least, upper) < 0;
}

// The longest prefix shared by every string of board letters that could
// occupy the gap — sort strictly between the bounds at the minimum length
// or longer. Greedy: grow one letter at a time while exactly one next
// letter remains possible. This subsumes the bounds' common prefix and
// also catches what the board forces on its own (after the last found
// word WOW, on a board whose last letter is W, everything starts with W).
export function forcedPrefix(bounds: GapBounds): string {
  const { alphabet, lower, upper, minimumLength } = bounds;
  if (alphabet.length === 0) {
    return '';
  }
  const compare = keyComparator(alphabet);

  // Soundness, by induction: every possible gap string extends the prefix
  // built so far (it cannot equal it — the guard below stopped first), so
  // its next letter is admitted; when only one letter is, they all share
  // it. Termination: the prefix can shadow `lower` for at most its length,
  // after which each appended letter came with an in-gap witness at or
  // above the prefix itself, and the guard fires once the minimum length
  // is reached.
  let prefix = '';
  for (;;) {
    // The prefix itself may be a complete in-gap word; extending past it
    // would claim letters that word does not have.
    if (
      prefix.length >= minimumLength &&
      (lower === null || compare(prefix, lower) > 0) &&
      (upper === null || compare(prefix, upper) < 0)
    ) {
      break;
    }
    const nextLetters = alphabet.filter((letter) =>
      gapAdmits(bounds, prefix + letter),
    );
    if (nextLetters.length !== 1) {
      break;
    }
    prefix += nextLetters[0];
  }
  return prefix;
}

// One run of unfound slots and the found keys that bound it.
export interface WordGap {
  lower: string | null;
  upper: string | null;
  // The run's slot range, [start, end), in display order.
  start: number;
  end: number;
}

// The gaps between finds, in list order: everything the derivations need
// to ask "could a new word sit here?".
export function wordGaps(options: {
  // All of the puzzle's words in display order (wordListOrder).
  words: readonly string[];
  isFound: (word: string) => boolean;
  keyOf: (word: string) => string;
}): readonly WordGap[] {
  const { words, isFound, keyOf } = options;
  const gaps: WordGap[] = [];
  let start = 0;
  while (start < words.length) {
    if (isFound(words[start])) {
      start += 1;
      continue;
    }
    let end = start;
    while (end < words.length && !isFound(words[end])) {
      end += 1;
    }
    gaps.push({
      lower: start > 0 ? keyOf(words[start - 1]) : null,
      upper: end < words.length ? keyOf(words[end]) : null,
      start,
      end,
    });
    start = end;
  }
  return gaps;
}

// Forced prefixes for every slot of the alphabetized word list, in display
// order: the empty string for found slots and for gaps that force nothing.
// Each run of unfound slots shares its gap's one prefix — the words within
// a gap tell each other apart only once found, which splits the gap and
// tightens its neighbors.
export function slotPrefixes(options: {
  // All of the puzzle's words in display order (wordListOrder).
  words: readonly string[];
  isFound: (word: string) => boolean;
  keyOf: (word: string) => string;
  alphabet: readonly string[];
  minimumLength: number;
}): readonly string[] {
  const { words, alphabet, minimumLength } = options;
  const prefixes = words.map(() => '');
  for (const gap of wordGaps(options)) {
    const prefix = forcedPrefix({
      alphabet,
      lower: gap.lower,
      upper: gap.upper,
      minimumLength,
    });
    for (let index = gap.start; index < gap.end; index++) {
      prefixes[index] = prefix;
    }
  }
  return prefixes;
}

// The rack's soft dimming: which board letters could still extend the
// typed key into a new (unfound) word. A letter is live while ANY gap
// admits it — the same dictionary-blind test the ghost prefixes use,
// aggregated across the whole list, so a dim tile never says more than
// the list itself proves. Deriving from the remaining answers instead
// would walk the player through the endgame letter by letter.
export function liveNextLetters(options: {
  gaps: readonly { lower: string | null; upper: string | null }[];
  alphabet: readonly string[];
  minimumLength: number;
  // The typed play key so far; empty when choosing the first letter.
  prefix: string;
}): ReadonlySet<string> {
  const { gaps, alphabet, minimumLength, prefix } = options;
  const live = new Set<string>();
  for (const letter of alphabet) {
    const next = prefix + letter;
    if (
      gaps.some((gap) =>
        gapAdmits(
          { alphabet, lower: gap.lower, upper: gap.upper, minimumLength },
          next,
        ),
      )
    ) {
      live.add(letter);
    }
  }
  return live;
}
