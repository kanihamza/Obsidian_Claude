/** OBSIDIAN v4.0 — tests/runner.js · tiny zero-dependency test harness (browser). */
const results = [];
export function describe(name, fn) { current = name; fn(); }
let current = '';
export function it(name, fn) {
  try { const r = fn(); if (r instanceof Promise) return r.then(() => pass(name)).catch((e) => fail(name, e));
    pass(name); } catch (e) { fail(name, e); }
}
function pass(name) { results.push({ suite: current, name, ok: true }); }
function fail(name, e) { results.push({ suite: current, name, ok: false, error: String(e && e.message || e) }); }
export const assert = {
  ok(v, m) { if (!v) throw new Error(m || 'expected truthy'); },
  equal(a, b, m) { if (a !== b) throw new Error(m || `expected ${b}, got ${a}`); },
  deep(a, b, m) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(m || 'deep mismatch'); }
};
export function report(rootSel) {
  const root = document.querySelector(rootSel);
  const passed = results.filter((r) => r.ok).length;
  const head = document.createElement('h1');
  head.textContent = `${passed}/${results.length} passing`;
  head.style.color = passed === results.length ? 'var(--color-success)' : 'var(--color-danger)';
  root.appendChild(head);
  for (const r of results) {
    const li = document.createElement('div');
    li.textContent = `${r.ok ? 'PASS' : 'FAIL'} · ${r.suite} › ${r.name}${r.error ? ' — ' + r.error : ''}`;
    li.style.color = r.ok ? 'var(--color-text)' : 'var(--color-danger)';
    root.appendChild(li);
  }
  return { passed, total: results.length };
}
