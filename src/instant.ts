import {
  calendarFromDayOfYear,
  formatDatePart,
  isLeapYear,
} from './calendar';
import { applyQuantum, toGmtFields, toLocalFields } from './carry';
import { ChronDate } from './date-only';
import { ChronDuration } from './duration';
import { ChronError } from './errors';
import { parseChron, requireKind } from './parse';
import { formatChronsField, formatYear } from './quantum';
import { parseRfc3339 } from './rfc3339';
import { ChronTime } from './time-only';
import { ChronKind, ParseOptions, Profile } from './types';
import { gmtFromUtcMs, utcMsFromGmt } from './utc';
import { formatZone, validateZone } from './zone';

export class ChronInstant {
  readonly kind: ChronKind = 'instant';
  readonly year: number;
  readonly dayOfYear: number;
  readonly time: number;
  readonly zone: number | null;

  constructor(year: number, dayOfYear: number, time: number, zone: number | null = 0) {
    if (!Number.isInteger(year) || Math.abs(year) > 9999) {
      throw new ChronError(`year ${year} is outside the 1–4 digit grammar`);
    }
    if (!Number.isFinite(time) || time < 0 || time >= 1000) {
      throw new ChronError(`time ${time} is outside [0, 1000)`);
    }
    calendarFromDayOfYear(year, dayOfYear);
    this.year = year;
    this.dayOfYear = dayOfYear;
    this.time = time;
    this.zone = zone === null ? null : validateZone(zone);
  }

  static parse(input: string, options: ParseOptions = {}): ChronInstant {
    const parsed = requireKind(parseChron(input, options), 'instant', input);
    return new ChronInstant(parsed.year, parsed.dayOfYear, parsed.time, parsed.zone);
  }

  static fromUtc(date: Date, zone: number = 0): ChronInstant {
    const gmt = gmtFromUtcMs(date.getTime());
    const z = validateZone(zone);
    if (z === 0) {
      return new ChronInstant(gmt.year, gmt.dayOfYear, gmt.time, 0);
    }
    const local = toLocalFields(gmt.year, gmt.dayOfYear, gmt.time, z);
    return new ChronInstant(local.year, local.dayOfYear, local.time, z);
  }

  static fromUnixMs(ms: number, zone: number = 0): ChronInstant {
    return ChronInstant.fromUtc(new Date(ms), zone);
  }

  static now(zone: number = 0): ChronInstant {
    return ChronInstant.fromUtc(new Date(), zone);
  }

  static fromRfc3339(input: string, zone: number = 0): ChronInstant {
    const utc = parseRfc3339(input);
    const z = validateZone(zone);
    if (utc.leapSecond) {
      const local = z === 0
        ? { year: utc.year, dayOfYear: utc.dayOfYear, time: utc.time }
        : toLocalFields(utc.year, utc.dayOfYear, utc.time, z);
      return new ChronInstant(local.year, local.dayOfYear, local.time, z);
    }
    return ChronInstant.fromUtc(
      new Date(utcMsFromGmt(utc.year, utc.dayOfYear, utc.time)),
      z,
    );
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

  requireZone(): number {
    if (this.zone === null) {
      throw new ChronError(
        'an omitted zone is not GMT; supply a meridian before converting this instant',
      );
    }
    return this.zone;
  }

  toGmt(): ChronInstant {
    const zone = this.requireZone();
    const gmt = toGmtFields(this.year, this.dayOfYear, this.time, zone);
    return new ChronInstant(gmt.year, gmt.dayOfYear, gmt.time, 0);
  }

  /**
   * Same written local fields, with a meridian assigned. Use this for
   * presentation strings that omitted the zone.
   */
  withZone(zone: number): ChronInstant {
    return new ChronInstant(this.year, this.dayOfYear, this.time, validateZone(zone));
  }

  /**
   * Same instant, rewritten at a different meridian (`local + zone = GMT`).
   */
  atZone(zone: number): ChronInstant {
    const gmt = this.toGmt();
    const z = validateZone(zone);
    if (z === 0) {
      return gmt;
    }
    const local = toLocalFields(gmt.year, gmt.dayOfYear, gmt.time, z);
    return new ChronInstant(local.year, local.dayOfYear, local.time, z);
  }

  add(duration: ChronDuration): ChronInstant {
    const zone = this.zone;
    const base = zone === null
      ? { year: this.year, dayOfYear: this.dayOfYear, time: this.time }
      : toGmtFields(this.year, this.dayOfYear, this.time, zone);
    const moved = applyQuantum({
      year: base.year,
      dayOfYear: base.dayOfYear,
      time: base.time + duration.chrons,
    });
    const result = new ChronInstant(
      moved.year,
      moved.dayOfYear,
      moved.time,
      zone === null ? null : 0,
    );
    if (zone !== null && zone !== 0) {
      return result.atZone(zone);
    }
    return result;
  }

  subtract(duration: ChronDuration): ChronInstant {
    return this.add(new ChronDuration(-duration.chrons));
  }

  toDate(): Date {
    const gmt = this.toGmt();
    return new Date(utcMsFromGmt(gmt.year, gmt.dayOfYear, gmt.time));
  }

  toUnixMs(): number {
    return this.toDate().getTime();
  }

  toRfc3339(): string {
    return this.toDate().toISOString();
  }

  toDateOnly(): ChronDate {
    return new ChronDate(this.year, this.dayOfYear);
  }

  toTimeOnly(): ChronTime {
    return new ChronTime(this.time, this.zone);
  }

  private format(profile: Profile): string {
    let year = this.year;
    let dayOfYear = this.dayOfYear;
    let time = this.time;
    let zone = this.zone;

    if (profile === 'canonical') {
      const gmt = this.toGmt();
      year = gmt.year;
      dayOfYear = gmt.dayOfYear;
      time = gmt.time;
      zone = 0;
    }
    const q = applyQuantum({ year, dayOfYear, time });
    year = q.year;
    dayOfYear = q.dayOfYear;
    time = q.time;

    const padded = profile !== 'presentation';
    const date = formatDatePart(year, dayOfYear, padded);
    const timeStr = formatChronsField(time, 3);
    const head = `${formatYear(year, padded)}${date}:${timeStr}`;

    if (profile === 'canonical') {
      return `${head}Z`;
    }
    if (profile === 'presentation') {
      return head;
    }
    if (zone === null) {
      throw new ChronError('interchange instant requires a zone or Z');
    }
    return `${head}${formatZone(zone)}`;
  }

  toString(profile: Profile = 'interchange'): string {
    return this.format(profile);
  }

  toCanonical(): string {
    return this.format('canonical');
  }

  toInterchange(): string {
    return this.format('interchange');
  }

  toPresentation(): string {
    return this.format('presentation');
  }

  toJSON(): string {
    return this.toCanonical();
  }

  equals(other: ChronInstant): boolean {
    return this.toCanonical() === other.toCanonical();
  }
}
