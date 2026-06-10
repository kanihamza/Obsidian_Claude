/** OBSIDIAN v4.0 — shared/utils/lookups.js · Platform.Lookups · option-set provider.
 *  Loads the REFERENCE_DATA flow (action 'lookups') → { users, categories, departments }.
 *
 *  IMPORTANT — naming disambiguation (see docs/PROJECT_STATUS.md §Data alignment):
 *  these are DROPDOWN OPTION SETS, NOT the `reference` ENTITY. The `reference` entity is
 *  the case join-key threading the fabric (entities.config.js#REFERENCE_KEY). Lookups
 *  deliberately do NOT flow through Platform.Entities — they would otherwise be mis-indexed
 *  as case records. Loaded once, cached, seed-fallback when the live flow is unreachable. */
import { BaseService } from '../../core/base-service.js';

const fetchLookups = BaseService.endpoint('REFERENCE_DATA', { expectedKeys: ['ok'] });

const cache = { users: [], categories: [], departments: [], loaded: false, source: null };

/** Normalize a raw list (objects or strings) into [{ value, label, raw }]. */
function toOptions(list, valueKeys, labelKeys) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (item == null) return null;
    if (typeof item !== 'object') return { value: String(item), label: String(item), raw: item };
    const pick = (keys) => { for (const k of keys) if (item[k] != null && item[k] !== '') return String(item[k]); return null; };
    const value = pick(valueKeys) || pick(labelKeys) || '';
    const label = pick(labelKeys) || value;
    return value ? { value, label, raw: item } : null;
  }).filter(Boolean);
}

export const Lookups = {
  /** Load + cache the option sets. Live takes precedence; FETCH_ALL is the in-fabric fallback.
   *  U1: the REFERENCE_DATA flow returns users/categories/departments at the TOP LEVEL of the body
   *  (flat shape), not nested under `data` — so we read from res.body first, then res.data, then the
   *  collections FETCH_ALL already carries (Entities.lookupSource), so dropdowns populate either way. */
  async load(force) {
    if (cache.loaded && !force) return cache;
    const res = await fetchLookups({}, {});
    const pick = (name) => {
      const Cap = name[0].toUpperCase() + name.slice(1);
      for (const src of [res && res.body, res && res.data, res]) {
        if (src && typeof src === 'object') { if (Array.isArray(src[name])) return src[name]; if (Array.isArray(src[Cap])) return src[Cap]; }
      }
      return null;
    };
    let users = pick('users'), categories = pick('categories'), departments = pick('departments');
    let ok = !!(res && res.ok && (users || categories || departments));
    let source = ok ? 'live' : null;
    if (!ok) {
      // Fallback: the FETCH_ALL payload already carries these collections (U1 resilience).
      const E = globalThis.Platform && globalThis.Platform.Entities;
      if (E && typeof E.lookupSource === 'function') {
        if (typeof E.isHydrated === 'function' && !E.isHydrated() && typeof E.bootstrap === 'function') { try { await E.bootstrap(); } catch (e) { /* offline */ } }
        const fb = E.lookupSource() || {};
        if ((fb.users && fb.users.length) || (fb.categories && fb.categories.length) || (fb.departments && fb.departments.length)) {
          users = fb.users; categories = fb.categories; departments = fb.departments; ok = true; source = 'fetch-all';
        }
      }
    }
    const data = ok ? { users: users || [], categories: categories || [], departments: departments || [] } : { users: [], categories: [], departments: [] };
    if (!ok) (globalThis.Platform?.Log)?.warn('lookups.fetch-failed', { message: (res && res.errors && res.errors[0] && res.errors[0].message) || (res && res.kind) || 'service unreachable' });
    cache.users = toOptions(data.users, ['email', 'value', 'id', 'upn'], ['name', 'displayName', 'title', 'label']);
    cache.categories = toOptions(data.categories, ['Category Code', 'code', 'value', 'ID', 'id'], ['Category', 'Title', 'name', 'label']);
    cache.departments = toOptions(data.departments, ['DSU_KEY', 'code', 'value', 'ID', 'id'], ['Title', 'name', 'label']);
    cache.loaded = true; cache.source = source;
    if (globalThis.Platform?.State) globalThis.Platform.State.set('shared.lookups.source', source);
    return cache;
  },
  users() { return cache.users; },
  categories() { return cache.categories; },
  departments() { return cache.departments; },
  isLoaded() { return cache.loaded; },
  source() { return cache.source; }
};

export default Lookups;
