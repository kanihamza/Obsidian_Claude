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
    // Change-plan directive (Lookups.wire): additively tolerate a FLAT typed array shape
    // [{ Type, Code, Value }] by partitioning on Type. The verified live flow returns the structured
    // { users, categories, departments } object (handled above) — this branch only fires when that
    // structured shape is absent AND a flat typed array is present, so it never regresses the real path.
    if (!users && !categories && !departments) {
      const flat = [res && res.body, res && res.data, res].find((s) =>
        Array.isArray(s) && s.some((x) => x && typeof x === 'object' && (x.Type != null || x.type != null)));
      if (flat) {
        const w = this.wire(flat);
        if (w.users.length || w.categories.length || w.departments.length) {
          cache.users = w.users; cache.categories = w.categories; cache.departments = w.departments;
          cache.loaded = true; cache.source = 'live-flat';
          if (globalThis.Platform?.State) globalThis.Platform.State.set('shared.lookups.source', cache.source);
          const c = { users: cache.users.length, categories: cache.categories.length, departments: cache.departments.length };
          globalThis.Platform?.Bus?.emit?.('data:lookups', { ok: true, source: 'live-flat', counts: c });
          return cache;
        }
      }
    }
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
    // Only mark loaded when we actually got option-sets — otherwise an early empty load (e.g. boot-warm
    // before FETCH_ALL hydrated, with REFERENCE_DATA unreachable) would poison the cache and leave every
    // dropdown permanently empty. Leaving loaded=false lets the next caller (Lookups.isLoaded() guard) retry.
    cache.loaded = ok; cache.source = source;
    if (globalThis.Platform?.State) globalThis.Platform.State.set('shared.lookups.source', source);
    // Signal completion so surfaces that mounted before the option-sets arrived can repopulate (closes
    // the boot race), and surface a user-visible warning when reference data could not be loaded at all.
    const counts = { users: cache.users.length, categories: cache.categories.length, departments: cache.departments.length };
    globalThis.Platform?.Bus?.emit?.('data:lookups', { ok, source, counts });
    if (!ok) globalThis.Platform?.UI?.toast?.({ messageKey: 'lookups.failed', variant: 'warning', timeout: 8000 });
    return cache;
  },
  users() { return cache.users; },
  categories() { return cache.categories; },
  departments() { return cache.departments; },
  isLoaded() { return cache.loaded; },
  source() { return cache.source; },

  /** Change-plan directive: partition a FLAT typed-array lookup payload [{Type,Code,Value}] into the
   *  { users, categories, departments } option-sets (each [{value,label,raw}]). Tolerant of casing and
   *  field aliases (Type/type, Code/code/value, Value/value/label). Used by load() only when the live
   *  flow returns the flat shape instead of the structured object. */
  wire(rows) {
    const out = { users: [], categories: [], departments: [] };
    if (!Array.isArray(rows)) return out;
    const bucket = (t) => {
      const s = String(t == null ? '' : t).toLowerCase();
      if (s.indexOf('assign') !== -1 || s.indexOf('user') !== -1 || s.indexOf('staff') !== -1) return 'users';
      if (s.indexOf('categ') !== -1) return 'categories';
      if (s.indexOf('dep') !== -1 || s.indexOf('dsu') !== -1 || s.indexOf('unit') !== -1 || s.indexOf('directorate') !== -1) return 'departments';
      return null;
    };
    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;
      const b = bucket(r.Type ?? r.type); if (!b) continue;
      const value = r.Code ?? r.code ?? r.value ?? r.Value ?? r.id ?? r.ID;
      const label = r.Value ?? r.value ?? r.label ?? r.Label ?? r.name ?? value;
      if (value == null || String(value) === '') continue;
      out[b].push({ value: String(value), label: String(label), raw: r });
    }
    return out;
  },

  /** Map a category's free-text Priority to the canonical urgency token (U4, adopted from the legacy
   *  NITDA SPA's cascade): High→p1, Medium→p2, Normal→p3, Low→p4; also accepts "P1 (High)" style. */
  priorityToToken(p) {
    if (p == null) return null;
    const s = String(p).trim().toLowerCase();
    const m = s.match(/p\s*([1-4])/); if (m) return 'p' + m[1];
    if (s.indexOf('high') !== -1 || s.indexOf('urgent') !== -1) return 'p1';
    if (s.indexOf('medium') !== -1) return 'p2';
    if (s.indexOf('normal') !== -1 || s.indexOf('routine') !== -1) return 'p3';
    if (s.indexOf('low') !== -1 || s.indexOf('defer') !== -1) return 'p4';
    return null;
  },

  /** Resolve a category (by Category name, Category Code, or option value) to its routing defaults —
   *  the NITDA category→responsibility cascade (U4, adopted from the legacy SPA, faithful to its field
   *  mapping). Returns null when the category isn't found. Pure read over the cached option-sets:
   *    primaryDSU  = category 'Default Primary Responsible'   (this is also the record's directorate)
   *    assignee    = that DSU's department head email
   *    coAssignee  = 'Default Supporting Department/Unit' head email
   *    cc[]        = INFORMDSU1/2/3 department head emails
   *    priorityToken = canonical urgency token from the category Priority */
  resolveCategory(category, subcategory) {
    if (category == null || String(category).trim() === '') return null;
    const key = String(category);
    const opt = cache.categories.find((o) => o && (
      String(o.value) === key || String(o.label) === key ||
      (o.raw && (String(o.raw.Category) === key || String(o.raw['Category Code'] || '') === key))));
    let rec = opt && opt.raw;
    // Refine to the Category+Subcategory record when a subcategory is supplied and the option-set has raws.
    if (rec && subcategory) {
      const sub = String(subcategory);
      const better = cache.categories.find((o) => o && o.raw &&
        String(o.raw.Category) === String(rec.Category) && String(o.raw.Subcategory || '') === sub);
      if (better) rec = better.raw;
    }
    if (!rec) return null;
    const deptByKey = (k) => {
      if (k == null || String(k).trim() === '') return null;
      const hit = cache.departments.find((o) => o && o.raw && String(o.raw.DSU_KEY) === String(k));
      return hit ? hit.raw : null;
    };
    const headEmail = (d) => d ? (d.DSU_HeadEmail || d.DSU_HeadPersonalEmail || '') : '';
    const primaryDSU = rec['Default Primary Responsible'] || '';
    const supportDSU = rec['Default Supporting Department/Unit'] || '';
    const primDept = deptByKey(primaryDSU);
    const suppDept = deptByKey(supportDSU);
    const cc = [rec.INFORMDSU1, rec.INFORMDSU2, rec.INFORMDSU3]
      .filter((k) => k && String(k).trim() !== '')
      .map((k) => headEmail(deptByKey(k))).filter(Boolean);
    return {
      category: rec.Category || key, subcategory: subcategory || rec.Subcategory || '',
      primaryDSU, assignee: headEmail(primDept), assigneeName: primDept ? (primDept.DSU_HeadTitle || '') : '', assigneeDSU: primaryDSU,
      supportDSU, coAssignee: suppDept ? (suppDept.DSU_HeadPersonalEmail || suppDept.DSU_HeadEmail || '') : '',
      cc, priority: rec.Priority || '', priorityToken: this.priorityToToken(rec.Priority),
      raw: rec
    };
  }
};

export default Lookups;
