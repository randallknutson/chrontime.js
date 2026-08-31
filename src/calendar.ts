import { ChronError } from './errors';
import { Fortnight, SpecialDay } from './types';

export function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year)) {
    throw new ChronError(`year must be an integer, got ${year}`);
  }
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

export function assertDayOfYear(year: number, dayOfYear: number): void {
  if (!Number.isInteger(dayOfYear)) {
    throw new ChronError(`day of year must be an integer, got ${dayOfYear}`);
  }
  const max = daysInYear(year);
  if (dayOfYear < 1 || dayOfYear > max) {
    throw new ChronError(
      `day of year ${dayOfYear} is out of range for year ${year} (1–${max})`,
    );
  }
}

export function fortnightIndex(letter: string): number {
  if (letter.length !== 1 || letter < 'A' || letter > 'Z') {
    throw new ChronError(`invalid fortnight '${letter}'`);
  }
  return letter.charCodeAt(0) - 65;
}

export function fortnightLetter(index: number): Fortnight {
  if (index < 0 || index > 25) {
    throw new ChronError(`fortnight index ${index} is out of range`);
  }
  return String.fromCharCode(65 + index) as Fortnight;
}

export function dayOfYearFromFortnight(fortnight: string, day: number): number {
  const index = fortnightIndex(fortnight);
  if (!Number.isInteger(day) || day < 1 || day > 14) {
    throw new ChronError(`day-in-fortnight must be 1–14, got ${day}`);
  }
  return index * 14 + day;
}

export function dayOfYearFromDatePart(year: number, date: string): number {
  if (date === 'YD') {
    return 365;
  }
  if (date === 'LD') {
    if (!isLeapYear(year)) {
      throw new ChronError(`LD is invalid in common year ${year}`);
    }
    return 366;
  }
  if (date.length < 2 || date.length > 3) {
    throw new ChronError(`invalid date part '${date}'`);
  }
  const fort = date[0];
  const day = Number(date.slice(1));
  const doy = dayOfYearFromFortnight(fort, day);
  assertDayOfYear(year, doy);
  return doy;
}

export interface ChronCalendarDate {
  fortnight: Fortnight | '';
  day: number | SpecialDay;
  month: number | null;
  week: 1 | 2 | null;
}

export function calendarFromDayOfYear(year: number, dayOfYear: number): ChronCalendarDate {
  assertDayOfYear(year, dayOfYear);
  if (dayOfYear === 365) {
    return { fortnight: '', day: 'YD', month: null, week: null };
  }
  if (dayOfYear === 366) {
    return { fortnight: '', day: 'LD', month: null, week: null };
  }
  const index = Math.floor((dayOfYear - 1) / 14);
  const remainder = dayOfYear % 14;
  const day = remainder === 0 ? 14 : remainder;
  return {
    fortnight: fortnightLetter(index),
    day,
    month: Math.floor(index / 2) + 1,
    week: day <= 7 ? 1 : 2,
  };
}

export function addDays(
  year: number,
  dayOfYear: number,
  days: number,
): { year: number; dayOfYear: number } {
  if (!Number.isInteger(days)) {
    throw new ChronError(`day carry must be an integer, got ${days}`);
  }
  let y = year;
  let d = dayOfYear + days;
  if (d > 0 && d <= daysInYear(y)) {
    return { year: y, dayOfYear: d };
  }
  while (d > daysInYear(y)) {
    d -= daysInYear(y);
    y += 1;
  }
  while (d < 1) {
    y -= 1;
    d += daysInYear(y);
  }
  return { year: y, dayOfYear: d };
}

const CUMULATIVE_COMMON = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const CUMULATIVE_LEAP = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function gregorianDayOfYear(year: number, month: number, day: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new ChronError(`Gregorian month must be 1–12, got ${month}`);
  }
  const leap = isLeapYear(year);
  const dim = month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1];
  if (!Number.isInteger(day) || day < 1 || day > dim) {
    throw new ChronError(`Gregorian day ${day} is out of range for ${year}-${month}`);
  }
  const cum = leap ? CUMULATIVE_LEAP : CUMULATIVE_COMMON;
  return cum[month - 1] + day;
}

export function gregorianFromDayOfYear(
  year: number,
  dayOfYear: number,
): { year: number; month: number; day: number } {
  assertDayOfYear(year, dayOfYear);
  const leap = isLeapYear(year);
  const cum = leap ? CUMULATIVE_LEAP : CUMULATIVE_COMMON;
  let month = 12;
  for (let i = 11; i >= 0; i -= 1) {
    if (dayOfYear > cum[i]) {
      month = i + 1;
      break;
    }
  }
  return { year, month, day: dayOfYear - cum[month - 1] };
}

export function formatDatePart(year: number, dayOfYear: number, padded: boolean): string {
  const cal = calendarFromDayOfYear(year, dayOfYear);
  if (cal.day === 'YD' || cal.day === 'LD') {
    return cal.day;
  }
  const day = padded ? String(cal.day).padStart(2, '0') : String(cal.day);
  return `${cal.fortnight}${day}`;
}
