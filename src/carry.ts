import { addDays } from './calendar';
import { roundToQuantum, toMillichrons } from './quantum';
import { CHRONS_PER_DAY } from './types';

export interface Ymdt {
  year: number;
  dayOfYear: number;
  time: number;
}

export function splitChrons(total: number): { days: number; time: number } {
  if (total === 0) {
    return { days: 0, time: 0 };
  }
  let days = Math.floor(total / CHRONS_PER_DAY);
  let time = total - days * CHRONS_PER_DAY;
  if (time < 0) {
    days -= 1;
    time += CHRONS_PER_DAY;
  }
  if (time >= CHRONS_PER_DAY) {
    days += 1;
    time -= CHRONS_PER_DAY;
  }
  if (Object.is(time, -0) || (time > 0 && time < 1e-12)) {
    time = 0;
  }
  return { days, time };
}

export function applyTimeCarry(
  year: number,
  dayOfYear: number,
  time: number,
): Ymdt {
  const { days, time: t } = splitChrons(time);
  const next = addDays(year, dayOfYear, days);
  return { year: next.year, dayOfYear: next.dayOfYear, time: t };
}

/**
 * Reduce local time + zone to GMT, carrying whole days through YD/LD.
 */
export function toGmtFields(
  year: number,
  dayOfYear: number,
  time: number,
  zone: number,
): Ymdt {
  return applyTimeCarry(year, dayOfYear, time + zone);
}

/**
 * Convert GMT fields to a local meridian.
 */
export function toLocalFields(
  year: number,
  dayOfYear: number,
  time: number,
  zone: number,
): Ymdt {
  return applyTimeCarry(year, dayOfYear, time - zone);
}

/**
 * Wrap a time-of-day into [0, 1000) with no date stored.
 */
export function wrapTimeOfDay(time: number): number {
  const { time: t } = splitChrons(time);
  return t;
}

/**
 * Apply the canonical quantum. If time rounds to 1000, carry a day.
 */
export function applyQuantum(fields: Ymdt): Ymdt {
  const millichrons = toMillichrons(fields.time);
  let days = 0;
  let milli = millichrons;
  if (milli >= 1_000_000) {
    days = Math.floor(milli / 1_000_000);
    milli -= days * 1_000_000;
  } else if (milli < 0) {
    days = Math.floor(milli / 1_000_000);
    milli -= days * 1_000_000;
  }
  const next = addDays(fields.year, fields.dayOfYear, days);
  return { year: next.year, dayOfYear: next.dayOfYear, time: milli / 1000 };
}

export function quantizeTimeOfDay(time: number): number {
  let q = roundToQuantum(time);
  if (q >= CHRONS_PER_DAY) {
    q -= CHRONS_PER_DAY;
  }
  if (q < 0) {
    q += CHRONS_PER_DAY;
  }
  return q;
}
