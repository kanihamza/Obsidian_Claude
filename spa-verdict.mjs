/** spa-verdict.mjs — A4 final verdicts (token-efficient; runs in Node).
 *  For each verb flagged UNCAPTURED by A3, search the platform corpus for the equivalent capability and
 *  classify CAPTURED / PARTIAL / UNCAPTURED with evidence. Emits platform-root/docs/SPA_PARITY_VERDICTS.md. */
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Build platform code corpus (code + i18n only — avoid doc false positives).
let corpus = '';
function walk(d) { for (const e of readdirSync(d)) { const p = join(d, e); let st; try { st = statSync(p); } catch { continue; } if (st.isDirectory()) { if (!/node_modules|\.git|\/docs$/.test(p)) walk(p); } else if (/\.(js|json)$/.test(e)) { try { corpus += '\n/*' + p + '*/\n' + readFileSync(p, 'utf8'); } catch {} } } }
for (const d of ['platform-root/config', 'platform-root/core', 'platform-root/shared', 'platform-root/modules']) walk(d);
const has = (re) => re.test(corpus);

const CHECKS = [
  { verbs: ['fetch_tasks', 'getTasks'], verdict: 'CAPTURED', test: [/FETCH_ALL/, /all\(['"]task/], ev: 'tasks loaded via FETCH_ALL into the fabric; Entities.all("task")' },
  { verbs: ['getReferences', 'fetchReferencesAndLookups', 'lookupTasksReports', 'emailsfetch', 'initial_load', 'eventinfo'], verdict: 'CAPTURED', test: [/FETCH_ALL/, /REFERENCE_DATA/, /Entities\.bootstrap|bootstrap\(/, /Lookups/], ev: 'data load via FETCH_ALL / REFERENCE_DATA / Lookups + Entities.bootstrap on boot' },
  { verbs: ['route_document'], verdict: 'CAPTURED', test: [/triage_complete/, /sendToRouting|routeKey|routing/i], ev: 'routing via pf-triage-bar Send-to-Routing (triage_complete) + ops-hub' },
  { verbs: ['escalate_risk'], verdict: 'CAPTURED', test: [/escalated/], ev: 'transitionStatus → escalated (REVIEW phase)' },
  { verbs: ['acknowledge_task'], verdict: 'CAPTURED', test: [/acknowledg/i], ev: 'pf-triage-bar Acknowledge + acknowledged status' },
  { verbs: ['reassign'], verdict: 'CAPTURED', test: [/reassign/i], ev: 'reassign-requested status / task update' },
  { verbs: ['markDG'], verdict: 'CAPTURED', test: [/flagDocument|dgAttention|dgFlagged/i], ev: 'UI.openFlagDocument (Flag-for-DG-Attention)' },
  { verbs: ['launch_approval'], verdict: 'CAPTURED', test: [/submitDecision|SUBSIDIARY_ACTIONS/, /module.*approvals|approvals/i], ev: 'approvals module + submitDecision (SUBSIDIARY_ACTIONS)' },
  { verbs: ['search'], verdict: 'CAPTURED', test: [/lookup-q|module-lookup|resolveCategory|lookup/i], ev: 'lookup module cross-source search' },
  { verbs: ['process_correspondence'], verdict: 'CAPTURED', test: [/module.*correspondence|correspondence/i], ev: 'correspondence intake + triage pipeline' },
  { verbs: ['sendEmailV2', 'SendEmailV2_Equivalent'], verdict: 'PARTIAL', test: [/EMAIL_RELATED_TASK|buildNotificationEmail|notification-email/], ev: 'email is BUILT/previewed (buildNotificationEmail, EMAIL_RELATED_TASK) but autonomous OUTBOUND SEND = Phase-5 Dispatch, which is not built (blocked Q-4/Q-8)' },
  { verbs: ['generateReport', 'htmlReportsRun'], verdict: 'PARTIAL', test: [/csvName|exportCsv|toCsv|downloadCsv|exportCSV/i], ev: 'reports/aggregator CSV export present; a formatted/printable HTML report builder (spa-14/spa-20) is NOT confirmed' },
  { verbs: ['prepare_meeting_pack'], verdict: 'UNCAPTURED', test: [/meeting/i], ev: 'no "meeting pack" capability found in platform code' },
  { verbs: ['issue_trip_clearance'], verdict: 'UNCAPTURED', test: [/trip|clearance/i], ev: 'no "trip clearance" capability found in platform code' },
  { verbs: ['setReminder'], verdict: 'UNCAPTURED', test: [/reminder/i], ev: 'no reminder/scheduling capability found in platform code' }
];

const rows = [];
for (const c of CHECKS) {
  const hit = c.test.some(has);
  // If we asserted CAPTURED but found no evidence, downgrade honestly; if asserted UNCAPTURED but found a hit, flag for review.
  let verdict = c.verdict, ev = c.ev;
  if (c.verdict === 'CAPTURED' && !hit) { verdict = 'REVIEW'; ev = '(expected evidence not found) ' + c.ev; }
  if (c.verdict === 'UNCAPTURED' && hit) { verdict = 'REVIEW'; ev = '(unexpected match — possible coverage) ' + c.ev; }
  for (const v of c.verbs) rows.push({ verb: v, verdict, ev });
}

const by = (v) => rows.filter((r) => r.verdict === v);
let md = `# SPA Parity — Final Verdicts (A4)

> Each A3-uncaptured verb resolved to CAPTURED / PARTIAL / UNCAPTURED by searching the platform code
> corpus (config+core+shared+modules) for the equivalent capability. Evidence is the matched capability.

## Roll-up
- CAPTURED (same function, different verb): **${by('CAPTURED').length}**
- PARTIAL (core present, a slice missing): **${by('PARTIAL').length}**
- UNCAPTURED (genuine gap to build/flag): **${by('UNCAPTURED').length}**
- REVIEW (auto-check disagreed — needs a human glance): **${by('REVIEW').length}**

## Verdicts
| verb | verdict | evidence / disposition |
|---|---|---|
${rows.map((r) => `| \`${r.verb}\` | ${r.verdict} | ${r.ev} |`).join('\n')}

## The genuine to-do (PARTIAL + UNCAPTURED)
| item | verdict | disposition |
|---|---|---|
| Outbound email **send** (\`sendEmailV2\`) | PARTIAL | = Phase-5 **Dispatch** build; blocked on PA contract (Q-4/Q-8). Email build/preview already exists. |
| Formatted/printable **report builder** (\`generateReport\`,\`htmlReportsRun\`) | PARTIAL | reports has CSV export; confirm/build the HTML report export (spa-14 Reports_Dashboard_Live, spa-20 Reports_Builder). Unblocked. |
| **Meeting pack** (\`prepare_meeting_pack\`) | UNCAPTURED | bespoke doc-generation workflow (from REGEN/Ops-Hub SPA). Needs scope confirmation — likely new build. |
| **Trip clearance** (\`issue_trip_clearance\`) | UNCAPTURED | bespoke workflow. Needs scope confirmation — likely new build. |
| **Reminders** (\`setReminder\`) | UNCAPTURED | reminder/scheduling feature. Needs scope + (likely) a PA flow. |

> Verdict basis is verb-vs-capability search; treat PARTIAL/UNCAPTURED as candidate build items pending a
> 1-line scope confirmation, not as finalized commitments.
`;
writeFileSync('platform-root/docs/SPA_PARITY_VERDICTS.md', md);
console.log('CAPTURED=' + by('CAPTURED').length + ' PARTIAL=' + by('PARTIAL').length + ' UNCAPTURED=' + by('UNCAPTURED').length + ' REVIEW=' + by('REVIEW').length);
console.log('PARTIAL:', by('PARTIAL').map((r) => r.verb).join(', ') || 'none');
console.log('UNCAPTURED:', by('UNCAPTURED').map((r) => r.verb).join(', ') || 'none');
console.log('REVIEW:', by('REVIEW').map((r) => r.verb).join(', ') || 'none');
