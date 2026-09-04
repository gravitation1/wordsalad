import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { AchievementId } from './game/achievements';
import type { GameFeedback, StagedPreview } from './useWordSaladGame';

export type Locale =
  'de' | 'en' | 'es' | 'fr' | 'it' | 'ja' | 'ko' | 'nl' | 'pt' | 'ru' | 'zh';

export const SUPPORTED_LOCALES: readonly Locale[] = [
  'de',
  'en',
  'es',
  'fr',
  'it',
  'ja',
  'ko',
  'nl',
  'pt',
  'ru',
  'zh',
];

// Each locale in its own language, for the UI-language picker: a reader who
// can't parse the current UI language must still recognize their own.
export const LOCALE_NAMES: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  nl: 'Nederlands',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
};

export interface Messages {
  locale: Locale;
  appTitle: string;
  deleteButton: string;
  tossButton: string;
  submitButton: string;
  wordsHeader: string;
  // The list header's suffix counting down what is left (" (6 remaining)");
  // " (all found)" at zero.
  wordsRemaining: (count: number) => string;
  pointsHeader: string;
  newGameButton: string;
  keepPlayingButton: string;
  customGameButton: string;
  moreMenuLabel: string;
  // The dictionary the puzzles draw words from — a property of the game,
  // deliberately named apart from the UI language.
  wordListLabel: string;
  themeLabel: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  uiLanguageLabel: string;
  // Renders the "follow the browser" picker entry; the argument is the
  // native name (LOCALE_NAMES) of the locale auto-detection would pick.
  uiLanguageAuto: (nativeName: string) => string;
  // The header's ♪ toggle. Its pressed state carries on/off, so the label
  // names the thing rather than the action.
  soundLabel: string;
  customGameTitle: string;
  customModeLegend: string;
  customModeRandom: string;
  customModeLetters: string;
  customMinLabel: string;
  customMaxLabel: string;
  customLettersLabel: string;
  customLettersHint: string;
  customMinLengthLabel: string;
  customWordCountLabel: string;
  customPangramLabel: string;
  customPreviewRandom: (minWords: number, maxWords: number) => string;
  customCreateButton: string;
  customPreview: (words: number, points: number, hasPangram: boolean) => string;
  customError: (kind: 'no-words' | 'generate-failed') => string;
  restartButton: string;
  historyButton: string;
  historyTitle: string;
  historyEmpty: string;
  sortRecent: string;
  sortResult: string;
  sortRating: string;
  statPlayed: string;
  statWon: string;
  statStreak: string;
  statHints: string;
  // The ⋯ menu's trophy case. Achievements are keyed by their catalog id
  // (game/achievements.ts): one name and one description each.
  achievementsButton: string;
  achievementsTitle: string;
  // The case's tally line ("3 of 12 earned").
  achievementsEarned: (earned: number, total: number) => string;
  // Screen-reader annotations for the case's ★/☆ rows.
  achievementEarnedLabel: string;
  achievementLockedLabel: string;
  // The end-game dialogs' eyebrow over the chips of what that board earned.
  unlockedLabel: string;
  // The ⋯ menu row's screen-reader count of unlocks since the case was
  // last opened (the visible form is "★ N").
  achievementsNew: (count: number) => string;
  achievements: Record<AchievementId, { description: string; name: string }>;
  shareButton: string;
  // Sits inside the share button in place of its label, so it stays short
  // enough not to reflow the button row.
  shareCopied: string;
  // The shared score's clause on the score line: your standing against the
  // sharer's, in the rank countdown's grammar ("5 points behind ◇", "Tied
  // with ◇", "45 points ahead of ◆"). The mark arrives from the view —
  // hollow while live, filled once settled — so the words can point at the
  // diamond on the bar. The *Note sentences serve screen readers and the
  // bar mark's title.
  challengeBehind: (points: number, mark: string) => string;
  challengeTied: (mark: string) => string;
  challengeAhead: (points: number, mark: string) => string;
  challengeUnreachable: (mark: string) => string;
  challengeBehindNote: (points: number, score: number) => string;
  challengeTiedNote: (score: number) => string;
  challengeTiedDoneNote: (score: number) => string;
  challengeAheadNote: (points: number, score: number) => string;
  challengeUnreachableNote: (score: number) => string;
  hintButton: string;
  hintsUsed: (count: number, lostPoints: number) => string;
  hintCostBadge: (cost: number) => string;
  hintCostLabel: (cost: number) => string;
  hintAgainLabel: string;
  hintForfeitsWinLabel: string;
  hintedLegend: string;
  // A drum brick's word count, worn as its visible text ("6 words").
  unfoundCountLabel: (count: number) => string;
  // A brick whose starting letters the alphabetized list gives away;
  // activating it types them into the word area. The letters arrive
  // pre-spaced ("C A") so screen readers spell them out.
  unfoundBlockLabel: (count: number, letters: string) => string;
  lockedOutNote: (reachablePoints: number, winPoints: number) => string;
  lockedOutTitle: string;
  lockedOutShort: string;
  winThresholdLabel: (winPoints: number) => string;
  victory: string;
  invalidGameData: string;
  generationFailed: string;
  dictionaryLoadFailed: (detail: string) => string;
  currentWordLabel: string;
  completionLabel: string;
  requiredLetterTitle: string;
  // Hover/screen-reader note for a dimmed rack tile: no unfound word can
  // use it next. Phrased as a state, not a prohibition — the tile still
  // types (the dim is soft).
  deadLetterNote: string;
  ratingsTitle: string;
  // Screen-reader annotations for the ratings ladder rungs.
  ratingReachedLabel: string;
  ratingNotReachedLabel: string;
  // Screen-reader description of the Submit button's verdict badge.
  submitPreviewLabel: (preview: StagedPreview) => string;
  // First-run coach: the rules the board cannot show, spoken in the
  // feedback row until the player's first scored word. {letters} marks where
  // the required letters go, set as mini tiles.
  coachLength: (minLength: number) => string;
  coachRequired: string;
  coachPangram: (letterCount: number) => string;
  // One-line form for short viewports; the Free variant serves a puzzle
  // with no required letter.
  coachCompact: (minLength: number) => string;
  coachCompactFree: (minLength: number) => string;
  howToPlayButton: string;
  howToPlayTitle: string;
  howToPlayLetters: (minLength: number, letterCount: number) => string;
  howToPlayRequired: (count: number) => string;
  howToPlayScoring: (
    minLength: number,
    letterCount: number,
    bonus: number,
  ) => string;
  howToPlayRanks: (winPercent: number) => string;
  howToPlayHints: string;
  howToPlayTypeHint: string;
  closeButton: string;
  levelName: (level: string) => string;
  thresholdFrom: (points: number) => string;
  feedbackText: (feedback: GameFeedback) => string;
  scoreLabel: (earnedPoints: number, maxPoints: number) => string;
  // The countdown to the next rank still in reach ("6 points to Genius").
  // The rank name arrives already localized via levelName.
  pointsToRank: (points: number, rank: string) => string;
}

// CLDR plural category -> form, with 'other' as the required fallback.
// Russian needs one/few/many; most languages only use one/other.
type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

function plural(locale: Locale, count: number, forms: PluralForms): string {
  return forms[new Intl.PluralRules(locale).select(count)] ?? forms.other;
}

const EN: Messages = {
  locale: 'en',
  appTitle: 'Word Salad',
  deleteButton: 'Delete',
  tossButton: 'Toss',
  submitButton: 'Submit',
  wordsHeader: 'Words',
  pointsHeader: 'Points',
  newGameButton: 'New game',
  keepPlayingButton: 'Keep playing',
  customGameButton: 'Custom game',
  moreMenuLabel: 'More options',
  wordListLabel: 'Word list',
  themeLabel: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  uiLanguageLabel: 'UI language',
  uiLanguageAuto: (nativeName) => `Auto (${nativeName})`,
  soundLabel: 'Sound',
  customGameTitle: 'Custom game',
  customModeLegend: 'Board',
  customModeRandom: 'Surprise me',
  customModeLetters: 'Choose letters',
  customMinLabel: 'min',
  customMaxLabel: 'max',
  customLettersLabel: 'Letters',
  customLettersHint:
    'Type up to 7 letters · tap one to require it in every word',
  customMinLengthLabel: 'Minimum word length',
  customWordCountLabel: 'Word count',
  customPangramLabel: 'Require a pangram',
  customPreviewRandom: (minWords, maxWords) =>
    `A board with ${minWords}–${maxWords} words will be generated`,
  customCreateButton: 'Create game',
  customPreview: (words, points, hasPangram) =>
    `${words} word${plural('en', words, { one: '', other: 's' })} · ` +
    `${points} point${plural('en', points, { one: '', other: 's' })}` +
    (hasPangram ? ' · pangram ✓' : ' · no pangram'),
  customError: (kind) =>
    kind === 'no-words'
      ? 'No valid words for these letters'
      : 'Could not build a game with these settings',
  restartButton: 'Restart',
  historyButton: 'History',
  historyTitle: 'History',
  historyEmpty: 'Nothing here yet — score a word to start your history.',
  sortRecent: 'Recent',
  sortResult: 'Result',
  sortRating: 'Rating',
  statPlayed: 'Played',
  statWon: 'Won',
  statStreak: 'Streak',
  statHints: 'Hints',
  achievementsButton: 'Achievements',
  achievementsTitle: 'Achievements',
  achievementsEarned: (earned, total) => `${earned} of ${total} earned`,
  achievementEarnedLabel: 'Earned',
  achievementLockedLabel: 'Locked',
  unlockedLabel: 'Unlocked',
  achievementsNew: (count) => `${count} new`,
  achievements: {
    'first-win': { name: 'First win', description: 'Win a game' },
    'no-help-needed': {
      name: 'No help needed',
      description: 'Win without a hint',
    },
    'first-perfect': {
      name: 'Perfect game',
      description: 'Earn every point on a board',
    },
    completionist: {
      name: 'Completionist',
      description: 'Find every word on a board, hints and all',
    },
    'super-genius': {
      name: 'Super-Genius',
      description: 'Reach Super-Genius on a board',
    },
    pangrammer: { name: 'Pangrammer', description: 'Find a pangram' },
    'long-haul': {
      name: 'Long haul',
      description: 'Find a word of ten letters or more',
    },
    'saw-what-you-did-there': {
      name: 'I saw what you did there',
      description: 'Find a word the list gave away',
    },
    marathon: { name: 'Marathon', description: 'Find 25 words on one board' },
    challenger: { name: 'Challenger', description: 'Beat a shared score' },
    'good-sport': {
      name: 'Good sport',
      description: 'Finish a challenge you could not beat',
    },
    'hard-mode': {
      name: 'Hard mode',
      description: 'Win with a minimum word length of 5 or more',
    },
    'double-duty': {
      name: 'Double duty',
      description: 'Win a board with two required letters',
    },
    builder: { name: 'Builder', description: 'Win a board you built' },
    overreach: { name: 'Overreach', description: 'Hint the win out of reach' },
    host: { name: 'Host', description: 'Share a board' },
    'ten-wins': { name: 'Ten wins', description: 'Win ten games' },
    'fifty-wins': { name: 'Fifty wins', description: 'Win fifty games' },
    century: { name: 'Century', description: 'Win a hundred games' },
    wordsmith: { name: 'Wordsmith', description: 'Find a thousand words' },
    perfectionist: {
      name: 'Perfectionist',
      description: 'Earn ten perfect games',
    },
    bilingual: { name: 'Bilingual', description: 'Win in a second word list' },
    polyglot: { name: 'Polyglot', description: 'Win in every word list' },
  },
  shareButton: 'Share',
  shareCopied: 'Copied!',
  wordsRemaining: (count) =>
    count === 0 ? ' (all found)' : ` (${count} remaining)`,
  challengeBehind: (points, mark) =>
    `${points} point${plural('en', points, { one: '', other: 's' })} behind ${mark}`,
  challengeTied: (mark) => `Tied with ${mark}`,
  challengeAhead: (points, mark) =>
    `${points} point${plural('en', points, { one: '', other: 's' })} ahead of ${mark}`,
  challengeUnreachable: (mark) => `${mark} out of reach`,
  challengeBehindNote: (points, score) =>
    `${points} point${plural('en', points, { one: '', other: 's' })} behind the shared score of ${score}`,
  challengeTiedNote: (score) => `Tied with the shared score of ${score}`,
  challengeTiedDoneNote: (score) => `You tied the shared score of ${score}!`,
  challengeAheadNote: (points, score) =>
    `You beat the shared score of ${score} by ${points} point${plural('en', points, { one: '', other: 's' })}!`,
  challengeUnreachableNote: (score) =>
    `The shared score of ${score} is out of reach`,
  hintButton: 'Hint',
  hintsUsed: (count, lostPoints) =>
    `${count} hint${plural('en', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('en', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Reveals a word and lowers your max score by ${cost} point${plural('en', cost, { one: '', other: 's' })}`,
  hintedLegend: '* revealed with a hint',
  unfoundCountLabel: (count) =>
    `${count} ${plural('en', count, { one: 'word', other: 'words' })}`,
  unfoundBlockLabel: (count, letters) =>
    `${plural('en', count, {
      one: 'One unfound word starts',
      other: `${count} unfound words start`,
    })} with ${letters} — fill in these letters`,
  hintAgainLabel: 'Shows your hinted word again — no extra cost',
  hintForfeitsWinLabel:
    'Reveals a word — your best possible score would drop below the win line',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Too many hints — winning takes ${winPoints} points, ` +
    `but only ${reachablePoints} can still be reached.`,
  lockedOutTitle: 'Out of reach',
  lockedOutShort: 'Winning is out of reach',
  winThresholdLabel: (winPoints) => `Win at ${winPoints} points`,
  victory: 'YOU WIN!',
  invalidGameData: 'INVALID GAME DATA!',
  generationFailed: 'Failed to generate a game!',
  dictionaryLoadFailed: (detail) =>
    `Failed to load the dictionary (${detail})!`,
  currentWordLabel: 'Current word',
  completionLabel: 'Completion',
  requiredLetterTitle: 'Required letter',
  deadLetterNote: 'No new word can use this letter next',
  ratingsTitle: 'Ratings',
  ratingReachedLabel: 'Reached',
  ratingNotReachedLabel: 'Not yet reached',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Already found';
      case 'dead-end':
        return 'No new word starts with these letters';
      case 'invalid-letters':
        return 'Uses letters not in the salad';
      case 'missing-required':
        return `Must contain ${Array.from(preview.requiredCharacters).join(', ')}`;
      case 'not-a-word':
        return 'Not in the word list';
      case 'too-short':
        return 'Too short';
      case 'valid':
        return preview.points > 0
          ? `Worth ${preview.points} point${plural('en', preview.points, { one: '', other: 's' })}`
          : 'Worth no points (revealed by a hint)';
    }
  },
  coachLength: (minLength) =>
    `Spell words of ${minLength}+ letters — letters can repeat.`,
  coachRequired: 'Every word must use {letters}.',
  coachPangram: (letterCount) => `Use all ${letterCount} letters for a bonus.`,
  coachCompact: (minLength) =>
    `${minLength}+ letters · always {letters} · letters can repeat`,
  coachCompactFree: (minLength) => `${minLength}+ letters · letters can repeat`,
  howToPlayButton: 'How to play',
  howToPlayTitle: 'How to play',
  howToPlayLetters: (minLength, letterCount) =>
    `Spell words of ${minLength} or more letters from the ${letterCount} in the salad. Letters can be used more than once.`,
  howToPlayRequired: (count) =>
    plural('en', count, {
      one: 'Every word must include the required letter {letters}.',
      other: 'Every word must include the required letters {letters}.',
    }),
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `Longer words score more: a ${minLength}-letter word is 1 point, and each extra letter adds one. Use all ${letterCount} letters in one word for a ${bonus}-point bonus.`,
  howToPlayRanks: (winPercent) =>
    `Your rank climbs with your share of the board's points. Reach ${winPercent}% to win — or find everything.`,
  howToPlayHints: `A hint reveals the shortest missing word. It scores nothing, and its points come off the board's maximum — so each hint lowers the best rank you can still reach.`,
  howToPlayTypeHint: 'Type to spell',
  closeButton: 'Close',
  levelName: (level) => level,
  thresholdFrom: (points) =>
    `from ${points} pt${plural('en', points, { one: '', other: 's' })}`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `${feedback.letter} is not in the word salad!`;
      case 'scored':
        return `${feedback.word} earned you ${feedback.points} point${plural('en', feedback.points, { one: '', other: 's' })}!`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word} was already found!`;
          case 'invalid-letters':
            return `${feedback.word} has invalid letters!`;
          case 'missing-required':
            return `${feedback.word} is missing required character!`;
          case 'not-a-word':
            return `${feedback.word} was not found!`;
          case 'too-short':
            return `${feedback.word} is too short!`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} point${plural('en', maxPoints, { one: '', other: 's' })}`,
  pointsToRank: (points, rank) =>
    `${points} point${plural('en', points, { one: '', other: 's' })} to ${rank}`,
};

const LEVELS_FR: Record<string, string> = {
  Idiot: 'Idiot',
  Meh: 'Bof',
  Okay: 'Correct',
  Nice: 'Pas mal',
  'Not-Too-Shabby': 'Pas-Trop-Minable',
  Great: 'Super',
  Awesome: 'Génial',
  'Smarty-Pants': 'Petit-Malin',
  Genius: 'Génie',
  'Super-Genius': 'Super-Génie',
  'Super-Duper-Genius': 'Méga-Super-Génie',
};

