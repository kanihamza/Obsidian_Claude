/** OBSIDIAN v4.0 — core/audit-log.js · Bounded audit-event log.
 *  Listens to every Bus event starting with 'audit:' and records it in a ring buffer for the
 *  Audit Log viewer in diagnostics. Persists to localStorage so the log survives reloads
 *  (useful for incident reviews).
 *
 *  A-12 — Reference-indexed audit thread (Phase 1 Decision 4, "Activity Audit Thread"):
 *    every entry captures its `ref` (from the event payload) and is mirrored into a ref→entries
 *    index maintained in lockstep with the ring buffer (including on eviction). AuditLog.forRef(ref)
 *    returns the complete chronological thread for a reference — consumed by Phase-4 review and the
 *    Phase-6 archive snapshot writer. */
import { Bus } from './bus.js';

const LOG_CAP = 1000;
const PERSIST_KEY = 'obsidian.auditLog.v1';
const log = [];
const byRef = new Map();   // refId -> [entry, …] (oldest→newest), kept in sync with `log` (A-12)

/** Pull the reference id off an audit payload (every audit:* emit should carry `ref`). */
function refOf(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return payload.ref || payload.reference || payload.referenceId || payload.__ref || null;
}
function indexAdd(entry) {
  if (!entry.ref) return;
  let arr = byRef.get(entry.ref);
  if (!arr) { arr = []; byRef.set(entry.ref, arr); }
  arr.push(entry);
}
function indexRemove(entry) {
  if (!entry.ref) return;
  const arr = byRef.get(entry.ref);
  if (!arr) return;
  const i = arr.indexOf(entry);
  if (i >= 0) arr.splice(i, 1);
  if (!arr.length) byRef.delete(entry.ref);
}
/** Push with ring-buffer eviction, keeping the ref index consistent. */
function record(entry) {
  if (log.length >= LOG_CAP) indexRemove(log.shift());
  log.push(entry);
  indexAdd(entry);
}

// Restore prior log on module load
(function _restore() {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) for (const e of arr.slice(-LOG_CAP)) {
      // Back-fill ref for entries persisted before A-12 (best effort from the saved payload).
      if (e && e.ref === undefined) e.ref = refOf(e.payload);
      record(e);
    }
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
    const safe = (() => {
      // Stringify-safe copy (drop functions / circular)
      try { return JSON.parse(JSON.stringify(payload || {})); } catch (_) { return { _unserialisable: true }; }
    })();
    record({
      ts: new Date().toISOString(),
      kind: eventName.slice(6),    // e.g. 'persona-switch' from 'audit:persona-switch'
      ref: refOf(payload),
      payload: safe
    });
    _persistSoon();
  }
  return origEmit(eventName, payload);
};

export const AuditLog = {
  /** Query the log newest-first, optionally narrowed by kind and/or ref. */
  log({ limit = 200, kind = null, ref = null } = {}) {
    let out = ref != null ? (byRef.get(String(ref)) || []).slice().reverse() : log.slice().reverse();
    if (kind) out = out.filter((e) => e.kind === kind);
    return out.slice(0, limit);
  },
  /** Complete chronological audit thread for one reference (newest-first) — A-12 / Decision 4. */
  forRef(ref, { limit = 500 } = {}) {
    if (ref == null) return [];
    return (byRef.get(String(ref)) || []).slice().reverse().slice(0, limit);
  },
  /** Distinct event kinds, for the diagnostics filter. */
  kinds() {
    return [...new Set(log.map((e) => e.kind))].sort();
  },
  /** Distinct references that have audit history. */
  refs() {
    return [...byRef.keys()].sort();
  },
  clear() {
    log.length = 0;
    byRef.clear();
    try { globalThis.localStorage && localStorage.removeItem(PERSIST_KEY); } catch (_) {}
  }
};
export default AuditLog;
