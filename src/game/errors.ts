export type WordSaladErrorName =
  | 'AlreadyFound'
  | 'CharacterSetTooLarge'
  | 'CharacterSetTooSmall'
  | 'GenerationFailed'
  | 'InvalidGameData'
  | 'InvalidWordLetters'
  | 'MissingRequiredCharacter'
  | 'NotFound'
  | 'NoValidWords'
  | 'TooShort';

export class WordSaladError extends Error {
  constructor(name: WordSaladErrorName, message: string) {
    super(message);
    this.name = name;
  }
}
