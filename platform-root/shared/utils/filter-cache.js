/** OBSIDIAN v4.0 — shared/utils/filter-cache.js · LRU cache for filtered list views.
 *  Keyed by rows identity (object reference) + query + sortKey. Tiny, dependency-free.
 *  Used by lens.mountListLens / mountMasterDetail / renderFabricTable to avoid rescanning
 *  the full dataset on every keystroke. Pairs with `debounce()` so the cache + the input
 *  handler together keep large-list filtering responsive on the 300-doc dataset.
 *
 *  Usage:
 *    const cache = createFilterCache();
 *    const filtered = cache.filter(rows, query, status, (r) => match(r, query, status));
 */

const MAX = 16;        // LRU size — small, since filter operations are usually few unique queries

export function createFilterCache() {
  const entries = [];  // [{ rowsRef, q, s, sortKey, out }]
  return {
    /** Try cached → else compute via predicate(row, q, s) and cache. */
    filter(rows, q, s, predicate, sortKey = '') {
      const cacheKey = q + '|' + s + '|' + sortKey;
      // Cache hit: same rows reference + same query/status/sortKey
      for (const e of entries) {
        if (e.rowsRef === rows && e.cacheKey === cacheKey) {
          // bump to front (LRU)
          const idx = entries.indexOf(e); entries.splice(idx, 1); entries.unshift(e);
          return e.out;
        }
      }
      // Miss: compute
      const out = rows.filter((r) => predicate(r, q, s));
      entries.unshift({ rowsRef: rows, cacheKey, out });
      if (entries.length > MAX) entries.length = MAX;
      return out;
    },
    /** Invalidate everything (e.g. on data:refresh). */
    clear() { entries.length = 0; },
    size() { return entries.length; }
  };
}

/** Debounce a function — used to throttle input handlers on heavy filtered lists.
 *  Returns a function with .cancel() to abort pending invocations. */
export function debounce(fn, wait = 200) {
  let timer = null;
  const wrapped = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...args); }, wait);
  };
  wrapped.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return wrapped;
}

export default { createFilterCache, debounce };
