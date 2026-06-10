/** OBSIDIAN v4.0 — tools/lookups-flat-test.mjs
 *  Change-plan guard: Lookups must tolerate BOTH the verified structured live shape
 *  ({ users, categories, departments, ok }) AND the plan's flat typed-array shape
 *  ([{ Type, Code, Value }]) — the flat branch must NOT regress the structured path.
 *  Zero deps; Node 18+.  Usage (from platform-root/):
 *    echo '{"type":"module"}' > package.json && node tools/lookups-flat-test.mjs ; rm -f package.json */

let MODE = 'structured';
const STRUCTURED = { ok: true, data: {
  users: [{ name: 'AA Testing', email: 'aa.testing@nitda.gov.ng' }],
  categories: [{ Category: 'Procurement', 'Category Code': 'PROC', 'Default Primary Responsible': 'CORP-SVC' }],
  departments: [{ DSU_KEY: 'CORP-SVC', Title: 'Corporate Services' }] } };
const FLAT = [
  { Type: 'Assignee', Code: 'DGO_001', Value: 'Director General' },
  { Type: 'User', Code: 'aa@nitda.gov.ng', Value: 'AA Testing' },
  { Type: 'Category', Code: 'CAT_MEMO', Value: 'Internal Memo' },
  { Type: 'Department', Code: 'CORP-SVC', Value: 'Corporate Services' }
];

globalThis.Platform = { Log: { info() {}, warn() {}, error() {} }, State: { set() {}, get() {} } };
globalThis.fetch = async () => ({ ok: true, status: 200,
  headers: { forEach: (cb) => cb('application/json', 'content-type') },
  text: async () => JSON.stringify(MODE === 'flat' ? FLAT : STRUCTURED) });

const { Lookups } = await import('../shared/utils/lookups.js');
let pass = 0, fail = 0;
const check = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  — ' + d : '')); } };

console.log('\n==================== LOOKUPS FLAT/STRUCTURED TEST ====================');

// 1) Structured (verified live) shape still works — the real path.
MODE = 'structured';
await Lookups.load(true);
check('structured: categories populated', Lookups.categories().length === 1, JSON.stringify(Lookups.categories()));
check('structured: users populated', Lookups.users().length === 1);
check('structured: departments populated', Lookups.departments().length === 1);
check('structured: source = live', Lookups.source() === 'live', Lookups.source());
check('structured: rich raw preserved (Default Primary Responsible)', Lookups.categories()[0].raw['Default Primary Responsible'] === 'CORP-SVC');

// 2) Flat typed-array shape — wired via partition.
MODE = 'flat';
await Lookups.load(true);
check('flat: users from Assignee+User rows', Lookups.users().length === 2, JSON.stringify(Lookups.users()));
check('flat: categories from Category rows', Lookups.categories().length === 1);
check('flat: departments from Department rows', Lookups.departments().length === 1);
check('flat: source = live-flat', Lookups.source() === 'live-flat', Lookups.source());
check('flat: option value=Code label=Value', Lookups.categories()[0].value === 'CAT_MEMO' && Lookups.categories()[0].label === 'Internal Memo');

// 3) wire() directly.
const w = Lookups.wire([{ type: 'directorate', code: 'X', value: 'Dept X' }]);
check('wire(): directorate -> departments', w.departments.length === 1 && w.departments[0].value === 'X');

console.log('\n--- RESULT ---  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
