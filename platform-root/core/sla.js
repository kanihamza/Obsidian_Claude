/** OBSIDIAN v4.0 — core/sla.js · Platform.SLA · working-time SLA engine (D-6 / Q-5, register K-1).
 *  SLA evaluation is COMPLETELY DECOUPLED from module rendering lifecycles (Decision D-6): it is a pure
 *  function of timestamps + priority, computed here once and consumed read-only by any surface. Elapsed
 *  time is counted in WAT organizational working minutes — Monday–Friday, 08:00–16:00 West Africa Time
 *  (UTC+1, no DST) — EXCLUDING national holidays (config/holidays.config.js). Weekends, nights, and
 *  holidays do not accrue. This replaces the raw-calendar-day SLA that produced false breaches (K-1).
 *
 *  SLA windows (Operational Lexicon §3.3, in WORKING HOURS): P1=2h, P2=6h, P3=24h, P4=72h. */
import { holidaySet } from '../config/holidays.config.js';

const WAT_OFFSET_MIN = 60;             // WAT = UTC+1, fixed (no daylight saving)
const WORK_START_MIN = 8 * 60;         // 08:00 WAT
const WORK_END_MIN   = 16 * 60;        // 16:00 WAT
const WORK_DAY_MIN   = WORK_END_MIN - WORK_START_MIN;   // 480 working minutes per day
const MINUTE = 60000;

/** SLA budgets in WORKING MINUTES, keyed by canonical priority token (§3.3). */
export const SLA_BUDGET_MIN = Object.freeze({ p1: 2 * 60, p2: 6 * 60, p3: 24 * 60, p4: 72 * 60 });

/** Map an arbitrary priority value (token, "High", "P1 (High)", number) to a canonical token. */
function priorityToken(p) {
  if (p == null) return 'p3';
  const s = String(p).trim().toLowerCase();
  const m = s.match(/p\s*([1-4])/); if (m) return 'p' + m[1];
  if (/high|urgent|immediate/.test(s)) return 'p1';
  if (/medium/.test(s)) return 'p2';
  if (/normal|routine/.test(s)) return 'p3';
  if (/low|defer|inform/.test(s)) return 'p4';
  return 'p3';
}

/** A Date shifted into WAT wall-clock, exposed via UTC getters (so getUTCHours() === WAT hour). */
function toWat(ms) { return new Date(ms + WAT_OFFSET_MIN * MINUTE); }
function ymd(watDate) { return watDate.toISOString().slice(0, 10); }
function isWeekend(watDate) { const d = watDate.getUTCDay(); return d === 0 || d === 6; }       // Sun/Sat
function isHoliday(watDate) { return holidaySet(watDate.getUTCFullYear()).has(ymd(watDate)); }
function isWorkingDay(watDate) { return !isWeekend(watDate) && !isHoliday(watDate); }

/** Working minutes elapsed between two epoch-ms instants (from ≤ to), counting only WAT working windows
 *  on working days. O(days) — bounded and cheap; never touches the DOM. */
export function workingMinutesBetween(fromMs, toMs) {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return 0;
  let total = 0;
  // Walk day-by-day in WAT from the start date to the end date.
  const startWat = toWat(fromMs);
  const cursor = new Date(Date.UTC(startWat.getUTCFullYear(), startWat.getUTCMonth(), startWat.getUTCDate()));
  const endWat = toWat(toMs);
  const lastDayUTC = Date.UTC(endWat.getUTCFullYear(), endWat.getUTCMonth(), endWat.getUTCDate());
  let guard = 0;
  while (cursor.getTime() <= lastDayUTC && guard++ < 4000) {   // ~10y guard
    if (isWorkingDay(cursor)) {
      const dayStr = ymd(cursor);
      // Window for this working day, as WAT minutes-of-day clamped to the from/to instants.
      const fromWat = toWat(fromMs), toWatD = toWat(toMs);
      const minOfDay = (watDate, dayString) => (ymd(watDate) === dayString
        ? watDate.getUTCHours() * 60 + watDate.getUTCMinutes()
        : (ymd(watDate) < dayString ? -Infinity : Infinity));
      const lo = Math.max(WORK_START_MIN, minOfDay(fromWat, dayStr));
      const hi = Math.min(WORK_END_MIN, minOfDay(toWatD, dayStr));
      if (hi > lo) total += (hi - lo);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return total;
}

export const SLA = {
  SLA_BUDGET_MIN,
  priorityToken,
  workingMinutesBetween,

  /** Working minutes a record has been open (from its arrival ts to `nowMs`, default Date.now()). */
  elapsedWorkingMinutes(fromTs, nowMs) {
    const from = Date.parse(fromTs);
    if (Number.isNaN(from)) return 0;
    return workingMinutesBetween(from, Number.isFinite(nowMs) ? nowMs : Date.now());
  },

  /** Full SLA state for a record: { token, budgetMin, elapsedMin, remainingMin, ratio, breached, state }.
   *  `state` ∈ ok | due-soon (≥80%) | breached. Pure — safe to call from anywhere, anytime. */
  evaluate(fromTs, priority, nowMs) {
    const token = priorityToken(priority);
    const budgetMin = SLA_BUDGET_MIN[token] || SLA_BUDGET_MIN.p3;
    const elapsedMin = this.elapsedWorkingMinutes(fromTs, nowMs);
    const remainingMin = budgetMin - elapsedMin;
    const ratio = budgetMin > 0 ? elapsedMin / budgetMin : 0;
    const breached = elapsedMin > budgetMin;
    const state = breached ? 'breached' : (ratio >= 0.8 ? 'due-soon' : 'ok');
    return { token, budgetMin, elapsedMin, remainingMin, ratio, breached, state };
  },

  /** Compact label e.g. "P1 · 1h 20m / 2h" for SLA chips. */
  label(fromTs, priority, nowMs) {
    const s = this.evaluate(fromTs, priority, nowMs);
    const fmt = (m) => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return (h ? h + 'h ' : '') + mm + 'm'; };
    return s.token.toUpperCase() + ' · ' + fmt(Math.max(0, s.elapsedMin)) + ' / ' + fmt(s.budgetMin);
  }
};

export default SLA;
