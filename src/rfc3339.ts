import { gregorianDayOfYear } from './calendar';
import { ChronError } from './errors';
import { utcDate } from './utc';

const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export interface Rfc3339Utc {
  year: number;
  dayOfYear: number;
  time: number;
  leapSecond: boolean;
}

/**
 * Parse an RFC 3339 timestamp to a UTC Chron day and chron-of-day.
 * The civil offset is used only to find the UTC instant. It is never a Chron zone.
 * A leap second (second 60) maps to chron 999 of that UTC date, not 000 of the next day.
 */
export function parseRfc3339(input: string): Rfc3339Utc {
  const m = input.match(RFC3339);
  if (!m) {
    throw new ChronError(`invalid RFC 3339 timestamp '${input}'`);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  const frac = m[7] ? Number(m[7]) : 0;
  const offset = m[8];

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ChronError(`invalid RFC 3339 date in '${input}'`);
  }
  if (hour > 23 || minute > 59 || second > 60) {
    throw new ChronError(`invalid RFC 3339 time in '${input}'`);
  }

  const leapSecond = second === 60;

  let offsetMinutes = 0;
  if (offset !== 'Z') {
    const sign = offset[0] === '-' ? -1 : 1;
    const oh = Number(offset.slice(1, 3));
    const om = Number(offset.slice(4, 6));
    offsetMinutes = sign * (oh * 60 + om);
  }

  if (leapSecond) {
    const local = utcDate(year, month, day, hour, minute, 59, 0);
    const utcMs = local.getTime() - offsetMinutes * 60 * 1000;
    const utc = new Date(utcMs);
    const uy = utc.getUTCFullYear();
    const um = utc.getUTCMonth() + 1;
    const ud = utc.getUTCDate();
    return {
      year: uy,
      dayOfYear: gregorianDayOfYear(uy, um, ud),
      time: 999,
      leapSecond: true,
    };
  }

  const ms =
    frac > 0
      ? Math.round(frac * 1000)
      : 0;
  const local = utcDate(year, month, day, hour, minute, second, ms);
  const utcMs = local.getTime() - offsetMinutes * 60 * 1000;
  const utc = new Date(utcMs);
  const uy = utc.getUTCFullYear();
  const um = utc.getUTCMonth() + 1;
  const ud = utc.getUTCDate();
  const msOfDay =
    ((utc.getUTCHours() * 60 + utc.getUTCMinutes()) * 60 + utc.getUTCSeconds()) * 1000 +
    utc.getUTCMilliseconds();
  return {
    year: uy,
    dayOfYear: gregorianDayOfYear(uy, um, ud),
    time: msOfDay / 86400,
    leapSecond: false,
  };
}
