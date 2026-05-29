import type { MoonDayResult } from './types';
import { TAINUI_CALENDAR } from './tainuiCalendar';

// Jean Meeus "Astronomical Algorithms" Chapters 47 & 49 implementation

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function normalizeAngle(deg: number): number {
  return deg - 360 * Math.floor(deg / 360);
}

function toJulianDay(year: number, month: number, day: number, hour: number, minute: number, utcOffset: number): number {
  const utcHour = hour - utcOffset;
  const dayFraction = (utcHour + minute / 60) / 24;

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (y + 4716)) +
         Math.floor(30.6001 * (m + 1)) +
         day + dayFraction + B - 1524.5;
}

// Meeus Ch.49 — Julian Day of a new moon given integer k
// k=0 is the new moon of Jan 2000
function newMoonJDE(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Mean JDE
  let JDE = 2451550.09766 + 29.530588861 * k
    + 0.00015437 * T2
    - 0.000000150 * T3
    + 0.00000000073 * T4;

  const E = 1 - 0.002516 * T - 0.0000074 * T2;

  // Mean anomalies
  const M = toRad(2.5534 + 29.10535669 * k - 0.0000218 * T2 - 0.00000011 * T3);
  const Mprime = toRad(201.5643 + 385.81693528 * k + 0.0107438 * T2 + 0.00001239 * T3 - 0.000000058 * T4);
  const F = toRad(160.7108 + 390.67050274 * k - 0.0016341 * T2 - 0.00000227 * T3 + 0.000000011 * T4);
  const Om = toRad(124.7746 - 1.56375580 * k + 0.0020691 * T2 + 0.00000215 * T3);

  // Corrections
  JDE += -0.40720 * Math.sin(Mprime)
    + 0.17241 * E * Math.sin(M)
    + 0.01608 * Math.sin(2 * Mprime)
    + 0.01039 * Math.sin(2 * F)
    + 0.00739 * E * Math.sin(Mprime - M)
    - 0.00514 * E * Math.sin(Mprime + M)
    + 0.00208 * E * E * Math.sin(2 * M)
    - 0.00111 * Math.sin(Mprime - 2 * F)
    - 0.00057 * Math.sin(Mprime + 2 * F)
    + 0.00056 * E * Math.sin(2 * Mprime + M)
    - 0.00042 * Math.sin(3 * Mprime)
    + 0.00042 * E * Math.sin(M + 2 * F)
    + 0.00038 * E * Math.sin(M - 2 * F)
    - 0.00024 * E * Math.sin(2 * Mprime - M)
    - 0.00017 * Math.sin(Om)
    - 0.00007 * Math.sin(Mprime + 2 * M)
    + 0.00004 * Math.sin(2 * Mprime - 2 * F)
    + 0.00004 * Math.sin(3 * M)
    + 0.00003 * Math.sin(Mprime + M - 2 * F)
    + 0.00003 * Math.sin(2 * Mprime + 2 * F)
    - 0.00003 * Math.sin(Mprime + M + 2 * F)
    + 0.00003 * Math.sin(Mprime - M + 2 * F)
    - 0.00002 * Math.sin(Mprime - M - 2 * F)
    - 0.00002 * Math.sin(3 * Mprime + M)
    + 0.00002 * Math.sin(4 * Mprime);

  return JDE;
}

// Find the JDE of the new moon immediately at or before the given JD,
// and the one immediately after, then return both.
function brackettingNewMoons(JD: number): { prevNM: number; nextNM: number } {
  // Approximate k from date
  const k0 = Math.floor((JD - 2451550.09766) / 29.530588861);

  // Search nearby k values to find the correct bracket
  let prevNM = newMoonJDE(k0 - 1);
  let nextNM = newMoonJDE(k0);

  // Walk forward until nextNM > JD
  let k = k0;
  while (nextNM <= JD) {
    prevNM = nextNM;
    k += 1;
    nextNM = newMoonJDE(k);
  }
  // Walk back if prevNM is somehow after JD (shouldn't happen, but guard)
  while (prevNM > JD) {
    nextNM = prevNM;
    k -= 1;
    prevNM = newMoonJDE(k - 1);
  }

  return { prevNM, nextNM };
}

