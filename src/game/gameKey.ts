import type { DictionarySpec } from './dictionaries';
import { storeWordSalad } from './generation';
import type { WordSalad } from './wordSalad';

// A game's identity in storage and history: the puzzle's canonical
// encoding (LETTERS.REQUIRED.MIN) carrying its dictionary id as a "fr:"
// style prefix, so equal boards in different languages never share
// progress. English stays bare, so saves that predate multiple
// dictionaries keep working.
export function storageKey(spec: DictionarySpec, wordSalad: WordSalad): string {
  const encoded = storeWordSalad(wordSalad);
  return spec.id === 'en' ? encoded : `${spec.id}:${encoded}`;
}

export interface GameKeyParts {
  // null for English, which stays implicit everywhere (bare URLs, bare
  // keys).
  dict: string | null;
  letters: string;
  requiredCharacters: string;
  minimumLength: string;
}

// The inverse of storageKey. Null for anything that is not the shape
// storageKey produces — keys come back from storage, where anything can
// happen to them.
export function parseGameKey(gameKey: string): GameKeyParts | null {
  const colon = gameKey.indexOf(':');
  const dict = colon === -1 ? null : gameKey.slice(0, colon);
  const encoded = colon === -1 ? gameKey : gameKey.slice(colon + 1);
  const pieces = encoded.split('.');
  if (pieces.length !== 3) {
    return null;
  }
  const [letters, requiredCharacters, minimumLength] = pieces;
  if (letters === '' || !/^[1-9]\d*$/.test(minimumLength)) {
    return null;
  }
  return { dict, letters, requiredCharacters, minimumLength };
}

// The query string that boots a saved game — the app's own URL params, in
// the order its links have always carried them — with the UI-language
// override (if any) riding along. Null when the key does not parse.
export function puzzleSearchParams(
  gameKey: string,
  langParam: string | null,
): URLSearchParams | null {
  const parts = parseGameKey(gameKey);
  if (parts === null) {
    return null;
  }
  const params = new URLSearchParams();
  if (langParam !== null) {
    params.set('lang', langParam);
  }
  if (parts.dict !== null) {
    params.set('dict', parts.dict);
  }
  params.set('letters', parts.letters);
  params.set('required', parts.requiredCharacters);
  if (parts.minimumLength !== '4') {
    params.set('min', parts.minimumLength);
  }
  return params;
}