const FR: Messages = {
  locale: 'fr',
  appTitle: 'Word Salad',
  deleteButton: 'Effacer',
  tossButton: 'Mélanger',
  submitButton: 'Valider',
  wordsHeader: 'Mots',
  pointsHeader: 'Points',
  newGameButton: 'Nouvelle partie',
  keepPlayingButton: 'Continuer à jouer',
  customGameButton: 'Partie personnalisée',
  moreMenuLabel: 'Plus d’options',
  wordListLabel: 'Liste de mots',
  themeLabel: 'Thème',
  themeSystem: 'Système',
  themeLight: 'Clair',
  themeDark: 'Sombre',
  uiLanguageLabel: 'Langue de l’interface',
  uiLanguageAuto: (nativeName) => `Auto (${nativeName})`,
  soundLabel: 'Son',
  customGameTitle: 'Partie personnalisée',
  customModeLegend: 'Plateau',
  customModeRandom: 'Surprise',
  customModeLetters: 'Choisir les lettres',
  customMinLabel: 'min',
  customMaxLabel: 'max',
  customLettersLabel: 'Lettres',
  customLettersHint:
    'Saisissez jusqu’à 7 lettres · touchez-en une pour l’exiger dans chaque mot',
  customMinLengthLabel: 'Longueur minimale des mots',
  customWordCountLabel: 'Nombre de mots',
  customPangramLabel: 'Exiger un pangramme',
  customPreviewRandom: (minWords, maxWords) =>
    `Un plateau de ${minWords} à ${maxWords} mots sera généré`,
  customCreateButton: 'Créer la partie',
  customPreview: (words, points, hasPangram) =>
    `${words} mot${plural('fr', words, { one: '', other: 's' })} · ` +
    `${points} point${plural('fr', points, { one: '', other: 's' })}` +
    (hasPangram ? ' · pangramme ✓' : ' · pas de pangramme'),
  customError: (kind) =>
    kind === 'no-words'
      ? 'Aucun mot valide pour ces lettres'
      : 'Impossible de créer une partie avec ces réglages',
  restartButton: 'Recommencer',
  historyButton: 'Historique',
  historyTitle: 'Historique',
  historyEmpty:
    'Rien ici pour l’instant — marquez un mot pour commencer votre historique.',
  sortRecent: 'Récents',
  sortResult: 'Résultat',
  sortRating: 'Niveau',
  statPlayed: 'Parties',
  statWon: 'Gagnées',
  statStreak: 'Série',
  statHints: 'Indices',
  achievementsButton: 'Succès',
  achievementsTitle: 'Succès',
  achievementsEarned: (earned, total) => `${earned} sur ${total} obtenus`,
  achievementEarnedLabel: 'Obtenu',
  achievementLockedLabel: 'Verrouillé',
  unlockedLabel: 'Débloqué',
  achievementsNew: (count) =>
    `${count} ${plural('fr', count, { one: 'nouveau', other: 'nouveaux' })}`,
  achievements: {
    'first-win': {
      name: 'Première victoire',
      description: 'Gagnez une partie',
    },
    'no-help-needed': { name: 'Sans aide', description: 'Gagnez sans indice' },
    'first-perfect': {
      name: 'Partie parfaite',
      description: 'Marquez tous les points d’une grille',
    },
    completionist: {
      name: 'Complétiste',
      description: 'Trouvez tous les mots d’une grille, indices compris',
    },
    'super-genius': {
      name: 'Super-Génie',
      description: 'Atteignez Super-Génie sur une grille',
    },
    pangrammer: { name: 'Pangrammiste', description: 'Trouvez un pangramme' },
    'long-haul': {
      name: 'Longue haleine',
      description: 'Trouvez un mot de dix lettres ou plus',
    },
    'saw-what-you-did-there': {
      name: 'J’ai tout vu',
      description: 'Trouvez un mot que la liste avait trahi',
    },
    marathon: {
      name: 'Marathon',
      description: 'Trouvez 25 mots sur une même grille',
    },
    challenger: { name: 'Challenger', description: 'Battez un score partagé' },
    'good-sport': {
      name: 'Beau joueur',
      description: 'Terminez un défi que vous n’avez pas pu battre',
    },
    'hard-mode': {
      name: 'Mode difficile',
      description: 'Gagnez avec des mots de 5 lettres minimum',
    },
    'double-duty': {
      name: 'Double contrainte',
      description: 'Gagnez une grille à deux lettres obligatoires',
    },
    builder: {
      name: 'Bâtisseur',
      description: 'Gagnez une grille que vous avez créée',
    },
    overreach: {
      name: 'Trop gourmand',
      description: 'Rendez la victoire inaccessible à coups d’indices',
    },
    host: { name: 'Hôte', description: 'Partagez une grille' },
    'ten-wins': { name: 'Dix victoires', description: 'Gagnez dix parties' },
    'fifty-wins': {
      name: 'Cinquante victoires',
      description: 'Gagnez cinquante parties',
    },
    century: { name: 'Centenaire', description: 'Gagnez cent parties' },
    wordsmith: { name: 'Lettré', description: 'Trouvez mille mots' },
    perfectionist: {
      name: 'Perfectionniste',
      description: 'Réussissez dix parties parfaites',
    },
    bilingual: {
      name: 'Bilingue',
      description: 'Gagnez dans une deuxième liste de mots',
    },
    polyglot: {
      name: 'Polyglotte',
      description: 'Gagnez dans toutes les listes de mots',
    },
  },
  shareButton: 'Partager',
  shareCopied: 'Copié !',
  wordsRemaining: (count) =>
    count === 0
      ? ' (tout trouvé)'
      : ` (${count} restant${plural('fr', count, { one: '', other: 's' })})`,
  challengeBehind: (points, mark) =>
    `${points} point${plural('fr', points, { one: '', other: 's' })} derrière ${mark}`,
  challengeTied: (mark) => `À égalité avec ${mark}`,
  challengeAhead: (points, mark) =>
    `${points} point${plural('fr', points, { one: '', other: 's' })} devant ${mark}`,
  challengeUnreachable: (mark) => `${mark} hors de portée`,
  challengeBehindNote: (points, score) =>
    `${points} point${plural('fr', points, { one: '', other: 's' })} derrière le score partagé de ${score}`,
  challengeTiedNote: (score) => `À égalité avec le score partagé de ${score}`,
  challengeTiedDoneNote: (score) =>
    `Vous avez égalé le score partagé de ${score} !`,
  challengeAheadNote: (points, score) =>
    `Vous avez battu le score partagé de ${score} de ${points} point${plural('fr', points, { one: '', other: 's' })} !`,
  challengeUnreachableNote: (score) =>
    `Le score partagé de ${score} est hors de portée`,
  hintButton: 'Indice',
  hintsUsed: (count, lostPoints) =>
    `${count} indice${plural('fr', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('fr', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Révèle un mot et réduit votre score max de ${cost} point${plural('fr', cost, { one: '', other: 's' })}`,
  hintedLegend: '* révélé par un indice',
  unfoundCountLabel: (count) =>
    `${count} ${plural('fr', count, { one: 'mot', other: 'mots' })}`,
  unfoundBlockLabel: (count, letters) =>
    `${plural('fr', count, {
      one: 'Un mot non trouvé commence',
      other: `${count} mots non trouvés commencent`,
    })} par ${letters} — saisir ces lettres`,
  hintAgainLabel: 'Réaffiche votre mot d’indice — sans coût supplémentaire',
  hintForfeitsWinLabel:
    'Révèle un mot — votre score maximum possible passerait sous le seuil de victoire',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Trop d’indices — il faut ${winPoints} points pour gagner, ` +
    `mais seulement ${reachablePoints} restent accessibles.`,
  lockedOutTitle: 'Hors de portée',
  lockedOutShort: 'La victoire est hors de portée',
  winThresholdLabel: (winPoints) => `Victoire à ${winPoints} points`,
  victory: 'VOUS AVEZ GAGNÉ !',
  invalidGameData: 'DONNÉES DE PARTIE INVALIDES !',
  generationFailed: 'Impossible de générer une partie !',
  dictionaryLoadFailed: (detail) =>
    `Impossible de charger le dictionnaire (${detail}) !`,
  currentWordLabel: 'Mot en cours',
  completionLabel: 'Progression',
  requiredLetterTitle: 'Lettre obligatoire',
  deadLetterNote: 'Aucun nouveau mot ne peut utiliser cette lettre ici',
  ratingsTitle: 'Niveaux',
  ratingReachedLabel: 'Atteint',
  ratingNotReachedLabel: 'Pas encore atteint',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Déjà trouvé';
      case 'dead-end':
        return 'Aucun nouveau mot ne commence par ces lettres';
      case 'invalid-letters':
        return 'Contient des lettres hors de la salade';
      case 'missing-required':
        return `Doit contenir ${Array.from(preview.requiredCharacters).join(', ')}`;
      case 'not-a-word':
        return 'Absent de la liste de mots';
      case 'too-short':
        return 'Trop court';
      case 'valid':
        return preview.points > 0
          ? `Vaut ${preview.points} point${plural('fr', preview.points, { one: '', other: 's' })}`
          : 'Ne vaut aucun point (mot révélé par un indice)';
    }
  },
  coachLength: (minLength) =>
    `Mots de ${minLength} lettres ou plus — lettres répétables.`,
  coachRequired: 'Chaque mot doit contenir {letters}.',
  coachPangram: (letterCount) =>
    `Utilisez les ${letterCount} lettres pour un bonus.`,
  coachCompact: (minLength) =>
    `${minLength}+ lettres · toujours {letters} · lettres répétables`,
  coachCompactFree: (minLength) => `${minLength}+ lettres · lettres répétables`,
  howToPlayButton: 'Comment jouer',
  howToPlayTitle: 'Comment jouer',
  howToPlayLetters: (minLength, letterCount) =>
    `Formez des mots de ${minLength} lettres ou plus avec les ${letterCount} lettres de la salade. Une lettre peut servir plusieurs fois.`,
  howToPlayRequired: (count) =>
    plural('fr', count, {
      one: 'Chaque mot doit contenir la lettre obligatoire {letters}.',
      other: 'Chaque mot doit contenir les lettres obligatoires {letters}.',
    }),
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `Les mots longs rapportent plus : un mot de ${minLength} lettres vaut 1 point, et chaque lettre de plus en ajoute un. Utilisez les ${letterCount} lettres dans un seul mot pour un bonus de ${bonus} points.`,
  howToPlayRanks: (winPercent) =>
    `Votre rang monte avec votre part des points du plateau. Atteignez ${winPercent} % pour gagner — ou trouvez tout.`,
  howToPlayHints:
    'Un indice révèle le mot manquant le plus court. Il ne rapporte rien, et ses points sont retirés du maximum du plateau : chaque indice abaisse donc le meilleur rang encore accessible.',
  howToPlayTypeHint: 'Tapez pour épeler',
  closeButton: 'Fermer',
  levelName: (level) => LEVELS_FR[level] ?? level,
  thresholdFrom: (points) =>
    `à partir de ${points} pt${plural('fr', points, { one: '', other: 's' })}`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `${feedback.letter} n'est pas dans la salade de mots !`;
      case 'scored':
        return `${feedback.word} vous a rapporté ${feedback.points} point${plural('fr', feedback.points, { one: '', other: 's' })} !`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word} a déjà été trouvé !`;
          case 'invalid-letters':
            return `${feedback.word} contient des lettres invalides !`;
          case 'missing-required':
            return `${feedback.word} ne contient pas la lettre obligatoire !`;
          case 'not-a-word':
            return `${feedback.word} est introuvable !`;
          case 'too-short':
            return `${feedback.word} est trop court !`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} point${plural('fr', maxPoints, { one: '', other: 's' })}`,
  pointsToRank: (points, rank) =>
    `à ${points} point${plural('fr', points, { one: '', other: 's' })} de ${rank}`,
};

const LEVELS_ES: Record<string, string> = {
  Idiot: 'Zoquete',
  Meh: 'Meh',
  Okay: 'Pasable',
  Nice: 'Bien',
  'Not-Too-Shabby': 'Nada mal',
  Great: 'Genial',
  Awesome: 'Increíble',
  'Smarty-Pants': 'Sabelotodo',
  Genius: 'Genio',
  'Super-Genius': 'Supergenio',
  'Super-Duper-Genius': 'Mega-Supergenio',
};

