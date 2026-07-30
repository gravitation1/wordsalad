// A playable dictionary is a word list plus the orthographic contract that
// makes it playable: which letters exist on a board, how surface spellings
// relate to what the player types (folding), and where a found word's
// definition lives. The engine plays entirely in folded "key" space; the
// word list keeps real orthography so every surface form can be shown and
// defined individually.
//
// Folding follows each language's own word-game tradition (French tile
// games play É as E and Œ as O+E), never a blanket strip: a letter the
// culture counts as its own alphabet member (Spanish Ñ) belongs in
// `letters` instead.
export interface DictionarySpec {
  // Identity in ?dict= URLs, storage keys, and the word-list file name.
  id: string;
  // The list's language in its own words, for the word-list picker — a
  // reader must recognize their language regardless of the UI language.
  label: string;
  // BCP-47 tag driving collation and lowercasing for this word list.
  lang: string;
  // Every letter a board or play key may use, uppercase.
  letters: string;
  // The subset of `letters` treated as vowels when sampling random boards.
  vowels: string;
  // Surface spelling (any case) -> uppercase play key drawn from `letters`.
  fold: (text: string) => string;
  // Where a found surface form's definition lives, given the UI locale.
  definitionUrl: (word: string, uiLocale: string) => string;
}

const LATIN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LATIN_VOWELS = 'AEIOU';

// Strip combining marks after NFD decomposition: É -> E, Ç -> C.
function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const EN_DICTIONARY: DictionarySpec = {
  id: 'en',
  label: 'English',
  lang: 'en',
  letters: LATIN_LETTERS,
  vowels: LATIN_VOWELS,
  fold: (text) => text.toUpperCase(),
  definitionUrl: (word) => `https://www.merriam-webster.com/dictionary/${word}`,
};

// French folds as the French game tradition does — accents strip, ligatures
// expand to their letter pairs — so boards stay A–Z while the word list
// keeps real spellings. Definitions point at Wiktionary: the only major
// French dictionary with predictable URLs for every surface form, inflected
// forms included. A French UI reads the Wiktionnaire; any other UI reads
// the English Wiktionary's French section, so a learner gets definitions in
// the language they chose to play in.
const FR_DICTIONARY: DictionarySpec = {
  id: 'fr',
  label: 'Français',
  lang: 'fr',
  letters: LATIN_LETTERS,
  vowels: LATIN_VOWELS,
  fold: (text) =>
    stripDiacritics(text.toUpperCase().replace(/Œ/g, 'OE').replace(/Æ/g, 'AE')),
  definitionUrl: (word, uiLocale) => {
    const form = encodeURIComponent(word.toLocaleLowerCase('fr'));
    return uiLocale === 'fr'
      ? `https://fr.wiktionary.org/wiki/${form}`
      : `https://en.wiktionary.org/wiki/${form}#French`;
  },
};

// Registered dictionaries, keyed by their ?dict= id. Tier-1 additions
// (es/it/pt/nl/de) slot in here; es will extend `letters` with Ñ.
export const DICTIONARIES: Record<string, DictionarySpec> = {
  en: EN_DICTIONARY,
  fr: FR_DICTIONARY,
};

export const DEFAULT_DICTIONARY = EN_DICTIONARY;

export function dictionaryById(id: string | null): DictionarySpec {
  return id !== null && Object.hasOwn(DICTIONARIES, id)
    ? DICTIONARIES[id]
    : DEFAULT_DICTIONARY;
}

// The public path of a dictionary's word list, relative to the site base.
export function dictionaryFile(spec: DictionarySpec): string {
  return `dictionaries/${spec.id}.txt`;
}

// Matches a whole string of the dictionary's letters (used to validate
// URL-supplied charsets and required letters).
export function alphabetPattern(spec: DictionarySpec): RegExp {
  return new RegExp(`^[${spec.letters}]+$`);
}
