/** OBSIDIAN v4.0 — tools/inspect-lookups.mjs
 *  Read-only shape probe for the REFERENCE_DATA Power Automate flow (the source of every category /
 *  assignee / co-assignee / CC dropdown via shared/utils/lookups.js). Calls the live flow with its
 *  configured defaults ({action:'lookups',…}), then prints the envelope + the users/categories/
 *  departments collections with each collection's count and first-record field names — so we can see
 *  exactly why the dropdowns are empty (flow returns nothing vs. returns an unparsed shape).
 *  The SAS url is NOT printed (only its host). Node 18+ (global fetch).
 *
 *  Usage (from platform-root/):  node tools/inspect-lookups.mjs
 *  Paste the entire output back. */

import { Endpoints } from '../config/endpoints.config.js';

const e = Endpoints.REFERENCE_DATA;
if (!e || !e.url) { console.error('REFERENCE_DATA endpoint or url not found in config'); process.exit(2); }

const body = { ...(e.defaults || {}) };   // {action:'lookups', operation:'read', mode:'read', source:…}
console.log('==================== REFERENCE_DATA PROBE ====================');
console.log('flow:   ' + (e.flowName || '—'));
console.log('host:   ' + new URL(e.url).host);
console.log('method: ' + (e.method || 'POST'));
console.log('body:   ' + JSON.stringify(body));

let res, text;
try {
  res = await fetch(e.url, { method: e.method || 'POST', headers: e.headers || { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  text = await res.text();
} catch (err) {
  console.error('\nNETWORK ERROR — ' + (err && err.message));
  console.error('(If this is a TLS/timeout/DNS error, the tablet could reach FETCH_ALL but not this flow.)');
  process.exit(3);
}

console.log('\nHTTP status: ' + res.status + '   bytes: ' + text.length);

let env;
try { env = JSON.parse(text); }
catch { console.log('\nResponse is NOT JSON. First 400 chars:\n' + text.slice(0, 400)); process.exit(0); }

console.log('envelope keys: ' + JSON.stringify(Object.keys(env)));
console.log('ok: ' + env.ok + '   status: ' + env.status + '   errors: ' + JSON.stringify(env.errors || null));

// v1 envelope: data may be an object OR a JSON string.
let data = env.data;
if (typeof data === 'string') { try { data = JSON.parse(data); console.log('(data was a JSON string — parsed)'); } catch { console.log('data is a non-JSON string, first 300: ' + data.slice(0, 300)); data = null; } }
if (!data || typeof data !== 'object') { console.log('\nNo usable data object. Full envelope (first 600 chars):\n' + text.slice(0, 600)); process.exit(0); }

console.log('\ndata keys: ' + JSON.stringify(Object.keys(data)));
for (const coll of ['users', 'categories', 'departments']) {
  const list = data[coll];
  if (!Array.isArray(list)) { console.log('\n--- ' + coll + ': NOT an array (' + (list == null ? 'missing' : typeof list) + ') ---'); continue; }
  const first = list.find((x) => x && typeof x === 'object') || {};
  console.log('\n--- ' + coll + '  (count ' + list.length + ') ---');
  console.log('  first-record keys: ' + JSON.stringify(Object.keys(first)));
  console.log('  first record (values trimmed): ' + JSON.stringify(Object.fromEntries(Object.entries(first).slice(0, 12).map(([k, v]) => [k, String(v).slice(0, 40)]))));
}
console.log('\n==================== END PROBE ====================');