const ES: Messages = {
  locale: 'es',
  appTitle: 'Word Salad',
  deleteButton: 'Borrar',
  tossButton: 'Mezclar',
  submitButton: 'Enviar',
  wordsHeader: 'Palabras',
  pointsHeader: 'Puntos',
  newGameButton: 'Nueva partida',
  keepPlayingButton: 'Seguir jugando',
  customGameButton: 'Partida personalizada',
  moreMenuLabel: 'Más opciones',
  wordListLabel: 'Lista de palabras',
  themeLabel: 'Tema',
  themeSystem: 'Sistema',
  themeLight: 'Claro',
  themeDark: 'Oscuro',
  uiLanguageLabel: 'Idioma de la interfaz',
  uiLanguageAuto: (nativeName) => `Auto (${nativeName})`,
  soundLabel: 'Sonido',
  customGameTitle: 'Partida personalizada',
  customModeLegend: 'Tablero',
  customModeRandom: 'Sorpréndeme',
  customModeLetters: 'Elegir letras',
  customMinLabel: 'mín',
  customMaxLabel: 'máx',
  customLettersLabel: 'Letras',
  customLettersHint:
    'Escribe hasta 7 letras · toca una para exigirla en cada palabra',
  customMinLengthLabel: 'Longitud mínima de palabra',
  customWordCountLabel: 'Número de palabras',
  customPangramLabel: 'Exigir un pangrama',
  customPreviewRandom: (minWords, maxWords) =>
    `Se generará un tablero de ${minWords} a ${maxWords} palabras`,
  customCreateButton: 'Crear partida',
  customPreview: (words, points, hasPangram) =>
    `${words} palabra${plural('es', words, { one: '', other: 's' })} · ` +
    `${points} punto${plural('es', points, { one: '', other: 's' })}` +
    (hasPangram ? ' · pangrama ✓' : ' · sin pangrama'),
  customError: (kind) =>
    kind === 'no-words'
      ? 'No hay palabras válidas para estas letras'
      : 'No se pudo crear una partida con estos ajustes',
  restartButton: 'Reiniciar',
  historyButton: 'Historial',
  historyTitle: 'Historial',
  historyEmpty:
    'Aún no hay nada: consigue una palabra para empezar tu historial.',
  sortRecent: 'Recientes',
  sortResult: 'Resultado',
  sortRating: 'Rango',
  statPlayed: 'Partidas',
  statWon: 'Ganadas',
  statStreak: 'Racha',
  statHints: 'Pistas',
  achievementsButton: 'Logros',
  achievementsTitle: 'Logros',
  achievementsEarned: (earned, total) => `${earned} de ${total} conseguidos`,
  achievementEarnedLabel: 'Conseguido',
  achievementLockedLabel: 'Bloqueado',
  unlockedLabel: 'Desbloqueado',
  achievementsNew: (count) =>
    `${count} ${plural('es', count, { one: 'nuevo', other: 'nuevos' })}`,
  achievements: {
    'first-win': { name: 'Primera victoria', description: 'Gana una partida' },
    'no-help-needed': { name: 'Sin ayuda', description: 'Gana sin pistas' },
    'first-perfect': {
      name: 'Partida perfecta',
      description: 'Consigue todos los puntos de un tablero',
    },
    completionist: {
      name: 'Completista',
      description:
        'Encuentra todas las palabras de un tablero, pistas incluidas',
    },
    'super-genius': {
      name: 'Supergenio',
      description: 'Alcanza Supergenio en un tablero',
    },
    pangrammer: { name: 'Pangramista', description: 'Encuentra un pangrama' },
    'long-haul': {
      name: 'Largo recorrido',
      description: 'Encuentra una palabra de diez letras o más',
    },
    'saw-what-you-did-there': {
      name: 'Ya te vi',
      description: 'Encuentra una palabra que la lista delató',
    },
    marathon: {
      name: 'Maratón',
      description: 'Encuentra 25 palabras en un mismo tablero',
    },
    challenger: {
      name: 'Retador',
      description: 'Supera una puntuación compartida',
    },
    'good-sport': {
      name: 'Deportividad',
      description: 'Termina un reto que no pudiste superar',
    },
    'hard-mode': {
      name: 'Modo difícil',
      description: 'Gana con palabras de 5 letras como mínimo',
    },
    'double-duty': {
      name: 'Doble deber',
      description: 'Gana un tablero con dos letras obligatorias',
    },
    builder: {
      name: 'Constructor',
      description: 'Gana un tablero creado por ti',
    },
    overreach: {
      name: 'Exceso',
      description: 'Deja la victoria fuera de alcance a base de pistas',
    },
    host: { name: 'Anfitrión', description: 'Comparte un tablero' },
    'ten-wins': { name: 'Diez victorias', description: 'Gana diez partidas' },
    'fifty-wins': {
      name: 'Cincuenta victorias',
      description: 'Gana cincuenta partidas',
    },
    century: { name: 'Centenario', description: 'Gana cien partidas' },
    wordsmith: { name: 'Letrado', description: 'Encuentra mil palabras' },
    perfectionist: {
      name: 'Perfeccionista',
      description: 'Logra diez partidas perfectas',
    },
    bilingual: {
      name: 'Bilingüe',
      description: 'Gana en una segunda lista de palabras',
    },
    polyglot: {
      name: 'Políglota',
      description: 'Gana en todas las listas de palabras',
    },
  },
  shareButton: 'Compartir',
  shareCopied: '¡Copiado!',
  wordsRemaining: (count) =>
    count === 0
      ? ' (todas encontradas)'
      : ` (${plural('es', count, { one: 'queda', other: 'quedan' })} ${count})`,
  challengeBehind: (points, mark) =>
    `${points} punto${plural('es', points, { one: '', other: 's' })} por detrás de ${mark}`,
  challengeTied: (mark) => `Empate con ${mark}`,
  challengeAhead: (points, mark) =>
    `${points} punto${plural('es', points, { one: '', other: 's' })} por delante de ${mark}`,
  challengeUnreachable: (mark) => `${mark} fuera de alcance`,
  challengeBehindNote: (points, score) =>
    `${points} punto${plural('es', points, { one: '', other: 's' })} por detrás de la puntuación compartida de ${score}`,
  challengeTiedNote: (score) =>
    `Empate con la puntuación compartida de ${score}`,
  challengeTiedDoneNote: (score) =>
    `¡Igualaste la puntuación compartida de ${score}!`,
  challengeAheadNote: (points, score) =>
    `¡Superaste la puntuación compartida de ${score} por ${points} punto${plural('es', points, { one: '', other: 's' })}!`,
  challengeUnreachableNote: (score) =>
    `La puntuación compartida de ${score} está fuera de alcance`,
  hintButton: 'Pista',
  hintsUsed: (count, lostPoints) =>
    `${count} pista${plural('es', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('es', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} máx`,
  hintCostLabel: (cost) =>
    `Revela una palabra y reduce tu puntuación máxima en ${cost} punto${plural('es', cost, { one: '', other: 's' })}`,
  hintedLegend: '* revelada con una pista',
  unfoundCountLabel: (count) =>
    `${count} ${plural('es', count, { one: 'palabra', other: 'palabras' })}`,
  unfoundBlockLabel: (count, letters) =>
    `${plural('es', count, {
      one: 'Una palabra sin encontrar empieza',
      other: `${count} palabras sin encontrar empiezan`,
    })} por ${letters} — introducir estas letras`,
  hintAgainLabel: 'Vuelve a mostrar la palabra de la pista, sin coste extra',
  hintForfeitsWinLabel:
    'Revela una palabra: tu puntuación máxima posible caería por debajo del umbral de victoria',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Demasiadas pistas: para ganar se necesitan ${winPoints} puntos, ` +
    `pero solo quedan ${reachablePoints} alcanzables.`,
  lockedOutTitle: 'Fuera de alcance',
  lockedOutShort: 'La victoria está fuera de alcance',
  winThresholdLabel: (winPoints) => `Victoria con ${winPoints} puntos`,
  victory: '¡GANASTE!',
  invalidGameData: '¡DATOS DE PARTIDA NO VÁLIDOS!',
  generationFailed: '¡No se pudo generar una partida!',
  dictionaryLoadFailed: (detail) =>
    `¡No se pudo cargar el diccionario (${detail})!`,
  currentWordLabel: 'Palabra actual',
  completionLabel: 'Progreso',
  requiredLetterTitle: 'Letra obligatoria',
  deadLetterNote: 'Ninguna palabra nueva puede usar esta letra aquí',
  ratingsTitle: 'Rangos',
  ratingReachedLabel: 'Alcanzado',
  ratingNotReachedLabel: 'Aún no alcanzado',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Ya encontrada';
      case 'dead-end':
        return 'Ninguna palabra nueva empieza por estas letras';
      case 'invalid-letters':
        return 'Usa letras que no están en la ensalada';
      case 'missing-required':
        return `Debe contener ${Array.from(preview.requiredCharacters).join(', ')}`;
      case 'not-a-word':
        return 'No está en la lista de palabras';
      case 'too-short':
        return 'Demasiado corta';
      case 'valid':
        return preview.points > 0
          ? `Vale ${preview.points} punto${plural('es', preview.points, { one: '', other: 's' })}`
          : 'No vale puntos (revelada con una pista)';
    }
  },
  coachLength: (minLength) =>
    `Palabras de ${minLength} letras o más — las letras se repiten.`,
  coachRequired: 'Cada palabra debe usar {letters}.',
  coachPangram: (letterCount) => `Usa las ${letterCount} letras para un bono.`,
  coachCompact: (minLength) =>
    `${minLength}+ letras · siempre {letters} · las letras se repiten`,
  coachCompactFree: (minLength) =>
    `${minLength}+ letras · las letras se repiten`,
  howToPlayButton: 'Cómo jugar',
  howToPlayTitle: 'Cómo jugar',
  howToPlayLetters: (minLength, letterCount) =>
    `Forma palabras de ${minLength} letras o más con las ${letterCount} letras de la ensalada. Una letra puede usarse más de una vez.`,
  howToPlayRequired: (count) =>
    plural('es', count, {
      one: 'Cada palabra debe incluir la letra obligatoria {letters}.',
      other: 'Cada palabra debe incluir las letras obligatorias {letters}.',
    }),
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `Las palabras largas valen más: una de ${minLength} letras da 1 punto, y cada letra extra suma uno. Usa las ${letterCount} letras en una sola palabra para un bono de ${bonus} puntos.`,
  howToPlayRanks: (winPercent) =>
    `Tu rango sube con tu parte de los puntos del tablero. Llega al ${winPercent} % para ganar, o encuéntralo todo.`,
  howToPlayHints:
    'Una pista revela la palabra más corta que falta. No suma puntos, y sus puntos se restan del máximo del tablero: cada pista baja el mejor rango que aún puedes alcanzar.',
  howToPlayTypeHint: 'Escribe para deletrear',
  closeButton: 'Cerrar',
  levelName: (level) => LEVELS_ES[level] ?? level,
  thresholdFrom: (points) =>
    `desde ${points} pt${plural('es', points, { one: '', other: 's' })}`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `¡${feedback.letter} no está en la ensalada de palabras!`;
      case 'scored':
        return `¡${feedback.word} te dio ${feedback.points} punto${plural('es', feedback.points, { one: '', other: 's' })}!`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `¡${feedback.word} ya fue encontrada!`;
          case 'invalid-letters':
            return `¡${feedback.word} tiene letras no válidas!`;
          case 'missing-required':
            return `¡A ${feedback.word} le falta la letra obligatoria!`;
          case 'not-a-word':
            return `¡${feedback.word} no se encontró!`;
          case 'too-short':
            return `¡${feedback.word} es demasiado corta!`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} punto${plural('es', maxPoints, { one: '', other: 's' })}`,
  pointsToRank: (points, rank) =>
    `a ${points} punto${plural('es', points, { one: '', other: 's' })} de ${rank}`,
};

const LEVELS_DE: Record<string, string> = {
  Idiot: 'Dussel',
  Meh: 'Naja',
  Okay: 'Okay',
  Nice: 'Nett',
  'Not-Too-Shabby': 'Gar nicht übel',
  Great: 'Stark',
  Awesome: 'Fantastisch',
  'Smarty-Pants': 'Schlaumeier',
  Genius: 'Genie',
  'Super-Genius': 'Supergenie',
  'Super-Duper-Genius': 'Mega-Supergenie',
};

