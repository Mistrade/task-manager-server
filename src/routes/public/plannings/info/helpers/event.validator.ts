export class EventValidator {
  constructor() {}

  public validateTitle(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const length = value.length;
    return length >= 5 && length <= 80;
  }

  public validateDescription(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const length = value.length;
    return length <= 3000;
  }
}
