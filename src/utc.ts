import { gregorianDayOfYear, gregorianFromDayOfYear } from './calendar';
import { ChronError } from './errors';
import { MS_PER_CHRON, MS_PER_DAY } from './types';

function utcDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, minute, second, ms);
  return d;
}

export function utcMsFromGmt(
  year: number,
  dayOfYear: number,
  chrons: number,
): number {
  const g = gregorianFromDayOfYear(year, dayOfYear);
  const start = utcDate(g.year, g.month, g.day).getTime();
  return start + chrons * MS_PER_CHRON;
}

export function gmtFromUtcMs(ms: number): { year: number; dayOfYear: number; time: number } {
  if (!Number.isFinite(ms)) {
    throw new ChronError('UTC timestamp must be finite');
  }
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const dayOfYear = gregorianDayOfYear(year, month, day);
  const msOfDay =
    ((date.getUTCHours() * 60 + date.getUTCMinutes()) * 60 + date.getUTCSeconds()) * 1000 +
    date.getUTCMilliseconds();
  const time = msOfDay / MS_PER_CHRON;
  return { year, dayOfYear, time };
}

export function dateFromGregorian(
  year: number,
  month: number,
  day: number,
): Date {
  return utcDate(year, month, day);
}

export { utcDate };