const DE: Messages = {
  locale: 'de',
  appTitle: 'Word Salad',
  deleteButton: 'Löschen',
  tossButton: 'Mischen',
  submitButton: 'Absenden',
  wordsHeader: 'Wörter',
  pointsHeader: 'Punkte',
  newGameButton: 'Neues Spiel',
  keepPlayingButton: 'Weiterspielen',
  customGameButton: 'Eigenes Spiel',
  moreMenuLabel: 'Weitere Optionen',
  wordListLabel: 'Wortliste',
  themeLabel: 'Design',
  themeSystem: 'System',
  themeLight: 'Hell',
  themeDark: 'Dunkel',
  uiLanguageLabel: 'Sprache der Oberfläche',
  uiLanguageAuto: (nativeName) => `Auto (${nativeName})`,
  soundLabel: 'Ton',
  customGameTitle: 'Eigenes Spiel',
  customModeLegend: 'Feld',
  customModeRandom: 'Überrasch mich',
  customModeLetters: 'Buchstaben wählen',
  customMinLabel: 'min',
  customMaxLabel: 'max',
  customLettersLabel: 'Buchstaben',
  customLettersHint:
    'Bis zu 7 Buchstaben eingeben · einen antippen, um ihn in jedem Wort zu verlangen',
  customMinLengthLabel: 'Mindestwortlänge',
  customWordCountLabel: 'Wortanzahl',
  customPangramLabel: 'Pangramm verlangen',
  customPreviewRandom: (minWords, maxWords) =>
    `Es wird ein Feld mit ${minWords}–${maxWords} Wörtern erzeugt`,
  customCreateButton: 'Spiel erstellen',
  customPreview: (words, points, hasPangram) =>
    `${words} ${plural('de', words, { one: 'Wort', other: 'Wörter' })} · ` +
    `${points} ${plural('de', points, { one: 'Punkt', other: 'Punkte' })}` +
    (hasPangram ? ' · Pangramm ✓' : ' · kein Pangramm'),
  customError: (kind) =>
    kind === 'no-words'
      ? 'Keine gültigen Wörter für diese Buchstaben'
      : 'Mit diesen Einstellungen ließ sich kein Spiel erstellen',
  restartButton: 'Neu starten',
  historyButton: 'Verlauf',
  historyTitle: 'Verlauf',
  historyEmpty:
    'Noch nichts hier — finde ein Wort, um deinen Verlauf zu starten.',
  sortRecent: 'Zuletzt',
  sortResult: 'Ergebnis',
  sortRating: 'Rang',
  statPlayed: 'Spiele',
  statWon: 'Gewonnen',
  statStreak: 'Serie',
  statHints: 'Tipps',
  achievementsButton: 'Erfolge',
  achievementsTitle: 'Erfolge',
  achievementsEarned: (earned, total) => `${earned} von ${total} erreicht`,
  achievementEarnedLabel: 'Erreicht',
  achievementLockedLabel: 'Gesperrt',
  unlockedLabel: 'Freigeschaltet',
  achievementsNew: (count) => `${count} neu`,
  achievements: {
    'first-win': { name: 'Erster Sieg', description: 'Gewinne ein Spiel' },
    'no-help-needed': { name: 'Ohne Hilfe', description: 'Gewinne ohne Tipp' },
    'first-perfect': {
      name: 'Perfektes Spiel',
      description: 'Hole alle Punkte eines Bretts',
    },
    completionist: {
      name: 'Komplettist',
      description: 'Finde alle Wörter eines Bretts, Tipps eingeschlossen',
    },
    'super-genius': {
      name: 'Supergenie',
      description: 'Erreiche Supergenie auf einem Brett',
    },
    pangrammer: { name: 'Pangrammatiker', description: 'Finde ein Pangramm' },
    'long-haul': {
      name: 'Langstrecke',
      description: 'Finde ein Wort mit zehn oder mehr Buchstaben',
    },
    'saw-what-you-did-there': {
      name: 'Erwischt',
      description: 'Finde ein Wort, das die Liste verraten hat',
    },
    marathon: {
      name: 'Marathon',
      description: 'Finde 25 Wörter auf einem Brett',
    },
    challenger: {
      name: 'Herausforderer',
      description: 'Schlage eine geteilte Punktzahl',
    },
    'good-sport': {
      name: 'Sportsgeist',
      description:
        'Beende eine Herausforderung, die du nicht schlagen konntest',
    },
    'hard-mode': {
      name: 'Schwerer Modus',
      description: 'Gewinne mit Wörtern ab 5 Buchstaben',
    },
    'double-duty': {
      name: 'Doppelpflicht',
      description: 'Gewinne ein Brett mit zwei Pflichtbuchstaben',
    },
    builder: {
      name: 'Baumeister',
      description: 'Gewinne ein selbst gebautes Brett',
    },
    overreach: { name: 'Übermut', description: 'Verspiele den Sieg mit Tipps' },
    host: { name: 'Gastgeber', description: 'Teile ein Brett' },
    'ten-wins': { name: 'Zehn Siege', description: 'Gewinne zehn Spiele' },
    'fifty-wins': {
      name: 'Fünfzig Siege',
      description: 'Gewinne fünfzig Spiele',
    },
    century: { name: 'Hundert', description: 'Gewinne hundert Spiele' },
    wordsmith: { name: 'Wortschmied', description: 'Finde tausend Wörter' },
    perfectionist: {
      name: 'Perfektionist',
      description: 'Schaffe zehn perfekte Spiele',
    },
    bilingual: {
      name: 'Zweisprachig',
      description: 'Gewinne in einer zweiten Wortliste',
    },
    polyglot: { name: 'Polyglott', description: 'Gewinne in jeder Wortliste' },
  },
  shareButton: 'Teilen',
  shareCopied: 'Kopiert!',
  wordsRemaining: (count) =>
    count === 0 ? ' (alle gefunden)' : ` (noch ${count})`,
  challengeBehind: (points, mark) =>
    `${points} ${plural('de', points, { one: 'Punkt', other: 'Punkte' })} hinter ${mark}`,
  challengeTied: (mark) => `Gleichauf mit ${mark}`,
  challengeAhead: (points, mark) =>
    `${points} ${plural('de', points, { one: 'Punkt', other: 'Punkte' })} vor ${mark}`,
  challengeUnreachable: (mark) => `${mark} außer Reichweite`,
  challengeBehindNote: (points, score) =>
    `${points} ${plural('de', points, { one: 'Punkt', other: 'Punkte' })} hinter der geteilten Punktzahl von ${score}`,
  challengeTiedNote: (score) =>
    `Gleichauf mit der geteilten Punktzahl von ${score}`,
  challengeTiedDoneNote: (score) =>
    `Du hast die geteilte Punktzahl von ${score} erreicht!`,
  challengeAheadNote: (points, score) =>
    `Du hast die geteilte Punktzahl von ${score} um ${points} ${plural('de', points, { one: 'Punkt', other: 'Punkte' })} geschlagen!`,
  challengeUnreachableNote: (score) =>
    `Die geteilte Punktzahl von ${score} ist außer Reichweite`,
  hintButton: 'Tipp',
  hintsUsed: (count, lostPoints) =>
    `${count} ${plural('de', count, { one: 'Tipp', other: 'Tipps' })} ` +
    `(−${lostPoints} Pkt.)`,
  hintCostBadge: (cost) => `−${cost} Max`,
  hintCostLabel: (cost) =>
    `Deckt ein Wort auf und senkt deinen Höchstpunktestand um ${cost} ${plural('de', cost, { one: 'Punkt', other: 'Punkte' })}`,
  hintedLegend: '* mit einem Tipp aufgedeckt',
  unfoundCountLabel: (count) =>
    `${count} ${plural('de', count, { one: 'Wort', other: 'Wörter' })}`,
  unfoundBlockLabel: (count, letters) =>
    `${plural('de', count, {
      one: 'Ein ungefundenes Wort beginnt',
      other: `${count} ungefundene Wörter beginnen`,
    })} mit ${letters} – Buchstaben eintragen`,
  hintAgainLabel:
    'Zeigt dein aufgedecktes Wort erneut — ohne zusätzliche Kosten',
  hintForfeitsWinLabel:
    'Deckt ein Wort auf — dein bestmöglicher Punktestand fiele unter die Siegmarke',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Zu viele Tipps — zum Sieg sind ${winPoints} Punkte nötig, ` +
    `aber nur noch ${reachablePoints} ${plural('de', reachablePoints, { one: 'ist', other: 'sind' })} erreichbar.`,
  lockedOutTitle: 'Nicht mehr erreichbar',
  lockedOutShort: 'Gewinnen ist nicht mehr möglich',
  winThresholdLabel: (winPoints) =>
    `Sieg ab ${winPoints} ${plural('de', winPoints, { one: 'Punkt', other: 'Punkten' })}`,
  victory: 'DU GEWINNST!',
  invalidGameData: 'UNGÜLTIGE SPIELDATEN!',
  generationFailed: 'Es konnte kein Spiel erstellt werden!',
  dictionaryLoadFailed: (detail) =>
    `Das Wörterbuch konnte nicht geladen werden (${detail})!`,
  currentWordLabel: 'Aktuelles Wort',
  completionLabel: 'Fortschritt',
  requiredLetterTitle: 'Pflichtbuchstabe',
  deadLetterNote:
    'Kein neues Wort kann diesen Buchstaben als Nächstes brauchen',
  ratingsTitle: 'Ränge',
  ratingReachedLabel: 'Erreicht',
  ratingNotReachedLabel: 'Noch nicht erreicht',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Bereits gefunden';
      case 'dead-end':
        return 'Kein neues Wort beginnt mit diesen Buchstaben';
      case 'invalid-letters':
        return 'Enthält Buchstaben außerhalb des Salats';
      case 'missing-required':
        return `Muss ${Array.from(preview.requiredCharacters).join(', ')} enthalten`;
      case 'not-a-word':
        return 'Nicht in der Wortliste';
      case 'too-short':
        return 'Zu kurz';
      case 'valid':
        return preview.points > 0
          ? `Bringt ${preview.points} ${plural('de', preview.points, { one: 'Punkt', other: 'Punkte' })}`
          : 'Bringt keine Punkte (durch Hinweis aufgedeckt)';
    }
  },
  coachLength: (minLength) =>
    `Wörter ab ${minLength} Buchstaben — Wiederholungen erlaubt.`,
  coachRequired: 'Jedes Wort muss {letters} enthalten.',
  coachPangram: (letterCount) =>
    `Nutze alle ${letterCount} Buchstaben für einen Bonus.`,
  coachCompact: (minLength) =>
    `${minLength}+ Buchstaben · immer {letters} · Wiederholungen erlaubt`,
  coachCompactFree: (minLength) =>
    `${minLength}+ Buchstaben · Wiederholungen erlaubt`,
  howToPlayButton: 'Spielanleitung',
  howToPlayTitle: 'Spielanleitung',
  howToPlayLetters: (minLength, letterCount) =>
    `Bilde Wörter aus ${minLength} oder mehr Buchstaben aus den ${letterCount} Buchstaben des Salats. Ein Buchstabe darf mehrfach verwendet werden.`,
  howToPlayRequired: (count) =>
    plural('de', count, {
      one: 'Jedes Wort muss den Pflichtbuchstaben {letters} enthalten.',
      other: 'Jedes Wort muss die Pflichtbuchstaben {letters} enthalten.',
    }),
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `Längere Wörter bringen mehr: ein Wort mit ${minLength} Buchstaben zählt 1 Punkt, jeder weitere Buchstabe einen mehr. Verwende alle ${letterCount} Buchstaben in einem Wort für ${bonus} Bonuspunkte.`,
  howToPlayRanks: (winPercent) =>
    `Dein Rang steigt mit deinem Anteil an den Punkten des Bretts. Erreiche ${winPercent} %, um zu gewinnen — oder finde alles.`,
  howToPlayHints:
    'Ein Tipp verrät das kürzeste fehlende Wort. Er bringt keine Punkte, und seine Punkte werden vom Maximum des Bretts abgezogen — jeder Tipp senkt also den besten noch erreichbaren Rang.',
  howToPlayTypeHint: 'Tippen zum Buchstabieren',
  closeButton: 'Schließen',
  levelName: (level) => LEVELS_DE[level] ?? level,
  thresholdFrom: (points) => `ab ${points} Pkt.`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `${feedback.letter} ist nicht im Wortsalat!`;
      case 'scored':
        return `${feedback.word} bringt dir ${feedback.points} ${plural('de', feedback.points, { one: 'Punkt', other: 'Punkte' })}!`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word} wurde schon gefunden!`;
          case 'invalid-letters':
            return `${feedback.word} enthält ungültige Buchstaben!`;
          case 'missing-required':
            return `${feedback.word} enthält den Pflichtbuchstaben nicht!`;
          case 'not-a-word':
            return `${feedback.word} wurde nicht gefunden!`;
          case 'too-short':
            return `${feedback.word} ist zu kurz!`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ${plural('de', maxPoints, { one: 'Punkt', other: 'Punkte' })}`,
  pointsToRank: (points, rank) =>
    `noch ${points} ${plural('de', points, { one: 'Punkt', other: 'Punkte' })} bis ${rank}`,
};

const LEVELS_IT: Record<string, string> = {
  Idiot: 'Somaro',
  Meh: 'Mah',
  Okay: 'Passabile',
  Nice: 'Carino',
  'Not-Too-Shabby': 'Niente male',
  Great: 'Grande',
  Awesome: 'Fantastico',
  'Smarty-Pants': 'Saputello',
  Genius: 'Genio',
  'Super-Genius': 'Supergenio',
  'Super-Duper-Genius': 'Mega-Supergenio',
};

const IT: Messages = {
  locale: 'it',
  appTitle: 'Word Salad',
  deleteButton: 'Elimina',
  tossButton: 'Mescola',
  submitButton: 'Invia',
  wordsHeader: 'Parole',
  pointsHeader: 'Punti',
  newGameButton: 'Nuova partita',
  keepPlayingButton: 'Continua a giocare',
  customGameButton: 'Partita personalizzata',
  moreMenuLabel: 'Altre opzioni',
  wordListLabel: 'Lista di parole',
  themeLabel: 'Tema',
  themeSystem: 'Sistema',
  themeLight: 'Chiaro',
  themeDark: 'Scuro',
  uiLanguageLabel: 'Lingua dell’interfaccia',
  uiLanguageAuto: (nativeName) => `Auto (${nativeName})`,
  soundLabel: 'Suono',
  customGameTitle: 'Partita personalizzata',
  customModeLegend: 'Tabellone',
  customModeRandom: 'Sorprendimi',
  customModeLetters: 'Scegli le lettere',
  customMinLabel: 'min',
  customMaxLabel: 'max',
  customLettersLabel: 'Lettere',
  customLettersHint:
    'Digita fino a 7 lettere · toccane una per richiederla in ogni parola',
  customMinLengthLabel: 'Lunghezza minima delle parole',
  customWordCountLabel: 'Numero di parole',
  customPangramLabel: 'Richiedi un pangramma',
  customPreviewRandom: (minWords, maxWords) =>
    `Verrà generato un tabellone da ${minWords} a ${maxWords} parole`,
  customCreateButton: 'Crea partita',
  customPreview: (words, points, hasPangram) =>
    `${words} ${plural('it', words, { one: 'parola', other: 'parole' })} · ` +
    `${points} ${plural('it', points, { one: 'punto', other: 'punti' })}` +
    (hasPangram ? ' · pangramma ✓' : ' · nessun pangramma'),
  customError: (kind) =>
    kind === 'no-words'
      ? 'Nessuna parola valida per queste lettere'
      : 'Impossibile creare una partita con queste impostazioni',
  restartButton: 'Ricomincia',
  historyButton: 'Cronologia',
  historyTitle: 'Cronologia',
  historyEmpty:
    'Ancora niente qui: trova una parola per iniziare la cronologia.',
  sortRecent: 'Recenti',
  sortResult: 'Risultato',
  sortRating: 'Livello',
  statPlayed: 'Partite',
  statWon: 'Vinte',
  statStreak: 'Serie',
  statHints: 'Indizi',
  achievementsButton: 'Obiettivi',
  achievementsTitle: 'Obiettivi',
  achievementsEarned: (earned, total) => `${earned} di ${total} ottenuti`,
  achievementEarnedLabel: 'Ottenuto',
  achievementLockedLabel: 'Bloccato',
  unlockedLabel: 'Sbloccato',
  achievementsNew: (count) =>
    `${count} ${plural('it', count, { one: 'nuovo', other: 'nuovi' })}`,
  achievements: {
    'first-win': { name: 'Prima vittoria', description: 'Vinci una partita' },
    'no-help-needed': {
      name: 'Senza aiuto',
      description: 'Vinci senza suggerimenti',
    },
    'first-perfect': {
      name: 'Partita perfetta',
      description: 'Ottieni tutti i punti di una griglia',
    },
    completionist: {
      name: 'Completista',
      description:
        'Trova tutte le parole di una griglia, suggerimenti compresi',
    },
    'super-genius': {
      name: 'Supergenio',
      description: 'Raggiungi Supergenio su una griglia',
    },
    pangrammer: { name: 'Pangrammista', description: 'Trova un pangramma' },
    'long-haul': {
      name: 'Lunga corsa',
      description: 'Trova una parola di dieci lettere o più',
    },
    'saw-what-you-did-there': {
      name: 'Ho visto tutto',
      description: 'Trova una parola che la lista aveva tradito',
    },
    marathon: {
      name: 'Maratona',
      description: 'Trova 25 parole sulla stessa griglia',
    },
    challenger: {
      name: 'Sfidante',
      description: 'Batti un punteggio condiviso',
    },
    'good-sport': {
      name: 'Sportività',
      description: 'Completa una sfida che non potevi battere',
    },
    'hard-mode': {
      name: 'Modalità difficile',
      description: 'Vinci con parole di almeno 5 lettere',
    },
    'double-duty': {
      name: 'Doppio obbligo',
      description: 'Vinci una griglia con due lettere obbligatorie',
    },
    builder: {
      name: 'Costruttore',
      description: 'Vinci una griglia creata da te',
    },
    overreach: {
      name: 'Troppa foga',
      description: 'Rendi la vittoria irraggiungibile a forza di suggerimenti',
    },
    host: { name: 'Anfitrione', description: 'Condividi una griglia' },
    'ten-wins': { name: 'Dieci vittorie', description: 'Vinci dieci partite' },
    'fifty-wins': {
      name: 'Cinquanta vittorie',
      description: 'Vinci cinquanta partite',
    },
    century: { name: 'Centenario', description: 'Vinci cento partite' },
    wordsmith: { name: 'Letterato', description: 'Trova mille parole' },
    perfectionist: {
      name: 'Perfezionista',
      description: 'Completa dieci partite perfette',
    },
    bilingual: {
      name: 'Bilingue',
      description: 'Vinci in una seconda lista di parole',
    },
    polyglot: {
      name: 'Poliglotta',
      description: 'Vinci in tutte le liste di parole',
    },
  },
  shareButton: 'Condividi',
  shareCopied: 'Copiato!',
  wordsRemaining: (count) =>
    count === 0
      ? ' (tutte trovate)'
      : ` (${count} ${plural('it', count, { one: 'rimanente', other: 'rimanenti' })})`,
  challengeBehind: (points, mark) =>
    `${points} ${plural('it', points, { one: 'punto', other: 'punti' })} dietro ${mark}`,
  challengeTied: (mark) => `Pari con ${mark}`,
  challengeAhead: (points, mark) =>
    `${points} ${plural('it', points, { one: 'punto', other: 'punti' })} davanti a ${mark}`,
  challengeUnreachable: (mark) => `${mark} fuori portata`,
  challengeBehindNote: (points, score) =>
    `${points} ${plural('it', points, { one: 'punto', other: 'punti' })} dietro il punteggio condiviso di ${score}`,
  challengeTiedNote: (score) => `Pari con il punteggio condiviso di ${score}`,
  challengeTiedDoneNote: (score) =>
    `Hai pareggiato il punteggio condiviso di ${score}!`,
  challengeAheadNote: (points, score) =>
    `Hai battuto il punteggio condiviso di ${score} di ${points} ${plural('it', points, { one: 'punto', other: 'punti' })}!`,
  challengeUnreachableNote: (score) =>
    `Il punteggio condiviso di ${score} è fuori portata`,
  hintButton: 'Indizio',
  hintsUsed: (count, lostPoints) =>
    `${count} ${plural('it', count, { one: 'indizio', other: 'indizi' })} ` +
    `(−${lostPoints} pt)`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Rivela una parola e riduce il punteggio massimo di ${cost} ${plural('it', cost, { one: 'punto', other: 'punti' })}`,
  hintedLegend: '* rivelata con un indizio',
  unfoundCountLabel: (count) =>
    `${count} ${plural('it', count, { one: 'parola', other: 'parole' })}`,
  unfoundBlockLabel: (count, letters) =>
    `${plural('it', count, {
      one: 'Una parola non trovata inizia',
      other: `${count} parole non trovate iniziano`,
    })} con ${letters} — inserisci queste lettere`,
  hintAgainLabel:
    'Mostra di nuovo la parola dell’indizio, senza costi aggiuntivi',
  hintForfeitsWinLabel:
    'Rivela una parola: il tuo punteggio massimo possibile scenderebbe sotto la soglia di vittoria',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Troppi indizi: per vincere ${plural('it', winPoints, { one: 'serve', other: 'servono' })} ${winPoints} ${plural('it', winPoints, { one: 'punto', other: 'punti' })}, ` +
    `ma ne ${plural('it', reachablePoints, { one: 'resta raggiungibile', other: 'restano raggiungibili' })} solo ${reachablePoints}.`,
  lockedOutTitle: 'Fuori portata',
  lockedOutShort: 'La vittoria è fuori portata',
  winThresholdLabel: (winPoints) =>
    `Vittoria a ${winPoints} ${plural('it', winPoints, { one: 'punto', other: 'punti' })}`,
  victory: 'HAI VINTO!',
  invalidGameData: 'DATI DI GIOCO NON VALIDI!',
  generationFailed: 'Impossibile generare una partita!',
  dictionaryLoadFailed: (detail) =>
    `Impossibile caricare il dizionario (${detail})!`,
  currentWordLabel: 'Parola corrente',
  completionLabel: 'Avanzamento',
  requiredLetterTitle: 'Lettera obbligatoria',
  deadLetterNote: 'Nessuna parola nuova può usare questa lettera qui',
  ratingsTitle: 'Livelli',
  ratingReachedLabel: 'Raggiunto',
  ratingNotReachedLabel: 'Non ancora raggiunto',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Già trovata';
      case 'dead-end':
        return 'Nessuna parola nuova inizia con queste lettere';
      case 'invalid-letters':
        return "Usa lettere fuori dall'insalata";
      case 'missing-required':
        return `Deve contenere ${Array.from(preview.requiredCharacters).join(', ')}`;
      case 'not-a-word':
        return "Non è nell'elenco delle parole";
      case 'too-short':
        return 'Troppo corta';
      case 'valid':
        return preview.points > 0
          ? `Vale ${preview.points} ${plural('it', preview.points, { one: 'punto', other: 'punti' })}`
          : 'Non vale punti (rivelata da un indizio)';
    }
  },
  coachLength: (minLength) =>
    `Parole di ${minLength}+ lettere — lettere ripetibili.`,
  coachRequired: 'Ogni parola deve usare {letters}.',
  coachPangram: (letterCount) =>
    `Usa tutte le ${letterCount} lettere per un bonus.`,
  coachCompact: (minLength) =>
    `${minLength}+ lettere · sempre {letters} · lettere ripetibili`,
  coachCompactFree: (minLength) => `${minLength}+ lettere · lettere ripetibili`,
  howToPlayButton: 'Come si gioca',
  howToPlayTitle: 'Come si gioca',
  howToPlayLetters: (minLength, letterCount) =>
    `Forma parole di ${minLength} o più lettere con le ${letterCount} lettere dell'insalata. Una lettera può essere usata più volte.`,
  howToPlayRequired: (count) =>
    plural('it', count, {
      one: 'Ogni parola deve contenere la lettera obbligatoria {letters}.',
      other: 'Ogni parola deve contenere le lettere obbligatorie {letters}.',
    }),
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `Le parole lunghe valgono di più: una parola di ${minLength} lettere vale 1 punto, e ogni lettera in più ne aggiunge uno. Usa tutte le ${letterCount} lettere in una sola parola per un bonus di ${bonus} punti.`,
  howToPlayRanks: (winPercent) =>
    `Il tuo grado sale con la tua quota dei punti del tabellone. Raggiungi il ${winPercent}% per vincere — o trova tutto.`,
  howToPlayHints:
    'Un suggerimento rivela la parola mancante più corta. Non dà punti, e i suoi punti vengono tolti dal massimo del tabellone: ogni suggerimento abbassa il miglior grado ancora raggiungibile.',
  howToPlayTypeHint: 'Digita per comporre',
  closeButton: 'Chiudi',
  levelName: (level) => LEVELS_IT[level] ?? level,
  thresholdFrom: (points) => `da ${points} pt`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `${feedback.letter} non è nell'insalata di parole!`;
      case 'scored':
        return `${feedback.word} ti ha fatto guadagnare ${feedback.points} ${plural('it', feedback.points, { one: 'punto', other: 'punti' })}!`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word} è già stata trovata!`;
          case 'invalid-letters':
            return `${feedback.word} contiene lettere non valide!`;
          case 'missing-required':
            return `${feedback.word} non contiene la lettera obbligatoria!`;
          case 'not-a-word':
            return `${feedback.word} non è stata trovata!`;
          case 'too-short':
            return `${feedback.word} è troppo corta!`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ${plural('it', maxPoints, { one: 'punto', other: 'punti' })}`,
  pointsToRank: (points, rank) =>
    `a ${points} ${plural('it', points, { one: 'punto', other: 'punti' })} da ${rank}`,
};

const LEVELS_PT: Record<string, string> = {
  Idiot: 'Tapado',
  Meh: 'Meh',
  Okay: 'Razoável',
  Nice: 'Legal',
  'Not-Too-Shabby': 'Nada mal',
  Great: 'Ótimo',
  Awesome: 'Incrível',
  'Smarty-Pants': 'Sabichão',
  Genius: 'Gênio',
  'Super-Genius': 'Supergênio',
  'Super-Duper-Genius': 'Mega-Supergênio',
};

