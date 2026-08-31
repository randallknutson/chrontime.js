export class ChronError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChronError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
