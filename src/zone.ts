import { ChronError } from './errors';
import { formatSignedZone, roundToQuantum } from './quantum';
import { DEGREES_PER_CHRON, MAX_ZONE, MIN_ZONE } from './types';

export function normalizeZone(zone: number): number {
  if (!Number.isFinite(zone)) {
    throw new ChronError('zone must be a finite number of chrons');
  }
  const quantized = roundToQuantum(zone);
  if (quantized === -500) {
    return 500;
  }
  if (quantized < MIN_ZONE || quantized > MAX_ZONE) {
    throw new ChronError(
      `zone ${zone} is outside [${MIN_ZONE}, +${MAX_ZONE}]`,
    );
  }
  return quantized;
}

export function validateZone(zone: number): number {
  if (!Number.isFinite(zone)) {
    throw new ChronError('zone must be a finite number of chrons');
  }
  if (zone === -500) {
    throw new ChronError('numeric zone -500 is not permitted; use +500');
  }
  if (zone < MIN_ZONE || zone > MAX_ZONE) {
    throw new ChronError(
      `zone ${zone} is outside [${MIN_ZONE}, +${MAX_ZONE}]`,
    );
  }
  return zone;
}

/**
 * Chron-resolution zone from west longitude in degrees.
 * East longitudes are negative west degrees. The 180th meridian is +500.
 */
export function zoneFromLongitude(longitudeWestDegrees: number): number {
  if (!Number.isFinite(longitudeWestDegrees)) {
    throw new ChronError('longitude must be a finite number of degrees');
  }
  const zone = Math.round(longitudeWestDegrees / DEGREES_PER_CHRON);
  if (zone === -500 || zone === 500) {
    return 500;
  }
  return normalizeZone(zone);
}

export function formatZone(zone: number, asZWhenZero: boolean = true): string {
  const z = normalizeZone(zone);
  if (asZWhenZero && z === 0) {
    return 'Z';
  }
  return formatSignedZone(z);
}
