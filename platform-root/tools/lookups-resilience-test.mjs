/** OBSIDIAN v4.0 — tools/lookups-resilience-test.mjs
 *  U1 guard. Proves the dropdown option-sets populate from the live REFERENCE_DATA flow's ACTUAL
 *  shape (users/categories/departments at the TOP LEVEL of the body, not nested under `data`), and
 *  that when REFERENCE_DATA is empty the loader falls back to the collections FETCH_ALL already
 *  carries (Entities.lookupSource). Also asserts Platform.Lookups is wired (it was never exposed).
 *  Zero deps; Node 18+.  Usage (from platform-root/):
 *    echo '{"type":"module"}' > package.json && node tools/lookups-resilience-test.mjs ; rm -f package.json */

let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); } };

// Flat REFERENCE_DATA body (exactly the probe's shape) for the 'lookups' action; a FETCH_ALL body
// (with embedded lookup collections) for 'fetchAll'. The stub routes by the action in the request body.
const REF_FLAT = { ok: true, message: 'ok', users: [{ name: 'AA Testing', email: 'aa.testing@nitda.gov.ng', department: 'e-Gov' }], categories: [{ Category: 'Procurement', 'Category Code': 'PROC', 'Default Primary Responsible': 'CORP-SVC' }], departments: [{ DSU_KEY: 'CORP-SVC', Title: 'Corporate Services' }] };
const FETCHALL = { ok: true, status: 200, data: { docs: [{ ID: 1, Title: 'D', RoutedToDSU: 'TECH-REG' }], users: [{ name: 'FromFetchAll', email: 'fa@nitda.gov.ng' }], categories: [{ Category: 'Legal', 'Default Primary Responsible': 'LEGAL' }], departments: [{ DSU_KEY: 'LEGAL', Title: 'Legal' }] } };

let mode = 'live';   // 'live' => REFERENCE_DATA returns flat data; 'empty' => REFERENCE_DATA returns nothing
function makeFetch() {
  return async (_url, opts) => {
    let action = '';
    try { action = (JSON.parse(opts && opts.body || '{}').action) || ''; } catch { /* ignore */ }
    const body = action === 'fetchAll' ? FETCHALL : (mode === 'live' ? REF_FLAT : { ok: true, message: 'no data' });
    return { ok: true, status: 200, headers: { forEach: (cb) => cb('application/json', 'content-type') }, text: async () => JSON.stringify(body) };
  };
}

globalThis.Platform = { Persona: { current: () => 'admin', email: () => 'a@nitda.gov.ng' }, Context: { directorate: () => 'all' }, Log: { info() {}, warn() {}, error() {} }, State: { set() {}, get() {} } };
globalThis.fetch = makeFetch();

const { Entities } = await import('../core/entity-store.js');
const { Lookups } = await import('../shared/utils/lookups.js');
globalThis.Platform.Entities = Entities;
globalThis.Platform.Lookups = Lookups;

console.log('\n==================== U1 LOOKUPS RESILIENCE TEST ====================');

// 1) Platform.Lookups wiring (the missing-import bug).
const { Platform: RealPlatform } = await import('../core/platform.js').then((m) => ({ Platform: m.Platform })).catch(() => ({ Platform: null }));
check('platform.js exposes Platform.Lookups', !!(RealPlatform && RealPlatform.Lookups && typeof RealPlatform.Lookups.load === 'function'), RealPlatform ? Object.keys(RealPlatform).includes('Lookups') : 'platform import failed');

// 2) LIVE path — REFERENCE_DATA flat body parses.
mode = 'live';
await Lookups.load(true);
check('categories populate from flat REFERENCE_DATA body', Lookups.categories().length === 1, JSON.stringify(Lookups.categories()));
check('users populate from flat body', Lookups.users().length === 1);
check('departments populate from flat body', Lookups.departments().length === 1);
check('source is "live" when REFERENCE_DATA returns data', Lookups.source() === 'live', Lookups.source());
check('category option carries value+label', Lookups.categories()[0].value === 'PROC' && Lookups.categories()[0].label === 'Procurement', JSON.stringify(Lookups.categories()[0]));

// 3) FALLBACK path — REFERENCE_DATA empty → use FETCH_ALL collections (Entities.lookupSource).
await Entities.bootstrap(true);                  // ingests FETCHALL, capturing its lookup collections
check('Entities.lookupSource captured FETCH_ALL categories', Entities.lookupSource().categories.length === 1);
mode = 'empty';
await Lookups.load(true);                         // REFERENCE_DATA now empty → fallback
check('categories fall back to FETCH_ALL when REFERENCE_DATA empty', Lookups.categories().length === 1, JSON.stringify(Lookups.categories()));
check('users fall back to FETCH_ALL', Lookups.users().some((u) => u.label === 'FromFetchAll' || u.value === 'fa@nitda.gov.ng'), JSON.stringify(Lookups.users()));
check('source is "fetch-all" on fallback', Lookups.source() === 'fetch-all', Lookups.source());

console.log('\n--- RESULT ---  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
