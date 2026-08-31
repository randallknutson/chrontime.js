import { ChronDate } from './date-only';
import { ChronDuration } from './duration';
import { ChronInstant } from './instant';
import { parseChron } from './parse';
import { ChronTime } from './time-only';
import { ParseOptions } from './types';

export { ChronError } from './errors';
export {
  addDays,
  calendarFromDayOfYear,
  dayOfYearFromFortnight,
  daysInYear,
  formatDatePart,
  gregorianDayOfYear,
  gregorianFromDayOfYear,
  isLeapYear,
} from './calendar';
export { ChronDate } from './date-only';
export { ChronDuration } from './duration';
export { ChronInstant } from './instant';
export { ChronTime } from './time-only';
export { parseChron } from './parse';
export { formatCanonicalDuration, formatChronsField, roundToQuantum } from './quantum';
export { parseRfc3339 } from './rfc3339';
export {
  CHRONS_PER_DAY,
  DEGREES_PER_CHRON,
  MAX_FRACTION_DIGITS,
  MAX_ZONE,
  MIN_ZONE,
  MS_PER_CHRON,
  MS_PER_DAY,
  QUANTUM_CHRONS,
  SECONDS_PER_CHRON,
  SECONDS_PER_DAY,
} from './types';
export { zoneFromLongitude, formatZone, normalizeZone } from './zone';
export type {
  ChronKind,
  Fortnight,
  ParseOptions,
  ParseProfile,
  Profile,
  SpecialDay,
} from './types';

export function parse(
  input: string,
  options: ParseOptions = {},
): ChronInstant | ChronDate | ChronTime | ChronDuration {
  const parsed = parseChron(input, options);
  switch (parsed.kind) {
    case 'instant':
      return new ChronInstant(parsed.year, parsed.dayOfYear, parsed.time, parsed.zone);
    case 'date-only':
      return new ChronDate(parsed.year, parsed.dayOfYear);
    case 'time-only':
      return new ChronTime(parsed.time, parsed.zone);
    case 'duration':
      return new ChronDuration(parsed.chrons);
    default: {
      const _never: never = parsed;
      throw new Error(`unhandled Chron kind ${(_never as { kind: string }).kind}`);
    }
  }
}

export function now(zone: number = 0): ChronInstant {
  return ChronInstant.now(zone);
}

export function fromUtc(date: Date, zone: number = 0): ChronInstant {
  return ChronInstant.fromUtc(date, zone);
}

export function fromRfc3339(input: string, zone: number = 0): ChronInstant {
  return ChronInstant.fromRfc3339(input, zone);
}