export function calculateMoonDay(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  utcOffset: number = 0
): MoonDayResult {
  const JD = toJulianDay(year, month, day, hour, minute, utcOffset);

  // Days since J2000.0 (2000-01-01 12:00 TT ≈ UTC)
  const T = (JD - 2451545.0) / 36525.0;

  // Sun's mean longitude (degrees)
  const Ls = normalizeAngle(280.46646 + 36000.76983 * T + 0.0003032 * T * T);

  // Sun's mean anomaly (degrees)
  const Ms = normalizeAngle(357.52911 + 35999.05029 * T - 0.0001537 * T * T);

  // Moon's mean longitude
  const Lm = normalizeAngle(218.3165 + 481267.8813 * T);

  // Moon's mean anomaly
  const Mm = normalizeAngle(134.9634 + 477198.8676 * T + 0.008997 * T * T);

  // Moon's argument of latitude
  const F = normalizeAngle(93.2721 + 483202.0175 * T - 0.003403 * T * T);

  // Longitude of ascending node
  const Om = normalizeAngle(125.0445 - 1934.1363 * T + 0.0020708 * T * T);

  // Equation of center corrections for Moon's elongation
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  // Moon's elongation from sun (mean)
  const D = normalizeAngle(297.8502 + 445267.1115 * T - 0.00163 * T * T);

  // Perturbations sum for longitude
  let suml = 0;
  suml += 6288774 * Math.sin(toRad(Mm));
  suml += 1274027 * Math.sin(toRad(2 * D - Mm));
  suml += 658314 * Math.sin(toRad(2 * D));
  suml += 213618 * Math.sin(toRad(2 * Mm));
  suml -= 185116 * E * Math.sin(toRad(Ms));
  suml -= 114332 * Math.sin(toRad(2 * F));
  suml += 58793 * Math.sin(toRad(2 * D - 2 * Mm));
  suml += 57066 * E * Math.sin(toRad(2 * D - Ms - Mm));
  suml += 53322 * Math.sin(toRad(2 * D + Mm));
  suml += 45758 * E * Math.sin(toRad(2 * D - Ms));
  suml -= 40923 * E * Math.sin(toRad(Ms - Mm));
  suml -= 34720 * Math.sin(toRad(D));
  suml -= 30383 * E * Math.sin(toRad(Ms + Mm));
  suml += 15327 * Math.sin(toRad(2 * D - 2 * F));
  suml -= 12528 * Math.sin(toRad(Mm + 2 * F));
  suml += 10980 * Math.sin(toRad(Mm - 2 * F));
  suml += 10675 * Math.sin(toRad(4 * D - Mm));
  suml += 10034 * Math.sin(toRad(3 * Mm));
  suml += 8548 * Math.sin(toRad(4 * D - 2 * Mm));
  suml -= 7888 * E * Math.sin(toRad(2 * D + Ms - Mm));
  suml -= 6766 * E * Math.sin(toRad(2 * D + Ms));
  suml -= 5163 * Math.sin(toRad(D - Mm));
  suml += 4987 * E * Math.sin(toRad(D + Ms));
  suml += 4036 * E * Math.sin(toRad(2 * D - Ms + Mm));
  suml += 3994 * Math.sin(toRad(2 * D + 2 * Mm));
  suml += 3861 * Math.sin(toRad(4 * D));
  suml += 3665 * Math.sin(toRad(2 * D - 3 * Mm));
  suml -= 2689 * E * Math.sin(toRad(Ms - 2 * Mm));
  suml -= 2602 * Math.sin(toRad(2 * D - Mm + 2 * F));
  suml += 2390 * E * Math.sin(toRad(2 * D - Ms - 2 * Mm));
  suml -= 2348 * Math.sin(toRad(D + Mm));
  suml += 2236 * E * E * Math.sin(toRad(2 * D - 2 * Ms));
  suml -= 2120 * E * Math.sin(toRad(Ms + 2 * Mm));
  suml -= 2069 * E * E * Math.sin(toRad(2 * Ms));
  suml += 2048 * E * E * Math.sin(toRad(2 * D - 2 * Ms - Mm));
  suml -= 1773 * Math.sin(toRad(2 * D + Mm - 2 * F));
  suml -= 1595 * Math.sin(toRad(2 * D + 2 * F));
  suml += 1215 * E * Math.sin(toRad(4 * D - Ms - Mm));
  suml -= 1110 * Math.sin(toRad(2 * Mm + 2 * F));
  suml -= 892 * Math.sin(toRad(3 * D - Mm));
  suml -= 810 * E * Math.sin(toRad(2 * D + Ms + Mm));
  suml += 759 * E * Math.sin(toRad(4 * D - Ms - 2 * Mm));
  suml -= 713 * E * E * Math.sin(toRad(2 * Ms - Mm));
  suml -= 700 * E * Math.sin(toRad(2 * D + 2 * Ms - Mm));
  suml += 691 * E * Math.sin(toRad(2 * D + Ms - 2 * Mm));
  suml += 596 * E * Math.sin(toRad(2 * D - Ms - 2 * F));
  suml += 549 * Math.sin(toRad(4 * D + Mm));
  suml += 537 * Math.sin(toRad(4 * Mm));
  suml += 520 * E * Math.sin(toRad(4 * D - Ms));
  suml -= 487 * Math.sin(toRad(D - 2 * Mm));
  suml -= 399 * E * Math.sin(toRad(2 * D + Ms - 2 * F));
  suml -= 381 * Math.sin(toRad(2 * Mm - 2 * F));
  suml += 351 * E * Math.sin(toRad(D + Ms + Mm));
  suml -= 340 * Math.sin(toRad(3 * D - 2 * Mm));
  suml += 330 * Math.sin(toRad(4 * D - 3 * Mm));
  suml += 327 * E * Math.sin(toRad(2 * D - Ms + 2 * Mm));
  suml -= 323 * E * E * Math.sin(toRad(2 * Ms + Mm));
  suml += 299 * E * Math.sin(toRad(D + Ms - Mm));

  // Nutation correction
  suml += 3958 * Math.sin(toRad(Om));
  suml += 1962 * Math.sin(toRad(Lm - F));
  suml += 318 * Math.sin(toRad(Om + 216.6));

  const moonLon = Lm + suml / 1000000;

  // Sun's apparent longitude
  const sunLon = Ls + (-1.9146 * Math.sin(toRad(Ms)) - 0.020 * Math.sin(toRad(2 * Ms)));

  // Phase angle (elongation of moon from sun)
  let phaseAngle = normalizeAngle(moonLon - sunLon);

  // Moon age in days (informational only — not used for night-name lookup)
  const { prevNM, nextNM } = brackettingNewMoons(JD);
  const actualLunation = nextNM - prevNM;
  const moonAge = Math.max(0, Math.min(JD - prevNM, actualLunation - 0.0001));

  // Illumination percentage
  const illumination = Math.round(((1 - Math.cos(toRad(phaseAngle))) / 2) * 100);

  // Day number 1–30: count whole days elapsed since the new moon moment.
  // Day 1 = same day as new moon, day 2 = next day, etc.
  // This avoids skipped names caused by 23.6-hour sub-day buckets in a fractional mapping.
  const dayNumber = Math.floor(moonAge) + 1;
  const clampedDay = Math.min(Math.max(dayNumber, 1), 30);

  // Phase name
  let phase: MoonDayResult['phase'];
  let phaseEmoji: string;

  if (phaseAngle < 3.5 || phaseAngle > 356.5) {
    phase = 'new';
    phaseEmoji = '🌑';
  } else if (phaseAngle < 90) {
    phase = 'waxing-crescent';
    phaseEmoji = '🌒';
  } else if (phaseAngle < 93.5) {
    phase = 'first-quarter';
    phaseEmoji = '🌓';
  } else if (phaseAngle < 180) {
    phase = 'waxing-gibbous';
    phaseEmoji = '🌔';
  } else if (phaseAngle < 183.5) {
    phase = 'full';
    phaseEmoji = '🌕';
  } else if (phaseAngle < 270) {
    phase = 'waning-gibbous';
    phaseEmoji = '🌖';
  } else if (phaseAngle < 273.5) {
    phase = 'last-quarter';
    phaseEmoji = '🌗';
  } else {
    phase = 'waning-crescent';
    phaseEmoji = '🌘';
  }

  return {
    moonAge,
    dayNumber: clampedDay,
    illumination,
    phase,
    phaseEmoji,
    tainuiDay: TAINUI_CALENDAR[clampedDay],
  };
}
