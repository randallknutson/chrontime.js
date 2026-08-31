import { ChronError } from './errors';
import { parseChron, requireKind } from './parse';
import { formatChronsField } from './quantum';
import { ChronKind, ParseOptions, Profile } from './types';
import { quantizeTimeOfDay, wrapTimeOfDay } from './carry';
import { formatZone, validateZone } from './zone';

export class ChronTime {
  readonly kind: ChronKind = 'time-only';
  readonly time: number;
  readonly zone: number | null;

  constructor(time: number, zone: number | null = 0) {
    if (!Number.isFinite(time) || time < 0 || time >= 1000) {
      throw new ChronError(`time ${time} is outside [0, 1000)`);
    }
    this.time = time;
    this.zone = zone === null ? null : validateZone(zone);
  }

  static parse(input: string, options: ParseOptions = {}): ChronTime {
    const parsed = requireKind(parseChron(input, options), 'time-only', input);
    return new ChronTime(parsed.time, parsed.zone);
  }

  gmtChrons(): number {
    if (this.zone === null) {
      throw new ChronError('time-only with an omitted zone cannot be reduced to GMT');
    }
    return wrapTimeOfDay(this.time + this.zone);
  }

  toGmt(): ChronTime {
    return new ChronTime(this.gmtChrons(), 0);
  }

  withZone(zone: number): ChronTime {
    return new ChronTime(this.time, validateZone(zone));
  }

  atZone(zone: number): ChronTime {
    const gmt = this.gmtChrons();
    const z = validateZone(zone);
    return new ChronTime(wrapTimeOfDay(gmt - z), z);
  }

  toString(profile: Profile = 'interchange'): string {
    const time = formatChronsField(quantizeTimeOfDay(this.time), 3);
    if (profile === 'canonical') {
      return `${formatChronsField(quantizeTimeOfDay(this.gmtChrons()), 3)}Z`;
    }
    if (profile === 'presentation') {
      return time;
    }
    if (this.zone === null) {
      throw new ChronError('interchange time-only requires a zone or Z');
    }
    return `${time}${formatZone(this.zone)}`;
  }

  toCanonical(): string {
    return this.toString('canonical');
  }

  toJSON(): string {
    return this.toCanonical();
  }

  equals(other: ChronTime): boolean {
    return this.toCanonical() === other.toCanonical();
  }
}
