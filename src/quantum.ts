import { ChronError } from './errors';
import { QUANTUM_DECIMALS } from './types';

/**
 * Round a real number half away from zero to the nearest integer.
 * 1.5 → 2, −1.5 → −2, 0.4 → 0.
 */
export function roundHalfAwayFromZero(n: number): number {
  if (!Number.isFinite(n)) {
    throw new ChronError('cannot round a non-finite number');
  }
  if (n === 0) {
    return 0;
  }
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  return sign * Math.floor(abs + 0.5);
}

/**
 * Round chrons to the canonical quantum of 0.001 chron.
 */
export function roundToQuantum(chrons: number): number {
  return roundHalfAwayFromZero(chrons * 10 ** QUANTUM_DECIMALS) / 10 ** QUANTUM_DECIMALS;
}

export function toMillichrons(chrons: number): number {
  return roundHalfAwayFromZero(chrons * 10 ** QUANTUM_DECIMALS);
}

/**
 * Format a non-negative chron quantity with a fixed-width integer part.
 * Trailing zeros and a dangling decimal point are stripped.
 */
export function formatChronsField(
  chrons: number,
  integerDigits: number,
  fractionDigits: number = QUANTUM_DECIMALS,
): string {
  if (!Number.isFinite(chrons)) {
    throw new ChronError('cannot format a non-finite chron value');
  }
  if (chrons < 0) {
    throw new ChronError('chron field must be non-negative');
  }
  const scaled = roundHalfAwayFromZero(chrons * 10 ** fractionDigits);
  const factor = 10 ** fractionDigits;
  let intPart = Math.floor(scaled / factor);
  let fracPart = scaled - intPart * factor;
  if (fracPart < 0) {
    fracPart = 0;
  }
  const intStr = String(intPart).padStart(integerDigits, '0');
  if (fracPart === 0) {
    return intStr;
  }
  const fracStr = String(fracPart)
    .padStart(fractionDigits, '0')
    .replace(/0+$/, '');
  return `${intStr}.${fracStr}`;
}

/**
 * Canonical duration: unpadded integer millichrons with a `c` suffix.
 */
export function formatCanonicalDuration(chrons: number): string {
  const millichrons = toMillichrons(chrons);
  const sign = millichrons < 0 ? '-' : '';
  const abs = Math.abs(millichrons);
  const intPart = Math.floor(abs / 1000);
  const fracPart = abs % 1000;
  if (fracPart === 0) {
    return `${sign}${intPart}c`;
  }
  const fracStr = String(fracPart).padStart(3, '0').replace(/0+$/, '');
  return `${sign}${intPart}.${fracStr}c`;
}

export function formatYear(year: number, padded: boolean): string {
  if (!Number.isInteger(year)) {
    throw new ChronError(`year must be an integer, got ${year}`);
  }
  const abs = Math.abs(year);
  if (abs > 9999) {
    throw new ChronError(`year ${year} is outside the 1–4 digit grammar`);
  }
  const digits = padded ? String(abs).padStart(4, '0') : String(abs);
  return year < 0 ? `-${digits}` : digits;
}

export function formatSignedZone(zone: number): string {
  const quantized = roundToQuantum(zone);
  if (quantized === -500) {
    return formatSignedZone(500);
  }
  const sign = quantized < 0 ? '-' : '+';
  return `${sign}${formatChronsField(Math.abs(quantized), 3)}`;
}
