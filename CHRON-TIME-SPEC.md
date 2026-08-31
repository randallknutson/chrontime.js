# Chron Time

Draft specification. 2026-08-30.

Designer: Randall Knutson.

## Abstract

This document specifies Chron Time, a representation of calendar date and time of day. Chron Time keeps the Gregorian year and leap rule, writes the year as 26 fortnights plus Year Day and Leap Day, divides the day into 1000 chrons, and uses a longitude zone that adds toward GMT. A Chron zone is fixed by geography. Civil time zones, daylight saving, and other government clock laws do not change it.

## Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

The grammars in §5 use the ABNF notation of [RFC5234].

In this document, GMT means UTC on the POSIX scale of §3.3.

This document describes three profiles:

- **Presentation:** for people. Day padding MAY be dropped (`R4`). On an instant or time-only string, the zone MAY be omitted when the local meridian is understood.
- **Interchange:** for storage and transmission. Year is four digits, day is two digits (`R04`), time is three digits before any decimal point. An instant or time-only string MUST include a zone or `Z`. A date-only string MUST NOT include a time or zone.
- **Canonical:** an interchange string reduced to GMT, rounded per §5.5, and written with `Z` (instants and time-only) or as a padded date (date-only). Two values of the same kind are equal if and only if their canonical strings are identical.

---

## 1. Purpose

Chron Time keeps the Gregorian year number and leap rule, then replaces months, weeks, the 24-hour clock, and civil time-zone signs with:

- 26 fortnights of 14 days
- 13 months of two fortnights each
- 1000 chrons in a day
- longitude zones whose sign adds toward GMT

The aim is a date and time that can be added in one equation and divided by tens.

---

## 2. Calendar

### 2.1 Year

The year number MUST be the Gregorian year of the corresponding UTC date.

Leap years MUST follow the Gregorian rule: a year is a leap year if it is divisible by 4, except century years, which are leap years only if divisible by 400.

### 2.2 Fortnights

A common year has 26 fortnights plus one Year Day. A leap year has those plus one Leap Day.

Each fortnight MUST contain exactly 14 days and MUST be labeled with one letter `A`–`Z` in order.

| Fort | Days of year |
|------|----------------|
| A | 1–14 |
| B | 15–28 |
| C | 29–42 |
| … | … |
| Z | 351–364 |

Day-of-year `d` (1–364) converts as:

- fortnight index `floor((d - 1) / 14)` maps `0` → `A` … `25` → `Z`
- day-in-fort `d % 14`, or `14` when that remainder is `0`

### 2.3 Months

Each month MUST be exactly two consecutive fortnights (28 days). There are 13 such months.

| Month | Forts | Days of year |
|-------|--------|----------------|
| 1 | AB | 1–28 |
| 2 | CD | 29–56 |
| 3 | EF | 57–84 |
| 4 | GH | 85–112 |
| 5 | IJ | 113–140 |
| 6 | KL | 141–168 |
| 7 | MN | 169–196 |
| 8 | OP | 197–224 |
| 9 | QR | 225–252 |
| 10 | ST | 253–280 |
| 11 | UV | 281–308 |
| 12 | WX | 309–336 |
| 13 | YZ | 337–364 |

The written date uses the fortnight letter, not a month number. Month names are not required by this spec.

### 2.4 Alignment with Gregorian dates

For the current revision, day 1 of fortnight A (`A01`, presentation `A1`) MUST be 1 January of that Gregorian year.

The weekday of `A01` therefore drifts from year to year. A later revision MAY reform the calendar so that 1 January is always Monday. That reform is a goal, not a rule of this draft.

### 2.5 Year Day and Leap Day

**Year Day** is day 365. It MUST NOT belong to a fortnight, month, or week. It MUST be written `YD` in the fortnight-and-day slot.

**Leap Day** is day 366. It exists only in a leap year. It MUST NOT belong to a fortnight, month, or week. It MUST be written `LD` in the fortnight-and-day slot. A string that uses `LD` in a common year is invalid.

Both sit after `Z14`.

