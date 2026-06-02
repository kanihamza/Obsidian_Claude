/**
 * OBSIDIAN v4.0 — Core API engine (/core/api.js)
 * THE ONLY MODULE PERMITTED TO CALL fetch(). Services go through BaseService.
 *
 * Platform.API.callAPI(endpointKey, payload?, opts?) -> Promise<NormalizedResult>
 * Never rejects on HTTP/transport failure. Always resolves a normalized object:
 *   { ok, kind, status, data, errors, body, headers, durationMs, correlationId }
 *   kind ∈ 'ok' | 'network' | 'timeout' | 'client' | 'server' | 'parse' | 'abort' | 'notImplemented' | 'config' | 'duplicate'
 *
 * Alignments with the authoritative live working SPA (NITDA_Digital_Ops_Hub_patched.html ~L2614):
 *   • Direct fetch(ep.url) — no intermediary, embedded URLs.
 *   • Per-endpoint in-flight guard rejects duplicate concurrent calls (kind:'duplicate').
 *   • correlationId set BOTH in X-Correlation-ID header AND in the body (PA run history captures body).
 *   • Per-call opts.timeoutMs || per-endpoint ep.timeoutMs || DEFAULT_TIMEOUT_MS (bulk/AI/fetch-all = 90s).
 *   • Double-stringified JSON ("{\"ok\":true,…}") returned by Power Automate is detected + unwrapped.
 *   • sanitize() preserves null and '' by default (flow schemas declare nullable fields, the SPA sends
 *     them through). Pass opts.stripEmpty:true for the legacy strip-all behaviour.
 *
 * Envelope normalization (F2 — contract):
 *   Production-v1 -> body.ok / body.status.http
 *   Subsidiary-v4 -> body.success / body.statusCode  (meta.routeKey carried through)
 *   Neither present -> kind:'parse'  (UNRECOGNIZED_ENVELOPE)
 *   `errors[]` is preserved verbatim even on success (contract §E.2 allows warnings on ok:true).
 */

import { Endpoints } from '../config/endpoints.config.js';

const DEFAULT_TIMEOUT_MS = 45000;
const _inflight = new Map(); // endpointKey -> count of in-flight calls

function uuid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'cid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function log(level, msg, ctx) {
  const L = globalThis.Platform && Platform.Log;
  if (L && typeof L[level] === 'function') L[level](msg, ctx);
}

/** Recursively strip undefined; preserve null and '' (flow schemas accept them).
 *  Pass stripEmpty:true to also drop null/''. */
function sanitize(value, stripEmpty) {
  if (Array.isArray(value)) return value.map((v) => sanitize(v, stripEmpty));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      const cleaned = sanitize(v, stripEmpty);
      if (stripEmpty && (cleaned === null || cleaned === '')) continue;
      out[k] = cleaned;
    }
    return out;
  }
  return value;
}

/** Envelope/meta keys that are NOT data. Everything else at top level is treated as the data
 *  payload when a flow returns its collections flat (live flows return `{ok, users, …}` not `{ok,data}`). */
const ENVELOPE_META = new Set(['ok', 'success', 'status', 'statusCode', 'message', 'details',
  'errors', 'meta', 'request', 'timing', 'correlationId']);

/** Pull the data object out of a body: nested `data` if present, else the flat top-level collections. */
function deriveData(body) {
  if (body && body.data !== undefined && body.data !== null) return body.data;
  if (body && typeof body === 'object') {
    const d = {};
    for (const [k, v] of Object.entries(body)) if (!ENVELOPE_META.has(k)) d[k] = v;
    if (Object.keys(d).length) return d;
  }
  return null;
}

