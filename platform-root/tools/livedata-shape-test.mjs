/** OBSIDIAN v4.0 — tools/livedata-shape-test.mjs
 *  S1.5c regression guard. Reproduces the LIVE FETCH_ALL shape that broke ingestion
 *  (352 records wrongly quarantined; document/email invisible) with a small synthetic
 *  payload, ingests it through the SEALED entity-store, and asserts the corrected behavior:
 *    • sentinel strings ("No RefIDD" / "No Route") are treated as blank, not real values
 *    • refless correspondence (document/email/task) self-references via a type-prefixed id
 *    • cross-type ids (doc 5 / task 5 / email 5) do NOT collide on a synthetic reference
 *    • directorate-underivable records are ADMITTED (not quarantined)
 *    • only a true child-only orphan (comment with sentinel parent) is quarantined
 *  Zero deps; Node 18+.  Usage (from platform-root/):
 *    echo '{"type":"module"}' > package.json && node tools/livedata-shape-test.mjs ; rm -f package.json */

globalThis.Platform = {
  Persona: { current: () => 'admin', email: () => 'admin@nitda.gov.ng' },
  Context: { directorate: () => 'all' },
  Log: { info() {}, warn() {}, error() {} },
  State: { set() {}, get() {} },
  Lookups: { categories: () => [
    { value: 'Procurement', label: 'Procurement', raw: { Category: 'Procurement', 'Default Primary Responsible': 'CORP-SVC' } }
  ] }
};

// Live-shape body: tasks carry RefIDD:"No RefIDD" (sentinel) + own ID + AssignedToDSU:"No Route" (sentinel);
// docs carry ID + RoutedToDSU/Category but a sentinel reference; emails carry id; comments hang off a task.
// Note the deliberate id collision: document ID 5, task ID 5, email ID 5.
const BODY = {
  docs: [
    { ID: 5,  RefIDD: 'No RefIDD', RoutedToDSU: 'TECH-REG', title: 'Doc five' },
    { ID: 6,  RefIDD: '',          Category: 'Procurement', title: 'Doc six (cat→DPR)' },
    { ID: 7,  RefIDD: 'DG/2024/007', RoutedToDSU: 'TECH-REG', title: 'Doc seven (real ref)' },
    { ID: 8,  RefIDD: 'No RefIDD', RoutedToDSU: '<div>bleed</div>', title: 'Doc eight (no directorate)' }
  ],
  tasks: [
    // Exact live sentinels: both RefIDD AND Reference_ID (a REF_ALT_KEY) are placeholder strings.
    { ID: 5, RefIDD: 'No RefIDD', Reference_ID: 'No Reference ID', AssignedToDSU: 'No Route', CoAssigneeDSU: 'LEGAL', title: 'Task five' },
    { ID: 9, RefIDD: 'DG/2024/007', AssignedToDSU: 'TECH-REG', title: 'Task nine (linked to doc seven)' }
  ],
  emails: [
    { id: 5, RefIDD: 'null', AssignedToDSU: 'CORP-SVC', subject: 'Email five' }
  ],
  taskComments: [
    { id: 1, RefIDD: 'No RefIDD', body: 'orphan comment (true child-only orphan)' }
  ]
};

globalThis.fetch = async () => ({
  ok: true, status: 200,
  headers: { forEach: (cb) => cb('application/json', 'content-type') },
  text: async () => JSON.stringify({ ok: true, status: 200, data: BODY })
});

const { Entities } = await import('../core/entity-store.js');
await Entities.bootstrap(true);

const counts = Entities.counts();
const q = Entities.quarantine();
const qByReason = {};
for (const r of q) qByReason[r.__quarantineReason || 'unknown'] = (qByReason[r.__quarantineReason || 'unknown'] || 0) + 1;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); }
}

console.log('\n==================== S1.5c LIVE-SHAPE TEST ====================');
console.log('counts: ' + JSON.stringify({ reference: counts.reference, document: counts.document, task: counts.task, email: counts.email, comment: counts.comment }));
console.log('quarantine by reason: ' + JSON.stringify(qByReason));

// All 4 docs admitted (none quarantined for missing ref or directorate).
check('all 4 documents admitted', counts.document === 4, 'got ' + counts.document);
// Both tasks admitted (sentinel-ref task self-references).
check('both tasks admitted', counts.task === 2, 'got ' + counts.task);
// Email admitted (RefIDD:"null" sentinel → self-reference via own id).
check('email admitted', counts.email === 1, 'got ' + counts.email);

// Cross-type id collision avoided: DOC-5, TASK-5, EML-5 are distinct references.
const docFive  = Entities.all('document').find((r) => r.__id === '5');
const taskFive = Entities.all('task').find((r) => r.__id === '5');
const emailFive = Entities.all('email').find((r) => r.__id === '5');
check('document 5 self-ref = DOC-5', docFive && docFive.__ref === 'DOC-5', docFive && docFive.__ref);
check('task 5 self-ref = TASK-5',     taskFive && taskFive.__ref === 'TASK-5', taskFive && taskFive.__ref);
check('email 5 self-ref = EML-5',     emailFive && emailFive.__ref === 'EML-5', emailFive && emailFive.__ref);
check('no cross-type ref collision',  docFive && taskFive && docFive.__ref !== taskFive.__ref);

// Real ref preserved (not self-referenced) and doc+task share it.
const docSeven = Entities.all('document').find((r) => r.__id === '7');
check('real reference preserved (DG/2024/007)', docSeven && docSeven.__ref === 'DG/2024/007', docSeven && docSeven.__ref);
const bundle = Entities.byReference('DG/2024/007');
check('doc seven + task nine bundle under real ref', bundle.document.length === 1 && bundle.task.length === 1,
  'docs=' + bundle.document.length + ' tasks=' + bundle.task.length);

// Directorate derivation through the sentinel filter.
check('task five directorate from CoAssigneeDSU (AssignedToDSU sentinel skipped)', taskFive && taskFive.__directorate === 'LEGAL', taskFive && taskFive.__directorate);
const docSix = Entities.all('document').find((r) => r.__id === '6');
check('doc six directorate from Category→DPR', docSix && docSix.__directorate === 'CORP-SVC', docSix && docSix.__directorate);
const docEight = Entities.all('document').find((r) => r.__id === '8');
check('doc eight admitted with null directorate (bleed rejected, NOT quarantined)', docEight && docEight.__directorate == null, docEight && docEight.__directorate);

// Only the child-only orphan comment is quarantined; zero directorate-underivable.
check('exactly 1 quarantined (the orphan comment)', q.length === 1, 'got ' + q.length);
check('quarantine reason is reference-missing only', (qByReason['reference-missing'] || 0) === 1 && !qByReason['directorate-underivable']);

console.log('\n--- RESULT ---  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
