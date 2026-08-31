# Chron Time implementation summary

Implemented the draft Chron Time spec (https://github.com/randallknutson/chrontime, 2026-08-30) as a TypeScript library with tests. Source under `src/` was rewritten. Nothing was pushed.

## What shipped

- **Calendar.** Gregorian year and leap rule. Fortnights `A`–`Z` (14 days), Year Day `YD`, Leap Day `LD`. `A01` is 1 January. Gregorian 29 February is an ordinary Chron day (`2020E04`). `LD` is rejected in a common year.
- **Time.** 1000 chrons per day on the POSIX 86400-second scale. RFC 3339 leap second `23:59:60` maps to chron `999` of that UTC date, not `000` of the next day.
- **Zones.** `local + zone = GMT`, west plus. `Z` is `+000`. Chron-resolution longitude `round(west_degrees / 0.36)`. Range `[-499, +500]`; `-500` is not emitted or parsed.
- **Four kinds.** Instant, date-only, time-only, duration, classified as in §5.3.
- **Three profiles.** Presentation (unpadded day, zone may be omitted), interchange (padded fields, zone required on instants and time-only), canonical (GMT + quantum + `Z`).
- **Canonical quantum.** 0.001 chron, half-away-from-zero, trailing zeros stripped, carry when time rounds to `1000`. Equality is identical canonical strings.
- **Conversions.** JS `Date` / Unix ms, RFC 3339 (civil offset used only to find UTC), duration add with carry through `YD`/`LD`.

Public API is in `src/index.ts`: `parse`, `ChronInstant`, `ChronDate`, `ChronTime`, `ChronDuration`, `fromUtc`, `fromRfc3339`, `zoneFromLongitude`, `isLeapYear`, and related helpers.

## Layout

| Path | Role |
|------|------|
| `src/parse.ts` | Grammar-directed parser |
| `src/instant.ts` | Instants, zones, add, UTC |
| `src/date-only.ts` | Date-only and Gregorian mapping |
| `src/time-only.ts` | Recurring time of day |
| `src/duration.ts` | Chron spans |
| `src/calendar.ts` | Leap years, fortnights, day-of-year |
| `src/quantum.ts` | Rounding and field format |
| `src/zone.ts` | Longitude and zone range |
| `src/rfc3339.ts` | RFC 3339 → UTC Chron fields |
| `src/chron.test.ts` | Spec examples, profiles, conversions |

The previous `src/Chron.ts` parser/formatter did not match this spec (civil-style default offset, unpadded default output, no profiles, no durations, zones outside `[-499, +500]`). It was replaced.

## Tests

```
npm test
```

70 mocha/chai tests, all passing. Coverage includes §7 worked examples, leap-year edges, profile rejection, longitude zones, duration carry, quantum rounding, POSIX Date conversion, and RFC 3339 leap seconds.

`npm run build` emits `lib/` (`tsc`).

## Notes

- Presentation `toString` omits the zone (meridian understood) and drops a leading zero on day `1`–`9`. Fractions are kept at the canonical quantum (`2026R4:659.472`), not dropped to whole chrons.
- A presentation instant without a zone cannot be canonicalized or converted to `Date` until `withZone` assigns a meridian. An omitted zone is not treated as GMT.
- `2026-08-30T22:17:00Z` quantizes to `928.472` chrons. The inverse POSIX formula from that quantized value is 19.2 ms earlier than 22:17:00, which is expected: the spec table is the UTC → Chron mapping.
- Zone sign is the opposite of ISO 8601. Civil offsets are never written in the Chron zone field.
