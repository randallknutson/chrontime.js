import {
  calendarFromDayOfYear,
  formatDatePart,
  gregorianDayOfYear,
  gregorianFromDayOfYear,
  isLeapYear,
} from './calendar';
import { ChronError } from './errors';
import { parseChron, requireKind } from './parse';
import { formatYear } from './quantum';
import { ChronKind, ParseOptions, Profile } from './types';
import { dateFromGregorian } from './utc';

export class ChronDate {
  readonly kind: ChronKind = 'date-only';
  readonly year: number;
  readonly dayOfYear: number;

  constructor(year: number, dayOfYear: number) {
    if (!Number.isInteger(year) || Math.abs(year) > 9999) {
      throw new ChronError(`year ${year} is outside the 1–4 digit grammar`);
    }
    this.year = year;
    this.dayOfYear = dayOfYear;
    calendarFromDayOfYear(year, dayOfYear);
  }

  static parse(input: string, options: ParseOptions = {}): ChronDate {
    const parsed = requireKind(parseChron(input, options), 'date-only', input);
    return new ChronDate(parsed.year, parsed.dayOfYear);
  }

  static fromGregorian(year: number, month: number, day: number): ChronDate {
    return new ChronDate(year, gregorianDayOfYear(year, month, day));
  }

  get leapYear(): boolean {
    return isLeapYear(this.year);
  }

  get fortnight(): string {
    return calendarFromDayOfYear(this.year, this.dayOfYear).fortnight;
  }

  get day(): number | 'YD' | 'LD' {
    return calendarFromDayOfYear(this.year, this.dayOfYear).day;
  }

  get month(): number | null {
    return calendarFromDayOfYear(this.year, this.dayOfYear).month;
  }

  toGregorian(): { year: number; month: number; day: number } {
    return gregorianFromDayOfYear(this.year, this.dayOfYear);
  }

  /**
   * Midnight UTC of this calendar day, as a convenience. A date-only is not an instant.
   */
  toUtcMidnight(): Date {
    const g = this.toGregorian();
    return dateFromGregorian(g.year, g.month, g.day);
  }

  toString(profile: Profile = 'interchange'): string {
    const padded = profile !== 'presentation';
    return `${formatYear(this.year, padded)}${formatDatePart(this.year, this.dayOfYear, padded)}`;
  }

  toCanonical(): string {
    return this.toString('canonical');
  }

  toJSON(): string {
    return this.toCanonical();
  }

  equals(other: ChronDate): boolean {
    return this.toCanonical() === other.toCanonical();
  }
}
