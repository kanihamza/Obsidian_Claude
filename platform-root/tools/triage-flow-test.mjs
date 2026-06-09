/** OBSIDIAN v4.0 — tools/triage-flow-test.mjs
 *  S3 contract guard for <pf-triage-bar>. The bar's DOM is browser-verified separately; this proves
 *  the engine contract it drives: the INTAKE phase-gate chain (registered→triaged→triage_complete via
 *  Entities.transitionStatus, C-7) starting from a NON-canonical imported status, plus the Phase-1→2
 *  handoff (Context.setHandoff/getHandoff, J-5). Mirrors the bar's _advance() walk exactly.
 *  Zero deps; Node 18+.  Usage (from platform-root/):
 *    echo '{"type":"module"}' > package.json && node tools/triage-flow-test.mjs ; rm -f package.json */

globalThis.Platform = {
  Persona: { current: () => 'general', email: () => 'officer@nitda.gov.ng' },
  Log: { info() {}, warn() {}, error() {} },
  State: { set() {}, get() {} }
};

// A live-shape document with a NON-canonical imported status ("Open") and no reference field — it
// self-references to DOC-<id> and synthesizes a reference whose status is the donor's "Open".
const BODY = { docs: [{ ID: 4242, Title: 'Letter from Ministry', RoutedToDSU: 'TECH-REG', Status: 'Open' }] };
globalThis.fetch = async () => ({
  ok: true, status: 200,
  headers: { forEach: (cb) => cb('application/json', 'content-type') },
  text: async () => JSON.stringify({ ok: true, status: 200, data: BODY })
});

const { Entities } = await import('../core/entity-store.js');
const { Context } = await import('../core/context.js');
// context.js reads/writes Platform.* via core/state.js + bus.js; expose them on the shim post-import.
globalThis.Platform.Entities = Entities;
globalThis.Platform.Context = Context;

await Entities.bootstrap(true);

const INTAKE_PATH = ['registered', 'triaged', 'triage_complete'];
const by = globalThis.Platform.Persona.email();
const ref = 'DOC-4242';

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); }
};

// Replicates pf-triage-bar._advance(): read live status, step the chain through the phase-gate writer.
function advance(target) {
  const tIdx = INTAKE_PATH.indexOf(target);
  let cur = String((Entities.byReference(ref)?.reference?.status) || '');
  let curIdx = INTAKE_PATH.indexOf(cur);
  if (curIdx >= tIdx) return { ok: true, finalStatus: cur, noop: true };
  for (let i = Math.max(curIdx + 1, 0); i <= tIdx; i++) {
    const res = Entities.transitionStatus(ref, cur, INTAKE_PATH[i], by);
    if (!res || !res.ok) return { ok: false, error: res, finalStatus: cur };
    cur = INTAKE_PATH[i];
  }
  return { ok: true, finalStatus: cur };
}

console.log('\n==================== S3 TRIAGE-FLOW CONTRACT TEST ====================');
const start = String(Entities.byReference(ref)?.reference?.status || '');
check('reference exists with non-canonical imported status "Open"', start === 'Open', start);

// Acknowledge: Open → (registered) → triaged.
const ack = advance('triaged');
check('Acknowledge walks Open → registered → triaged', ack.ok && ack.finalStatus === 'triaged', JSON.stringify(ack));
check('fabric status is now "triaged"', String(Entities.byReference(ref)?.reference?.status) === 'triaged');

// Send to Routing: triaged → triage_complete.
const send = advance('triage_complete');
check('Send-to-Routing walks triaged → triage_complete', send.ok && send.finalStatus === 'triage_complete', JSON.stringify(send));
check('fabric status is now "triage_complete"', String(Entities.byReference(ref)?.reference?.status) === 'triage_complete');

// Re-acknowledge is a safe no-op (already past on the path).
const again = advance('triaged');
check('re-advance past current is a no-op', again.ok && again.noop === true);

// Illegal skip is rejected by the phase-gate (cannot jump triage_complete → assigned here via INTAKE chain).
const illegal = Entities.transitionStatus(ref, 'triage_complete', 'dispatched', by);
check('phase-gate rejects an illegal jump', illegal && illegal.ok === false, JSON.stringify(illegal));

// Handoff slice (J-5): set, read a copy, fields intact, ts stamped, clear works.
const meta = { category: 'Procurement', urgency: 'p1', duplicate: false, duplicateOf: null, acknowledgedBy: by };
const written = Context.setHandoff({ fromPhase: 1, toPhase: 2, refs: [ref], triageMeta: meta });
const read = Context.getHandoff();
check('handoff stored with fromPhase/toPhase', read && read.fromPhase === 1 && read.toPhase === 2);
check('handoff carries the routed ref', read && Array.isArray(read.refs) && read.refs[0] === ref);
check('handoff carries triageMeta (category+urgency)', read && read.triageMeta && read.triageMeta.category === 'Procurement' && read.triageMeta.urgency === 'p1');
check('handoff is timestamped', !!(read && read.ts));
read.refs.push('TAMPER');                 // mutate the returned copy
check('getHandoff returns a defensive copy (mutation does not leak)', Context.getHandoff().refs.length === 1);
Context.clearHandoff();
check('clearHandoff empties the slice', Context.getHandoff() === null);

console.log('\n--- RESULT ---  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
