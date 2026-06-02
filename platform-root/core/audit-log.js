/** OBSIDIAN v4.0 — core/audit-log.js · Bounded audit-event log.
 *  Listens to every Bus event starting with 'audit:' and records it in a ring buffer for the
 *  Audit Log viewer in diagnostics. Persists to localStorage so the log survives reloads
 *  (useful for incident reviews). */
import { Bus } from './bus.js';

const LOG_CAP = 1000;
const PERSIST_KEY = 'obsidian.auditLog.v1';
const log = [];

// Restore prior log on module load
(function _restore() {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) for (const e of arr.slice(-LOG_CAP)) log.push(e);
  } catch (_) { /* ignore corrupted / private mode */ }
})();

let _persistTimer = null;
function _persistSoon() {
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    try { globalThis.localStorage && localStorage.setItem(PERSIST_KEY, JSON.stringify(log)); }
    catch (_) {}
  }, 1500);
}

// Listen for every Bus event whose name begins with 'audit:' — the Bus has no wildcard, so
// we intercept emit() to siphon matching events.
const origEmit = Bus.emit.bind(Bus);
Bus.emit = function (eventName, payload) {
  if (typeof eventName === 'string' && eventName.startsWith('audit:')) {
    const entry = {
      ts: new Date().toISOString(),
      kind: eventName.slice(6),    // e.g. 'persona-switch' from 'audit:persona-switch'
      payload: (() => {
        // Stringify-safe copy (drop functions / circular)
        try { return JSON.parse(JSON.stringify(payload || {})); } catch (_) { return { _unserialisable: true }; }
      })()
    };
    if (log.length >= LOG_CAP) log.shift();
    log.push(entry);
    _persistSoon();
  }
  return origEmit(eventName, payload);
};

export const AuditLog = {
  log({ limit = 200, kind = null } = {}) {
    let out = log.slice().reverse();
    if (kind) out = out.filter((e) => e.kind === kind);
    return out.slice(0, limit);
  },
  kinds() {
    return [...new Set(log.map((e) => e.kind))].sort();
  },
  clear() {
    log.length = 0;
    try { globalThis.localStorage && localStorage.removeItem(PERSIST_KEY); } catch (_) {}
  }
};
export default AuditLog;