| Kind of year | Day 364 | Day 365 | Day 366 |
|--------------|---------|---------|---------|
| Common | `Z14` (30 December) | `YD` (31 December) | — |
| Leap | `Z14` (29 December) | `YD` (30 December) | `LD` (31 December) |

February 29 of the Gregorian calendar is an ordinary Chron day (for example `2020E04`). It is not Leap Day.

### 2.6 Weeks

Each fortnight is two 7-day weeks: days 01–07 and days 08–14 of that fortnight.

Those weeks are not Monday-aligned while `A01` is 1 January. Year Day and Leap Day are not part of any week.

---

## 3. Time of day

### 3.1 The chron

A day is divided into 1000 **chrons**.

The universal day starts at midnight UTC. Chron `000` is that midnight. Chron `500` is noon UTC. Chron `999` is 86.4 POSIX seconds before the next midnight.

```
1 chron  = 0.001 day = 86.4 seconds = 1.44 minutes
10 chrons = 0.01 day = 14.4 minutes   (one centiday)
100 chrons = 0.1 day = 2.4 hours      (one deciday)
0.001 chron = 0.000001 day = 0.0864 seconds  (one microday)
```

Those second counts are 86400 / 1000 POSIX seconds (§3.3), not a count of SI seconds on a leap-second day.

Time MAY be written with a decimal fraction of a chron. Interchange MAY use up to 12 fractional digits. Canonical form uses the quantum in §5.5.

### 3.2 Stored value

Implementations SHOULD store time of day as a real number of chrons in the half-open range `[0, 1000)`, or as the equivalent day fraction `[0, 1)`.

### 3.3 Leap seconds

A Chron day is the UTC calendar date. It always contains exactly 1000 chrons, from 00:00:00 UTC inclusive to the next 00:00:00 exclusive.

Chron Time uses the POSIX time scale: each day is treated as 86400 seconds. A leap second is not a distinct Chron instant. The [RFC3339] second `23:59:60` MUST be mapped to chron `999` of that UTC date. It MUST NOT be mapped to `000` of the next day.

Example: `2016-12-31T23:59:60Z` is `2016LD:999Z`.

### 3.4 Duration

A duration is a span, not an instant, date, or time of day. It MUST NOT be written as a Chron date string.

A duration is a count of chrons, or of whole Chron days plus leftover chrons. Adding a duration to an instant MUST carry through fortnights, `YD`, and `LD` using §2.

```
50c        = 50 chrons = 0.050 day
0.050d     = 50 chrons
3d         = 3000 chrons
3d200c     = 3200 chrons
```

The canonical duration is a single number of chrons, rounded per §5.5, with a `c` suffix. `50c` and `0.050d` are the same duration. Negative spans MAY be written with a leading minus (`-50c`).

---

## 4. Zones

### 4.1 Longitude

A zone is a longitude band. It is a property of the meridian, not of a government.

Civil time zones, daylight-saving rules, and other clock laws MUST NOT be used as a Chron zone. A place does not change zone when a legislature moves a clock or draws a time-zone boundary. Two places share a zone only when they share a longitude band.

| Precision | Width | Chrons | Fraction of a day |
|-----------|--------|--------|-------------------|
| Zone | 36° | 100 | 0.1 |
| Decizone | 3.6° | 10 | 0.01 |
| Chron of longitude | 0.36° | 1 | 0.001 |

Finer subdivisions MAY be used. Zone 0 covers longitude `0°` up to but not including `36°` east when the coarse 36° grid is in use.

Implementations that use chron-resolution zones MUST take

```
zone = round(longitude_west_degrees / 0.36)
```

so that west is positive, matching §4.2. East longitudes are negative west degrees.

If that value is `-500` or `+500` (the 180th meridian), the written numeric zone MUST be `+500`. Implementations MUST NOT emit `-500`.

Examples at chron resolution: Greenwich is `+000` / `Z`. Carrollton, Texas (about 96.9°W) is `+269`. Chicago (about 87.6°W) is `+243`. Prague (about 14.4°E) is `-040`. The 180th meridian is `+500`.

A civil offset such as CDT (`−05:00`, 208 chrons) is not a Chron zone. Implementations MAY convert to or from civil time for display. They MUST NOT write that civil offset in the Chron zone field.