const PT: Messages = {
  locale: 'pt',
  appTitle: 'Word Salad',
  deleteButton: 'Apagar',
  tossButton: 'Misturar',
  submitButton: 'Enviar',
  wordsHeader: 'Palavras',
  pointsHeader: 'Pontos',
  newGameButton: 'Novo jogo',
  keepPlayingButton: 'Continuar jogando',
  customGameButton: 'Jogo personalizado',
  moreMenuLabel: 'Mais opções',
  wordListLabel: 'Lista de palavras',
  themeLabel: 'Tema',
  themeSystem: 'Sistema',
  themeLight: 'Claro',
  themeDark: 'Escuro',
  uiLanguageLabel: 'Idioma da interface',
  uiLanguageAuto: (nativeName) => `Auto (${nativeName})`,
  soundLabel: 'Som',
  customGameTitle: 'Jogo personalizado',
  customModeLegend: 'Tabuleiro',
  customModeRandom: 'Surpreenda-me',
  customModeLetters: 'Escolher letras',
  customMinLabel: 'mín',
  customMaxLabel: 'máx',
  customLettersLabel: 'Letras',
  customLettersHint:
    'Digite até 7 letras · toque numa para exigi-la em cada palavra',
  customMinLengthLabel: 'Comprimento mínimo da palavra',
  customWordCountLabel: 'Número de palavras',
  customPangramLabel: 'Exigir um pangrama',
  customPreviewRandom: (minWords, maxWords) =>
    `Será gerado um tabuleiro de ${minWords} a ${maxWords} palavras`,
  customCreateButton: 'Criar jogo',
  customPreview: (words, points, hasPangram) =>
    `${words} palavra${plural('pt', words, { one: '', other: 's' })} · ` +
    `${points} ponto${plural('pt', points, { one: '', other: 's' })}` +
    (hasPangram ? ' · pangrama ✓' : ' · sem pangrama'),
  customError: (kind) =>
    kind === 'no-words'
      ? 'Nenhuma palavra válida para estas letras'
      : 'Não foi possível criar um jogo com estas definições',
  restartButton: 'Recomeçar',
  historyButton: 'Histórico',
  historyTitle: 'Histórico',
  historyEmpty:
    'Nada aqui ainda — marque uma palavra para começar seu histórico.',
  sortRecent: 'Recentes',
  sortResult: 'Resultado',
  sortRating: 'Nível',
  statPlayed: 'Partidas',
  statWon: 'Vencidas',
  statStreak: 'Sequência',
  statHints: 'Dicas',
  achievementsButton: 'Conquistas',
  achievementsTitle: 'Conquistas',
  achievementsEarned: (earned, total) => `${earned} de ${total} conquistadas`,
  achievementEarnedLabel: 'Conquistada',
  achievementLockedLabel: 'Bloqueada',
  unlockedLabel: 'Desbloqueado',
  achievementsNew: (count) =>
    `${count} ${plural('pt', count, { one: 'nova', other: 'novas' })}`,
  achievements: {
    'first-win': { name: 'Primeira vitória', description: 'Vença um jogo' },
    'no-help-needed': { name: 'Sem ajuda', description: 'Vença sem dicas' },
    'first-perfect': {
      name: 'Jogo perfeito',
      description: 'Faça todos os pontos de um tabuleiro',
    },
    completionist: {
      name: 'Completista',
      description:
        'Encontre todas as palavras de um tabuleiro, dicas incluídas',
    },
    'super-genius': {
      name: 'Supergênio',
      description: 'Alcance Supergênio em um tabuleiro',
    },
    pangrammer: { name: 'Pangramista', description: 'Encontre um pangrama' },
    'long-haul': {
      name: 'Longa jornada',
      description: 'Encontre uma palavra de dez letras ou mais',
    },
    'saw-what-you-did-there': {
      name: 'Vi tudo',
      description: 'Encontre uma palavra que a lista entregou',
    },
    marathon: {
      name: 'Maratona',
      description: 'Encontre 25 palavras em um mesmo tabuleiro',
    },
    challenger: {
      name: 'Desafiante',
      description: 'Supere uma pontuação compartilhada',
    },
    'good-sport': {
      name: 'Espírito esportivo',
      description: 'Termine um desafio que não conseguiu superar',
    },
    'hard-mode': {
      name: 'Modo difícil',
      description: 'Vença com palavras de no mínimo 5 letras',
    },
    'double-duty': {
      name: 'Dupla tarefa',
      description: 'Vença um tabuleiro com duas letras obrigatórias',
    },
    builder: {
      name: 'Construtor',
      description: 'Vença um tabuleiro criado por você',
    },
    overreach: {
      name: 'Exagero',
      description: 'Deixe a vitória fora de alcance à custa de dicas',
    },
    host: { name: 'Anfitrião', description: 'Compartilhe um tabuleiro' },
    'ten-wins': { name: 'Dez vitórias', description: 'Vença dez jogos' },
    'fifty-wins': {
      name: 'Cinquenta vitórias',
      description: 'Vença cinquenta jogos',
    },
    century: { name: 'Centenário', description: 'Vença cem jogos' },
    wordsmith: { name: 'Letrado', description: 'Encontre mil palavras' },
    perfectionist: {
      name: 'Perfeccionista',
      description: 'Faça dez jogos perfeitos',
    },
    bilingual: {
      name: 'Bilíngue',
      description: 'Vença em uma segunda lista de palavras',
    },
    polyglot: {
      name: 'Poliglota',
      description: 'Vença em todas as listas de palavras',
    },
  },
  shareButton: 'Compartilhar',
  shareCopied: 'Copiado!',
  wordsRemaining: (count) =>
    count === 0
      ? ' (todas encontradas)'
      : ` (${plural('pt', count, { one: 'falta', other: 'faltam' })} ${count})`,
  challengeBehind: (points, mark) =>
    `${points} ponto${plural('pt', points, { one: '', other: 's' })} atrás de ${mark}`,
  challengeTied: (mark) => `Empatado com ${mark}`,
  challengeAhead: (points, mark) =>
    `${points} ponto${plural('pt', points, { one: '', other: 's' })} à frente de ${mark}`,
  challengeUnreachable: (mark) => `${mark} fora de alcance`,
  challengeBehindNote: (points, score) =>
    `${points} ponto${plural('pt', points, { one: '', other: 's' })} atrás da pontuação compartilhada de ${score}`,
  challengeTiedNote: (score) =>
    `Empatado com a pontuação compartilhada de ${score}`,
  challengeTiedDoneNote: (score) =>
    `Você igualou a pontuação compartilhada de ${score}!`,
  challengeAheadNote: (points, score) =>
    `Você superou a pontuação compartilhada de ${score} por ${points} ponto${plural('pt', points, { one: '', other: 's' })}!`,
  challengeUnreachableNote: (score) =>
    `A pontuação compartilhada de ${score} está fora de alcance`,
  hintButton: 'Dica',
  hintsUsed: (count, lostPoints) =>
    `${count} dica${plural('pt', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('pt', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} máx`,
  hintCostLabel: (cost) =>
    `Revela uma palavra e reduz sua pontuação máxima em ${cost} ponto${plural('pt', cost, { one: '', other: 's' })}`,
  hintedLegend: '* revelada com uma dica',
  unfoundCountLabel: (count) =>
    `${count} ${plural('pt', count, { one: 'palavra', other: 'palavras' })}`,
  unfoundBlockLabel: (count, letters) =>
    `${plural('pt', count, {
      one: 'Uma palavra não encontrada começa',
      other: `${count} palavras não encontradas começam`,
    })} com ${letters} — preencher estas letras`,
  hintAgainLabel: 'Mostra novamente a palavra da dica, sem custo extra',
  hintForfeitsWinLabel:
    'Revela uma palavra — sua pontuação máxima possível cairia abaixo da linha de vitória',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Dicas demais — vencer exige ${winPoints} pontos, ` +
    `mas só dá para alcançar ${reachablePoints}.`,
  lockedOutTitle: 'Fora de alcance',
  lockedOutShort: 'A vitória está fora de alcance',
  winThresholdLabel: (winPoints) => `Vitória com ${winPoints} pontos`,
  victory: 'VOCÊ VENCEU!',
  invalidGameData: 'DADOS DE JOGO INVÁLIDOS!',
  generationFailed: 'Não foi possível gerar um jogo!',
  dictionaryLoadFailed: (detail) =>
    `Não foi possível carregar o dicionário (${detail})!`,
  currentWordLabel: 'Palavra atual',
  completionLabel: 'Progresso',
  requiredLetterTitle: 'Letra obrigatória',
  deadLetterNote: 'Nenhuma palavra nova pode usar esta letra aqui',
  ratingsTitle: 'Níveis',
  ratingReachedLabel: 'Alcançado',
  ratingNotReachedLabel: 'Ainda não alcançado',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Já encontrada';
      case 'dead-end':
        return 'Nenhuma palavra nova começa com estas letras';
      case 'invalid-letters':
        return 'Usa letras fora da salada';
      case 'missing-required':
        return `Deve conter ${Array.from(preview.requiredCharacters).join(', ')}`;
      case 'not-a-word':
        return 'Não está na lista de palavras';
      case 'too-short':
        return 'Curta demais';
      case 'valid':
        return preview.points > 0
          ? `Vale ${preview.points} ponto${plural('pt', preview.points, { one: '', other: 's' })}`
          : 'Não vale pontos (revelada por uma dica)';
    }
  },
  coachLength: (minLength) =>
    `Palavras com ${minLength}+ letras — as letras podem repetir.`,
  coachRequired: 'Toda palavra precisa usar {letters}.',
  coachPangram: (letterCount) =>
    `Use todas as ${letterCount} letras para um bônus.`,
  coachCompact: (minLength) =>
    `${minLength}+ letras · sempre {letters} · letras podem repetir`,
  coachCompactFree: (minLength) =>
    `${minLength}+ letras · letras podem repetir`,
  howToPlayButton: 'Como jogar',
  howToPlayTitle: 'Como jogar',
  howToPlayLetters: (minLength, letterCount) =>
    `Forme palavras com ${minLength} ou mais letras a partir das ${letterCount} letras da salada. Uma letra pode ser usada mais de uma vez.`,
  howToPlayRequired: (count) =>
    plural('pt', count, {
      one: 'Toda palavra precisa incluir a letra obrigatória {letters}.',
      other: 'Toda palavra precisa incluir as letras obrigatórias {letters}.',
    }),
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `Palavras longas valem mais: uma palavra de ${minLength} letras vale 1 ponto, e cada letra extra soma um. Use todas as ${letterCount} letras em uma só palavra para um bônus de ${bonus} pontos.`,
  howToPlayRanks: (winPercent) =>
    `Seu nível sobe com sua parte dos pontos do tabuleiro. Alcance ${winPercent}% para vencer — ou encontre tudo.`,
  howToPlayHints:
    'Uma dica revela a palavra mais curta que falta. Ela não pontua, e seus pontos saem do máximo do tabuleiro — assim cada dica reduz o melhor nível que você ainda pode alcançar.',
  howToPlayTypeHint: 'Digite para soletrar',
  closeButton: 'Fechar',
  levelName: (level) => LEVELS_PT[level] ?? level,
  thresholdFrom: (points) =>
    `a partir de ${points} pt${plural('pt', points, { one: '', other: 's' })}`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `${feedback.letter} não está na salada de palavras!`;
      case 'scored':
        return `${feedback.word} te rendeu ${feedback.points} ponto${plural('pt', feedback.points, { one: '', other: 's' })}!`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word} já foi encontrada!`;
          case 'invalid-letters':
            return `${feedback.word} tem letras inválidas!`;
          case 'missing-required':
            return `${feedback.word} não tem a letra obrigatória!`;
          case 'not-a-word':
            return `${feedback.word} não foi encontrada!`;
          case 'too-short':
            return `${feedback.word} é curta demais!`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ponto${plural('pt', maxPoints, { one: '', other: 's' })}`,
  pointsToRank: (points, rank) =>
    `a ${points} ponto${plural('pt', points, { one: '', other: 's' })} de ${rank}`,
};

const LEVELS_NL: Record<string, string> = {
  Idiot: 'Sukkel',
  Meh: 'Mwah',
  Okay: 'Oké',
  Nice: 'Aardig',
  'Not-Too-Shabby': 'Niet onaardig',
  Great: 'Sterk',
  Awesome: 'Geweldig',
  'Smarty-Pants': 'Slimmerik',
  Genius: 'Genie',
  'Super-Genius': 'Supergenie',
  'Super-Duper-Genius': 'Mega-Supergenie',
};

const NL: Messages = {
  locale: 'nl',
  appTitle: 'Word Salad',
  deleteButton: 'Wissen',
  tossButton: 'Husselen',
  submitButton: 'Invoeren',
  wordsHeader: 'Woorden',
  pointsHeader: 'Punten',
  newGameButton: 'Nieuw spel',
  keepPlayingButton: 'Verder spelen',
  customGameButton: 'Eigen spel',
  moreMenuLabel: 'Meer opties',
  wordListLabel: 'Woordenlijst',
  themeLabel: 'Thema',
  themeSystem: 'Systeem',
  themeLight: 'Licht',
  themeDark: 'Donker',
  uiLanguageLabel: 'Taal van de interface',
  uiLanguageAuto: (nativeName) => `Auto (${nativeName})`,
  soundLabel: 'Geluid',
  customGameTitle: 'Eigen spel',
  customModeLegend: 'Bord',
  customModeRandom: 'Verras me',
  customModeLetters: 'Letters kiezen',
  customMinLabel: 'min',
  customMaxLabel: 'max',
  customLettersLabel: 'Letters',
  customLettersHint:
    'Typ maximaal 7 letters · tik op één om die in elk woord te vereisen',
  customMinLengthLabel: 'Minimale woordlengte',
  customWordCountLabel: 'Aantal woorden',
  customPangramLabel: 'Pangram vereisen',
  customPreviewRandom: (minWords, maxWords) =>
    `Er wordt een bord met ${minWords}–${maxWords} woorden gegenereerd`,
  customCreateButton: 'Spel maken',
  customPreview: (words, points, hasPangram) =>
    `${words} ${plural('nl', words, { one: 'woord', other: 'woorden' })} · ` +
    `${points} ${plural('nl', points, { one: 'punt', other: 'punten' })}` +
    (hasPangram ? ' · pangram ✓' : ' · geen pangram'),
  customError: (kind) =>
    kind === 'no-words'
      ? 'Geen geldige woorden voor deze letters'
      : 'Kon geen spel maken met deze instellingen',
  restartButton: 'Opnieuw beginnen',
  historyButton: 'Geschiedenis',
  historyTitle: 'Geschiedenis',
  historyEmpty:
    'Nog niets hier — scoor een woord om je geschiedenis te starten.',
  sortRecent: 'Recent',
  sortResult: 'Resultaat',
  sortRating: 'Niveau',
  statPlayed: 'Gespeeld',
  statWon: 'Gewonnen',
  statStreak: 'Reeks',
  statHints: 'Hints',
  achievementsButton: 'Prestaties',
  achievementsTitle: 'Prestaties',
  achievementsEarned: (earned, total) => `${earned} van ${total} behaald`,
  achievementEarnedLabel: 'Behaald',
  achievementLockedLabel: 'Vergrendeld',
  unlockedLabel: 'Ontgrendeld',
  achievementsNew: (count) => `${count} nieuw`,
  achievements: {
    'first-win': { name: 'Eerste overwinning', description: 'Win een spel' },
    'no-help-needed': { name: 'Zonder hulp', description: 'Win zonder hint' },
    'first-perfect': {
      name: 'Perfect spel',
      description: 'Haal alle punten van een bord',
    },
    completionist: {
      name: 'Completist',
      description: 'Vind alle woorden van een bord, hints meegerekend',
    },
    'super-genius': {
      name: 'Supergenie',
      description: 'Bereik Supergenie op een bord',
    },
    pangrammer: { name: 'Pangrammist', description: 'Vind een pangram' },
    'long-haul': {
      name: 'Lange adem',
      description: 'Vind een woord van tien letters of meer',
    },
    'saw-what-you-did-there': {
      name: 'Betrapt',
      description: 'Vind een woord dat de lijst verraadde',
    },
    marathon: { name: 'Marathon', description: 'Vind 25 woorden op één bord' },
    challenger: { name: 'Uitdager', description: 'Versla een gedeelde score' },
    'good-sport': {
      name: 'Sportief',
      description: 'Maak een uitdaging af die je niet kon verslaan',
    },
    'hard-mode': {
      name: 'Zware modus',
      description: 'Win met woorden van minstens 5 letters',
    },
    'double-duty': {
      name: 'Dubbele plicht',
      description: 'Win een bord met twee verplichte letters',
    },
    builder: {
      name: 'Bouwer',
      description: 'Win een bord dat je zelf hebt gebouwd',
    },
    overreach: {
      name: 'Te gretig',
      description: 'Hint de overwinning buiten bereik',
    },
    host: { name: 'Gastheer', description: 'Deel een bord' },
    'ten-wins': { name: 'Tien overwinningen', description: 'Win tien spellen' },
    'fifty-wins': {
      name: 'Vijftig overwinningen',
      description: 'Win vijftig spellen',
    },
    century: { name: 'Honderd', description: 'Win honderd spellen' },
    wordsmith: { name: 'Woordsmid', description: 'Vind duizend woorden' },
    perfectionist: {
      name: 'Perfectionist',
      description: 'Speel tien perfecte spellen',
    },
    bilingual: {
      name: 'Tweetalig',
      description: 'Win in een tweede woordenlijst',
    },
    polyglot: { name: 'Polyglot', description: 'Win in elke woordenlijst' },
  },
  shareButton: 'Delen',
  shareCopied: 'Gekopieerd!',
  wordsRemaining: (count) =>
    count === 0 ? ' (alles gevonden)' : ` (nog ${count})`,
  challengeBehind: (points, mark) =>
    `${points} ${plural('nl', points, { one: 'punt', other: 'punten' })} achter ${mark}`,
  challengeTied: (mark) => `Gelijk met ${mark}`,
  challengeAhead: (points, mark) =>
    `${points} ${plural('nl', points, { one: 'punt', other: 'punten' })} voor op ${mark}`,
  challengeUnreachable: (mark) => `${mark} buiten bereik`,
  challengeBehindNote: (points, score) =>
    `${points} ${plural('nl', points, { one: 'punt', other: 'punten' })} achter de gedeelde score van ${score}`,
  challengeTiedNote: (score) => `Gelijk met de gedeelde score van ${score}`,
  challengeTiedDoneNote: (score) =>
    `Je hebt de gedeelde score van ${score} geëvenaard!`,
  challengeAheadNote: (points, score) =>
    `Je hebt de gedeelde score van ${score} met ${points} ${plural('nl', points, { one: 'punt', other: 'punten' })} verslagen!`,
  challengeUnreachableNote: (score) =>
    `De gedeelde score van ${score} is buiten bereik`,
  hintButton: 'Hint',
  hintsUsed: (count, lostPoints) =>
    `${count} hint${plural('nl', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} ${plural('nl', lostPoints, { one: 'pt', other: 'ptn' })})`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Onthult een woord en verlaagt je maximale score met ${cost} ${plural('nl', cost, { one: 'punt', other: 'punten' })}`,
  hintedLegend: '* onthuld met een hint',
  unfoundCountLabel: (count) =>
    `${count} ${plural('nl', count, { one: 'woord', other: 'woorden' })}`,
  unfoundBlockLabel: (count, letters) =>
    `${plural('nl', count, {
      one: 'Eén niet gevonden woord begint',
      other: `${count} niet gevonden woorden beginnen`,
    })} met ${letters} — deze letters invullen`,
  hintAgainLabel: 'Toont je hintwoord opnieuw — zonder extra kosten',
  hintForfeitsWinLabel:
    'Onthult een woord — je maximaal haalbare score zakt dan onder de winstgrens',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Te veel hints — winnen vergt ${winPoints} punten, ` +
    `maar er ${plural('nl', reachablePoints, { one: 'is', other: 'zijn' })} er nog maar ${reachablePoints} haalbaar.`,
  lockedOutTitle: 'Buiten bereik',
  lockedOutShort: 'Winnen is niet meer mogelijk',
  winThresholdLabel: (winPoints) =>
    `Winst bij ${winPoints} ${plural('nl', winPoints, { one: 'punt', other: 'punten' })}`,
  victory: 'JIJ WINT!',
  invalidGameData: 'ONGELDIGE SPELDATA!',
  generationFailed: 'Kon geen spel genereren!',
  dictionaryLoadFailed: (detail) =>
    `Kon het woordenboek niet laden (${detail})!`,
  currentWordLabel: 'Huidig woord',
  completionLabel: 'Voortgang',
  requiredLetterTitle: 'Verplichte letter',
  deadLetterNote: 'Geen nieuw woord kan deze letter hier gebruiken',
  ratingsTitle: 'Niveaus',
  ratingReachedLabel: 'Bereikt',
  ratingNotReachedLabel: 'Nog niet bereikt',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Al gevonden';
      case 'dead-end':
        return 'Geen nieuw woord begint met deze letters';
      case 'invalid-letters':
        return 'Bevat letters buiten de salade';
      case 'missing-required':
        return `Moet ${Array.from(preview.requiredCharacters).join(', ')} bevatten`;
      case 'not-a-word':
        return 'Staat niet in de woordenlijst';
      case 'too-short':
        return 'Te kort';
      case 'valid':
        return preview.points > 0
          ? `Levert ${preview.points} ${plural('nl', preview.points, { one: 'punt', other: 'punten' })} op`
          : 'Levert geen punten op (onthuld met een hint)';
    }
  },
  coachLength: (minLength) =>
    `Woorden van ${minLength}+ letters — letters mogen herhalen.`,
  coachRequired: 'Elk woord moet {letters} bevatten.',
  coachPangram: (letterCount) =>
    `Gebruik alle ${letterCount} letters voor een bonus.`,
  coachCompact: (minLength) =>
    `${minLength}+ letters · altijd {letters} · letters mogen herhalen`,
  coachCompactFree: (minLength) =>
    `${minLength}+ letters · letters mogen herhalen`,
  howToPlayButton: 'Speluitleg',
  howToPlayTitle: 'Speluitleg',
  howToPlayLetters: (minLength, letterCount) =>
    `Maak woorden van ${minLength} of meer letters uit de ${letterCount} letters van de salade. Een letter mag vaker worden gebruikt.`,
  howToPlayRequired: (count) =>
    plural('nl', count, {
      one: 'Elk woord moet de verplichte letter {letters} bevatten.',
      other: 'Elk woord moet de verplichte letters {letters} bevatten.',
    }),
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `Langere woorden leveren meer op: een woord van ${minLength} letters is 1 punt, en elke extra letter telt er een bij. Gebruik alle ${letterCount} letters in één woord voor ${bonus} bonuspunten.`,
  howToPlayRanks: (winPercent) =>
    `Je rang stijgt met je aandeel in de punten van het bord. Haal ${winPercent}% om te winnen — of vind alles.`,
  howToPlayHints:
    'Een hint onthult het kortste ontbrekende woord. Hij levert niets op, en zijn punten gaan van het maximum van het bord af — elke hint verlaagt dus de beste rang die je nog kunt halen.',
  howToPlayTypeHint: 'Typ om te spellen',
  closeButton: 'Sluiten',
  levelName: (level) => LEVELS_NL[level] ?? level,
  thresholdFrom: (points) =>
    `vanaf ${points} ${plural('nl', points, { one: 'pt', other: 'ptn' })}`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `${feedback.letter} zit niet in de woordsalade!`;
      case 'scored':
        return `${feedback.word} leverde je ${feedback.points} ${plural('nl', feedback.points, { one: 'punt', other: 'punten' })} op!`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word} is al gevonden!`;
          case 'invalid-letters':
            return `${feedback.word} bevat ongeldige letters!`;
          case 'missing-required':
            return `${feedback.word} mist de verplichte letter!`;
          case 'not-a-word':
            return `${feedback.word} is niet gevonden!`;
          case 'too-short':
            return `${feedback.word} is te kort!`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ${plural('nl', maxPoints, { one: 'punt', other: 'punten' })}`,
  pointsToRank: (points, rank) =>
    `nog ${points} ${plural('nl', points, { one: 'punt', other: 'punten' })} tot ${rank}`,
};

const LEVELS_JA: Record<string, string> = {
  Idiot: 'うっかり者',
  Meh: 'いまいち',
  Okay: 'まあまあ',
  Nice: 'いいね',
  'Not-Too-Shabby': '悪くない',
  Great: 'すごい',
  Awesome: '最高',
  'Smarty-Pants': '物知り',
  Genius: '天才',
  'Super-Genius': '超天才',
  'Super-Duper-Genius': '超々天才',
};

const JA: Messages = {
  locale: 'ja',
  appTitle: 'Word Salad',
  deleteButton: '削除',
  tossButton: 'シャッフル',
  submitButton: '決定',
  wordsHeader: '単語',
  pointsHeader: 'ポイント',
  newGameButton: '新しいゲーム',
  keepPlayingButton: 'プレイを続ける',
  customGameButton: 'カスタムゲーム',
  moreMenuLabel: 'その他のオプション',
  wordListLabel: '単語リスト',
  themeLabel: 'テーマ',
  themeSystem: 'システム',
  themeLight: 'ライト',
  themeDark: 'ダーク',
  uiLanguageLabel: '表示言語',
  uiLanguageAuto: (nativeName) => `自動（${nativeName}）`,
  soundLabel: 'サウンド',
  customGameTitle: 'カスタムゲーム',
  customModeLegend: '盤面',
  customModeRandom: 'おまかせ',
  customModeLetters: '文字を選ぶ',
  customMinLabel: '最小',
  customMaxLabel: '最大',
  customLettersLabel: '文字',
  customLettersHint: '最大7文字まで入力 ・タップすると必須文字になります',
  customMinLengthLabel: '単語の最小文字数',
  customWordCountLabel: '単語数',
  customPangramLabel: 'パングラムを必須にする',
  customPreviewRandom: (minWords, maxWords) =>
    `${minWords}〜${maxWords}語の盤面が生成されます`,
  customCreateButton: 'ゲームを作成',
  customPreview: (words, points, hasPangram) =>
    `${words} 単語 · ${points} ポイント` +
    (hasPangram ? ' ・パングラムあり ✓' : ' ・パングラムなし'),
  customError: (kind) =>
    kind === 'no-words'
      ? 'この文字では有効な単語がありません'
      : 'この設定ではゲームを作成できませんでした',
  restartButton: 'やり直す',
  historyButton: '履歴',
  historyTitle: '履歴',
  historyEmpty: 'まだ何もありません — 単語を見つけて履歴を始めましょう。',
  sortRecent: '新しい順',
  sortResult: '結果',
  sortRating: 'ランク',
  statPlayed: 'プレイ数',
  statWon: '勝利',
  statStreak: '連続日数',
  statHints: 'ヒント',
  achievementsButton: '実績',
  achievementsTitle: '実績',
  achievementsEarned: (earned, total) => `${total}件中${earned}件を達成`,
  achievementEarnedLabel: '達成済み',
  achievementLockedLabel: '未達成',
  unlockedLabel: '実績解除',
  achievementsNew: (count) => `新着${count}件`,
  achievements: {
    'first-win': { name: '初勝利', description: 'ゲームに勝つ' },
    'no-help-needed': { name: 'ノーヒント', description: 'ヒントなしで勝つ' },
    'first-perfect': {
      name: 'パーフェクト',
      description: 'ボードの全ポイントを獲得する',
    },
    completionist: {
      name: 'コンプリート',
      description: 'ヒントも含めてボードの全単語を見つける',
    },
    'super-genius': { name: '超天才', description: 'ボードで超天才に到達する' },
    pangrammer: { name: 'パングラム', description: 'パングラムを見つける' },
    'long-haul': {
      name: 'ロングワード',
      description: '10文字以上の単語を見つける',
    },
    'saw-what-you-did-there': {
      name: '見てたよ',
      description: 'リストが漏らした単語を見つける',
    },
    marathon: { name: 'マラソン', description: '1つのボードで25語を見つける' },
    challenger: { name: '挑戦者', description: '共有されたスコアを上回る' },
    'good-sport': {
      name: 'スポーツマンシップ',
      description: '勝てなかった挑戦をやり遂げる',
    },
    'hard-mode': {
      name: 'ハードモード',
      description: '最短5文字以上のボードで勝つ',
    },
    'double-duty': {
      name: '二重の条件',
      description: '必須文字が2つのボードで勝つ',
    },
    builder: { name: 'ビルダー', description: '自分で作ったボードで勝つ' },
    overreach: { name: '欲張り', description: 'ヒントで勝利を手放す' },
    host: { name: 'ホスト', description: 'ボードを共有する' },
    'ten-wins': { name: '10勝', description: '10回勝つ' },
    'fifty-wins': { name: '50勝', description: '50回勝つ' },
    century: { name: '100勝', description: '100回勝つ' },
    wordsmith: { name: '言葉の職人', description: '合計1000語を見つける' },
    perfectionist: {
      name: '完璧主義者',
      description: 'パーフェクトを10回達成する',
    },
    bilingual: { name: 'バイリンガル', description: '2つ目の単語リストで勝つ' },
    polyglot: { name: 'ポリグロット', description: 'すべての単語リストで勝つ' },
  },
  shareButton: '共有',
  shareCopied: 'コピーしました！',
  wordsRemaining: (count) =>
    count === 0 ? '（すべて発見）' : `（残り${count}語）`,
  challengeBehind: (points, mark) => `${mark}まで あと${points}ポイント`,
  challengeTied: (mark) => `${mark}と同点`,
  challengeAhead: (points, mark) => `${mark}を${points}ポイント上回る`,
  challengeUnreachable: (mark) => `${mark}には届かない`,
  challengeBehindNote: (points, score) =>
    `共有されたスコア${score}まで あと${points}ポイント`,
  challengeTiedNote: (score) => `共有されたスコア${score}と同点`,
  challengeTiedDoneNote: (score) => `共有されたスコア${score}に並びました！`,
  challengeAheadNote: (points, score) =>
    `共有されたスコア${score}を${points}ポイント上回りました！`,
  challengeUnreachableNote: (score) =>
    `共有されたスコア${score}にはもう届きません`,
  hintButton: 'ヒント',
  hintsUsed: (count, lostPoints) => `ヒント${count}回（−${lostPoints}点）`,
  hintCostBadge: (cost) => `最大−${cost}`,
  hintCostLabel: (cost) => `単語を1つ表示し、最大スコアが${cost}点下がります`,
  hintedLegend: '* ヒントで表示',
  unfoundCountLabel: (count) => `${count}語`,
  unfoundBlockLabel: (count, letters) =>
    `${letters} で始まる未発見の単語 ${count}語 — この文字を入力`,
  hintAgainLabel: 'ヒントで表示した単語をもう一度表示します（追加コストなし）',
  hintForfeitsWinLabel:
    '単語を1つ表示しますが、最大スコアが勝利ラインを下回ります',
  lockedOutNote: (reachablePoints, winPoints) =>
    `ヒントが多すぎます — 勝利には${winPoints}ポイント必要ですが、` +
    `あと最大${reachablePoints}ポイントしか獲得できません。`,
  lockedOutTitle: '勝利は不可能に',
  lockedOutShort: '勝利には届きません',
  winThresholdLabel: (winPoints) => `${winPoints}ポイントで勝利`,
  victory: 'あなたの勝ち！',
  invalidGameData: '無効なゲームデータ！',
  generationFailed: 'ゲームを生成できませんでした！',
  dictionaryLoadFailed: (detail) => `辞書を読み込めませんでした（${detail}）！`,
  currentWordLabel: '入力中の単語',
  completionLabel: '達成度',
  requiredLetterTitle: '必須の文字',
  deadLetterNote: '次にこの文字を使える新しい単語はありません',
  ratingsTitle: 'ランク',
  ratingReachedLabel: '達成済み',
  ratingNotReachedLabel: '未達成',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'すでに見つけた単語です';
      case 'dead-end':
        return 'この文字列で始まる新しい単語はありません';
      case 'invalid-letters':
        return 'サラダにない文字が含まれています';
      case 'missing-required':
        return `${Array.from(preview.requiredCharacters).join('、')} を含める必要があります`;
      case 'not-a-word':
        return '単語リストにありません';
      case 'too-short':
        return '短すぎます';
      case 'valid':
        return preview.points > 0
          ? `${preview.points}ポイント獲得できます`
          : 'ポイントにはなりません（ヒントで判明した単語）';
    }
  },
  coachLength: (minLength) =>
    `${minLength}文字以上の単語 — 同じ文字は何度でも可。`,
  coachRequired: 'どの単語にも {letters} を使います。',
  coachPangram: (letterCount) => `${letterCount}文字すべてを使うとボーナス。`,
  coachCompact: (minLength) =>
    `${minLength}文字以上 · 必ず {letters} · 文字は重複可`,
  coachCompactFree: (minLength) => `${minLength}文字以上 · 文字は重複可`,
  howToPlayButton: '遊び方',
  howToPlayTitle: '遊び方',
  howToPlayLetters: (minLength, letterCount) =>
    `サラダの${letterCount}文字から、${minLength}文字以上の単語を作ります。同じ文字を何度使ってもかまいません。`,
  howToPlayRequired: () =>
    '必須の文字 {letters} をすべての単語に含めてください。',
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `長い単語ほど高得点：${minLength}文字の単語は1点、1文字増えるごとに1点加算。${letterCount}文字すべてを1つの単語に使うと${bonus}点のボーナス。`,
  howToPlayRanks: (winPercent) =>
    `ボード全体の得点に占める割合でランクが上がります。${winPercent}%で勝利 — すべて見つければ完全制覇。`,
  howToPlayHints:
    'ヒントは未発見の最短単語を明かします。得点にはならず、その点数はボードの最大値から差し引かれるため、ヒントを使うたびに到達できる最高ランクが下がります。',
  howToPlayTypeHint: '文字を入力',
  closeButton: '閉じる',
  levelName: (level) => LEVELS_JA[level] ?? level,
  thresholdFrom: (points) => `${points}ポイントから`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `${feedback.letter} はワードサラダにありません！`;
      case 'scored':
        return `${feedback.word} で${feedback.points}ポイント獲得！`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word} はすでに見つけています！`;
          case 'invalid-letters':
            return `${feedback.word} には使えない文字があります！`;
          case 'missing-required':
            return `${feedback.word} には必須の文字が入っていません！`;
          case 'not-a-word':
            return `${feedback.word} は辞書にありません！`;
          case 'too-short':
            return `${feedback.word} は短すぎます！`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints}ポイント`,
  pointsToRank: (points, rank) => `${rank}まで あと${points}ポイント`,
};

const LEVELS_KO: Record<string, string> = {
  Idiot: '맹꽁이',
  Meh: '글쎄',
  Okay: '그럭저럭',
  Nice: '좋아요',
  'Not-Too-Shabby': '나쁘지 않아요',
  Great: '훌륭해요',
  Awesome: '대단해요',
  'Smarty-Pants': '똑똑이',
  Genius: '천재',
  'Super-Genius': '슈퍼 천재',
  'Super-Duper-Genius': '울트라 슈퍼 천재',
};

const KO: Messages = {
  locale: 'ko',
  appTitle: 'Word Salad',
  deleteButton: '삭제',
  tossButton: '섞기',
  submitButton: '제출',
  wordsHeader: '단어',
  pointsHeader: '점수',
  newGameButton: '새 게임',
  keepPlayingButton: '계속 플레이하기',
  customGameButton: '커스텀 게임',
  moreMenuLabel: '더 보기',
  wordListLabel: '단어 목록',
  themeLabel: '테마',
  themeSystem: '시스템',
  themeLight: '라이트',
  themeDark: '다크',
  uiLanguageLabel: '표시 언어',
  uiLanguageAuto: (nativeName) => `자동 (${nativeName})`,
  soundLabel: '소리',
  customGameTitle: '커스텀 게임',
  customModeLegend: '보드',
  customModeRandom: '랜덤',
  customModeLetters: '글자 선택',
  customMinLabel: '최소',
  customMaxLabel: '최대',
  customLettersLabel: '글자',
  customLettersHint: '최대 7글자까지 입력 · 탭하면 필수 글자가 됩니다',
  customMinLengthLabel: '최소 단어 길이',
  customWordCountLabel: '단어 수',
  customPangramLabel: '팬그램 필수',
  customPreviewRandom: (minWords, maxWords) =>
    `${minWords}~${maxWords}개 단어의 보드가 생성됩니다`,
  customCreateButton: '게임 만들기',
  customPreview: (words, points, hasPangram) =>
    `${words} 단어 · ${points} 점` +
    (hasPangram ? ' · 팬그램 있음 ✓' : ' · 팬그램 없음'),
  customError: (kind) =>
    kind === 'no-words'
      ? '이 글자로는 유효한 단어가 없습니다'
      : '이 설정으로는 게임을 만들 수 없습니다',
  restartButton: '다시 시작',
  historyButton: '기록',
  historyTitle: '기록',
  historyEmpty: '아직 아무것도 없어요 — 단어를 찾아 기록을 시작하세요.',
  sortRecent: '최신순',
  sortResult: '결과',
  sortRating: '등급',
  statPlayed: '플레이',
  statWon: '승리',
  statStreak: '연속',
  statHints: '힌트',
  achievementsButton: '업적',
  achievementsTitle: '업적',
  achievementsEarned: (earned, total) => `${total}개 중 ${earned}개 달성`,
  achievementEarnedLabel: '달성함',
  achievementLockedLabel: '잠김',
  unlockedLabel: '업적 달성',
  achievementsNew: (count) => `새 업적 ${count}개`,
  achievements: {
    'first-win': { name: '첫 승리', description: '게임에서 승리하기' },
    'no-help-needed': { name: '힌트 없이', description: '힌트 없이 승리하기' },
    'first-perfect': {
      name: '퍼펙트 게임',
      description: '보드의 모든 점수 획득하기',
    },
    completionist: {
      name: '완성주의자',
      description: '힌트를 포함해 보드의 모든 단어 찾기',
    },
    'super-genius': {
      name: '슈퍼 천재',
      description: '보드에서 슈퍼 천재 달성하기',
    },
    pangrammer: { name: '팬그램', description: '팬그램 찾기' },
    'long-haul': { name: '긴 단어', description: '10글자 이상의 단어 찾기' },
    'saw-what-you-did-there': {
      name: '다 봤어요',
      description: '목록이 흘린 단어 찾기',
    },
    marathon: { name: '마라톤', description: '한 보드에서 25개 단어 찾기' },
    challenger: { name: '도전자', description: '공유된 점수 넘어서기' },
    'good-sport': {
      name: '스포츠맨십',
      description: '넘어서지 못한 도전을 끝까지 마치기',
    },
    'hard-mode': {
      name: '하드 모드',
      description: '최소 5글자 보드에서 승리하기',
    },
    'double-duty': {
      name: '이중 조건',
      description: '필수 글자가 두 개인 보드에서 승리하기',
    },
    builder: { name: '빌더', description: '직접 만든 보드에서 승리하기' },
    overreach: { name: '과욕', description: '힌트로 승리를 놓치기' },
    host: { name: '호스트', description: '보드 공유하기' },
    'ten-wins': { name: '10승', description: '10번 승리하기' },
    'fifty-wins': { name: '50승', description: '50번 승리하기' },
    century: { name: '100승', description: '100번 승리하기' },
    wordsmith: { name: '단어 장인', description: '총 1000개 단어 찾기' },
    perfectionist: {
      name: '완벽주의자',
      description: '퍼펙트 게임 10번 달성하기',
    },
    bilingual: {
      name: '이중 언어',
      description: '두 번째 단어 목록에서 승리하기',
    },
    polyglot: { name: '다국어', description: '모든 단어 목록에서 승리하기' },
  },
  shareButton: '공유',
  shareCopied: '복사했어요!',
  wordsRemaining: (count) =>
    count === 0 ? ' (모두 찾음)' : ` (${count}개 남음)`,
  challengeBehind: (points, mark) => `${mark}까지 ${points}점`,
  challengeTied: (mark) => `${mark}와 동점`,
  challengeAhead: (points, mark) => `${mark}보다 ${points}점 앞섬`,
  challengeUnreachable: (mark) => `${mark} 도달 불가`,
  challengeBehindNote: (points, score) =>
    `공유된 점수 ${score}점까지 ${points}점 남았어요`,
  challengeTiedNote: (score) => `공유된 점수 ${score}점과 동점이에요`,
  challengeTiedDoneNote: (score) => `공유된 점수 ${score}점과 동점을 이뤘어요!`,
  challengeAheadNote: (points, score) =>
    `공유된 점수 ${score}점을 ${points}점 차로 넘었어요!`,
  challengeUnreachableNote: (score) =>
    `공유된 점수 ${score}점에는 더 이상 도달할 수 없어요`,
  hintButton: '힌트',
  hintsUsed: (count, lostPoints) => `힌트 ${count}개 (−${lostPoints}점)`,
  hintCostBadge: (cost) => `최대 −${cost}`,
  hintCostLabel: (cost) =>
    `단어 하나를 공개하고 최대 점수가 ${cost}점 낮아집니다`,
  hintedLegend: '* 힌트로 공개',
  unfoundCountLabel: (count) => `단어 ${count}개`,
  unfoundBlockLabel: (count, letters) =>
    `${letters}(으)로 시작하는 미발견 단어 ${count}개 — 이 글자 입력`,
  hintAgainLabel: '힌트로 공개한 단어를 다시 보여줘요 (추가 비용 없음)',
  hintForfeitsWinLabel:
    '단어를 공개하지만 최대 점수가 승리 기준 아래로 떨어져요',
  lockedOutNote: (reachablePoints, winPoints) =>
    `힌트를 너무 많이 썼어요 — 승리에는 ${winPoints}점이 필요하지만 ` +
    `이제 최대 ${reachablePoints}점만 얻을 수 있어요.`,
  lockedOutTitle: '승리 불가능',
  lockedOutShort: '승리에 도달할 수 없습니다',
  winThresholdLabel: (winPoints) => `${winPoints}점에서 승리`,
  victory: '승리!',
  invalidGameData: '잘못된 게임 데이터!',
  generationFailed: '게임을 생성하지 못했어요!',
  dictionaryLoadFailed: (detail) => `사전을 불러오지 못했어요 (${detail})!`,
  currentWordLabel: '현재 단어',
  completionLabel: '진행도',
  requiredLetterTitle: '필수 글자',
  deadLetterNote: '다음에 이 글자를 쓸 수 있는 새 단어가 없습니다',
  ratingsTitle: '등급',
  ratingReachedLabel: '달성함',
  ratingNotReachedLabel: '아직 미달성',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return '이미 찾은 단어입니다';
      case 'dead-end':
        return '이 글자들로 시작하는 새 단어가 없습니다';
      case 'invalid-letters':
        return '샐러드에 없는 글자가 있습니다';
      case 'missing-required':
        return `${Array.from(preview.requiredCharacters).join(', ')}을(를) 포함해야 합니다`;
      case 'not-a-word':
        return '단어 목록에 없습니다';
      case 'too-short':
        return '너무 짧습니다';
      case 'valid':
        return preview.points > 0
          ? `${preview.points}점을 얻습니다`
          : '점수가 없습니다 (힌트로 공개된 단어)';
    }
  },
  coachLength: (minLength) =>
    `${minLength}글자 이상 단어 만들기 — 글자는 반복해도 됩니다.`,
  coachRequired: '모든 단어에는 {letters} 이(가) 들어가야 합니다.',
  coachPangram: (letterCount) => `${letterCount}개 글자를 모두 쓰면 보너스.`,
  coachCompact: (minLength) =>
    `${minLength}글자 이상 · 항상 {letters} · 글자 반복 가능`,
  coachCompactFree: (minLength) => `${minLength}글자 이상 · 글자 반복 가능`,
  howToPlayButton: '게임 방법',
  howToPlayTitle: '게임 방법',
  howToPlayLetters: (minLength, letterCount) =>
    `샐러드의 ${letterCount}개 글자로 ${minLength}글자 이상의 단어를 만드세요. 같은 글자를 여러 번 써도 됩니다.`,
  howToPlayRequired: () =>
    '모든 단어에는 필수 글자 {letters} 이(가) 들어가야 합니다.',
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `긴 단어일수록 점수가 높습니다. ${minLength}글자 단어는 1점, 글자가 하나 늘 때마다 1점씩 추가됩니다. ${letterCount}개 글자를 한 단어에 모두 쓰면 ${bonus}점 보너스.`,
  howToPlayRanks: (winPercent) =>
    `보드 전체 점수 중 얻은 비율에 따라 등급이 올라갑니다. ${winPercent}%에 도달하면 승리 — 모두 찾으면 완벽.`,
  howToPlayHints:
    '힌트는 아직 찾지 못한 가장 짧은 단어를 알려 줍니다. 점수는 없고, 그 점수만큼 보드의 최대 점수에서 빠지므로 힌트를 쓸 때마다 도달할 수 있는 최고 등급이 낮아집니다.',
  howToPlayTypeHint: '글자를 입력',
  closeButton: '닫기',
  levelName: (level) => LEVELS_KO[level] ?? level,
  thresholdFrom: (points) => `${points}점부터`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `${feedback.letter}은(는) 워드 샐러드에 없어요!`;
      case 'scored':
        return `${feedback.word}(으)로 ${feedback.points}점 획득!`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word}은(는) 이미 찾았어요!`;
          case 'invalid-letters':
            return `${feedback.word}에 사용할 수 없는 글자가 있어요!`;
          case 'missing-required':
            return `${feedback.word}에 필수 글자가 없어요!`;
          case 'not-a-word':
            return `${feedback.word}은(는) 사전에 없어요!`;
          case 'too-short':
            return `${feedback.word}은(는) 너무 짧아요!`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) => `${earnedPoints} / ${maxPoints}점`,
  pointsToRank: (points, rank) => `${rank}까지 ${points}점`,
};

