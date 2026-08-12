// Every letter tile in the game — the salad buttons, the victory banner,
// the confetti, the history rows, the feedback line, the found-word drum —
// wears one of these color recipes, so a theme tweak lands everywhere at
// once.
export const TILE_FACE = {
  // The required letter (and victory punctuation): filled accent.
  accent: 'bg-accent text-white',
  // The perfect-score gilding, and its solid cousin for punctuation.
  gold: 'border border-amber-400 bg-amber-300 text-amber-900',
  goldSolid: 'bg-amber-400 text-white',
  // A derived-prefix letter on an unfound row: known but not yet played,
  // so an outline only — quieter than every filled face, and monochrome
  // even for required letters, so found rows keep their color.
  ghost:
    'border border-dashed border-gray-300 text-gray-400 dark:border-gray-700 dark:text-gray-500',
  // Hinted words are spent: the progress bar's lost gray.
  mutedAccent: 'bg-gray-400 text-white dark:bg-gray-600',
  mutedPlain:
    'border border-gray-300 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
  // A regular letter: bordered white card.
  plain:
    'border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
} as const;

// Where the typed word last sat on screen (viewport coordinates), written
// by the input on every edit and read by the drum to fly a found word from
// that spot into its slot.
export interface WordOrigin {
  height: number;
  left: number;
  top: number;
}

interface MiniTileOptions {
  // Squeezes long words into the drum's fixed rows and narrow screens.
  compact?: boolean;
  // The drum's derived-prefix letters on unfound rows.
  ghost?: boolean;
  // The drum's hinted state.
  muted?: boolean;
}

// The game's letters at pocket size, shared by the history rows, the
// found-word drum, and the feedback line.
export function miniTileClass(
  letter: string,
  requiredCharacters: string,
  { compact = false, ghost = false, muted = false }: MiniTileOptions = {},
): string {
  const isRequired = requiredCharacters.includes(letter);
  const face = ghost
    ? TILE_FACE.ghost
    : muted
      ? isRequired
        ? TILE_FACE.mutedAccent
        : TILE_FACE.mutedPlain
      : isRequired
        ? TILE_FACE.accent
        : TILE_FACE.plain;
  const size = compact ? 'h-4 w-4 text-[10px]' : 'h-5 w-5 text-[11px]';
  return `flex items-center justify-center rounded font-bold ${size} ${face}`;
}