### 4.2 Sign (opposite civil time)

Civil time uses `UTC + offset = local` (Chicago civil winter time is `−06:00`).

Chron Time uses the opposite equation:

```
local + zone = GMT
```

West of Greenwich is plus. East is minus.

Example: local `100` plus zone `200` is `300` GMT.

The zone field is in chrons, the same unit as time of day. `+269` is 269 chrons west (Carrollton). `+250` is 90° west. `+500` is 180°.

### 4.3 Date of the written string

The date in an instant string (year, fortnight, day) is the **local** date after the zone is applied. Adding zone to local time MUST carry into the next or previous Chron day and year, including onto `YD` / `LD` and off of `A01`.

Universal (GMT) time is the local time plus the zone, with that same carry.

On an instant or time-only string in the interchange and canonical profiles, the zone is REQUIRED: a numeric zone or `Z`. `Z` means zone `+000` (the Greenwich meridian).

In the presentation profile, the zone MAY be omitted when the local meridian is understood. An omitted zone MUST NOT be treated as GMT unless that context is Greenwich.

A date-only string has no zone. It names a calendar day, not an instant.

---

## 5. Text format

### 5.1 Profiles

Instant interchange:

```
2026R04:659.472+269
2020C12:200+300
2020YD:000Z
2024LD:500Z
-0001A01:000Z
```

Instant canonical (same instants, reduced to GMT, quantum applied):

```
2026R04:928.472Z
2020C12:500Z
2020YD:000Z
2024LD:500Z
-0001A01:000Z
```

Instant presentation (same first instant, meridian already known):

```
2026R4:659
```

Date-only:

```
2026R4          ; presentation
2026R04         ; interchange and canonical
2020YD
2024LD
```

Time-only:

```
659             ; presentation, meridian already known
659.472+269     ; interchange
928.472Z        ; canonical (and interchange)
100+200         ; local 100 at zone +200, same clock as 300Z
```

### 5.2 Instant grammar

```
instant          = presentation / interchange
interchange      = iyear date ":" time zone
presentation     = year date-short ":" time [ zone ]
canonical        = iyear date ":" time "Z"
iyear            = [ "-" ] 4DIGIT
year             = [ "-" ] 1*4DIGIT
date             = fortnight day-in-fort / year-day / leap-day
date-short       = fortnight day-short / year-day / leap-day
fortnight        = %x41-5A          ; A–Z
day-in-fort      = "01" / "02" / "03" / "04" / "05" / "06" / "07"
                 / "08" / "09" / "10" / "11" / "12" / "13" / "14"
day-short        = "1" / "2" / "3" / "4" / "5" / "6" / "7"
                 / "8" / "9" / day-in-fort
year-day         = "YD"
leap-day         = "LD"
time             = 3DIGIT [ "." 1*12DIGIT ]
zone             = "Z" / ( "+" / "-" ) 3DIGIT [ "." 1*12DIGIT ]
```

Letters in `date` are uppercase. `Z` as a zone is the Greenwich meridian. It is not fortnight `Z`; fortnight `Z` can only appear in the date slot (`Z14`).

`time` is chrons, zero-padded to three digits before any decimal point (`000`–`999`).

A numeric zone is chrons, with an explicit sign and three digits before any decimal point. The value `-500` MUST NOT be emitted (§4.1).

A parser MUST reject `LD` unless `year` is a leap year. A parser MUST reject a fractional part longer than 12 digits. Interchange parsers MUST reject an unpadded day (`R4`) and a missing zone.

The older glued form `2020C120.500+0.3` is not a Chron string in any profile.

### 5.3 Date-only and time-only

A **date-only** names a Chron calendar day. It is not an instant. It has no time and no zone. Midnight on that day at a given meridian is written as an instant (`2026R04:000+269` or `2026R04:000Z`).

```
date-only-interchange   = iyear date
date-only-presentation  = year date-short
date-only-canonical     = iyear date
```

Examples: birthday `2026R04`, Year Day `2021YD`, Leap Day `2020LD`.

