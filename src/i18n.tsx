import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { GameFeedback } from './useWordSaladGame';

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
  restartButton: string;
  hintButton: string;
  hintsUsed: (count: number, lostPoints: number) => string;
  hintCostBadge: (cost: number) => string;
  hintCostLabel: (cost: number) => string;
  hintedLegend: string;
  lockedOutNote: (reachablePoints: number, winPoints: number) => string;
  winThresholdLabel: (winPoints: number) => string;
  victory: string;
  invalidGameData: string;
  generationFailed: string;
  dictionaryLoadFailed: (detail: string) => string;
  currentWordLabel: string;
  completionLabel: string;
  requiredLetterTitle: string;
  ratingsTitle: string;
  closeButton: string;
  levelName: (level: string) => string;
  thresholdFrom: (points: number) => string;
  feedbackText: (feedback: GameFeedback) => string;
  foundSummary: (words: number) => string;
  progressLabel: (
    earnedPoints: number,
    maxPoints: number,
    level: string,
  ) => string;
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
  restartButton: 'Restart',
  hintButton: 'Hint',
  hintsUsed: (count, lostPoints) =>
    `${count} hint${plural('en', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('en', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Reveals a word and lowers your max score by ${cost} point${plural('en', cost, { one: '', other: 's' })}`,
  hintedLegend: '* revealed with a hint',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Too many hints — winning takes ${winPoints} points, ` +
    `but only ${reachablePoints} can still be reached.`,
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints} point${plural('en', maxPoints, { one: '', other: 's' })} · ${level}`,
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
  restartButton: 'Recommencer',
  hintButton: 'Indice',
  hintsUsed: (count, lostPoints) =>
    `${count} indice${plural('fr', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('fr', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Révèle un mot et réduit votre score max de ${cost} point${plural('fr', cost, { one: '', other: 's' })}`,
  hintedLegend: '* révélé par un indice',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Trop d’indices — il faut ${winPoints} points pour gagner, ` +
    `mais seulement ${reachablePoints} restent accessibles.`,
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints} point${plural('fr', maxPoints, { one: '', other: 's' })} · ${LEVELS_FR[level] ?? level}`,
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
  restartButton: 'Reiniciar',
  hintButton: 'Pista',
  hintsUsed: (count, lostPoints) =>
    `${count} pista${plural('es', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('es', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} máx`,
  hintCostLabel: (cost) =>
    `Revela una palabra y reduce tu puntuación máxima en ${cost} punto${plural('es', cost, { one: '', other: 's' })}`,
  hintedLegend: '* revelada con una pista',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Demasiadas pistas: para ganar se necesitan ${winPoints} puntos, ` +
    `pero solo quedan ${reachablePoints} alcanzables.`,
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints} punto${plural('es', maxPoints, { one: '', other: 's' })} · ${LEVELS_ES[level] ?? level}`,
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
  restartButton: 'Neu starten',
  hintButton: 'Tipp',
  hintsUsed: (count, lostPoints) =>
    `${count} ${plural('de', count, { one: 'Tipp', other: 'Tipps' })} ` +
    `(−${lostPoints} Pkt.)`,
  hintCostBadge: (cost) => `−${cost} Max`,
  hintCostLabel: (cost) =>
    `Deckt ein Wort auf und senkt deinen Höchstpunktestand um ${cost} ${plural('de', cost, { one: 'Punkt', other: 'Punkte' })}`,
  hintedLegend: '* mit einem Tipp aufgedeckt',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Zu viele Tipps — zum Sieg sind ${winPoints} Punkte nötig, ` +
    `aber nur noch ${reachablePoints} ${plural('de', reachablePoints, { one: 'ist', other: 'sind' })} erreichbar.`,
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints} ${plural('de', maxPoints, { one: 'Punkt', other: 'Punkte' })} · ${LEVELS_DE[level] ?? level}`,
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
  restartButton: 'Ricomincia',
  hintButton: 'Indizio',
  hintsUsed: (count, lostPoints) =>
    `${count} ${plural('it', count, { one: 'indizio', other: 'indizi' })} ` +
    `(−${lostPoints} pt)`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Rivela una parola e riduce il punteggio massimo di ${cost} ${plural('it', cost, { one: 'punto', other: 'punti' })}`,
  hintedLegend: '* rivelata con un indizio',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Troppi indizi: per vincere ${plural('it', winPoints, { one: 'serve', other: 'servono' })} ${winPoints} ${plural('it', winPoints, { one: 'punto', other: 'punti' })}, ` +
    `ma ne ${plural('it', reachablePoints, { one: 'resta raggiungibile', other: 'restano raggiungibili' })} solo ${reachablePoints}.`,
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints} ${plural('it', maxPoints, { one: 'punto', other: 'punti' })} · ${LEVELS_IT[level] ?? level}`,
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
  restartButton: 'Recomeçar',
  hintButton: 'Dica',
  hintsUsed: (count, lostPoints) =>
    `${count} dica${plural('pt', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} pt${plural('pt', lostPoints, { one: '', other: 's' })})`,
  hintCostBadge: (cost) => `−${cost} máx`,
  hintCostLabel: (cost) =>
    `Revela uma palavra e reduz sua pontuação máxima em ${cost} ponto${plural('pt', cost, { one: '', other: 's' })}`,
  hintedLegend: '* revelada com uma dica',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Dicas demais — vencer exige ${winPoints} pontos, ` +
    `mas só dá para alcançar ${reachablePoints}.`,
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints} ponto${plural('pt', maxPoints, { one: '', other: 's' })} · ${LEVELS_PT[level] ?? level}`,
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
  restartButton: 'Opnieuw beginnen',
  hintButton: 'Hint',
  hintsUsed: (count, lostPoints) =>
    `${count} hint${plural('nl', count, { one: '', other: 's' })} ` +
    `(−${lostPoints} ${plural('nl', lostPoints, { one: 'pt', other: 'ptn' })})`,
  hintCostBadge: (cost) => `−${cost} max`,
  hintCostLabel: (cost) =>
    `Onthult een woord en verlaagt je maximale score met ${cost} ${plural('nl', cost, { one: 'punt', other: 'punten' })}`,
  hintedLegend: '* onthuld met een hint',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Te veel hints — winnen vergt ${winPoints} punten, ` +
    `maar er ${plural('nl', reachablePoints, { one: 'is', other: 'zijn' })} er nog maar ${reachablePoints} haalbaar.`,
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints} ${plural('nl', maxPoints, { one: 'punt', other: 'punten' })} · ${LEVELS_NL[level] ?? level}`,
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
  restartButton: 'やり直す',
  hintButton: 'ヒント',
  hintsUsed: (count, lostPoints) => `ヒント${count}回（−${lostPoints}点）`,
  hintCostBadge: (cost) => `最大−${cost}`,
  hintCostLabel: (cost) => `単語を1つ表示し、最大スコアが${cost}点下がります`,
  hintedLegend: '* ヒントで表示',
  lockedOutNote: (reachablePoints, winPoints) =>
    `ヒントが多すぎます — 勝利には${winPoints}ポイント必要ですが、` +
    `あと最大${reachablePoints}ポイントしか獲得できません。`,
  winThresholdLabel: (winPoints) => `${winPoints}ポイントで勝利`,
  victory: 'あなたの勝ち！',
  invalidGameData: '無効なゲームデータ！',
  generationFailed: 'ゲームを生成できませんでした！',
  dictionaryLoadFailed: (detail) => `辞書を読み込めませんでした（${detail}）！`,
  currentWordLabel: '入力中の単語',
  completionLabel: '達成度',
  requiredLetterTitle: '必須の文字',
  ratingsTitle: 'ランク',
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints}ポイント · ${LEVELS_JA[level] ?? level}`,
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
  restartButton: '다시 시작',
  hintButton: '힌트',
  hintsUsed: (count, lostPoints) => `힌트 ${count}개 (−${lostPoints}점)`,
  hintCostBadge: (cost) => `최대 −${cost}`,
  hintCostLabel: (cost) =>
    `단어 하나를 공개하고 최대 점수가 ${cost}점 낮아집니다`,
  hintedLegend: '* 힌트로 공개',
  lockedOutNote: (reachablePoints, winPoints) =>
    `힌트를 너무 많이 썼어요 — 승리에는 ${winPoints}점이 필요하지만 ` +
    `이제 최대 ${reachablePoints}점만 얻을 수 있어요.`,
  winThresholdLabel: (winPoints) => `${winPoints}점에서 승리`,
  victory: '승리!',
  invalidGameData: '잘못된 게임 데이터!',
  generationFailed: '게임을 생성하지 못했어요!',
  dictionaryLoadFailed: (detail) => `사전을 불러오지 못했어요 (${detail})!`,
  currentWordLabel: '현재 단어',
  completionLabel: '진행도',
  requiredLetterTitle: '필수 글자',
  ratingsTitle: '등급',
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints}점 · ${LEVELS_KO[level] ?? level}`,
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
  restartButton: '重新开始',
  hintButton: '提示',
  hintsUsed: (count, lostPoints) => `${count} 次提示（−${lostPoints} 分）`,
  hintCostBadge: (cost) => `上限−${cost}`,
  hintCostLabel: (cost) => `揭示一个单词，最高分降低 ${cost} 分`,
  hintedLegend: '* 用提示揭示',
  lockedOutNote: (reachablePoints, winPoints) =>
    `提示用得太多——获胜需要 ${winPoints} 分，` +
    `但最多只能拿到 ${reachablePoints} 分。`,
  winThresholdLabel: (winPoints) => `${winPoints} 分获胜`,
  victory: '你赢了！',
  invalidGameData: '无效的游戏数据！',
  generationFailed: '无法生成游戏！',
  dictionaryLoadFailed: (detail) => `无法加载词典（${detail}）！`,
  currentWordLabel: '当前单词',
  completionLabel: '完成度',
  requiredLetterTitle: '必用字母',
  ratingsTitle: '等级',
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints} 分 · ${LEVELS_ZH[level] ?? level}`,
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
  restartButton: 'Начать заново',
  hintButton: 'Подсказка',
  hintsUsed: (count, lostPoints) =>
    `${count} ${plural('ru', count, { one: 'подсказка', few: 'подсказки', other: 'подсказок' })} ` +
    `(−${lostPoints} очк.)`,
  hintCostBadge: (cost) => `−${cost} макс`,
  hintCostLabel: (cost) =>
    `Открывает слово и снижает максимум на ${cost} ${plural('ru', cost, { one: 'очко', few: 'очка', other: 'очков' })}`,
  hintedLegend: '* открыто подсказкой',
  lockedOutNote: (reachablePoints, winPoints) =>
    `Слишком много подсказок — для победы нужно ${winPoints} ${plural('ru', winPoints, { one: 'очко', few: 'очка', other: 'очков' })}, ` +
    `но достижимо не больше ${reachablePoints}.`,
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
  progressLabel: (earnedPoints, maxPoints, level) =>
    `${earnedPoints} / ${maxPoints} ${plural('ru', maxPoints, { one: 'очко', few: 'очка', other: 'очков' })} · ${LEVELS_RU[level] ?? level}`,
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
