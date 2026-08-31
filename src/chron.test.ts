import { expect } from 'chai';
import {
  ChronDate,
  ChronDuration,
  ChronError,
  ChronInstant,
  ChronTime,
  fromRfc3339,
  fromUtc,
  gregorianFromDayOfYear,
  isLeapYear,
  parse,
  zoneFromLongitude,
} from './index';

describe('Chron Time', () => {
  describe('§7 worked examples', () => {
    const examples: Array<{
      meaning: string;
      interchange: string;
      canonical: string;
      utc?: string;
      date?: string;
    }> = [
      {
        meaning: 'Start of 2020',
        interchange: '2020A01:000Z',
        canonical: '2020A01:000Z',
        utc: '2020-01-01T00:00:00.000Z',
      },
      {
        meaning: 'Noon GMT, C12',
        interchange: '2020C12:500Z',
        canonical: '2020C12:500Z',
        utc: '2020-02-09T12:00:00.000Z',
      },
      {
        meaning: 'Same noon, 108°W',
        interchange: '2020C12:200+300',
        canonical: '2020C12:500Z',
        utc: '2020-02-09T12:00:00.000Z',
      },
      {
        meaning: 'Local noon at 108°W',
        interchange: '2020C12:500+300',
        canonical: '2020C12:800Z',
        utc: '2020-02-09T19:12:00.000Z',
      },
      {
        meaning: 'One chron after midnight',
        interchange: '2000A01:001Z',
        canonical: '2000A01:001Z',
        utc: '2000-01-01T00:01:26.400Z',
      },
      {
        meaning: '2026-08-30 22:17 UTC, Carrollton +269',
        interchange: '2026R04:659.472+269',
        canonical: '2026R04:928.472Z',
      },
      {
        meaning: 'Common Year Day',
        interchange: '2021YD:000Z',
        canonical: '2021YD:000Z',
        utc: '2021-12-31T00:00:00.000Z',
      },
      {
        meaning: 'Leap Year Day',
        interchange: '2020YD:000Z',
        canonical: '2020YD:000Z',
        utc: '2020-12-30T00:00:00.000Z',
      },
      {
        meaning: 'Leap Day',
        interchange: '2020LD:000Z',
        canonical: '2020LD:000Z',
        utc: '2020-12-31T00:00:00.000Z',
      },
      {
        meaning: 'GMT midnight from +250',
        interchange: '1999YD:750+250',
        canonical: '2000A01:000Z',
        utc: '2000-01-01T00:00:00.000Z',
      },
    ];

    examples.forEach((ex) => {
      it(ex.meaning, () => {
        const instant = ChronInstant.parse(ex.interchange);
        expect(instant.toCanonical()).to.equal(ex.canonical);
        expect(instant.toInterchange()).to.equal(
          ex.interchange.includes('Z') || /[+-]\d/.test(ex.interchange)
            ? ChronInstant.parse(ex.interchange).toInterchange()
            : ex.interchange,
        );
        expect(instant.equals(ChronInstant.parse(ex.canonical))).to.equal(true);
        if (ex.utc) {
          expect(instant.toDate().toISOString()).to.equal(ex.utc);
        }
      });
    });

    it('Leap second maps 23:59:60 to chron 999 of that date', () => {
      const instant = ChronInstant.fromRfc3339('2016-12-31T23:59:60Z');
      expect(instant.toCanonical()).to.equal('2016LD:999Z');
      expect(instant.toInterchange()).to.equal('2016LD:999Z');
    });

    it('Birthday date-only', () => {
      const d = ChronDate.parse('2026R04');
      expect(d.toCanonical()).to.equal('2026R04');
      expect(d.toString('presentation')).to.equal('2026R4');
      expect(d.toGregorian()).to.deep.equal({ year: 2026, month: 8, day: 30 });
    });

    it('Noon GMT time-only', () => {
      const t = ChronTime.parse('500Z');
      expect(t.toCanonical()).to.equal('500Z');
    });

    it('Same clock at +300 time-only', () => {
      const t = ChronTime.parse('200+300');
      expect(t.toCanonical()).to.equal('500Z');
      expect(t.equals(ChronTime.parse('500Z'))).to.equal(true);
    });

    it('100+200 = 300 GMT as time-only', () => {
      expect(ChronTime.parse('100+200').toCanonical()).to.equal('300Z');
    });

    it('50c after 2020Z14:980Z is 2020YD:030Z', () => {
      const instant = ChronInstant.parse('2020Z14:980Z');
      const next = instant.add(ChronDuration.parse('50c'));
      expect(next.toCanonical()).to.equal('2020YD:030Z');
    });

    it('720.000Z canonicalizes to 720Z', () => {
      expect(ChronInstant.parse('2000A01:720.000Z').toCanonical()).to.equal('2000A01:720Z');
    });

    it('928.470Z canonicalizes to 928.47Z', () => {
      expect(ChronInstant.parse('2026R04:928.470Z').toCanonical()).to.equal('2026R04:928.47Z');
    });

    it('presentation of the Carrollton instant', () => {
      const instant = ChronInstant.parse('2026R04:659.472+269');
      expect(instant.toPresentation()).to.equal('2026R4:659.472');
    });

    it('converts 2026-08-30 22:17 UTC into the Carrollton example', () => {
      const utc = fromUtc(new Date('2026-08-30T22:17:00Z'), 269);
      expect(utc.toInterchange()).to.equal('2026R04:659.472+269');
      expect(utc.toCanonical()).to.equal('2026R04:928.472Z');
    });
  });

  describe('Calendar', () => {
    it('uses the Gregorian leap rule', () => {
      expect(isLeapYear(2020)).to.equal(true);
      expect(isLeapYear(2021)).to.equal(false);
      expect(isLeapYear(2000)).to.equal(true);
      expect(isLeapYear(1900)).to.equal(false);
      expect(isLeapYear(2100)).to.equal(false);
      expect(isLeapYear(0)).to.equal(true);
    });

    it('maps A01 to 1 January', () => {
      expect(ChronDate.parse('2020A01').toGregorian()).to.deep.equal({
        year: 2020, month: 1, day: 1,
      });
      expect(ChronDate.parse('2021A1').toGregorian()).to.deep.equal({
        year: 2021, month: 1, day: 1,
      });
    });

    it('maps fortnights A–Z to days 1–364', () => {
      expect(ChronInstant.parse('2021A01:000Z').dayOfYear).to.equal(1);
      expect(ChronInstant.parse('2021A14:000Z').dayOfYear).to.equal(14);
      expect(ChronInstant.parse('2021B01:000Z').dayOfYear).to.equal(15);
      expect(ChronInstant.parse('2021Z14:000Z').dayOfYear).to.equal(364);
      expect(ChronInstant.parse('2021Z14:000Z').fortnight).to.equal('Z');
      expect(ChronInstant.parse('2021Z14:000Z').day).to.equal(14);
    });

    it('places Year Day and Leap Day after Z14', () => {
      expect(ChronDate.parse('2020Z14').dayOfYear).to.equal(364);
      expect(ChronDate.parse('2020YD').dayOfYear).to.equal(365);
      expect(ChronDate.parse('2020LD').dayOfYear).to.equal(366);
      expect(ChronDate.parse('2021YD').dayOfYear).to.equal(365);
      expect(gregorianFromDayOfYear(2020, 364)).to.deep.equal({ year: 2020, month: 12, day: 29 });
      expect(gregorianFromDayOfYear(2020, 365)).to.deep.equal({ year: 2020, month: 12, day: 30 });
      expect(gregorianFromDayOfYear(2020, 366)).to.deep.equal({ year: 2020, month: 12, day: 31 });
      expect(gregorianFromDayOfYear(2021, 365)).to.deep.equal({ year: 2021, month: 12, day: 31 });
    });

    it('treats Gregorian February 29 as an ordinary Chron day', () => {
      const leap = ChronDate.parse('2020E04');
      expect(leap.toGregorian()).to.deep.equal({ year: 2020, month: 2, day: 29 });
      expect(leap.toCanonical()).to.equal('2020E04');
      const common = ChronDate.parse('2021E04');
      expect(common.toGregorian()).to.deep.equal({ year: 2021, month: 3, day: 1 });
    });

    it('round-trips Gregorian calendar dates', () => {
      const cases: Array<[string, string]> = [
        ['2020-01-01', '2020A01'],
        ['2020-01-02', '2020A02'],
        ['2020-02-28', '2020E03'],
        ['2020-02-29', '2020E04'],
        ['2020-03-01', '2020E05'],
        ['2020-06-14', '2020L12'],
        ['2020-12-29', '2020Z14'],
        ['2020-12-30', '2020YD'],
        ['2020-12-31', '2020LD'],
        ['2021-01-01', '2021A01'],
        ['2021-01-14', '2021A14'],
        ['2021-01-15', '2021B01'],
        ['2021-01-28', '2021B14'],
        ['2021-01-29', '2021C01'],
        ['2021-02-28', '2021E03'],
        ['2021-03-01', '2021E04'],
        ['2021-06-14', '2021L11'],
        ['2021-12-30', '2021Z14'],
        ['2021-12-31', '2021YD'],
      ];
      cases.forEach(([iso, chron]) => {
        const [year, month, day] = iso.split('-').map(Number);
        const parsed = ChronDate.parse(chron);
        expect(parsed.toGregorian()).to.deep.equal({ year, month, day });
        expect(ChronDate.fromGregorian(year, month, day).toCanonical()).to.equal(
          ChronDate.parse(chron, { profile: 'any' }).toCanonical(),
        );
        expect(fromUtc(new Date(`${iso}T00:00:00Z`)).toDateOnly().toCanonical())
          .to.equal(parsed.toCanonical());
      });
    });

    it('uses 13 months of two fortnights', () => {
      expect(ChronDate.parse('2026A01').month).to.equal(1);
      expect(ChronDate.parse('2026B14').month).to.equal(1);
      expect(ChronDate.parse('2026C01').month).to.equal(2);
      expect(ChronDate.parse('2026R04').month).to.equal(9);
      expect(ChronDate.parse('2026Y01').month).to.equal(13);
      expect(ChronDate.parse('2026Z14').month).to.equal(13);
      expect(ChronDate.parse('2026YD').month).to.equal(null);
      expect(ChronDate.parse('2020LD').month).to.equal(null);
    });

    it('rejects LD in a common year', () => {
      expect(() => ChronInstant.parse('2021LD:000Z')).to.throw(ChronError);
      expect(() => ChronDate.parse('1900LD')).to.throw(ChronError);
    });
  });

  describe('Profiles and parsing', () => {
    it('parses presentation instants with unpadded day and optional zone', () => {
      const a = ChronInstant.parse('2026R4:659');
      expect(a.zone).to.equal(null);
      expect(a.toPresentation()).to.equal('2026R4:659');
      expect(a.withZone(269).toCanonical()).to.equal('2026R04:928Z');
    });

    it('parses interchange instants with padded day and required zone', () => {
      const a = ChronInstant.parse('2026R04:659.472+269', { profile: 'interchange' });
      expect(a.toInterchange()).to.equal('2026R04:659.472+269');
    });

    it('rejects unpadded days in interchange', () => {
      expect(() => ChronInstant.parse('2026R4:659.472+269', { profile: 'interchange' }))
        .to.throw(ChronError);
    });

    it('rejects a missing zone in interchange instants and time-only', () => {
      expect(() => ChronInstant.parse('2026R04:659.472', { profile: 'interchange' }))
        .to.throw(ChronError);
      expect(() => ChronTime.parse('659', { profile: 'interchange' }))
        .to.throw(ChronError);
    });

    it('rejects the older glued form', () => {
      expect(() => parse('2020C120.500+0.3')).to.throw(ChronError);
    });

    it('rejects a fractional part longer than 12 digits', () => {
      expect(() => ChronInstant.parse('2020A01:500.1234567890123Z')).to.throw(ChronError);
      expect(() => ChronDuration.parse('1.1234567890123c')).to.throw(ChronError);
    });

    it('accepts 12 fractional digits', () => {
      const instant = ChronInstant.parse('2020A01:500.123456789012Z');
      expect(instant.time).to.equal(500.123456789012);
    });

    it('rejects time at or above 1000', () => {
      expect(() => ChronInstant.parse('2020A01:1000Z')).to.throw(ChronError);
    });

    it('rejects day 00 and day 15', () => {
      expect(() => ChronDate.parse('2020A00')).to.throw(ChronError);
      expect(() => ChronDate.parse('2020A15')).to.throw(ChronError);
      expect(() => ChronDate.parse('2020A0')).to.throw(ChronError);
    });

    it('rejects lowercase letters in the date slot', () => {
      expect(() => ChronInstant.parse('2020a01:000Z')).to.throw(ChronError);
    });

    it('classifies kinds from the grammar', () => {
      expect(parse('2020C12:200+300').kind).to.equal('instant');
      expect(parse('2026R04').kind).to.equal('date-only');
      expect(parse('2026R4').kind).to.equal('date-only');
      expect(parse('500Z').kind).to.equal('time-only');
      expect(parse('200+300').kind).to.equal('time-only');
      expect(parse('50c').kind).to.equal('duration');
      expect(parse('0.050d').kind).to.equal('duration');
      expect(parse('3d200c').kind).to.equal('duration');
    });

    it('parses negative four-digit years', () => {
      const instant = ChronInstant.parse('-0001A01:000Z');
      expect(instant.year).to.equal(-1);
      expect(instant.toCanonical()).to.equal('-0001A01:000Z');
      expect(instant.toPresentation()).to.equal('-1A1:000');
    });

    it('parses presentation years with 1–4 digits', () => {
      expect(ChronInstant.parse('1A1:000Z').year).to.equal(1);
      expect(ChronInstant.parse('10A1:000Z').year).to.equal(10);
      expect(ChronInstant.parse('100A1:000Z').year).to.equal(100);
      expect(ChronInstant.parse('-1A1:000Z').toCanonical()).to.equal('-0001A01:000Z');
    });

    it('requires four-digit years in interchange', () => {
      expect(() => ChronInstant.parse('1A01:000Z', { profile: 'interchange' }))
        .to.throw(ChronError);
    });
  });

  describe('Zones', () => {
    it('uses local + zone = GMT with west as plus', () => {
      expect(ChronInstant.parse('2020C12:200+300').toCanonical()).to.equal('2020C12:500Z');
      expect(ChronTime.parse('100+200').toCanonical()).to.equal('300Z');
    });

    it('computes chron-resolution zones from west longitude', () => {
      expect(zoneFromLongitude(0)).to.equal(0);
      expect(zoneFromLongitude(96.9)).to.equal(269);
      expect(zoneFromLongitude(87.6)).to.equal(243);
      expect(zoneFromLongitude(-14.4)).to.equal(-40);
      expect(zoneFromLongitude(180)).to.equal(500);
      expect(zoneFromLongitude(-180)).to.equal(500);
    });

    it('does not emit -500', () => {
      expect(() => ChronInstant.parse('2000A01:000-500')).to.throw(ChronError);
      expect(ChronInstant.parse('2000A01:000+500').toInterchange()).to.equal('2000A01:000+500');
    });

    it('rewrites an instant at another meridian', () => {
      const gmt = ChronInstant.parse('2000A01:000Z');
      expect(gmt.atZone(250).toInterchange()).to.equal('1999YD:750+250');
      expect(gmt.atZone(250).toCanonical()).to.equal('2000A01:000Z');
      expect(gmt.atZone(-100).toInterchange()).to.equal('2000A01:100-100');
    });

    it('does not treat an omitted zone as GMT', () => {
      const local = ChronInstant.parse('2026R4:659');
      expect(() => local.toCanonical()).to.throw(ChronError);
      expect(() => local.toDate()).to.throw(ChronError);
    });

    it('Z means zone +000', () => {
      expect(ChronInstant.parse('2020A01:000Z').zone).to.equal(0);
      expect(ChronInstant.parse('2020A01:000+000').zone).to.equal(0);
      expect(ChronInstant.parse('2020A01:000+000').toCanonical()).to.equal('2020A01:000Z');
    });

    it('rejects civil-style zones outside the Chron range', () => {
      expect(() => ChronInstant.parse('2000A01:000+600')).to.throw(ChronError);
      expect(() => ChronInstant.parse('2000A01:000-600')).to.throw(ChronError);
    });
  });

  describe('Duration', () => {
    it('canonicalizes to a single number of chrons', () => {
      expect(ChronDuration.parse('50c').toCanonical()).to.equal('50c');
      expect(ChronDuration.parse('0.050d').toCanonical()).to.equal('50c');
      expect(ChronDuration.parse('3d').toCanonical()).to.equal('3000c');
      expect(ChronDuration.parse('3d200c').toCanonical()).to.equal('3200c');
      expect(ChronDuration.parse('-50c').toCanonical()).to.equal('-50c');
    });

    it('treats 50c and 0.050d as equal', () => {
      expect(ChronDuration.parse('50c').equals(ChronDuration.parse('0.050d'))).to.equal(true);
    });

    it('rejects YD or LD inside a duration', () => {
      expect(() => ChronDuration.parse('YD')).to.throw(ChronError);
      expect(() => parse('3dYDc')).to.throw(ChronError);
    });

    it('rejects leftover of 1000c or more', () => {
      expect(() => ChronDuration.parse('3d1000c')).to.throw(ChronError);
    });

    it('carries through fortnights, YD, and LD', () => {
      expect(
        ChronInstant.parse('2020Z14:980Z').add(ChronDuration.parse('50c')).toCanonical(),
      ).to.equal('2020YD:030Z');
      expect(
        ChronInstant.parse('2020YD:980Z').add(ChronDuration.parse('50c')).toCanonical(),
      ).to.equal('2020LD:030Z');
      expect(
        ChronInstant.parse('2020LD:980Z').add(ChronDuration.parse('50c')).toCanonical(),
      ).to.equal('2021A01:030Z');
      expect(
        ChronInstant.parse('2021YD:980Z').add(ChronDuration.parse('50c')).toCanonical(),
      ).to.equal('2022A01:030Z');
    });

    it('strips trailing zeros in canonical form', () => {
      expect(ChronDuration.parse('50.000c').toCanonical()).to.equal('50c');
      expect(ChronDuration.parse('50.470c').toCanonical()).to.equal('50.47c');
    });
  });

  describe('Canonical quantum', () => {
    it('rounds half away from zero to 0.001 chron', () => {
      expect(ChronInstant.parse('2000A01:000.0004Z').toCanonical()).to.equal('2000A01:000Z');
      expect(ChronInstant.parse('2000A01:000.0005Z').toCanonical()).to.equal('2000A01:000.001Z');
      expect(ChronDuration.parse('-0.0005c').toCanonical()).to.equal('-0.001c');
    });

    it('carries when time rounds to 1000', () => {
      expect(ChronInstant.parse('2020Z14:999.9995Z').toCanonical()).to.equal('2020YD:000Z');
      expect(ChronInstant.parse('2020YD:999.9995Z').toCanonical()).to.equal('2020LD:000Z');
      expect(ChronInstant.parse('2020LD:999.9995Z').toCanonical()).to.equal('2021A01:000Z');
      expect(ChronInstant.parse('2021YD:999.9995Z').toCanonical()).to.equal('2022A01:000Z');
    });

    it('compares instants by canonical strings', () => {
      const a = ChronInstant.parse('2020C12:200+300');
      const b = ChronInstant.parse('2020C12:500Z');
      expect(a.equals(b)).to.equal(true);
      expect(a.toInterchange()).to.not.equal(b.toInterchange());
    });
  });

  describe('UTC conversion', () => {
    it('converts Date values through POSIX days of 86400 seconds', () => {
      const midnight = fromUtc(new Date('2020-01-01T00:00:00Z'));
      expect(midnight.toCanonical()).to.equal('2020A01:000Z');
      const noon = fromUtc(new Date('2020-02-09T12:00:00Z'));
      expect(noon.toCanonical()).to.equal('2020C12:500Z');
      const carrollton = fromUtc(new Date('2026-08-30T22:17:00Z'), 269);
      expect(carrollton.toInterchange()).to.equal('2026R04:659.472+269');
      expect(carrollton.toCanonical()).to.equal('2026R04:928.472Z');
    });

    it('maps 1 chron to 86.4 seconds', () => {
      const c = ChronInstant.parse('2000A01:001Z');
      expect(c.toDate().toISOString()).to.equal('2000-01-01T00:01:26.400Z');
    });

    it('maps 001.001 chrons to 86.4864 seconds', () => {
      const c = ChronInstant.parse('2000A01:001.001Z');
      expect(c.toDate().toISOString()).to.equal('2000-01-01T00:01:26.486Z');
    });

    it('quantizes 00:01:00 UTC to 000.694', () => {
      const c = fromUtc(new Date('2000-01-01T00:01:00.000Z'));
      expect(c.toCanonical()).to.equal('2000A01:000.694Z');
    });

    it('quantizes 23:59:00 UTC to 999.306', () => {
      const c = fromUtc(new Date('2000-01-01T23:59:00.000Z'));
      expect(c.toCanonical()).to.equal('2000A01:999.306Z');
    });

    it('maps quarter-day marks', () => {
      expect(fromUtc(new Date('2000-01-01T06:00:00.000Z')).toCanonical()).to.equal('2000A01:250Z');
      expect(fromUtc(new Date('2000-01-01T12:00:00.000Z')).toCanonical()).to.equal('2000A01:500Z');
      expect(fromUtc(new Date('2000-01-01T18:00:00.000Z')).toCanonical()).to.equal('2000A01:750Z');
      expect(ChronInstant.parse('2000A01:999Z').toDate().toISOString())
        .to.equal('2000-01-01T23:58:33.600Z');
    });

    it('does not copy an RFC 3339 civil offset into the Chron zone', () => {
      const c = fromRfc3339('2026-08-30T17:17:00-05:00');
      expect(c.toCanonical()).to.equal('2026R04:928.472Z');
      expect(c.zone).to.equal(0);
    });

    it('does not map a leap second to 000 of the next day', () => {
      const c = fromRfc3339('2016-12-31T23:59:60Z');
      expect(c.toCanonical()).to.equal('2016LD:999Z');
      expect(c.toDate().toISOString()).to.not.equal('2017-01-01T00:00:00.000Z');
    });

    it('converts local zone display of UTC midnight', () => {
      const utc = new Date('2000-01-01T00:00:00.000Z');
      expect(fromUtc(utc, 100).toInterchange()).to.equal('1999YD:900+100');
      expect(fromUtc(utc, 250).toInterchange()).to.equal('1999YD:750+250');
      expect(fromUtc(utc, 500).toInterchange()).to.equal('1999YD:500+500');
      expect(fromUtc(utc, -100).toInterchange()).to.equal('2000A01:100-100');
      expect(fromUtc(utc, -250).toInterchange()).to.equal('2000A01:250-250');
    });
  });

  describe('Date-only and time-only', () => {
    it('does not treat a date-only as midnight UTC', () => {
      const d = ChronDate.parse('2026R04');
      expect(d.kind).to.equal('date-only');
      expect(d.toString()).to.not.match(/:/);
    });

    it('wraps time-only through GMT without storing a date', () => {
      expect(ChronTime.parse('900+200').toCanonical()).to.equal('100Z');
      expect(ChronTime.parse('100-200').toCanonical()).to.equal('900Z');
    });

    it('formats presentation time-only without a zone', () => {
      expect(ChronTime.parse('659.472+269').toString('presentation')).to.equal('659.472');
    });
  });
});
