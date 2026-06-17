/** OBSIDIAN v4.0 — holidays.config.js · NITDA national-holiday calendar for SLA working-time (D-6).
 *  SLA elapsed time is measured in WAT organizational working minutes (Mon–Fri 08:00–16:00) EXCLUDING
 *  national holidays. This file is the holiday source consumed by core/sla.js. Dates are ISO `YYYY-MM-DD`
 *  in WAT. Fixed-date Nigerian public holidays are listed multi-year; movable Islamic/observed holidays
 *  are listed per-year as confirmed (extend annually). Keeping this as data (not logic) lets the calendar
 *  be updated without touching the SLA engine. */

/** Fixed-date Nigerian federal public holidays (same calendar date every year). */
export const FIXED_HOLIDAYS = Object.freeze([
  '01-01', // New Year's Day
  '05-01', // Workers' Day
  '06-12', // Democracy Day
  '10-01', // Independence Day
  '12-25', // Christmas Day
  '12-26'  // Boxing Day
]);

/** Movable / observed national holidays by year (Eid al-Fitr, Eid al-Adha, Eid al-Mawlid, Good Friday,
 *  Easter Monday, and any one-off federal declarations). Listed as confirmed; extend each year. */
export const DATED_HOLIDAYS = Object.freeze({
  2026: [
    '2026-01-01', '2026-03-20', '2026-03-21', // New Year, Eid al-Fitr (observed window)
    '2026-04-03', '2026-04-06',               // Good Friday, Easter Monday
    '2026-05-01', '2026-05-27', '2026-05-28', // Workers' Day, Eid al-Adha (observed window)
    '2026-06-12',                             // Democracy Day
    '2026-08-25',                             // Eid al-Mawlid
    '2026-10-01', '2026-12-25', '2026-12-26'  // Independence, Christmas, Boxing Day
  ]
});

/** Build the active holiday set for a given year (fixed dates expanded + dated entries). */
export function holidaySet(year) {
  const set = new Set();
  for (const md of FIXED_HOLIDAYS) set.add(`${year}-${md}`);
  for (const d of (DATED_HOLIDAYS[year] || [])) set.add(d);
  return set;
}

export default { FIXED_HOLIDAYS, DATED_HOLIDAYS, holidaySet };
