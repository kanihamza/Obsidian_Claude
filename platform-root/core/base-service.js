// FILE: core/base-service.js
/**
 * OBSIDIAN v4.0 — BaseService (/core/base-service.js)
 * Common service plumbing so no service hand-rolls fetch, pagination, sort, or cache.
 *
 *   export const fetchAll = BaseService.endpoint('FETCH_ALL', { cache: 30000, expectedKeys: ['ok','data'] });
 *   const res = await fetchAll({ ...payload }, { page, pageSize, sortBy, sortDir });
 *
 * The factory returns the FULL normalized result from API.callAPI (callers keep errors[] warnings);
 * res.data is the contract payload. Client-side sort/paginate apply only when res.data is an array.
 *
 * Idempotency: for writes a key is prepared here (deterministic, bucketed) and passed BOTH via
 * payload.idempotencyKey and opts.idempotencyKey. The caller's payload object is never mutated.
 * bucketMs may be overridden per-endpoint (factory opts) or per-call (query) for OTP-gated bulk flows.
 */

import { API } from './api.js';
import { Endpoints } from '../config/endpoints.config.js';
import { Idempotency } from './idempotency.js';

function log(level, msg, ctx) {
  const L = globalThis.Platform && Platform.Log;
  if (L && typeof L[level] === 'function') L[level](msg, ctx);
}

function cacheKey(endpointKey, payload, query) {
  return endpointKey + '::' + JSON.stringify(payload || {}) + '::' + JSON.stringify(query || {});
}

function validateShape(endpointKey, result, expectedKeys) {
  if (!result.ok || !result.body || !Array.isArray(expectedKeys)) return;
  const missing = expectedKeys.filter((k) => !(k in result.body));
  if (missing.length) log('error', 'service.shape-mismatch', { endpointKey, missing, correlationId: result.correlationId });
}

function applySort(rows, sortBy, sortDir) {
  if (!sortBy || !Array.isArray(rows)) return rows;
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a == null ? '' : a[sortBy]; const bv = b == null ? '' : b[sortBy];
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * dir;
  });
}

function applyPage(rows, page, pageSize) {
  if (!pageSize || !Array.isArray(rows)) return rows;
  const p = Math.max(1, page || 1);
  return rows.slice((p - 1) * pageSize, (p - 1) * pageSize + pageSize);
}

export const BaseService = {
  /**
   * Build a callable bound to one endpoint key.
   * opts: { cache?:ms, expectedKeys?:string[], silent?:bool, bucketMs?:number|false }
   * Returned fn(payload?, query?): query may carry { page, pageSize, sortBy, sortDir, force, bucketMs, idempotencyKey }.
   */
  endpoint(endpointKey, opts = {}) {
    if (!Endpoints[endpointKey]) {
      log('error', 'service.unknown-endpoint', { endpointKey });
    }
    const expectedKeys = opts.expectedKeys || (Endpoints[endpointKey] && Endpoints[endpointKey].expectedKeys);
    const ttl = opts.cache || 0;
    const store = new Map(); // key -> { at, result }

    const fn = async (payload = {}, query = {}) => {
      const key = cacheKey(endpointKey, payload, query);
      if (ttl && !query.force) {
        const hit = store.get(key);
        if (hit && Date.now() - hit.at < ttl) return hit.result;
      }

      // ─── Idempotency: prepare a key for writes (reads skip it). Never mutate the caller's payload.
      const action = payload && (payload.action || payload.operation);
      const isWrite = !ttl && !!action && !Idempotency.isReadAction(action);
      const bucketMs = (opts.bucketMs !== undefined) ? opts.bucketMs
        : (query.bucketMs !== undefined) ? query.bucketMs
        : undefined;
      let idempotencyKey = (payload && payload.idempotencyKey) || query.idempotencyKey || null;
      let outPayload = payload;
      if (isWrite) {
        idempotencyKey = Idempotency.normalizeInput({
          endpointKey, payload, opts: { idempotencyKey, bucketMs }, bucketMs
        }).idempotencyKey;
        outPayload = { ...payload, idempotencyKey };
      }

      const callOpts = { silent: opts.silent };
      if (idempotencyKey) callOpts.idempotencyKey = idempotencyKey;
      if (bucketMs !== undefined) callOpts.bucketMs = bucketMs;

      const t0 = (globalThis.performance && performance.now ? performance.now() : Date.now());
      const result = await API.callAPI(endpointKey, outPayload, callOpts);
      const durationMs = Math.round((globalThis.performance && performance.now ? performance.now() : Date.now()) - t0);
      validateShape(endpointKey, result, expectedKeys);

      // ─── Always log the call (success or failure) into the bounded request log.
      Idempotency.record({
        endpointKey, action: action || '',
        key: idempotencyKey, ok: !!result.ok, status: result.status || null,
        durationMs, errorMessage: (!result.ok && result.errors && result.errors[0] && result.errors[0].message) || null
      });

      if (result.ok && Array.isArray(result.data)) {
        let rows = applySort(result.data, query.sortBy, query.sortDir);
        const total = rows.length;
        rows = applyPage(rows, query.page, query.pageSize);
        result.rows = rows;
        result.page = { page: query.page || 1, pageSize: query.pageSize || total, total };
      }

      if (ttl && result.ok) store.set(key, { at: Date.now(), result });
      return result;
    };

    fn.endpointKey = endpointKey;
    fn.invalidate = () => store.clear();
    return fn;
  }
};

export default BaseService;
// END FILE: core/base-service.js
