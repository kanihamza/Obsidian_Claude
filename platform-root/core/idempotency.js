// FILE: core/idempotency.js
/** OBSIDIAN v4.0 — core/idempotency.js · Idempotency key builder + bounded request log (A-11).
 *  Deterministic-within-bucket keys so identical retries reuse the same key and Power Automate
 *  de-dupes server-side. Default bucket is 300000 ms (5 min) — longer than the OTP email delay so an
 *  OTP-gated bulk retry keeps its key (register A-11). Pass bucketMs:0/false for a fully stable key. */

const DEFAULT_BUCKET_MS = 300000;
const LOG_CAP = 500;
const PERSIST_KEY = 'obsidian.requestLog.v1';
const log = [];

/** Actions that are reads — callers/api use this to avoid stamping idempotency on reads. */
const READ_ACTIONS = new Set([
  'fetchall', 'getdocs', 'lookups', 'init', 'refresh_emails', 'load_email_details', 'load_event_info',
  'track', 'get_all', 'get_bootstrap', 'listdocs', 'getdoc', 'getreferences', 'list-activities', 'read'
]);

function isReadAction(action) {
  return !!action && READ_ACTIONS.has(String(action).toLowerCase());
}

/** Deterministic stable serialization — object keys sorted recursively so two logically equal
 *  payloads always serialize identically regardless of property insertion order. */
function stableStringify(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    let out = '[';
    for (let i = 0; i < value.length; i++) {
      if (i > 0) out += ',';
      out += stableStringify(value[i]);
    }
    return out + ']';
  }
  const keys = Object.keys(value).sort();
  let out = '{';
  let first = true;
  for (const k of keys) {
    if (value[k] === undefined) continue;
    if (!first) out += ',';
    out += JSON.stringify(k) + ':' + stableStringify(value[k]);
    first = false;
  }
  return out + '}';
}

/** Lightweight deterministic 32-bit FNV-1a hash, base36 — no external packages. */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return (h >>> 0).toString(36);
}

/** Fingerprint of a payload, excluding volatile envelope fields that must not change identity. */
function fingerprintOf(payload) {
  const clone = {};
  if (payload && typeof payload === 'object') {
    for (const k of Object.keys(payload)) {
      if (k === 'idempotencyKey' || k === 'correlationId' || k === 'ts' || k === 'timestamp') continue;
      clone[k] = payload[k];
    }
  }
  return fnv1a(stableStringify(clone));
}

function refOf(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const v = payload.refId || payload.referenceId || payload.Reference_ID || payload.RefIDD || payload.target ||
    (payload.Selected && (payload.Selected.RefIDD || payload.Selected.ID)) || '';
  return String(v || '');
}

function token(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_-]+/g, '');
}

// Restore prior log on module load — survives reloads, useful for incident debugging.
(function _restore() {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) for (const e of arr.slice(-LOG_CAP)) log.push(e);
  } catch (_) { /* private mode / corrupted — skip */ }
})();

let _persistTimer = null;
function _persistSoon() {
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    try { globalThis.localStorage && localStorage.setItem(PERSIST_KEY, JSON.stringify(log)); }
    catch (_) { /* over-quota / private mode — skip */ }
  }, 1000);
}

export const Idempotency = {
  DEFAULT_BUCKET_MS,
  isReadAction,
  stableStringify,
  fingerprint: fingerprintOf,

  /** Build a deterministic idempotency key. Preserves a provided key verbatim.
   *  bucketMs 0/false disables the time bucket so the key is stable for an identical payload. */
  build({ endpointKey, action, operation, refId, referenceId, target, payload, bucketMs, key } = {}) {
    if (key) return String(key);
    const verb = token(String(action || operation || (payload && (payload.action || payload.operation)) || 'write').toLowerCase());
    const ep = token(endpointKey || '');
    const ref = token(refId || referenceId || target || refOf(payload));
    const fp = fingerprintOf(payload || {});
    const disabled = bucketMs === 0 || bucketMs === false;
    const ms = (typeof bucketMs === 'number' && bucketMs > 0) ? bucketMs : DEFAULT_BUCKET_MS;
    const bucket = disabled ? 'stable' : String(Math.floor(Date.now() / ms));
    return ['obsidian', ep || 'na', verb || 'write', ref || 'na', fp, bucket].join('.');
  },

  /** Normalize an idempotency input. Returns { idempotencyKey, source, bucketMs, fingerprint }.
   *  Preserves a provided key (source 'provided'); otherwise derives one (source 'derived'). */
  normalizeInput({ endpointKey, action, operation, refId, referenceId, target, payload, opts, bucketMs, key } = {}) {
    const provided = key || (payload && payload.idempotencyKey) || (opts && opts.idempotencyKey) || null;
    const effectiveBucket = (bucketMs !== undefined) ? bucketMs
      : (opts && opts.bucketMs !== undefined) ? opts.bucketMs
      : DEFAULT_BUCKET_MS;
    const fingerprint = fingerprintOf(payload || {});
    if (provided) {
      return { idempotencyKey: String(provided), source: 'provided', bucketMs: effectiveBucket, fingerprint };
    }
    const idempotencyKey = this.build({
      endpointKey, action: action || (payload && payload.action),
      operation: operation || (payload && payload.operation),
      refId, referenceId, target, payload, bucketMs: effectiveBucket
    });
    return { idempotencyKey, source: 'derived', bucketMs: effectiveBucket, fingerprint };
  },

  /** Record a request entry in the bounded ring buffer for diagnostics. */
  record({ endpointKey, action, key, ok, status, durationMs, errorMessage } = {}) {
    if (log.length >= LOG_CAP) log.shift();
    log.push({
      ts: new Date().toISOString(),
      endpointKey: endpointKey || '', action: action || '',
      key: key || '',
      ok: !!ok, status: status || null,
      durationMs: durationMs || null,
      errorMessage: errorMessage || null
    });
    _persistSoon();
  },

  /** Inspect the request log (newest first). */
  log({ limit = 100, endpointKey = null, action = null, okOnly = false, errOnly = false } = {}) {
    let out = log.slice().reverse();
    if (endpointKey) out = out.filter((e) => e.endpointKey === endpointKey);
    if (action) out = out.filter((e) => e.action === action);
    if (okOnly) out = out.filter((e) => e.ok);
    if (errOnly) out = out.filter((e) => !e.ok);
    return out.slice(0, limit);
  },

  clear() {
    log.length = 0;
    try { globalThis.localStorage && localStorage.removeItem(PERSIST_KEY); } catch (_) { /* ignore */ }
  }
};
export default Idempotency;
// END FILE: core/idempotency.js
