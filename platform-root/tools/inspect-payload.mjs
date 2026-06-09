/** OBSIDIAN v4.0 — tools/inspect-payload.mjs
 *  Standalone shape inspector for a live FETCH_ALL response. Prints the top-level keys, every
 *  collection (array-of-objects) with its path + count, and for each collection the first record's
 *  field names — flagging reference-like, id-like, and DSU-like fields. Zero dependencies.
 *
 *  Usage (from platform-root/):  node tools/inspect-payload.mjs <path-to-FETCH_ALL.json>
 *  Paste the entire output back. */

import { readFileSync } from 'node:fs';

const PATH = process.argv[2];
if (!PATH) { console.error('usage: node tools/inspect-payload.mjs <file.json>'); process.exit(2); }
let root;
try { root = JSON.parse(readFileSync(PATH, 'utf8')); }
catch (e) { console.error('cannot parse ' + PATH + ' — ' + (e && e.message)); process.exit(2); }

const REF_RX = /ref/i;
const ID_RX  = /(^id$|_id$|id$)/i;
const DSU_RX = /dsu/i;

function isCollection(v) { return Array.isArray(v) && v.length && v.some((x) => x && typeof x === 'object' && !Array.isArray(x)); }

console.log('==================== PAYLOAD SHAPE ====================');
console.log('file: ' + PATH + '  (' + readFileSync(PATH).length + ' bytes)');
console.log('top-level type: ' + (Array.isArray(root) ? 'array' : typeof root));
if (root && typeof root === 'object' && !Array.isArray(root)) console.log('top-level keys: ' + JSON.stringify(Object.keys(root)));

const collections = [];
(function walk(o, path) {
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o)) return;
  for (const [k, v] of Object.entries(o)) {
    const p = path ? path + '.' + k : k;
    if (isCollection(v)) collections.push({ path: p, key: k, list: v });
    else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p);
  }
})(root, '');

if (!collections.length) { console.log('\nNO array-of-object collections found at depth ≤ a few levels.'); process.exit(0); }

for (const c of collections) {
  const first = c.list.find((x) => x && typeof x === 'object') || {};
  const keys = Object.keys(first);
  const refLike = keys.filter((k) => REF_RX.test(k));
  const idLike  = keys.filter((k) => ID_RX.test(k));
  const dsuLike = keys.filter((k) => DSU_RX.test(k));
  console.log('\n--- collection: ' + c.path + '  (count ' + c.list.length + ') ---');
  console.log('  all keys (' + keys.length + '): ' + JSON.stringify(keys));
  console.log('  reference-like keys: ' + JSON.stringify(refLike) + '  → first values: ' +
    JSON.stringify(refLike.map((k) => first[k]).slice(0, 6)));
  console.log('  id-like keys:        ' + JSON.stringify(idLike) + '  → first values: ' +
    JSON.stringify(idLike.map((k) => String(first[k]).slice(0, 40)).slice(0, 6)));
  console.log('  DSU-like keys:       ' + JSON.stringify(dsuLike) + '  → first values: ' +
    JSON.stringify(dsuLike.map((k) => String(first[k]).slice(0, 40)).slice(0, 6)));
}
console.log('\n==================== END SHAPE ====================');
