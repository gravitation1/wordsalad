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

// A keyboard key drawn as a miniature tile — the game's word for "a thing
// you press" applied to the keyboard itself, so shortcut hints read as
// keys rather than stray characters. Hidden without a precise pointer,
// where keyboard hints mean nothing.
const KEYCAP_BASE_CLASS =
  'hidden h-4 min-w-4 items-center justify-center rounded border px-0.5 text-[10px] font-normal leading-none tracking-normal pointer-fine:inline-flex';

// The standard cap: one fixed gray, so caps match exactly across button
// groups whose own text colors differ (the play row's bright labels, the
// meta row's muted ones). Its border sits a shade off the pills' own
// border gray (300/dark:700) in each theme, so the cap's outline never
// reads as part of the button's stroke.
export const KEYCAP_CLASS = `${KEYCAP_BASE_CLASS} border-gray-400 text-gray-400 dark:border-gray-500 dark:text-gray-500`;

// The exception, for hosts with a color story of their own — filled CTAs,
// dashed disabled states, Submit's readiness tint — where the fixed gray
// would detach from (or outshine) the button: ride its currentColor,
// dimmed to hint weight, so the cap follows the button's state like the
// label does.
export const KEYCAP_TINTED_CLASS = `${KEYCAP_BASE_CLASS} border-current opacity-60`;

// Where the typed word last sat on screen (viewport coordinates), written
// by the input on every edit and read by the drum to fly a found word from
// that spot into its slot. Width and height bound the flight's launch
// size: the ghost may not outgrow the letters it replaces.
export interface WordOrigin {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface MiniTileOptions {
  // Squeezes long words into the drum's fixed rows and narrow screens.
  compact?: boolean;
  // The drum's derived-prefix letters on unfound rows.
  ghost?: boolean;
  // The drum's hinted state.
  muted?: boolean;
  // A pangram used every letter on the board, so every tile wears the
  // accent — the "letters that counted" story widened from the one
  // required letter to all seven. This is what makes the pangram bonus
  // legible: a fully lit row carrying an outsized number explains itself.
  pangram?: boolean;
}

// The game's letters at pocket size, shared by the history rows, the
// found-word drum, and the feedback line.
export function miniTileClass(
  letter: string,
  requiredCharacters: string,
  {
    compact = false,
    ghost = false,
    muted = false,
    pangram = false,
  }: MiniTileOptions = {},
): string {
  const isRequired = pangram || requiredCharacters.includes(letter);
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
