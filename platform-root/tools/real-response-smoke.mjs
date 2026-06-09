/** OBSIDIAN v4.0 — tools/real-response-smoke.mjs
 *  Ingests a local FETCH_ALL response into the SEALED entity-store and reports exactly how many
 *  records were accepted into the fabric vs. quarantined (Q-6: missing PrimaryDSU/AssignedDSU, or
 *  No-Orphan: missing reference). Zero dependencies; Node 18+ (uses structuredClone).
 *
 *  Usage (from platform-root/):
 *    echo '{"type":"module"}' > package.json
 *    node tools/real-response-smoke.mjs /tmp/real-response.json
 *    rm -f package.json
 *
 *  Exit code 0 = ingest produced records; 2 = file unreadable; 3 = zero records ingested. */

import { readFileSync } from 'node:fs';

const PATH = process.argv[2] || '/tmp/real-response.json';
let raw;
try {
  raw = readFileSync(PATH, 'utf8');
} catch (e) {
  console.error('[smoke] cannot read ' + PATH + ' — ' + (e && e.message));
  process.exit(2);
}

// Build a Lookups stub from the payload's own `categories` collection so the Category→Default-Primary-
// Responsible directorate step (S1.5 step d) resolves on real data — exactly as it will once the live
// Lookups option-set is loaded in the browser. Defensive: empty stub if the collection is absent.
let categoriesStub = [];
try {
  const parsed = JSON.parse(raw);
  const body = (parsed && parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
  const cats = (body && Array.isArray(body.categories)) ? body.categories
    : (body && Array.isArray(body.Categories)) ? body.Categories : [];
  categoriesStub = cats.map((c) => ({ value: c.Category ?? c.Title ?? '', label: c.Title ?? c.Category ?? '', raw: c }));
} catch (_) { categoriesStub = []; }

// Minimal Platform shim so the sealed readers + quarantine() resolve. Admin persona => quarantine visible.
globalThis.Platform = {
  Persona: { current: () => 'admin', email: () => 'admin@nitda.gov.ng' },
  Context: { directorate: () => 'all' },
  Log: { info() {}, warn() {}, error() {} },
  State: { set() {}, get() {} },
  Lookups: { categories: () => categoriesStub }
};

// Stub fetch so Entities.bootstrap() ingests the local file as if it were the live FETCH_ALL body.
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  headers: { forEach: (cb) => cb('application/json', 'content-type') },
  text: async () => raw
});

const { Entities } = await import('../core/entity-store.js');

await Entities.bootstrap(true);

const counts = Entities.counts();
const TYPES = ['reference', 'document', 'task', 'email', 'approval', 'comment', 'activity'];
const acceptedRows = TYPES.map((t) => ({ type: t, accepted: counts[t] || 0 }));
const acceptedTotal = acceptedRows.reduce((n, r) => n + r.accepted, 0);

const quarantine = Entities.quarantine(); // admin-only
const byReason = {};
for (const q of quarantine) {
  const reason = q.__quarantineReason || 'unknown';
  byReason[reason] = (byReason[reason] || 0) + 1;
}
const quarantineRows = Object.keys(byReason).sort().map((r) => ({ reason: r, count: byReason[r] }));
const quarantinedTotal = quarantine.length;

console.log('\n==================== OBSIDIAN INGEST SMOKE ====================');
console.log('source: ' + PATH + '  (' + raw.length + ' bytes)');

console.log('\n--- ACCEPTED into sealed fabric (visible at scope=all) ---');
console.table(acceptedRows);
console.log('accepted total: ' + acceptedTotal);

console.log('\n--- QUARANTINED (kept out of the live fabric) ---');
if (quarantineRows.length) {
  console.table(quarantineRows);
} else {
  console.log('(none)');
}
console.log('quarantined total: ' + quarantinedTotal);
console.log('  reason "reference-missing" = a CHILD-ONLY record (approval/comment/activity) with no');
console.log('     resolvable parent reference (No-Orphan). Correspondence types self-reference (S1.5c).');

// Directorate-derivation breakdown (S1.5c): how many accepted records resolved a directorate vs.
// were admitted with __directorate=null (visible only at the unscoped 'all' tier — never leaked).
console.log('\n--- DIRECTORATE DERIVATION (accepted records) ---');
const dirRows = ['reference', 'document', 'task', 'email'].map((t) => {
  let withDir = 0, nullDir = 0;
  for (const r of Entities.all(t)) (r.__directorate != null ? withDir++ : nullDir++);
  return { type: t, 'directorate-derived': withDir, 'directorate-null (all-tier only)': nullDir };
});
console.table(dirRows);

console.log('\n--- SUMMARY ---');
const grandTotal = acceptedTotal + quarantinedTotal;
const acceptRate = grandTotal ? ((acceptedTotal / grandTotal) * 100).toFixed(1) : '0.0';
console.table([{ acceptedTotal, quarantinedTotal, grandTotal, acceptRatePct: acceptRate }]);

// S1.5c success criteria: correspondence is visible (docs + emails > 0) and nothing is quarantined
// for a derivable-directorate reason. Child-only orphans (comments without a parent) may remain.
const docsVisible = (counts.document || 0) > 0;
const emailsVisible = (counts.email || 0) > 0;
const noDirQuarantine = !(byReason['directorate-underivable'] > 0);
console.log('documents visible:               ' + (docsVisible ? 'YES (' + counts.document + ')' : 'NO'));
console.log('emails visible:                  ' + (emailsVisible ? 'YES (' + counts.email + ')' : 'NO'));
console.log('zero directorate-quarantine:     ' + (noDirQuarantine ? 'YES' : 'NO (' + byReason['directorate-underivable'] + ')'));
console.log('reference-missing (child orphans): ' + (byReason['reference-missing'] || 0));
const s15cOk = docsVisible && emailsVisible && noDirQuarantine;
console.log('\nS1.5c restitution: ' + (s15cOk ? 'PASS — correspondence is visible in the fabric.' : 'FAIL — see above.'));

if (acceptedTotal === 0) {
  console.error('[smoke] FAIL — zero records ingested.');
  process.exit(3);
}
console.log('\n[smoke] OK — ingest produced ' + acceptedTotal + ' records (' + quarantinedTotal + ' quarantined).');
process.exit(0);
