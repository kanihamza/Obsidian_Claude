/** OBSIDIAN v4.0 — core/idempotency.js · Idempotency key builder + bounded request log.
 *  Prevents accidental duplicate writes by ensuring identical retries reuse the same key.
 *  Tracks every API call in a bounded ring buffer that diagnostics + telemetry can inspect.
 *
 *  Mirrors the SPA pattern (REGEN buildIdempotencyKey / logRequest): the key incorporates
 *  the action, the target ref, a coarse time bucket (default 60s) — so two clicks within the
 *  bucket produce the same key (PA-side de-dupes), but later retries get a fresh key.
 *  A trailing UUID slice gives randomness for non-target writes. */

const BUCKET_MS = 60_000;
const LOG_CAP = 500;
const PERSIST_KEY = 'obsidian.requestLog.v1';
const log = [];

function uuidSlice(n = 8) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().slice(0, n);
  return Math.random().toString(36).slice(2, 2 + n);
}

// Restore prior log on module load — survives page reloads, useful for incident debugging
(function _restore() {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) for (const e of arr.slice(-LOG_CAP)) log.push(e);
  } catch (_) { /* private mode / corrupted — skip */ }
})();

// Persist every N writes — debounced batching to avoid hammering localStorage on every API call
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
  /** Build a deterministic-within-bucket idempotency key for an action + target. */
  build({ action, refId, target, payload }) {
    const a = String(action || 'unknown').toLowerCase().replace(/[^a-z0-9_]+/g, '-');
    const r = String(refId || target || (payload && (payload.RefIDD || payload.referenceId)) || '').replace(/[^a-zA-Z0-9_-]+/g, '');
    const bucket = Math.floor(Date.now() / BUCKET_MS);
    // The random suffix is a safety net for actions without a clear target (otherwise two unrelated
    // writes in the same bucket would collide).
    const tail = r ? '' : '-' + uuidSlice();
    return `obsidian.${a}.${r || 'na'}.${bucket}${tail}`;
  },

  /** Record a request entry in the ring buffer for diagnostics. */
  record({ endpointKey, action, key, ok, status, durationMs, errorMessage }) {
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
    if (action)      out = out.filter((e) => e.action === action);
    if (okOnly)      out = out.filter((e) => e.ok);
    if (errOnly)     out = out.filter((e) => !e.ok);
    return out.slice(0, limit);
  },

  clear() {
    log.length = 0;
    try { globalThis.localStorage && localStorage.removeItem(PERSIST_KEY); } catch (_) {}
  }
};
export default Idempotency;