/** Split a string that may contain several concatenated JSON values into the individual values. */
function scanConcatenatedJSON(text) {
  const out = []; let i = 0; const n = text.length;
  while (i < n) {
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;
    if (text[i] !== '{' && text[i] !== '[') { i++; continue; }
    let depth = 0, inStr = false, esc = false; const start = i;
    for (; i < n; i++) {
      const c = text[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
      else if (c === '"') inStr = true;
      else if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') { depth--; if (depth === 0) { i++; break; } }
    }
    try { out.push(JSON.parse(text.slice(start, i))); } catch { /* skip malformed fragment */ }
  }
  return out;
}

/** Parse a Power Automate response body robustly: clean JSON, double-stringified JSON, OR multiple
 *  concatenated objects (a real PA artefact — prefer the successful envelope, else the last). */
function parseFlowBody(text) {
  if (!text) return null;
  try {
    let b = JSON.parse(text);
    if (typeof b === 'string') { const t = b.trim(); if (t.startsWith('{') || t.startsWith('[')) { try { b = JSON.parse(t); } catch { /* keep */ } } }
    return b;
  } catch (e) {
    const objs = scanConcatenatedJSON(text);
    if (!objs.length) throw e;
    const ok = objs.filter((o) => o && typeof o === 'object' && (o.ok === true || o.success === true));
    return ok.length ? ok[ok.length - 1] : objs[objs.length - 1];
  }
}

/** Extract a normalized errors[] array from whatever shape PA / connectors returned.
 *  Handles: body.errors[], body.error (object|string), body.message, body.validationErrors,
 *  body.exception, top-level fault objects. Each error becomes {code, message, target?}. */
function extractErrors(body) {
  if (!body) return [];
  if (Array.isArray(body.errors)) return body.errors.map(normErr);
  const out = [];
  if (body.error) {
    if (typeof body.error === 'string') out.push({ code: 'ERROR', message: body.error });
    else if (typeof body.error === 'object') out.push(normErr(body.error));
  }
  if (Array.isArray(body.validationErrors)) for (const e of body.validationErrors) out.push(normErr(e, 'VALIDATION'));
  if (body.exception) out.push({ code: 'EXCEPTION', message: String(body.exception.message || body.exception) });
  if (body.fault && body.fault.faultstring) out.push({ code: body.fault.faultcode || 'FAULT', message: body.fault.faultstring });
  if (!out.length && body.message && (body.ok === false || body.success === false)) {
    out.push({ code: body.code || 'ERROR', message: String(body.message), target: body.target });
  }
  return out;
}
function normErr(e, defaultCode) {
  if (typeof e === 'string') return { code: defaultCode || 'ERROR', message: e };
  return { code: e.code || e.errorCode || defaultCode || 'ERROR',
           message: e.message || e.detail || e.description || String(e),
           target: e.target || e.field || e.path || undefined };
}

/** A-10 — canonical machine-readable error taxonomy. Maps PA-provided `kind` (preferred) or the
 *  HTTP/transport signal to the 13-row taxonomy the UI error-router and OTP handshake consume.
 *  Attached as `result.errorKind` on every failure; the transport `kind` field is left untouched. */
const HTTP_ERROR_KIND = {
  401: 'AUTH_FAILED', 403: 'NOT_AUTHORIZED', 409: 'CONFLICT_IDEMPOTENT', 410: 'OTP_EXPIRED',
  422: 'VALIDATION_FAILED', 428: 'OTP_REQUIRED', 429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR', 502: 'UPSTREAM_TIMEOUT', 503: 'UPSTREAM_TIMEOUT', 504: 'UPSTREAM_TIMEOUT'
};
function deriveErrorKind(body, httpStatus, transportKind) {
  const raw = (body && Array.isArray(body.errors) && body.errors[0] && body.errors[0].kind) || (body && body.kind);
  if (raw && typeof raw === 'string') return raw.toUpperCase();
  if (transportKind === 'timeout' || transportKind === 'network' || transportKind === 'unavailable') return 'UPSTREAM_TIMEOUT';
  if (transportKind === 'duplicate') return 'CONFLICT_IDEMPOTENT';
  if (httpStatus && HTTP_ERROR_KIND[httpStatus]) return HTTP_ERROR_KIND[httpStatus];
  if (httpStatus >= 500) return 'INTERNAL_ERROR';
  if (httpStatus >= 400) return 'VALIDATION_FAILED';
  return 'INTERNAL_ERROR';
}

function reserved501(endpointKey, correlationId, durationMs) {
  return {
    ok: false, kind: 'notImplemented', status: 501, data: null, errorKind: 'INTERNAL_ERROR',
    errors: [{ code: 'NOT_IMPLEMENTED', message: 'This flow is reserved and not implemented.', target: endpointKey }],
    body: null, headers: {}, durationMs, correlationId
  };
}

/** Map a parsed body to the normalized result, handling v1 (ok) and v4 (success) envelopes.
 *  Maps HTTP-only signals (rate-limit, unavailable) to richer `kind` values. */
function kindForStatus(httpStatus, defaultKind) {
  if (httpStatus === 429) return 'rateLimit';
  if (httpStatus === 503) return 'unavailable';
  if (httpStatus === 401 || httpStatus === 403) return 'auth';
  if (httpStatus >= 500) return 'server';
  if (httpStatus >= 400) return 'client';
  return defaultKind || 'ok';
}
function normalizeBody(body, headers, durationMs, correlationId, httpStatus) {
  // HTTP status is authoritative for transport failures (429/503/401/etc.) — body.ok:true cannot override it.
  const httpFailed = !!(httpStatus && httpStatus >= 400);
  if (body && typeof body === 'object' && 'ok' in body) {
    const status = httpStatus || (body.status && Number(body.status.http)) || (body.ok ? 200 : 500);
    const realOk = !!body.ok && !httpFailed;
    return {
      ok: realOk, kind: realOk ? 'ok' : kindForStatus(status, 'server'),
      errorKind: realOk ? undefined : deriveErrorKind(body, status, null),
      status, data: deriveData(body), errors: extractErrors(body),
      retryAfter: headers && headers['retry-after'] ? Number(headers['retry-after']) || null : null,
      body, headers, durationMs, correlationId
    };
  }
  if (body && typeof body === 'object' && 'success' in body) {
    const status = httpStatus || Number(body.statusCode) || (body.success ? 200 : 500);
    const realOk = !!body.success && !httpFailed;
    return {
      ok: realOk, kind: realOk ? 'ok' : kindForStatus(status, 'server'),
      errorKind: realOk ? undefined : deriveErrorKind(body, status, null),
      status, data: deriveData(body), errors: extractErrors(body),
      retryAfter: headers && headers['retry-after'] ? Number(headers['retry-after']) || null : null,
      routeKey: body.meta && body.meta.routeKey, body, headers, durationMs, correlationId
    };
  }
  // No recognized envelope — still surface HTTP signals (429/503/etc.) instead of 'parse' if status is informative
  if (httpStatus && httpStatus >= 400) {
    return { ok: false, kind: kindForStatus(httpStatus), errorKind: deriveErrorKind(body, httpStatus, null),
      status: httpStatus, data: null,
      errors: extractErrors(body) || [{ code: 'HTTP_' + httpStatus, message: 'Service returned ' + httpStatus + '.' }],
      retryAfter: headers && headers['retry-after'] ? Number(headers['retry-after']) || null : null,
      body, headers, durationMs, correlationId };
  }
  return {
    ok: false, kind: 'parse', status: 0, data: null, errorKind: 'INTERNAL_ERROR',
    errors: [{ code: 'UNRECOGNIZED_ENVELOPE', message: 'Response matched neither v1 (ok) nor v4 (success).' }],
    body, headers, durationMs, correlationId
  };
}

/** Resolve an endpoint URL, honouring any operator-set override in localStorage.
 *  Overrides are managed by the Settings module — keyed by `obsidian.endpoint.<KEY>` so
 *  ops can swap a flow URL for sandbox testing without a rebuild. Empty/missing => default. */
function _resolveUrl(endpointKey, defaultUrl) {
  try {
    const k = 'obsidian.endpoint.' + endpointKey;
    const v = (globalThis.localStorage && localStorage.getItem(k)) || '';
    if (v && /^https?:\/\//.test(v)) return v;
  } catch (_) { /* private mode / SSR — fall through */ }
  return defaultUrl;
}

async function callAPI(endpointKey, payload = {}, opts = {}) {
  const correlationId = opts.correlationId || uuid();
  const t0 = (globalThis.performance && performance.now()) || Date.now();
  const elapsed = () => Math.round(((globalThis.performance && performance.now()) || Date.now()) - t0);

  const ep = Endpoints[endpointKey];
  if (!ep) {
    log('error', 'api.unknown-endpoint', { endpointKey, correlationId });
    return { ok: false, kind: 'config', status: 0, data: null, errorKind: 'INTERNAL_ERROR',
      errors: [{ code: 'UNKNOWN_ENDPOINT', message: 'No registry entry for key.', target: endpointKey }],
      body: null, headers: {}, durationMs: elapsed(), correlationId };
  }

  if (ep.reserved || !ep.url) {
    log('info', 'api.reserved', { endpointKey, correlationId });
    return reserved501(endpointKey, correlationId, elapsed());
  }

  // Per-endpoint in-flight guard — rejects duplicate concurrent calls (mirrors SPA's AppState._fetching).
  if (!opts.allowConcurrent && _inflight.get(endpointKey)) {
    log('warn', 'api.duplicate-blocked', { endpointKey, correlationId });
    return { ok: false, kind: 'duplicate', status: 0, data: null, errorKind: 'CONFLICT_IDEMPOTENT',
      errors: [{ code: 'DUPLICATE_IN_FLIGHT', message: 'A request to this endpoint is already in flight.', target: endpointKey }],
      body: null, headers: {}, durationMs: elapsed(), correlationId };
  }
  _inflight.set(endpointKey, (_inflight.get(endpointKey) || 0) + 1);

  const persona = (globalThis.Platform && Platform.Persona && Platform.Persona.current && Platform.Persona.current()) || null;
  // sanitize: preserve null/'' by default (flow schemas accept them; only drop undefined).
  const merged = sanitize({ ...ep.defaults, ...payload, correlationId }, !!opts.stripEmpty);

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs || ep.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  if (opts.cancellable && typeof opts.onCancel === 'function') opts.onCancel(() => controller.abort('user'));

  log('info', 'api.request', { endpointKey, action: merged.action, persona, correlationId, timeoutMs });

  try {
    const res = await fetch(_resolveUrl(endpointKey, ep.url), {
      method: ep.method || 'POST',
      headers: { ...ep.headers, 'X-Correlation-ID': correlationId },
      body: JSON.stringify(merged),
      signal: controller.signal
    });
    clearTimeout(timer);

    const headers = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    // Read text first so we can handle Power Automate's double-stringification ("{\"ok\":…}").
    const text = await res.text();
    let body = null;
    try {
      body = parseFlowBody(text);
    } catch {
      const r = { ok: false, kind: 'parse', status: res.status, data: null, errorKind: 'INTERNAL_ERROR',
        errors: [{ code: 'PARSE_ERROR', message: 'Response body was not valid JSON.' }],
        body: text || null, headers, durationMs: elapsed(), correlationId };
      log('error', 'api.parse', { endpointKey, status: res.status, correlationId });
      if (!opts.silent && globalThis.Platform && Platform.UI) Platform.UI.toastError(r);
      return r;
    }

    const result = normalizeBody(body, headers, elapsed(), correlationId, res.status);
    log(result.ok ? 'info' : 'error', 'api.response',
      { endpointKey, status: result.status, kind: result.kind, persona, correlationId });
    if (!result.ok && !opts.silent && globalThis.Platform && Platform.UI) Platform.UI.toastError(result);
    return result;
  } catch (err) {
    clearTimeout(timer);
    const kind = (err && (err.name === 'AbortError' || controller.signal.reason === 'timeout'))
      ? (controller.signal.reason === 'user' ? 'abort' : 'timeout')
      : 'network';
    const r = { ok: false, kind, status: 0, data: null, errorKind: deriveErrorKind(null, 0, kind),
      errors: [{ code: kind.toUpperCase(), message: String((err && err.message) || kind) }],
      body: null, headers: {}, durationMs: elapsed(), correlationId };
    log('error', 'api.transport', { endpointKey, kind, correlationId });
    if (!opts.silent && kind !== 'abort' && globalThis.Platform && Platform.UI) Platform.UI.toastError(r);
    return r;
  } finally {
    const n = (_inflight.get(endpointKey) || 1) - 1;
    if (n <= 0) _inflight.delete(endpointKey); else _inflight.set(endpointKey, n);
  }
}

export const API = { callAPI };
export default API;
