/** OBSIDIAN v4.0 — tools/category-cascade-test.mjs
 *  U4 guard. Proves Lookups.resolveCategory() reproduces the legacy NITDA SPA's category→responsibility
 *  cascade against the REAL category/department field shape (Category, Default Primary Responsible,
 *  Default Supporting Department/Unit, INFORMDSU1/2/3, Priority ; DSU_KEY, DSU_HeadEmail, …).
 *  Zero deps; Node 18+.  Usage (from platform-root/):
 *    echo '{"type":"module"}' > package.json && node tools/category-cascade-test.mjs ; rm -f package.json */

// REFERENCE_DATA (flat) with categories + departments shaped exactly like the live data.
const BODY = {
  ok: true, message: 'ok',
  categories: [
    { ID: 1, Category: 'Procurement', 'Category Code': 'PROC', Subcategory: 'Contracts',
      'Default Primary Responsible': 'PROC-DSU', 'Default Supporting Department/Unit': 'LEGAL-DSU',
      INFORMDSU1: 'FIN-DSU', INFORMDSU2: 'DGO', INFORMDSU3: '', Priority: 'High' },
    { ID: 2, Category: 'Routine Memo', 'Category Code': 'MEMO',
      'Default Primary Responsible': 'CORP-DSU', 'Default Supporting Department/Unit': '',
      INFORMDSU1: '', INFORMDSU2: '', INFORMDSU3: '', Priority: 'Low' }
  ],
  departments: [
    { DSU_KEY: 'PROC-DSU', Title: 'Procurement', DSU_HeadEmail: 'proc.head@nitda.gov.ng', DSU_HeadPersonalEmail: 'proc.personal@nitda.gov.ng', DSU_HeadTitle: 'Director, Procurement' },
    { DSU_KEY: 'LEGAL-DSU', Title: 'Legal', DSU_HeadEmail: 'legal.head@nitda.gov.ng', DSU_HeadPersonalEmail: 'legal.personal@nitda.gov.ng', DSU_HeadTitle: 'Director, Legal' },
    { DSU_KEY: 'FIN-DSU', Title: 'Finance', DSU_HeadEmail: 'fin.head@nitda.gov.ng', DSU_HeadTitle: 'Director, Finance' },
    { DSU_KEY: 'DGO', Title: "DG's Office", DSU_HeadEmail: 'dgo@nitda.gov.ng', DSU_HeadTitle: 'DG Office' }
  ]
};

globalThis.Platform = { Log: { info() {}, warn() {}, error() {} }, State: { set() {}, get() {} } };
globalThis.fetch = async () => ({ ok: true, status: 200, headers: { forEach: (cb) => cb('application/json', 'content-type') }, text: async () => JSON.stringify(BODY) });

const { Lookups } = await import('../shared/utils/lookups.js');
await Lookups.load(true);

let pass = 0, fail = 0;
const check = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  — ' + d : '')); } };

console.log('\n==================== U4 CATEGORY-CASCADE TEST ====================');

// Resolve by Category name.
const r = Lookups.resolveCategory('Procurement');
check('resolves by Category name', !!r, JSON.stringify(r));
check('primaryDSU = Default Primary Responsible', r && r.primaryDSU === 'PROC-DSU', r && r.primaryDSU);
check('assignee = primary DSU head email', r && r.assignee === 'proc.head@nitda.gov.ng', r && r.assignee);
check('assigneeName = DSU head title', r && r.assigneeName === 'Director, Procurement', r && r.assigneeName);
check('coAssignee = support DSU head (personal preferred)', r && r.coAssignee === 'legal.personal@nitda.gov.ng', r && r.coAssignee);
check('cc from INFORMDSU1/2 (blank INFORMDSU3 dropped)', r && r.cc.length === 2 && r.cc.includes('fin.head@nitda.gov.ng') && r.cc.includes('dgo@nitda.gov.ng'), JSON.stringify(r && r.cc));
check('priorityToken High -> p1', r && r.priorityToken === 'p1', r && r.priorityToken);

// Resolve by Category Code.
const r2 = Lookups.resolveCategory('PROC');
check('resolves by Category Code', r2 && r2.primaryDSU === 'PROC-DSU', r2 && r2.primaryDSU);

// Category with no support/inform DSUs.
const r3 = Lookups.resolveCategory('Routine Memo');
check('no support DSU -> empty coAssignee', r3 && r3.coAssignee === '', JSON.stringify(r3 && r3.coAssignee));
check('no inform DSUs -> empty cc', r3 && r3.cc.length === 0, JSON.stringify(r3 && r3.cc));
check('priorityToken Low -> p4', r3 && r3.priorityToken === 'p4', r3 && r3.priorityToken);

// Unknown category -> null.
check('unknown category returns null', Lookups.resolveCategory('Nope') === null);

// priorityToken accepts P-prefixed and words.
check('priorityToToken "P2 (Medium)" -> p2', Lookups.priorityToToken('P2 (Medium)') === 'p2');
check('priorityToToken "Routine" -> p3', Lookups.priorityToToken('Routine') === 'p3');

console.log('\n--- RESULT ---  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
