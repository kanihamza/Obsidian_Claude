/**
 * OBSIDIAN v4.0 — BaseService (/core/base-service.js)
 * Common service plumbing so no service hand-rolls fetch, pagination, sort, or cache.
 *
 *   export const fetchAll = BaseService.endpoint('FETCH_ALL', { cache: 30000, expectedKeys: ['ok','data'] });
 *   const res = await fetchAll({ ...payload }, { page, pageSize, sortBy, sortDir });
 *
 * The factory returns the FULL normalized result from Platform.API.callAPI
 * (so callers keep errors[] warnings); res.data is the contract payload.
 * Client-side sort/paginate apply only when res.data is an array.
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
   * opts: { cache?:ms, expectedKeys?:string[], silent?:bool }
   * Returned fn(payload?, query?): query may carry { page, pageSize, sortBy, sortDir, force }.
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

      // ─── Idempotency: add a key to writes so accidental double-clicks are de-duped server-side.
      //     Reads (FETCH_ALL, REFERENCE_DATA) don't need it; skip when GET or cache-enabled.
      const isWrite = !ttl && payload && (payload.action || payload.operation);
      let idemKey = null;
      if (isWrite) {
        idemKey = Idempotency.build({ action: payload.action, refId: payload.RefIDD || payload.referenceId, payload });
        // Pass via both payload field and a property the API layer can lift to a header
        payload = { ...payload, idempotencyKey: idemKey };
      }

      const t0 = (globalThis.performance && performance.now ? performance.now() : Date.now());
      const result = await API.callAPI(endpointKey, payload, { silent: opts.silent });
      const durationMs = Math.round((globalThis.performance && performance.now ? performance.now() : Date.now()) - t0);
      validateShape(endpointKey, result, expectedKeys);

      // ─── Always log the call (success or failure) into the bounded request log.
      Idempotency.record({
        endpointKey, action: payload.action || '',
        key: idemKey, ok: !!result.ok, status: result.status || null,
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
