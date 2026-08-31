# Chron Time

TypeScript implementation of [Chron Time](https://github.com/randallknutson/chrontime/blob/main/CHRON-TIME-SPEC.md), a calendar date and time-of-day notation that keeps the Gregorian year and leap rule, writes the year as 26 fortnights plus Year Day and Leap Day, divides the day into 1000 chrons, and uses a longitude zone whose sign adds toward GMT.

```
npm install @chrontime/chrontime
```

```ts
import {
  parse,
  ChronInstant,
  ChronDate,
  ChronTime,
  ChronDuration,
  fromUtc,
  fromRfc3339,
  zoneFromLongitude,
} from '@chrontime/chrontime';

ChronInstant.parse('2026R04:659.472+269').toCanonical();
// '2026R04:928.472Z'

fromUtc(new Date('2020-02-09T12:00:00Z')).toCanonical();
// '2020C12:500Z'

ChronDate.parse('2026R4').toGregorian();
// { year: 2026, month: 8, day: 30 }

ChronTime.parse('200+300').equals(ChronTime.parse('500Z'));
// true

ChronDuration.parse('0.050d').toCanonical();
// '50c'

zoneFromLongitude(96.9); // Carrollton, Texas, west longitude
// 269
```

## Calendar

The year number and leap rule are Gregorian. Day 1 of fortnight A (`A01`) is 1 January.

| Slot | Days of year | Notes |
|------|----------------|--------|
| Fortnights `A`–`Z` | 1–364 | 14 days each |
| Year Day `YD` | 365 | not in a fortnight, month, or week |
| Leap Day `LD` | 366 | leap years only; Gregorian 29 February is an ordinary Chron day (`2020E04`) |

A common year ends `Z14`, `YD`. A leap year ends `Z14`, `YD`, `LD`.

There are 13 months of two fortnights (28 days). The written date uses the fortnight letter, not a month number.

## Time of day

A day is 1000 **chrons**. Chron `000` is midnight UTC. Chron `500` is noon UTC. One chron is 86.4 POSIX seconds.

Chron Time uses the POSIX scale: every calendar day is 86400 seconds. A leap second is not a distinct Chron instant. RFC 3339 `23:59:60` maps to chron `999` of that UTC date, never to `000` of the next day.

## Zones

A zone is a longitude band, not a civil time zone. Daylight saving and other clock laws do not change it.

```
local + zone = GMT
```

West of Greenwich is plus. East is minus. `Z` means zone `+000`.

```
2020C12:200+300   // local 200 at 108°W
2020C12:500Z      // the same instant
```

Chron-resolution zone from west longitude:

```
zone = round(longitude_west_degrees / 0.36)
```

The 180th meridian is `+500`. `-500` is not written. Implementations that ingest both Chron Time and ISO 8601 must not reuse an ISO offset parser for a Chron zone.

## Profiles

| Profile | Use | Instant example |
|---------|-----|-----------------|
| Presentation | people | `2026R4:659` (day padding and zone may be omitted) |
| Interchange | storage and transmission | `2026R04:659.472+269` (padded fields, zone required) |
| Canonical | equality | `2026R04:928.472Z` (reduced to GMT, quantum applied) |

Two values of the same kind are equal if and only if their canonical strings are identical.

Canonical numeric fields round to 0.001 chron using half-away-from-zero. Trailing zeros are stripped (`720.000Z` → `720Z`). If time rounds to `1000`, it carries into the next Chron day.

An omitted zone is allowed only in presentation. It means the local meridian is understood. It is not GMT. A date-only string names a calendar day, not an instant.

## Parsing

`parse` classifies the string:

- `c` or `d` unit suffix → duration (`50c`, `3d200c`, `-50c`)
- contains `:` → instant
- year then fortnight / `YD` / `LD`, no colon → date-only
- otherwise → time-only

```ts
parse('2020C12:200+300'); // ChronInstant
parse('2026R04');         // ChronDate
parse('500Z');            // ChronTime
parse('3d200c');          // ChronDuration
```

Pass `{ profile: 'interchange' }` to reject unpadded days, short years, and missing zones.

## Instants

```ts
const local = ChronInstant.parse('2026R04:659.472+269');
local.toCanonical();                 // '2026R04:928.472Z'
local.atZone(0).toInterchange();     // '2026R04:928.472Z'
local.toDate().toISOString();        // POSIX UTC from §6

const presentation = ChronInstant.parse('2026R4:659');
presentation.withZone(269).toCanonical();
```

`withZone` assigns a meridian to a presentation string. `atZone` rewrites the same instant at another meridian.

`fromUtc` / `fromRfc3339` convert a JS `Date` or RFC 3339 timestamp. A civil offset is used only to find the UTC instant; it does not become the Chron zone.

Adding a duration carries through fortnights, Year Day, and Leap Day:

```ts
ChronInstant.parse('2020Z14:980Z')
  .add(ChronDuration.parse('50c'))
  .toCanonical();
// '2020YD:030Z'
```

## Development

```
npm install
npm test
npm run build
```

The grammar, conversion equations, and worked examples are in the [Chron Time spec](https://github.com/randallknutson/chrontime/blob/main/CHRON-TIME-SPEC.md).