A **time-only** names a time of day, possibly recurring. It is not an instant and not a duration (`50c`). Interchange MUST include a zone or `Z`. Presentation MAY omit the zone when the meridian is understood.

```
time-only-interchange   = time zone
time-only-presentation  = time [ zone ]
time-only-canonical     = time "Z"
```

`200+300` and `500Z` are the same time of day. They are not a date.

A parser distinguishes the kinds as follows:

- contains `c` or `d` as a unit suffix → duration
- contains `:` → instant
- starts with a year then a fortnight, `YD`, or `LD`, and has no `:` → date-only
- otherwise a leading `time` → time-only

### 5.4 Duration grammar

```
duration      = [ "-" ] ( days leftover / days / chrons-unit )
days          = 1*DIGIT [ "." 1*12DIGIT ] "d"
leftover      = 1*3DIGIT [ "." 1*12DIGIT ] "c"
chrons-unit   = 1*DIGIT [ "." 1*12DIGIT ] "c"
```

`3d200c` is 3 days and 200 chrons. A leftover MUST be less than `1000c`. Implementations MUST reject `YD` or `LD` inside a duration.

### 5.5 Canonical quantum

Canonical numeric fields are rounded to 3 decimal chrons (0.001 chron, 86.4 microseconds) using half-away-from-zero. If time rounds to `1000`, it MUST carry into the next Chron day and become `000`.

Trailing zeros after the decimal point MUST be stripped, and a dangling decimal point MUST be stripped. `500`, `500.0`, and `500.000` all canonicalize to `500`. `928.470` canonicalizes to `928.47`.

The same quantum applies to a numeric zone in interchange (then `Z` in canonical form), to time-only canonical form, and to a canonical duration in chrons.

Two instants MUST be compared by producing both canonical strings and testing them for identical text. The same rule applies to two date-only values, two time-only values, or two durations.

### 5.6 Field ranges

| Field | Range |
|-------|--------|
| year (interchange) | four-digit Gregorian year, optional leading minus |
| year (presentation) | 1–4 digits, optional leading minus |
| fortnight | `A`–`Z` |
| day | `01`–`14`, or `YD`, or `LD` (presentation MAY drop a leading zero) |
| time | `[0, 1000)` chrons |
| zone | `Z`, or a longitude in chrons in `[-499, +500]` (`+500` at 180°) |
| duration | real number of chrons, optional minus |

---

## 6. Conversion

Let `doy` be the Chron day of year (`1`–`366`) and `t` the local time in chrons. `Z` is zone `0`.

```
GMT_chrons = t + zone
```

If `GMT_chrons` is outside `[0, 1000)`, carry whole days into `doy` and `year` using §2.

Apply §5.5. That is the canonical time.

The corresponding UTC instant, on the POSIX time scale of §3.3, is:

```
UTC = 00:00:00 UTC on 1 January of `year`
    + (doy - 1) * 86400 seconds
    + (GMT_chrons / 1000) * 86400 seconds
```

The inverse: take the UTC year and day-of-year, map 1–364 through §2.2, map 365 → `YD`, map 366 → `LD`, convert the UTC fraction of a day to chrons, then apply §5.5. That is the canonical time. Subtract `zone` to display local time (borrowing a day when needed).

To compare or store an instant, reduce it to the canonical profile. `2020C12:200+300` and `2020C12:500Z` are the same instant.

A date-only converts to a Gregorian calendar date through §2, with no time. A time-only converts through `GMT_chrons = t + zone` with no date carry stored; the result is a time of day in `[0, 1000)`.

[RFC3339] timestamps convert by parsing them as UTC (or as UTC plus their own civil offset), then applying this mapping. The civil offset is used only to find the UTC instant. It MUST NOT become the Chron zone. Chron Time does not replace RFC 3339 on the wire for existing systems; it is a parallel representation.

---

## 7. Worked examples

