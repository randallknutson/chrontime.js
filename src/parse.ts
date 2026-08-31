import { ChronError } from './errors';
import { dayOfYearFromDatePart, isLeapYear } from './calendar';
import {
  MAX_FRACTION_DIGITS,
  MAX_ZONE,
  MIN_ZONE,
  ParsedValue,
  ParseOptions,
  ParseProfile,
} from './types';

class Scanner {
  constructor(readonly input: string, public pos = 0) {}

  eof(): boolean {
    return this.pos >= this.input.length;
  }

  peek(n = 1): string {
    return this.input.slice(this.pos, this.pos + n);
  }

  startsWith(s: string): boolean {
    return this.input.startsWith(s, this.pos);
  }

  consume(n = 1): string {
    const s = this.peek(n);
    this.pos += s.length;
    return s;
  }

  consumeWhile(pred: (ch: string) => boolean): string {
    const start = this.pos;
    while (this.pos < this.input.length && pred(this.input[this.pos])) {
      this.pos += 1;
    }
    return this.input.slice(start, this.pos);
  }
}

function fail(input: string, reason: string): never {
  throw new ChronError(`invalid Chron string '${input}': ${reason}`);
}

function parseUnsignedInt(digits: string): number {
  return parseInt(digits, 10);
}

function parseDecimal(intDigits: string, fracDigits: string | null): number {
  if (fracDigits === null) {
    return parseUnsignedInt(intDigits);
  }
  return parseFloat(`${intDigits}.${fracDigits}`);
}

function takeFraction(s: Scanner, input: string): string | null {
  if (!s.startsWith('.')) {
    return null;
  }
  s.consume(1);
  const frac = s.consumeWhile((ch) => ch >= '0' && ch <= '9');
  if (frac.length === 0) {
    fail(input, 'decimal point must be followed by at least one digit');
  }
  if (frac.length > MAX_FRACTION_DIGITS) {
    fail(input, `fractional part longer than ${MAX_FRACTION_DIGITS} digits`);
  }
  return frac;
}

function takeTime(s: Scanner, input: string): number {
  const intPart = s.consumeWhile((ch) => ch >= '0' && ch <= '9');
  if (intPart.length !== 3) {
    fail(input, 'time must be three digits before any decimal point');
  }
  const frac = takeFraction(s, input);
  const value = parseDecimal(intPart, frac);
  if (value < 0 || value >= 1000) {
    fail(input, `time ${value} is outside [0, 1000)`);
  }
  return value;
}

function takeZone(s: Scanner, input: string, required: boolean): number | null {
  if (s.eof()) {
    if (required) {
      fail(input, 'interchange instant or time-only string requires a zone or Z');
    }
    return null;
  }
  if (s.startsWith('Z')) {
    s.consume(1);
    return 0;
  }
  const signCh = s.peek();
  if (signCh !== '+' && signCh !== '-') {
    if (required) {
      fail(input, 'expected a zone or Z');
    }
    fail(input, `unexpected trailing input '${s.peek(32)}'`);
  }
  const sign = signCh === '-' ? -1 : 1;
  s.consume(1);
  const intPart = s.consumeWhile((ch) => ch >= '0' && ch <= '9');
  if (intPart.length !== 3) {
    fail(input, 'numeric zone must have an explicit sign and three digits');
  }
  const frac = takeFraction(s, input);
  const mag = parseDecimal(intPart, frac);
  const zone = sign * mag;
  if (zone === -500) {
    fail(input, 'numeric zone -500 is not permitted; use +500');
  }
  if (zone < MIN_ZONE || zone > MAX_ZONE) {
    fail(input, `zone ${formatRawZone(zone)} is outside [${MIN_ZONE}, +${MAX_ZONE}]`);
  }
  return zone;
}

function formatRawZone(zone: number): string {
  return `${zone >= 0 ? '+' : ''}${zone}`;
}

function takeYear(
  s: Scanner,
  input: string,
  profile: ParseProfile,
): { year: number; digits: number } {
  let negative = false;
  if (s.startsWith('-')) {
    negative = true;
    s.consume(1);
  }
  const digits = s.consumeWhile((ch) => ch >= '0' && ch <= '9');
  if (digits.length < 1 || digits.length > 4) {
    fail(input, 'year must be 1–4 digits');
  }
  if (profile === 'interchange' || profile === 'canonical') {
    if (digits.length !== 4) {
      fail(input, 'interchange year must be four digits');
    }
  }
  const abs = parseUnsignedInt(digits);
  const year = negative ? -abs : abs;
  return { year, digits: digits.length };
}

function takeDatePart(
  s: Scanner,
  input: string,
  year: number,
  profile: ParseProfile,
): number {
  if (s.startsWith('YD')) {
    s.consume(2);
    return 365;
  }
  if (s.startsWith('LD')) {
    s.consume(2);
    if (!isLeapYear(year)) {
      fail(input, `LD is invalid in common year ${year}`);
    }
    return 366;
  }
  const fort = s.peek();
  if (fort < 'A' || fort > 'Z') {
    fail(input, 'expected a fortnight A–Z, YD, or LD');
  }
  s.consume(1);
  const dayDigits = s.consumeWhile((ch) => ch >= '0' && ch <= '9');
  if (profile === 'interchange' || profile === 'canonical') {
    if (dayDigits.length !== 2) {
      fail(input, 'interchange day must be two digits (01–14)');
    }
  } else if (dayDigits.length !== 1 && dayDigits.length !== 2) {
    fail(input, 'day must be 1–14');
  }
  if (dayDigits.length === 1) {
    if (dayDigits === '0') {
      fail(input, 'day must be 1–14');
    }
  }
  const day = parseUnsignedInt(dayDigits);
  if (day < 1 || day > 14) {
    fail(input, `day-in-fortnight must be 1–14, got ${day}`);
  }
  if (dayDigits.length === 2 && dayDigits[0] === '0' && day >= 10) {
    fail(input, `invalid day '${dayDigits}'`);
  }
  return dayOfYearFromDatePart(year, `${fort}${day}`);
}