const LEVELS_ZH: Record<string, string> = {
  Idiot: '小笨蛋',
  Meh: '一般般',
  Okay: '还行',
  Nice: '不错',
  'Not-Too-Shabby': '有点东西',
  Great: '很棒',
  Awesome: '厉害',
  'Smarty-Pants': '机灵鬼',
  Genius: '天才',
  'Super-Genius': '超级天才',
  'Super-Duper-Genius': '无敌超级天才',
};

const ZH: Messages = {
  locale: 'zh',
  appTitle: 'Word Salad',
  deleteButton: '删除',
  tossButton: '打乱',
  submitButton: '提交',
  wordsHeader: '单词',
  pointsHeader: '分数',
  newGameButton: '新游戏',
  keepPlayingButton: '继续游戏',
  customGameButton: '自定义游戏',
  moreMenuLabel: '更多选项',
  wordListLabel: '词库',
  themeLabel: '主题',
  themeSystem: '跟随系统',
  themeLight: '浅色',
  themeDark: '深色',
  uiLanguageLabel: '界面语言',
  uiLanguageAuto: (nativeName) => `自动（${nativeName}）`,
  soundLabel: '声音',
  customGameTitle: '自定义游戏',
  customModeLegend: '棋盘',
  customModeRandom: '随机',
  customModeLetters: '选择字母',
  customMinLabel: '最少',
  customMaxLabel: '最多',
  customLettersLabel: '字母',
  customLettersHint: '最多输入 7 个字母 · 点按可设为必需',
  customMinLengthLabel: '最短单词长度',
  customWordCountLabel: '单词数量',
  customPangramLabel: '要求全字母词',
  customPreviewRandom: (minWords, maxWords) =>
    `将生成包含 ${minWords}–${maxWords} 个单词的棋盘`,
  customCreateButton: '创建游戏',
  customPreview: (words, points, hasPangram) =>
    `${words} 个单词 · ${points} 分` +
    (hasPangram ? ' · 有全字母词 ✓' : ' · 无全字母词'),
  customError: (kind) =>
    kind === 'no-words' ? '这些字母没有有效单词' : '无法用这些设置创建游戏',
  restartButton: '重新开始',
  historyButton: '历史',
  historyTitle: '历史',
  historyEmpty: '这里还没有记录——找到一个单词开始吧。',
  sortRecent: '最近',
  sortResult: '结果',
  sortRating: '等级',
  statPlayed: '局数',
  statWon: '获胜',
  statStreak: '连续天数',
  statHints: '提示',
  achievementsButton: '成就',
  achievementsTitle: '成就',
  achievementsEarned: (earned, total) => `已达成 ${earned} / ${total}`,
  achievementEarnedLabel: '已达成',
  achievementLockedLabel: '未解锁',
  unlockedLabel: '成就解锁',
  achievementsNew: (count) => `${count} 个新成就`,
  achievements: {
    'first-win': { name: '首次获胜', description: '赢下一局' },
    'no-help-needed': { name: '无需提示', description: '不用提示赢下一局' },
    'first-perfect': { name: '完美一局', description: '拿下一局的全部分数' },
    completionist: {
      name: '全收集',
      description: '找出一局的全部单词，提示的也算',
    },
    'super-genius': { name: '超级天才', description: '在一局中达到超级天才' },
    pangrammer: { name: '全字母词', description: '找到一个全字母词' },
    'long-haul': { name: '长词', description: '找到一个十个字母以上的单词' },
    'saw-what-you-did-there': {
      name: '我都看见了',
      description: '找出词库泄露的词',
    },
    marathon: { name: '马拉松', description: '在一局中找到 25 个单词' },
    challenger: { name: '挑战者', description: '超过一个分享的分数' },
    'good-sport': {
      name: '输得起',
      description: '完成一局未能超过的挑战',
    },
    'hard-mode': {
      name: '困难模式',
      description: '在最短 5 个字母的一局中获胜',
    },
    'double-duty': {
      name: '双重条件',
      description: '在有两个必选字母的一局中获胜',
    },
    builder: { name: '建造者', description: '赢下自己创建的一局' },
    overreach: { name: '得不偿失', description: '用提示把胜利耗尽' },
    host: { name: '东道主', description: '分享一局' },
    'ten-wins': { name: '十胜', description: '赢下十局' },
    'fifty-wins': { name: '五十胜', description: '赢下五十局' },
    century: { name: '百胜', description: '赢下一百局' },
    wordsmith: { name: '词匠', description: '累计找到一千个单词' },
    perfectionist: { name: '完美主义者', description: '完成十局完美一局' },
    bilingual: { name: '双语', description: '在第二个词表中获胜' },
    polyglot: { name: '多语', description: '在每个词表中获胜' },
  },
  shareButton: '分享',
  shareCopied: '已复制！',
  wordsRemaining: (count) =>
    count === 0 ? '（全部找到）' : `（剩余 ${count} 个）`,
  challengeBehind: (points, mark) => `落后 ${mark} ${points} 分`,
  challengeTied: (mark) => `与 ${mark} 持平`,
  challengeAhead: (points, mark) => `领先 ${mark} ${points} 分`,
  challengeUnreachable: (mark) => `${mark} 已无法达到`,
  challengeBehindNote: (points, score) =>
    `落后分享的分数 ${score} 共 ${points} 分`,
  challengeTiedNote: (score) => `与分享的分数 ${score} 持平`,
  challengeTiedDoneNote: (score) => `你追平了分享的分数 ${score}！`,
  challengeAheadNote: (points, score) =>
    `你以 ${points} 分领先分享的分数 ${score}！`,
  challengeUnreachableNote: (score) => `分享的分数 ${score} 已无法达到`,
  hintButton: '提示',
  hintsUsed: (count, lostPoints) => `${count} 次提示（−${lostPoints} 分）`,
  hintCostBadge: (cost) => `上限−${cost}`,
  hintCostLabel: (cost) => `揭示一个单词，最高分降低 ${cost} 分`,
  hintedLegend: '* 用提示揭示',
  unfoundCountLabel: (count) => `${count} 个单词`,
  unfoundBlockLabel: (count, letters) =>
    `以 ${letters} 开头的未找到单词 ${count} 个 — 填入这些字母`,
  hintAgainLabel: '再次显示提示过的单词，无额外扣分',
  hintForfeitsWinLabel: '揭示一个单词，但最高可得分将跌破获胜线',
  lockedOutNote: (reachablePoints, winPoints) =>
    `提示用得太多——获胜需要 ${winPoints} 分，` +
    `但最多只能拿到 ${reachablePoints} 分。`,
  lockedOutTitle: '无法获胜',
  lockedOutShort: '无法达到获胜线',
  winThresholdLabel: (winPoints) => `${winPoints} 分获胜`,
  victory: '你赢了！',
  invalidGameData: '无效的游戏数据！',
  generationFailed: '无法生成游戏！',
  dictionaryLoadFailed: (detail) => `无法加载词典（${detail}）！`,
  currentWordLabel: '当前单词',
  completionLabel: '完成度',
  requiredLetterTitle: '必用字母',
  deadLetterNote: '没有新单词能在此处使用这个字母',
  ratingsTitle: '等级',
  ratingReachedLabel: '已达到',
  ratingNotReachedLabel: '尚未达到',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return '已找到过';
      case 'dead-end':
        return '没有新单词以这些字母开头';
      case 'invalid-letters':
        return '包含沙拉之外的字母';
      case 'missing-required':
        return `必须包含 ${Array.from(preview.requiredCharacters).join('、')}`;
      case 'not-a-word':
        return '不在单词表中';
      case 'too-short':
        return '太短';
      case 'valid':
        return preview.points > 0
          ? `可得 ${preview.points} 分`
          : '不得分（由提示揭示的单词）';
    }
  },
  coachLength: (minLength) =>
    `拼出${minLength}个字母以上的单词——字母可以重复使用。`,
  coachRequired: '每个单词都必须包含 {letters}。',
  coachPangram: (letterCount) => `用上全部${letterCount}个字母可获得奖励。`,
  coachCompact: (minLength) =>
    `${minLength}+字母 · 必含 {letters} · 字母可重复`,
  coachCompactFree: (minLength) => `${minLength}+字母 · 字母可重复`,
  howToPlayButton: '玩法说明',
  howToPlayTitle: '玩法说明',
  howToPlayLetters: (minLength, letterCount) =>
    `用沙拉里的${letterCount}个字母拼出${minLength}个字母以上的单词。同一个字母可以多次使用。`,
  howToPlayRequired: () => '每个单词都必须包含必用字母 {letters}。',
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `单词越长得分越高：${minLength}个字母的单词得1分，每多一个字母加1分。在一个单词里用上全部${letterCount}个字母可得${bonus}分奖励。`,
  howToPlayRanks: (winPercent) =>
    `你的等级随所得分数占全盘分数的比例上升。达到${winPercent}%即获胜——或者找出全部单词。`,
  howToPlayHints:
    '提示会揭示尚未找到的最短单词。它不计分，其分数会从全盘最高分中扣除——因此每次提示都会降低你仍可达到的最高等级。',
  howToPlayTypeHint: '输入字母',
  closeButton: '关闭',
  levelName: (level) => LEVELS_ZH[level] ?? level,
  thresholdFrom: (points) => `${points} 分起`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `${feedback.letter} 不在单词沙拉里！`;
      case 'scored':
        return `${feedback.word} 为你赢得 ${feedback.points} 分！`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word} 已经找到过了！`;
          case 'invalid-letters':
            return `${feedback.word} 含有无效字母！`;
          case 'missing-required':
            return `${feedback.word} 缺少必用字母！`;
          case 'not-a-word':
            return `${feedback.word} 不在词典里！`;
          case 'too-short':
            return `${feedback.word} 太短了！`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) => `${earnedPoints} / ${maxPoints} 分`,
  pointsToRank: (points, rank) => `距“${rank}”还差 ${points} 分`,
};

const LEVELS_RU: Record<string, string> = {
  Idiot: 'Балда',
  Meh: 'Так себе',
  Okay: 'Сойдёт',
  Nice: 'Неплохо',
  'Not-Too-Shabby': 'Очень даже',
  Great: 'Отлично',
  Awesome: 'Блестяще',
  'Smarty-Pants': 'Умник',
  Genius: 'Гений',
  'Super-Genius': 'Супергений',
  'Super-Duper-Genius': 'Мегасупергений',
};

const RU: Messages = {
  locale: 'ru',
  appTitle: 'Word Salad',
  deleteButton: 'Удалить',
  tossButton: 'Перемешать',
  submitButton: 'Отправить',
  wordsHeader: 'Слова',
  pointsHeader: 'Очки',
  newGameButton: 'Новая игра',
  keepPlayingButton: 'Продолжить игру',
  customGameButton: 'Своя игра',
  moreMenuLabel: 'Ещё',
  wordListLabel: 'Список слов',
  themeLabel: 'Тема',
  themeSystem: 'Системная',
  themeLight: 'Светлая',
  themeDark: 'Тёмная',
  uiLanguageLabel: 'Язык интерфейса',
  uiLanguageAuto: (nativeName) => `Авто (${nativeName})`,
  soundLabel: 'Звук',
  customGameTitle: 'Своя игра',
  customModeLegend: 'Поле',
  customModeRandom: 'Наугад',
  customModeLetters: 'Выбрать буквы',
  customMinLabel: 'мин',
  customMaxLabel: 'макс',
  customLettersLabel: 'Буквы',
  customLettersHint:
    'Введите до 7 букв · нажмите на букву, чтобы требовать её в каждом слове',
  customMinLengthLabel: 'Минимальная длина слова',
  customWordCountLabel: 'Количество слов',
  customPangramLabel: 'Требовать панграмму',
  customPreviewRandom: (minWords, maxWords) =>
    `Будет создано поле из ${minWords}–${maxWords} слов`,
  customCreateButton: 'Создать игру',
  customPreview: (words, points, hasPangram) =>
    `${words} ${plural('ru', words, { one: 'слово', few: 'слова', other: 'слов' })} · ` +
    `${points} ${plural('ru', points, { one: 'очко', few: 'очка', other: 'очков' })}` +
    (hasPangram ? ' · есть панграмма ✓' : ' · нет панграммы'),
  customError: (kind) =>
    kind === 'no-words'
      ? 'Нет допустимых слов для этих букв'
      : 'Не удалось создать игру с этими настройками',
  restartButton: 'Начать заново',
  historyButton: 'История',
  historyTitle: 'История',
  historyEmpty: 'Пока пусто — найдите слово, чтобы начать историю.',
  sortRecent: 'Недавние',
  sortResult: 'Результат',
  sortRating: 'Звание',
  statPlayed: 'Сыграно',
  statWon: 'Побед',
  statStreak: 'Серия',
  statHints: 'Подсказки',
  achievementsButton: 'Достижения',
  achievementsTitle: 'Достижения',
  achievementsEarned: (earned, total) => `Получено ${earned} из ${total}`,
  achievementEarnedLabel: 'Получено',
  achievementLockedLabel: 'Не получено',
  unlockedLabel: 'Открыто',
  achievementsNew: (count) =>
    `${count} ${plural('ru', count, { one: 'новое', few: 'новых', many: 'новых', other: 'новых' })}`,
  achievements: {
    'first-win': { name: 'Первая победа', description: 'Выиграйте игру' },
    'no-help-needed': {
      name: 'Без подсказок',
      description: 'Выиграйте без подсказок',
    },
    'first-perfect': {
      name: 'Идеальная игра',
      description: 'Наберите все очки на поле',
    },
    completionist: {
      name: 'Коллекционер',
      description: 'Найдите все слова на поле, включая подсказанные',
    },
    'super-genius': {
      name: 'Супергений',
      description: 'Достигните звания «Супергений» на поле',
    },
    pangrammer: { name: 'Панграммист', description: 'Найдите панграмму' },
    'long-haul': {
      name: 'Длинное слово',
      description: 'Найдите слово из десяти букв и длиннее',
    },
    'saw-what-you-did-there': {
      name: 'Всё вижу',
      description: 'Найдите слово, которое выдал список',
    },
    marathon: { name: 'Марафон', description: 'Найдите 25 слов на одном поле' },
    challenger: { name: 'Претендент', description: 'Побейте чужой результат' },
    'good-sport': {
      name: 'Спортивный дух',
      description: 'Завершите вызов, который не смогли побить',
    },
    'hard-mode': {
      name: 'Сложный режим',
      description: 'Выиграйте на поле со словами от 5 букв',
    },
    'double-duty': {
      name: 'Двойная задача',
      description: 'Выиграйте на поле с двумя обязательными буквами',
    },
    builder: {
      name: 'Строитель',
      description: 'Выиграйте на поле, которое собрали сами',
    },
    overreach: {
      name: 'Перебор',
      description: 'Растратьте победу на подсказки',
    },
    host: { name: 'Хозяин', description: 'Поделитесь полем' },
    'ten-wins': { name: 'Десять побед', description: 'Выиграйте десять игр' },
    'fifty-wins': {
      name: 'Пятьдесят побед',
      description: 'Выиграйте пятьдесят игр',
    },
    century: { name: 'Сотня', description: 'Выиграйте сто игр' },
    wordsmith: { name: 'Словесник', description: 'Найдите тысячу слов' },
    perfectionist: {
      name: 'Перфекционист',
      description: 'Сыграйте десять идеальных игр',
    },
    bilingual: {
      name: 'Билингв',
      description: 'Выиграйте во втором списке слов',
    },
    polyglot: {
      name: 'Полиглот',
      description: 'Выиграйте в каждом списке слов',
    },
  },
  shareButton: 'Поделиться',
  shareCopied: 'Скопировано!',
  wordsRemaining: (count) =>
    count === 0
      ? ' (все найдены)'
      : ` (осталось ${count} ${plural('ru', count, { few: 'слова', one: 'слово', other: 'слов' })})`,
  challengeBehind: (points, mark) =>
    `${points} ${plural('ru', points, { few: 'очка', one: 'очко', other: 'очков' })} позади ${mark}`,
  challengeTied: (mark) => `Вровень с ${mark}`,
  challengeAhead: (points, mark) =>
    `${points} ${plural('ru', points, { few: 'очка', one: 'очко', other: 'очков' })} впереди ${mark}`,
  challengeUnreachable: (mark) => `${mark} недостижим`,
  challengeBehindNote: (points, score) =>
    `${points} ${plural('ru', points, { few: 'очка', one: 'очко', other: 'очков' })} позади результата ${score}`,
  challengeTiedNote: (score) => `Вровень с результатом ${score}`,
  challengeTiedDoneNote: (score) => `Вы повторили результат ${score}!`,
  challengeAheadNote: (points, score) =>
    `Вы побили результат ${score} на ${points} ${plural('ru', points, { few: 'очка', one: 'очко', other: 'очков' })}!`,
  challengeUnreachableNote: (score) => `Результат ${score} больше недостижим`,
  hintButton: 'Подсказка',
  hintsUsed: (count, lostPoints) =>
    `${count} ${plural('ru', count, { one: 'подсказка', few: 'подсказки', other: 'подсказок' })} ` +
    `(−${lostPoints} очк.)`,
  hintCostBadge: (cost) => `−${cost} макс`,
  hintCostLabel: (cost) =>
    `Открывает слово и снижает максимум на ${cost} ${plural('ru', cost, { one: 'очко', few: 'очка', other: 'очков' })}`,
  hintedLegend: '* открыто подсказкой',
  unfoundCountLabel: (count) =>
    `${count} ${plural('ru', count, { few: 'слова', one: 'слово', other: 'слов' })}`,
  unfoundBlockLabel: (count, letters) =>
    `${count} ${plural('ru', count, {
      few: 'ненайденных слова начинаются',
      one: 'ненайденное слово начинается',
      other: 'ненайденных слов начинаются',
    })} с ${letters} — ввести эти буквы`,
  hintAgainLabel:
    'Снова показывает слово из подсказки — без дополнительной платы',
  hintForfeitsWinLabel:
    'Открывает слово — ваш максимально возможный счёт опустится ниже победной отметки',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Слишком много подсказок — для победы нужно ${winPoints} ${plural('ru', winPoints, { one: 'очко', few: 'очка', other: 'очков' })}, ` +
    `но достижимо не больше ${reachablePoints}.`,
  lockedOutTitle: 'Победа недостижима',
  lockedOutShort: 'Победа недостижима',
  winThresholdLabel: (winPoints) =>
    `Победа при ${winPoints} ${plural('ru', winPoints, { one: 'очке', other: 'очках' })}`,
  victory: 'ПОБЕДА!',
  invalidGameData: 'НЕВЕРНЫЕ ДАННЫЕ ИГРЫ!',
  generationFailed: 'Не удалось создать игру!',
  dictionaryLoadFailed: (detail) => `Не удалось загрузить словарь (${detail})!`,
  currentWordLabel: 'Текущее слово',
  completionLabel: 'Прогресс',
  requiredLetterTitle: 'Обязательная буква',
  deadLetterNote: 'Ни одно новое слово не может использовать эту букву здесь',
  ratingsTitle: 'Звания',
  ratingReachedLabel: 'Достигнуто',
  ratingNotReachedLabel: 'Ещё не достигнуто',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Уже найдено';
      case 'dead-end':
        return 'Ни одно новое слово не начинается с этих букв';
      case 'invalid-letters':
        return 'Содержит буквы не из салата';
      case 'missing-required':
        return `Должно содержать ${Array.from(preview.requiredCharacters).join(', ')}`;
      case 'not-a-word':
        return 'Нет в списке слов';
      case 'too-short':
        return 'Слишком короткое';
      case 'valid':
        return preview.points > 0
          ? `Принесёт ${preview.points} ${plural('ru', preview.points, { one: 'очко', few: 'очка', other: 'очков' })}`
          : 'Не принесёт очков (открыто подсказкой)';
    }
  },
  coachLength: (minLength) =>
    `Слова из ${minLength}+ букв — буквы можно повторять.`,
  coachRequired: 'В каждом слове должна быть {letters}.',
  coachPangram: (letterCount) =>
    `Используйте все ${letterCount} букв для бонуса.`,
  coachCompact: (minLength) =>
    `${minLength}+ букв · всегда {letters} · буквы повторяются`,
  coachCompactFree: (minLength) => `${minLength}+ букв · буквы повторяются`,
  howToPlayButton: 'Как играть',
  howToPlayTitle: 'Как играть',
  howToPlayLetters: (minLength, letterCount) =>
    `Составляйте слова из ${minLength} и более букв из ${letterCount} букв салата. Одну букву можно использовать несколько раз.`,
  howToPlayRequired: (count) =>
    plural('ru', count, {
      one: 'В каждом слове должна быть обязательная буква {letters}.',
      other: 'В каждом слове должны быть обязательные буквы {letters}.',
    }),
  howToPlayScoring: (minLength, letterCount, bonus) =>
    `Длинные слова приносят больше: слово из ${minLength} букв — 1 очко, каждая дополнительная буква добавляет ещё одно. Используйте все ${letterCount} букв в одном слове и получите бонус ${bonus} очков.`,
  howToPlayRanks: (winPercent) =>
    `Ранг растёт вместе с вашей долей очков на доске. Наберите ${winPercent}%, чтобы выиграть, — или найдите всё.`,
  howToPlayHints:
    'Подсказка открывает самое короткое ненайденное слово. Она не приносит очков, а её очки вычитаются из максимума доски — так что каждая подсказка снижает лучший ранг, которого ещё можно достичь.',
  howToPlayTypeHint: 'Печатайте буквы',
  closeButton: 'Закрыть',
  levelName: (level) => LEVELS_RU[level] ?? level,
  thresholdFrom: (points) => `от ${points} очк.`,
  feedbackText: (feedback) => {
    switch (feedback.kind) {
      case 'letter-rejected':
        return `Буквы ${feedback.letter} нет в словесном салате!`;
      case 'scored':
        return `${feedback.word} принесло вам ${feedback.points} ${plural('ru', feedback.points, { one: 'очко', few: 'очка', other: 'очков' })}!`;
      case 'word-rejected':
        switch (feedback.reason.verdict) {
          case 'already-found':
            return `${feedback.word} уже найдено!`;
          case 'invalid-letters':
            return `В слове ${feedback.word} недопустимые буквы!`;
          case 'missing-required':
            return `В слове ${feedback.word} нет обязательной буквы!`;
          case 'not-a-word':
            return `Слова ${feedback.word} нет в словаре!`;
          case 'too-short':
            return `${feedback.word} слишком короткое!`;
        }
    }
  },
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ${plural('ru', maxPoints, { one: 'очко', few: 'очка', other: 'очков' })}`,
  pointsToRank: (points, rank) =>
    `${points} ${plural('ru', points, { few: 'очка', one: 'очко', other: 'очков' })} до звания «${rank}»`,
};

export const CATALOGS: Record<Locale, Messages> = {
  de: DE,
  en: EN,
  es: ES,
  fr: FR,
  it: IT,
  ja: JA,
  ko: KO,
  nl: NL,
  pt: PT,
  ru: RU,
  zh: ZH,
};

export function detectLocale(
  languages: readonly string[] = navigator.languages,
): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) {
      return base as Locale;
    }
  }
  return 'en';
}

// The browser's languages decide the locale, ahead of them a saved
// UI-language override (the ⋯-menu setting), and ahead of everything a
// ?lang= query parameter (handy for spot-checking translations). Candidates
// all funnel through detectLocale, so an unsupported entry at any level
// falls through to the next.
export function resolveLocale(override: string | null = null): Locale {
  const param = new URLSearchParams(window.location.search).get('lang');
  return detectLocale([
    ...(param === null ? [] : [param]),
    ...(override === null ? [] : [override]),
    ...navigator.languages,
  ]);
}

const MessagesContext = createContext<Messages>(EN);

export function MessagesProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  return (
    <MessagesContext.Provider value={CATALOGS[locale]}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages(): Messages {
  return useContext(MessagesContext);
}
