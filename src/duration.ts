import { ChronError } from './errors';
import { parseChron, requireKind } from './parse';
import { formatCanonicalDuration, roundToQuantum } from './quantum';
import { ChronKind, ParseOptions } from './types';

export class ChronDuration {
  readonly kind: ChronKind = 'duration';
  readonly chrons: number;

  constructor(chrons: number) {
    if (!Number.isFinite(chrons)) {
      throw new ChronError('duration must be a finite number of chrons');
    }
    this.chrons = chrons;
  }

  static parse(input: string, options: ParseOptions = {}): ChronDuration {
    const parsed = requireKind(parseChron(input, options), 'duration', input);
    return new ChronDuration(parsed.chrons);
  }

  static fromDays(days: number): ChronDuration {
    return new ChronDuration(days * 1000);
  }

  get days(): number {
    return this.chrons / 1000;
  }

  abs(): ChronDuration {
    return new ChronDuration(Math.abs(this.chrons));
  }

  negate(): ChronDuration {
    return new ChronDuration(-this.chrons);
  }

  add(other: ChronDuration): ChronDuration {
    return new ChronDuration(this.chrons + other.chrons);
  }

  subtract(other: ChronDuration): ChronDuration {
    return new ChronDuration(this.chrons - other.chrons);
  }

  equals(other: ChronDuration): boolean {
    return this.toCanonical() === other.toCanonical();
  }

  toCanonical(): string {
    return formatCanonicalDuration(this.chrons);
  }

  toString(): string {
    return this.toCanonical();
  }

  toJSON(): string {
    return this.toCanonical();
  }

  valueOf(): number {
    return roundToQuantum(this.chrons);
  }
}
