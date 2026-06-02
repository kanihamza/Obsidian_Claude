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
  /** Load + cache the option sets. Live takes precedence; seed is the offline fallback. */
  async load(force) {
    if (cache.loaded && !force) return cache;
    const res = await fetchLookups({}, {});
    const ok = !!(res && res.ok && res.data && (res.data.users || res.data.categories || res.data.departments));
    const data = ok ? res.data : { users: [], categories: [], departments: [] };
    const source = 'live';
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
