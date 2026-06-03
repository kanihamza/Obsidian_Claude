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

// Minimal Platform shim so the sealed readers + quarantine() resolve. Admin persona => quarantine visible.
globalThis.Platform = {
  Persona: { current: () => 'admin', email: () => 'admin@nitda.gov.ng' },
  Context: { directorate: () => 'all' },
  Log: { info() {}, warn() {}, error() {} },
  State: { set() {}, get() {} }
};

const PATH = process.argv[2] || '/tmp/real-response.json';
let raw;
try {
  raw = readFileSync(PATH, 'utf8');
} catch (e) {
  console.error('[smoke] cannot read ' + PATH + ' — ' + (e && e.message));
  process.exit(2);
}

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
console.log('  reason "directorate-underivable" = record had neither PrimaryDSU nor AssignedDSU (Q-6).');
console.log('  reason "reference-missing"        = record had no derivable Reference id (No-Orphan).');

console.log('\n--- SUMMARY ---');
const grandTotal = acceptedTotal + quarantinedTotal;
const acceptRate = grandTotal ? ((acceptedTotal / grandTotal) * 100).toFixed(1) : '0.0';
console.table([{
  acceptedTotal,
  quarantinedTotal,
  grandTotal,
  acceptRatePct: acceptRate
}]);

// The canonical preserved response is documented as ref 302 | doc 300 | task 100 | email 50 | comment 2.
const EXPECT = { reference: 302, document: 300, task: 100, email: 50, comment: 2 };
const matchesCanonical = Object.keys(EXPECT).every((k) => (counts[k] || 0) === EXPECT[k]);
console.log('matches documented canonical counts (302/300/100/50/2): ' + (matchesCanonical ? 'YES' : 'NO'));
if (!matchesCanonical && quarantinedTotal > 0) {
  console.log('NOTE: records were quarantined — if this payload should be fully accepted, the live');
  console.log('      FETCH_ALL rows are missing PrimaryDSU/AssignedDSU. Report the counts above so the');
  console.log('      Q-6 derivation can be reconciled against the real DGCEO data shape.');
}

if (acceptedTotal === 0) {
  console.error('[smoke] FAIL — zero records ingested.');
  process.exit(3);
}
console.log('\n[smoke] OK — ingest produced ' + acceptedTotal + ' records (' + quarantinedTotal + ' quarantined).');
process.exit(0);
