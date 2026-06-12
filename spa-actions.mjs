/** spa-actions.mjs — A3 action-level parity (token-efficient; runs in Node).
 *  Extracts the action/operation verbs each SPA invokes and reconciles them against the platform's real
 *  action vocabulary (endpoint defaults + every action:/operation: dispatched in platform-root code).
 *  Normalized compare (case/format-insensitive) so UPDATE_TASK == updateTask. Emits
 *  platform-root/docs/SPA_ACTION_PARITY.md + prints a compact summary. */
import { readFileSync, readdirSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const VERB = /(?:["']?(?:action|operation)["']?\s*[:=]\s*)["']([A-Za-z][\w .-]{1,40}?)["']/g;
const isVerb = (v) => v && !/^https?:|[\/]/.test(v) && v.length <= 40; // drop form-action URLs

function verbsIn(src) {
  const out = new Set(); let m;
  VERB.lastIndex = 0;
  while ((m = VERB.exec(src))) { const v = m[1].trim(); if (isVerb(v)) out.add(v); }
  return out;
}

// --- platform action vocabulary (walk platform-root .js + endpoints) ---
const platVerbs = new Map(); // norm -> sample
function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (!/node_modules|\.git/.test(p)) walk(p); }
    else if (/\.(js|json)$/.test(e)) {
      let src = ''; try { src = readFileSync(p, 'utf8'); } catch { continue; }
      for (const v of verbsIn(src)) if (!platVerbs.has(norm(v))) platVerbs.set(norm(v), v);
    }
  }
}
walk('platform-root/config'); walk('platform-root/core'); walk('platform-root/shared'); walk('platform-root/modules');
const platSet = new Set(platVerbs.keys());

// --- SPA verbs ---
const MAP = [
  ['spa-01', 'REGEN_DGO_LIVE_V2_8_ENHANCED_FINAL.html'], ['spa-02', 'NITDA_Digital_Ops_Hub_patched.html'],
  ['spa-03', 'Optimized_NITDA DGO Smart Orchestrator Merged Launcher.html'], ['spa-04', 'dg_ceo_office_platform-1.html'],
  ['spa-05', 'DGO_FastTrack_Monitoring_SPA.html'], ['spa-06', 'Assignment_Intelligence_Dashboard.html'],
  ['spa-07', 'DAA_DGO_HUB_ASSIGN_ITEM_DIRECT_Build_v2.0.html'], ['spa-08', 'stats_screen_spa-2.html'],
  ['spa-09', ' Response Tracking & Matrix.html'], ['spa-10', 'Correspondence_Tracker.html'],
  ['spa-11', 'Response matrix v2.html'], ['spa-12', 'NITDA_DGO_HUB_ACK.html'],
  ['spa-13', 'Unified Smart Orchestrator.html'], ['spa-14', 'Reports_Dashboard_Live.html'],
  ['spa-15', 'DGCEO Correspondence & Decision Hub.html'], ['spa-16', 'registry_movement.html'],
  ['spa-17', 'approvals.html'], ['spa-18', 'Executive_Operations_Hub_Build_v2.0.html'],
  ['spa-19', 'Comments_Thread.html'], ['spa-20', 'HTML Reports_Builder_SPA.html']
];
const rows = []; const allUncaptured = new Map(); // norm -> {sample, spas:Set}
for (const [id, file] of MAP) {
  const src = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const verbs = [...verbsIn(src)];
  const captured = []; const uncaptured = [];
  for (const v of verbs) {
    if (platSet.has(norm(v))) captured.push(v);
    else { uncaptured.push(v); const k = norm(v); if (!allUncaptured.has(k)) allUncaptured.set(k, { sample: v, spas: new Set() }); allUncaptured.get(k).spas.add(id); }
  }
  rows.push({ id, file, total: verbs.length, captured: captured.length, uncaptured });
}

// --- emit ---
let md = `# SPA Action/Function Parity (A3 — verb-level reconciliation)

> Each SPA's invoked action/operation verbs vs the platform's real action vocabulary (endpoint defaults +
> every action:/operation: dispatched in platform-root). Normalized compare (UPDATE_TASK == updateTask).
> CAPTURED = the verb (or its normalized form) exists in the platform. UNCAPTURED verbs are the concrete
> candidate gaps — confirm each is a real feature (not a dead/legacy verb) before building.

## Summary
- Platform distinct action verbs: ${platSet.size}
- SPA verbs: total invocations ${rows.reduce((a, r) => a + r.total, 0)} across ${rows.length} SPAs
- Distinct UNCAPTURED verbs (candidate gaps): **${allUncaptured.size}**

## Per-SPA
| SPA | source | verbs | captured | UNCAPTURED verbs |
|---|---|---|---|---|
`;
for (const r of rows) md += `| ${r.id} | ${r.file} | ${r.total} | ${r.captured}/${r.total} | ${r.uncaptured.join(', ') || '—'} |\n`;

md += `\n## Distinct UNCAPTURED verbs (union — the real to-verify list)\n\n| verb | seen in |\n|---|---|\n`;
for (const [, v] of [...allUncaptured.entries()].sort()) md += `| \`${v.sample}\` | ${[...v.spas].join(', ')} |\n`;

md += `\n## Platform action vocabulary (reference)\n\n${[...platVerbs.values()].sort().map((v) => '`' + v + '`').join(' · ')}\n`;
md += `\n> Note: a verb appearing UNCAPTURED may still be functionally covered if the platform implements the\n> same behaviour under a different verb/endpoint (the GUID repoint, see SPA_PARITY_MATRIX.md). Verb match is\n> a strong signal but each UNCAPTURED entry needs a 1-line confirm before it becomes a build item.\n`;
writeFileSync('platform-root/docs/SPA_ACTION_PARITY.md', md);

console.log('platform verbs=' + platSet.size + '  uncaptured-distinct=' + allUncaptured.size);
console.log('UNCAPTURED:', [...allUncaptured.values()].map((v) => v.sample).sort().join(', ') || 'none');
console.log('per-spa cap:', rows.map((r) => r.id + '=' + r.captured + '/' + r.total).join(' '));
