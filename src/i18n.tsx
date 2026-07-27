import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { GameFeedback, WordPreview } from './useWordSaladGame';

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

export interface Messages {
  locale: Locale;
  appTitle: string;
  deleteButton: string;
  tossButton: string;
  submitButton: string;
  wordsHeader: string;
  pointsHeader: string;
  newGameButton: string;
  playAgainButton: string;
  keepPlayingButton: string;
  customGameButton: string;
  moreMenuLabel: string;
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
  shareButton: string;
  shareCopied: string;
  challengeNote: (points: number) => string;
  challengeBeaten: (points: number) => string;
  hintButton: string;
  hintsUsed: (count: number, lostPoints: number) => string;
  hintCostBadge: (cost: number) => string;
  hintCostLabel: (cost: number) => string;
  hintAgainLabel: string;
  hintForfeitsWinLabel: string;
  hintedLegend: string;
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
  ratingsTitle: string;
  // Screen-reader annotations for the ratings ladder rungs.
  ratingReachedLabel: string;
  ratingNotReachedLabel: string;
  // Screen-reader description of the Submit button's verdict badge.
  submitPreviewLabel: (preview: WordPreview) => string;
  closeButton: string;
  levelName: (level: string) => string;
  thresholdFrom: (points: number) => string;
  feedbackText: (feedback: GameFeedback) => string;
  foundSummary: (words: number) => string;
  scoreLabel: (earnedPoints: number, maxPoints: number) => string;
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
  playAgainButton: 'Play again',
  keepPlayingButton: 'Keep playing',
  customGameButton: 'Custom game',
  moreMenuLabel: 'More options',
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
  shareButton: 'Share',
  shareCopied: 'Copied to clipboard!',
  challengeNote: (points) => `Shared score to beat: ${points}`,
  challengeBeaten: (points) => `You beat the shared score of ${points}!`,
  hintButton: 'Hint',
  hintsUsed: (count, lostPoints) =>
    `${count} hint${plural('en', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('en', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Reveals a word and lowers your max score by ${cost} point${plural('en', cost, { one: '', other: 's' })}`,
  hintedLegend: '* revealed with a hint',
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
  ratingsTitle: 'Ratings',
  ratingReachedLabel: 'Reached',
  ratingNotReachedLabel: 'Not yet reached',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Already found';
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
  foundSummary: (words) =>
    `Found ${words} word${plural('en', words, { one: '', other: 's' })}`,
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} point${plural('en', maxPoints, { one: '', other: 's' })}`,
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
  playAgainButton: 'Rejouer',
  keepPlayingButton: 'Continuer à jouer',
  customGameButton: 'Partie personnalisée',
  moreMenuLabel: 'Plus d’options',
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
  shareButton: 'Partager',
  shareCopied: 'Copié dans le presse-papiers !',
  challengeNote: (points) => `Score partagé à battre : ${points}`,
  challengeBeaten: (points) =>
    `Vous avez battu le score partagé de ${points} !`,
  hintButton: 'Indice',
  hintsUsed: (count, lostPoints) =>
    `${count} indice${plural('fr', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('fr', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Révèle un mot et réduit votre score max de ${cost} point${plural('fr', cost, { one: '', other: 's' })}`,
  hintedLegend: '* révélé par un indice',
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
  ratingsTitle: 'Niveaux',
  ratingReachedLabel: 'Atteint',
  ratingNotReachedLabel: 'Pas encore atteint',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Déjà trouvé';
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
  foundSummary: (words) =>
    `${words} mot${plural('fr', words, { one: '', other: 's' })} trouvé${plural('fr', words, { one: '', other: 's' })}`,
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} point${plural('fr', maxPoints, { one: '', other: 's' })}`,
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
  playAgainButton: 'Jugar otra vez',
  keepPlayingButton: 'Seguir jugando',
  customGameButton: 'Partida personalizada',
  moreMenuLabel: 'Más opciones',
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
  shareButton: 'Compartir',
  shareCopied: '¡Copiado al portapapeles!',
  challengeNote: (points) => `Puntuación compartida a batir: ${points}`,
  challengeBeaten: (points) =>
    `¡Superaste la puntuación compartida de ${points}!`,
  hintButton: 'Pista',
  hintsUsed: (count, lostPoints) =>
    `${count} pista${plural('es', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('es', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} máx`,
  hintCostLabel: (cost) =>
    `Revela una palabra y reduce tu puntuación máxima en ${cost} punto${plural('es', cost, { one: '', other: 's' })}`,
  hintedLegend: '* revelada con una pista',
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
  ratingsTitle: 'Rangos',
  ratingReachedLabel: 'Alcanzado',
  ratingNotReachedLabel: 'Aún no alcanzado',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Ya encontrada';
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
  foundSummary: (words) =>
    `${words} palabra${plural('es', words, { one: '', other: 's' })} encontrada${plural('es', words, { one: '', other: 's' })}`,
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} punto${plural('es', maxPoints, { one: '', other: 's' })}`,
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
  playAgainButton: 'Nochmal spielen',
  keepPlayingButton: 'Weiterspielen',
  customGameButton: 'Eigenes Spiel',
  moreMenuLabel: 'Weitere Optionen',
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
  shareButton: 'Teilen',
  shareCopied: 'In die Zwischenablage kopiert!',
  challengeNote: (points) => `Geteilte Punktzahl zum Schlagen: ${points}`,
  challengeBeaten: (points) =>
    `Du hast die geteilte Punktzahl von ${points} geschlagen!`,
  hintButton: 'Tipp',
  hintsUsed: (count, lostPoints) =>
    `${count} ${plural('de', count, { one: 'Tipp', other: 'Tipps' })} ` +
    `(−${lostPoints} Pkt.)`,
  hintCostBadge: (cost) => `−${cost} Max`,
  hintCostLabel: (cost) =>
    `Deckt ein Wort auf und senkt deinen Höchstpunktestand um ${cost} ${plural('de', cost, { one: 'Punkt', other: 'Punkte' })}`,
  hintedLegend: '* mit einem Tipp aufgedeckt',
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
  ratingsTitle: 'Ränge',
  ratingReachedLabel: 'Erreicht',
  ratingNotReachedLabel: 'Noch nicht erreicht',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Bereits gefunden';
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
  foundSummary: (words) =>
    `${words} ${plural('de', words, { one: 'Wort', other: 'Wörter' })} gefunden`,
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ${plural('de', maxPoints, { one: 'Punkt', other: 'Punkte' })}`,
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
  playAgainButton: 'Gioca ancora',
  keepPlayingButton: 'Continua a giocare',
  customGameButton: 'Partita personalizzata',
  moreMenuLabel: 'Altre opzioni',
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
  shareButton: 'Condividi',
  shareCopied: 'Copiato negli appunti!',
  challengeNote: (points) => `Punteggio condiviso da battere: ${points}`,
  challengeBeaten: (points) =>
    `Hai battuto il punteggio condiviso di ${points}!`,
  hintButton: 'Indizio',
  hintsUsed: (count, lostPoints) =>
    `${count} ${plural('it', count, { one: 'indizio', other: 'indizi' })} ` +
    `(−${lostPoints} pt)`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Rivela una parola e riduce il punteggio massimo di ${cost} ${plural('it', cost, { one: 'punto', other: 'punti' })}`,
  hintedLegend: '* rivelata con un indizio',
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
  ratingsTitle: 'Livelli',
  ratingReachedLabel: 'Raggiunto',
  ratingNotReachedLabel: 'Non ancora raggiunto',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Già trovata';
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
  foundSummary: (words) =>
    `${words} ${plural('it', words, { one: 'parola trovata', other: 'parole trovate' })}`,
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ${plural('it', maxPoints, { one: 'punto', other: 'punti' })}`,
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
  playAgainButton: 'Jogar de novo',
  keepPlayingButton: 'Continuar jogando',
  customGameButton: 'Jogo personalizado',
  moreMenuLabel: 'Mais opções',
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
  shareButton: 'Compartilhar',
  shareCopied: 'Copiado para a área de transferência!',
  challengeNote: (points) => `Pontuação compartilhada a bater: ${points}`,
  challengeBeaten: (points) =>
    `Você superou a pontuação compartilhada de ${points}!`,
  hintButton: 'Dica',
  hintsUsed: (count, lostPoints) =>
    `${count} dica${plural('pt', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('pt', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} máx`,
  hintCostLabel: (cost) =>
    `Revela uma palavra e reduz sua pontuação máxima em ${cost} ponto${plural('pt', cost, { one: '', other: 's' })}`,
  hintedLegend: '* revelada com uma dica',
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
  ratingsTitle: 'Níveis',
  ratingReachedLabel: 'Alcançado',
  ratingNotReachedLabel: 'Ainda não alcançado',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Já encontrada';
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
  foundSummary: (words) =>
    `${words} palavra${plural('pt', words, { one: '', other: 's' })} encontrada${plural('pt', words, { one: '', other: 's' })}`,
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ponto${plural('pt', maxPoints, { one: '', other: 's' })}`,
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
  playAgainButton: 'Opnieuw spelen',
  keepPlayingButton: 'Verder spelen',
  customGameButton: 'Eigen spel',
  moreMenuLabel: 'Meer opties',
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
  shareButton: 'Delen',
  shareCopied: 'Gekopieerd naar het klembord!',
  challengeNote: (points) => `Gedeelde score om te verslaan: ${points}`,
  challengeBeaten: (points) =>
    `Je hebt de gedeelde score van ${points} verslagen!`,
  hintButton: 'Hint',
  hintsUsed: (count, lostPoints) =>
    `${count} hint${plural('nl', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} ${plural('nl', lostPoints, { one: 'pt', other: 'ptn' })})`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Onthult een woord en verlaagt je maximale score met ${cost} ${plural('nl', cost, { one: 'punt', other: 'punten' })}`,
  hintedLegend: '* onthuld met een hint',
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
  ratingsTitle: 'Niveaus',
  ratingReachedLabel: 'Bereikt',
  ratingNotReachedLabel: 'Nog niet bereikt',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Al gevonden';
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
  foundSummary: (words) =>
    `${words} ${plural('nl', words, { one: 'woord', other: 'woorden' })} gevonden`,
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ${plural('nl', maxPoints, { one: 'punt', other: 'punten' })}`,
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
  playAgainButton: 'もう一度遊ぶ',
  keepPlayingButton: 'プレイを続ける',
  customGameButton: 'カスタムゲーム',
  moreMenuLabel: 'その他のオプション',
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
  shareButton: '共有',
  shareCopied: 'クリップボードにコピーしました！',
  challengeNote: (points) => `共有されたスコア：${points}（これを超えよう）`,
  challengeBeaten: (points) => `共有されたスコア${points}を超えました！`,
  hintButton: 'ヒント',
  hintsUsed: (count, lostPoints) => `ヒント${count}回（−${lostPoints}点）`,
  hintCostBadge: (cost) => `最大−${cost}`,
  hintCostLabel: (cost) => `単語を1つ表示し、最大スコアが${cost}点下がります`,
  hintedLegend: '* ヒントで表示',
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
  ratingsTitle: 'ランク',
  ratingReachedLabel: '達成済み',
  ratingNotReachedLabel: '未達成',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'すでに見つけた単語です';
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
  foundSummary: (words) => `${words}個の単語`,
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints}ポイント`,
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
  playAgainButton: '다시 하기',
  keepPlayingButton: '계속 플레이하기',
  customGameButton: '커스텀 게임',
  moreMenuLabel: '더 보기',
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
  shareButton: '공유',
  shareCopied: '클립보드에 복사했어요!',
  challengeNote: (points) => `공유된 점수: ${points} (도전해 보세요)`,
  challengeBeaten: (points) => `공유된 점수 ${points}점을 넘었어요!`,
  hintButton: '힌트',
  hintsUsed: (count, lostPoints) => `힌트 ${count}개 (−${lostPoints}점)`,
  hintCostBadge: (cost) => `최대 −${cost}`,
  hintCostLabel: (cost) =>
    `단어 하나를 공개하고 최대 점수가 ${cost}점 낮아집니다`,
  hintedLegend: '* 힌트로 공개',
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
  ratingsTitle: '등급',
  ratingReachedLabel: '달성함',
  ratingNotReachedLabel: '아직 미달성',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return '이미 찾은 단어입니다';
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
  foundSummary: (words) => `단어 ${words}개`,
  scoreLabel: (earnedPoints, maxPoints) => `${earnedPoints} / ${maxPoints}점`,
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
  playAgainButton: '再玩一局',
  keepPlayingButton: '继续游戏',
  customGameButton: '自定义游戏',
  moreMenuLabel: '更多选项',
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
  shareButton: '分享',
  shareCopied: '已复制到剪贴板！',
  challengeNote: (points) => `好友分享的分数：${points}（超过它！）`,
  challengeBeaten: (points) => `你超过了分享的分数 ${points}！`,
  hintButton: '提示',
  hintsUsed: (count, lostPoints) => `${count} 次提示（−${lostPoints} 分）`,
  hintCostBadge: (cost) => `上限−${cost}`,
  hintCostLabel: (cost) => `揭示一个单词，最高分降低 ${cost} 分`,
  hintedLegend: '* 用提示揭示',
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
  ratingsTitle: '等级',
  ratingReachedLabel: '已达到',
  ratingNotReachedLabel: '尚未达到',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return '已找到过';
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
  foundSummary: (words) => `已找到 ${words} 个单词`,
  scoreLabel: (earnedPoints, maxPoints) => `${earnedPoints} / ${maxPoints} 分`,
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
  playAgainButton: 'Сыграть ещё раз',
  keepPlayingButton: 'Продолжить игру',
  customGameButton: 'Своя игра',
  moreMenuLabel: 'Ещё',
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
  shareButton: 'Поделиться',
  shareCopied: 'Скопировано в буфер обмена!',
  challengeNote: (points) => `Поделились результатом ${points} — побейте его!`,
  challengeBeaten: (points) => `Вы побили результат ${points}!`,
  hintButton: 'Подсказка',
  hintsUsed: (count, lostPoints) =>
    `${count} ${plural('ru', count, { one: 'подсказка', few: 'подсказки', other: 'подсказок' })} ` +
    `(−${lostPoints} очк.)`,
  hintCostBadge: (cost) => `−${cost} макс`,
  hintCostLabel: (cost) =>
    `Открывает слово и снижает максимум на ${cost} ${plural('ru', cost, { one: 'очко', few: 'очка', other: 'очков' })}`,
  hintedLegend: '* открыто подсказкой',
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
  ratingsTitle: 'Звания',
  ratingReachedLabel: 'Достигнуто',
  ratingNotReachedLabel: 'Ещё не достигнуто',
  submitPreviewLabel: (preview) => {
    switch (preview.verdict) {
      case 'already-found':
        return 'Уже найдено';
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
  foundSummary: (words) =>
    `Найдено ${words} ${plural('ru', words, { one: 'слово', few: 'слова', other: 'слов' })}`,
  scoreLabel: (earnedPoints, maxPoints) =>
    `${earnedPoints} / ${maxPoints} ${plural('ru', maxPoints, { one: 'очко', few: 'очка', other: 'очков' })}`,
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

// The browser's languages decide the locale, but a ?lang= query parameter
// wins when present (handy for spot-checking translations).
export function resolveLocale(): Locale {
  const override = new URLSearchParams(window.location.search).get('lang');
  return detectLocale(
    override === null
      ? navigator.languages
      : [override, ...navigator.languages],
  );
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