| Meaning | Interchange | Canonical | UTC or note |
|---------|-------------|-----------|-------------|
| Start of 2020 | `2020A01:000Z` | `2020A01:000Z` | 2020-01-01T00:00:00Z |
| Noon GMT, C12 | `2020C12:500Z` | `2020C12:500Z` | 2020-02-09T12:00:00Z |
| Same noon, 108°W | `2020C12:200+300` | `2020C12:500Z` | 2020-02-09T12:00:00Z |
| Local noon at 108°W | `2020C12:500+300` | `2020C12:800Z` | 2020-02-09T19:12:00Z |
| One chron after midnight | `2000A01:001Z` | `2000A01:001Z` | 2000-01-01T00:01:26.400Z |
| 2026-08-30 22:17 UTC, Carrollton +269 | `2026R04:659.472+269` | `2026R04:928.472Z` | 2026-08-30T22:17:00Z |
| Common Year Day | `2021YD:000Z` | `2021YD:000Z` | 2021-12-31T00:00:00Z |
| Leap Year Day | `2020YD:000Z` | `2020YD:000Z` | 2020-12-30T00:00:00Z |
| Leap Day | `2020LD:000Z` | `2020LD:000Z` | 2020-12-31T00:00:00Z |
| Leap second | `2016LD:999Z` | `2016LD:999Z` | 2016-12-31T23:59:60Z |
| GMT midnight from +250 | `1999YD:750+250` | `2000A01:000Z` | 2000-01-01T00:00:00Z |
| Birthday (date-only) | `2026R04` | `2026R04` | 2026-08-30 |
| Noon GMT (time-only) | `500Z` | `500Z` | every day, 12:00:00Z |
| Same clock at +300 (time-only) | `200+300` | `500Z` | same time of day as `500Z` |

`100+200 = 300` GMT is the zone equation written as time-only.

`50c` after `2020Z14:980Z` is `2020YD:030Z`.

`720.000Z` canonicalizes to `720Z`. `928.470Z` canonicalizes to `928.47Z`.

---

## 8. Open for a later revision

- Fixed Monday 1 January (calendar reform).
- Month names, including a name for month 7 (MN).

---

## 9. Security Considerations

Chron Time is a date and time notation. It is not a clock for signatures, replay windows, or other security protocols.

The zone sign is the opposite of [RFC3339] and ISO 8601: west is plus. A converter that applies a civil offset with the civil sign will shift the instant by twice the zone. Implementations that ingest both notations MUST NOT reuse an ISO 8601 offset parser for a Chron zone.

A civil time zone or DST offset MUST NOT be copied into the Chron zone field. Doing so makes two writers at the same longitude disagree after a clock-law change, and makes equality depend on a legislature.

An omitted zone is allowed only in the presentation profile of an instant or time-only string. It means the local meridian is understood. It is not GMT unless that context is Greenwich. Interchange instants and time-only strings without a zone or `Z` MUST be rejected.

A date-only MUST NOT be treated as midnight UTC. It has no instant until a time and a meridian are supplied.

Two interchange instants MUST be compared by canonicalizing both (§5.5). Comparing the raw text of `2020C12:200+300` and `2020C12:500Z` will miss that they are the same instant. `720Z` and `720.000Z` are the same after canonicalization.

A parser MUST reject a fractional part longer than 12 digits so an arbitrarily long decimal cannot be used as a resource exhaustion. Implementations SHOULD also reject years outside the grammar and any time value outside `[0, 1000)`.

---

## 10. IANA Considerations

This document has no IANA actions. A media type for Chron strings is not requested.

---

## 11. References

### 11.1 Normative References

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997. https://www.rfc-editor.org/rfc/rfc2119
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017. https://www.rfc-editor.org/rfc/rfc8174
- [RFC5234] Crocker, D., Ed., and P. Overell, "Augmented BNF for Syntax Specifications: ABNF", STD 68, RFC 5234, January 2008. https://www.rfc-editor.org/rfc/rfc5234

### 11.2 Informative References

- [RFC3339] Klyne, G. and C. Newman, "Date and Time on the Internet: Timestamps", RFC 3339, July 2002. https://www.rfc-editor.org/rfc/rfc3339
- [Metric time] Wikipedia, "Metric time". https://en.wikipedia.org/wiki/Metric_time
- [Decimal time] Wikipedia, "Decimal time". https://en.wikipedia.org/wiki/Decimal_time