function looksLikeDuration(input: string): boolean {
  return /[cd]$/.test(input) && !input.includes(':');
}

function looksLikeDateOnly(input: string): boolean {
  return /^-?\d{1,4}(?:YD|LD|[A-Z](?:0[1-9]|1[0-4]|[1-9]))$/.test(input);
}

function parseDuration(input: string): ParsedValue {
  if (/YD|LD/.test(input)) {
    fail(input, 'YD and LD are not allowed inside a duration');
  }
  const s = new Scanner(input);
  let negative = false;
  if (s.startsWith('-')) {
    negative = true;
    s.consume(1);
  }
  const first = s.consumeWhile((ch) => ch >= '0' && ch <= '9');
  if (first.length === 0) {
    fail(input, 'duration must start with a digit');
  }
  const firstFrac = takeFraction(s, input);
  const firstVal = parseDecimal(first, firstFrac);

  if (s.startsWith('d')) {
    s.consume(1);
    let leftover = 0;
    if (!s.eof()) {
      const leftoverInt = s.consumeWhile((ch) => ch >= '0' && ch <= '9');
      if (leftoverInt.length < 1 || leftoverInt.length > 3) {
        fail(input, 'duration leftover must be 1–3 digits of chrons');
      }
      const leftoverFrac = takeFraction(s, input);
      leftover = parseDecimal(leftoverInt, leftoverFrac);
      if (leftover >= 1000) {
        fail(input, 'duration leftover must be less than 1000c');
      }
      if (!s.startsWith('c')) {
        fail(input, 'duration leftover must end with c');
      }
      s.consume(1);
    }
    if (!s.eof()) {
      fail(input, `unexpected trailing input '${s.peek(32)}'`);
    }
    const chrons = firstVal * 1000 + leftover;
    return { kind: 'duration', chrons: negative ? -chrons : chrons };
  }

  if (s.startsWith('c')) {
    s.consume(1);
    if (!s.eof()) {
      fail(input, `unexpected trailing input '${s.peek(32)}'`);
    }
    return { kind: 'duration', chrons: negative ? -firstVal : firstVal };
  }

  fail(input, 'duration must use a c or d unit suffix');
}

function parseInstant(input: string, profile: ParseProfile): ParsedValue {
  const s = new Scanner(input);
  const { year } = takeYear(s, input, profile);
  const dayOfYear = takeDatePart(s, input, year, profile);
  if (!s.startsWith(':')) {
    fail(input, 'instant requires a colon before time');
  }
  s.consume(1);
  const time = takeTime(s, input);
  const zoneRequired = profile === 'interchange' || profile === 'canonical';
  const zone = takeZone(s, input, zoneRequired);
  if (profile === 'canonical') {
    if (zone !== 0 || !input.endsWith('Z')) {
      fail(input, 'canonical instant must use Z');
    }
  }
  if (!s.eof()) {
    fail(input, `unexpected trailing input '${s.peek(32)}'`);
  }
  return { kind: 'instant', year, dayOfYear, time, zone };
}

function parseDateOnly(input: string, profile: ParseProfile): ParsedValue {
  const s = new Scanner(input);
  const { year } = takeYear(s, input, profile);
  const dayOfYear = takeDatePart(s, input, year, profile);
  if (!s.eof()) {
    fail(input, `unexpected trailing input '${s.peek(32)}'`);
  }
  return { kind: 'date-only', year, dayOfYear };
}

function parseTimeOnly(input: string, profile: ParseProfile): ParsedValue {
  const s = new Scanner(input);
  const time = takeTime(s, input);
  const zoneRequired = profile === 'interchange' || profile === 'canonical';
  const zone = takeZone(s, input, zoneRequired);
  if (profile === 'canonical') {
    if (zone !== 0 || !input.endsWith('Z')) {
      fail(input, 'canonical time-only must use Z');
    }
  }
  if (!s.eof()) {
    fail(input, `unexpected trailing input '${s.peek(32)}'`);
  }
  return { kind: 'time-only', time, zone };
}

export function parseChron(input: string, options: ParseOptions = {}): ParsedValue {
  if (typeof input !== 'string' || input.length === 0) {
    throw new ChronError('Chron string must be a non-empty string');
  }
  const profile: ParseProfile = options.profile || 'any';

  if (looksLikeDuration(input)) {
    return parseDuration(input);
  }
  if (input.includes(':')) {
    return parseInstant(input, profile);
  }
  if (looksLikeDateOnly(input)) {
    return parseDateOnly(input, profile);
  }
  return parseTimeOnly(input, profile);
}

export function requireKind<K extends ParsedValue['kind']>(
  parsed: ParsedValue,
  kind: K,
  input: string,
): Extract<ParsedValue, { kind: K }> {
  if (parsed.kind !== kind) {
    throw new ChronError(`expected ${kind}, got ${parsed.kind} from '${input}'`);
  }
  return parsed as Extract<ParsedValue, { kind: K }>;
}
