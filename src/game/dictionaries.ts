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

// Strip combining marks after NFD decomposition: É -> E, Ç -> C. Input is
// NFC-normalized first so decomposed text (A + combining umlaut) meets the
// precomposed replacements the folds run beforehand.
function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Wiktionary is the definition host for every non-English list: the only
// major dictionary family with predictable URLs for every inflected
// surface form. When the UI language matches the word list, the reader's
// own edition serves; otherwise the English edition's language section, so
// a learner reads definitions in the language they chose for the UI.
function wiktionaryUrl(
  lang: string,
  anchor: string,
  toEntry: (word: string) => string = (word) => word.toLocaleLowerCase(lang),
): DictionarySpec['definitionUrl'] {
  return (word, uiLocale) => {
    const form = encodeURIComponent(toEntry(word));
    return uiLocale === lang
      ? `https://${lang}.wiktionary.org/wiki/${form}`
      : `https://en.wiktionary.org/wiki/${form}#${anchor}`;
  };
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
// keeps real spellings.
const FR_DICTIONARY: DictionarySpec = {
  id: 'fr',
  label: 'Français',
  lang: 'fr',
  letters: LATIN_LETTERS,
  vowels: LATIN_VOWELS,
  fold: (text) =>
    stripDiacritics(
      text
        .normalize('NFC')
        .toUpperCase()
        .replace(/Œ/g, 'OE')
        .replace(/Æ/g, 'AE'),
    ),
  definitionUrl: wiktionaryUrl('fr', 'French'),
};

// Spanish folds its accents (Á→A, Ü→U) but keeps Ñ: not a decorated N but
// the alphabet's own letter — año and ano must never collide. The explicit
// map (rather than a blanket strip) is what protects it.
const ES_DICTIONARY: DictionarySpec = {
  id: 'es',
  label: 'Español',
  lang: 'es',
  letters: `${LATIN_LETTERS}Ñ`,
  vowels: LATIN_VOWELS,
  fold: (text) =>
    text
      .normalize('NFC')
      .toUpperCase()
      .replace(/Á/g, 'A')
      .replace(/É/g, 'E')
      .replace(/Í/g, 'I')
      .replace(/Ó/g, 'O')
      .replace(/Ú/g, 'U')
      .replace(/Ü/g, 'U'),
  definitionUrl: wiktionaryUrl('es', 'Spanish'),
};

// Italian folds its accents (È→E, À→A), as its own word games do.
const IT_DICTIONARY: DictionarySpec = {
  id: 'it',
  label: 'Italiano',
  lang: 'it',
  letters: LATIN_LETTERS,
  vowels: LATIN_VOWELS,
  fold: (text) => stripDiacritics(text.normalize('NFC').toUpperCase()),
  definitionUrl: wiktionaryUrl('it', 'Italian'),
};

// Dutch is nearly bare A–Z already; the fold clears loanword accents and
// tremas (café, reëel). IJ is typed as I then J, so nothing else needed.
const NL_DICTIONARY: DictionarySpec = {
  id: 'nl',
  label: 'Nederlands',
  lang: 'nl',
  letters: LATIN_LETTERS,
  vowels: LATIN_VOWELS,
  fold: (text) => stripDiacritics(text.normalize('NFC').toUpperCase()),
  definitionUrl: wiktionaryUrl('nl', 'Dutch'),
};

// Portuguese folds accents and the cedilla (Ã→A, Ç→C).
const PT_DICTIONARY: DictionarySpec = {
  id: 'pt',
  label: 'Português',
  lang: 'pt',
  letters: LATIN_LETTERS,
  vowels: LATIN_VOWELS,
  fold: (text) => stripDiacritics(text.normalize('NFC').toUpperCase()),
  definitionUrl: wiktionaryUrl('pt', 'Portuguese'),
};

// German expands rather than strips: Ä/Ö/Ü become AE/OE/UE and ß becomes
// SS — the crossword-and-passport transcription — so boards stay A–Z.
// Its surface forms keep true case (Haus, laufen): German capitalization
// is meaningful, and a noun's Wiktionary entry lives at its capitalized
// title, so the entry is the word exactly as stored. toUpperCase alone
// already turns ß into SS.
const DE_DICTIONARY: DictionarySpec = {
  id: 'de',
  label: 'Deutsch',
  lang: 'de',
  letters: LATIN_LETTERS,
  vowels: LATIN_VOWELS,
  fold: (text) =>
    stripDiacritics(
      text
        .normalize('NFC')
        .toUpperCase()
        .replace(/Ä/g, 'AE')
        .replace(/Ö/g, 'OE')
        .replace(/Ü/g, 'UE'),
    ),
  definitionUrl: wiktionaryUrl('de', 'German', (word) => word),
};

// Registered dictionaries, keyed by their ?dict= id — English (the
// default) first, the rest alphabetical.
export const DICTIONARIES: Record<string, DictionarySpec> = {
  en: EN_DICTIONARY,
  de: DE_DICTIONARY,
  es: ES_DICTIONARY,
  fr: FR_DICTIONARY,
  it: IT_DICTIONARY,
  nl: NL_DICTIONARY,
  pt: PT_DICTIONARY,
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
