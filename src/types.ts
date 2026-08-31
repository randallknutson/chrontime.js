export type Profile = 'presentation' | 'interchange' | 'canonical';

export type ParseProfile = Profile | 'any';

export type ChronKind = 'instant' | 'date-only' | 'time-only' | 'duration';

export type Fortnight =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
  | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

export type SpecialDay = 'YD' | 'LD';

export interface ParseOptions {
  profile?: ParseProfile;
}

export interface ParsedInstant {
  kind: 'instant';
  year: number;
  dayOfYear: number;
  time: number;
  zone: number | null;
}

export interface ParsedDate {
  kind: 'date-only';
  year: number;
  dayOfYear: number;
}

export interface ParsedTime {
  kind: 'time-only';
  time: number;
  zone: number | null;
}

export interface ParsedDuration {
  kind: 'duration';
  chrons: number;
}

export type ParsedValue = ParsedInstant | ParsedDate | ParsedTime | ParsedDuration;

export const CHRONS_PER_DAY = 1000;
export const SECONDS_PER_DAY = 86400;
export const MS_PER_DAY = 86400000;
export const SECONDS_PER_CHRON = 86.4;
export const MS_PER_CHRON = 86400;
export const QUANTUM_CHRONS = 0.001;
export const QUANTUM_DECIMALS = 3;
export const MAX_FRACTION_DIGITS = 12;
export const MIN_ZONE = -499;
export const MAX_ZONE = 500;
export const DEGREES_PER_CHRON = 0.36;
