#!/usr/bin/env node
/** OBSIDIAN v4.0 — boot smoke test (zero deps).
 *  Stubs JUST enough browser globals to let _base.js, the components, and every module
 *  index.js load in Node, then verifies module registration + nav IA invariants.
 *  Catches component-init regressions that node --check (syntax only) misses. */

// ─── Minimal DOM/CSS stubs ────────────────────────────────────────────────
class CSSStyleSheet { constructor() { this.cssRules = []; } replaceSync() {} async replace() {} }
class FakeNode {
  constructor(tag) { this.tagName = (tag || 'div').toUpperCase(); this.children = []; this.childNodes = []; this._attrs = {}; this.style = {};
    this.classList = { _set: new Set(), add: (c) => this.classList._set.add(c), remove: (c) => this.classList._set.delete(c),
      contains: (c) => this.classList._set.has(c), toggle: (c, on) => on ? this.classList._set.add(c) : this.classList._set.delete(c) };
    this.dataset = new Proxy({}, { set: (t, k, v) => { this._attrs['data-' + k] = v; return true; }, get: (t, k) => this._attrs['data-' + k] }); }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k) { return this._attrs[k] || null; }
  removeAttribute(k) { delete this._attrs[k]; }
  hasAttribute(k) { return k in this._attrs; }
  addEventListener() {} removeEventListener() {}
  appendChild(c) { this.children.push(c); this.childNodes.push(c); return c; }
  append(...nodes) { for (const n of nodes) if (n != null) this.appendChild(typeof n === 'string' ? new TextNode(n) : n); }
  replaceWith(node) { /* no-op */ }
  remove() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  get firstChild() { return this.childNodes[0] || null; }
  get textContent() { return ''; }
  set textContent(v) {}
  get innerHTML() { return ''; }
  set innerHTML(v) {}
  focus() {}
  scrollIntoView() {}
  click() {}
  dispatchEvent() { return true; }
}
class TextNode { constructor(text) { this.nodeType = 3; this.textContent = text; } }
class FakeShadowRoot extends FakeNode { constructor() { super(); this.adoptedStyleSheets = []; } }
class HTMLElement extends FakeNode {
  constructor() { super(); }
  attachShadow() { this.shadowRoot = new FakeShadowRoot(); return this.shadowRoot; }
  connectedCallback() {}
}

globalThis.HTMLElement = HTMLElement;
globalThis.CSSStyleSheet = CSSStyleSheet;
globalThis.customElements = new Map();
globalThis.customElements.define = function (name, ctor) { this.set(name, ctor); };
globalThis.customElements.get = function (name) { return this.get(name); };
globalThis.customElements.whenDefined = async () => {};
globalThis.document = {
  createElement: (tag) => new FakeNode(tag),
  createTextNode: (t) => new TextNode(t),
  createDocumentFragment: () => new FakeNode('#fragment'),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  documentElement: new FakeNode('html'),
  body: new FakeNode('body'),
  head: new FakeNode('head'),
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.window = {
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  location: { hash: '', href: 'http://localhost/' },
  addEventListener: () => {}, removeEventListener: () => {},
  dispatchEvent: () => true
};
try { globalThis.navigator = { userAgent: 'node-smoke' }; }
catch { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-smoke' }, configurable: true }); }
globalThis.performance = { now: () => Date.now() };
globalThis.fetch = async () => ({ ok: false, status: 0, headers: { forEach: () => {} }, text: async () => '' });
globalThis.CustomEvent = class { constructor(name, init) { this.type = name; this.detail = (init && init.detail) || null; } };
globalThis.Event = class { constructor(name) { this.type = name; } };
globalThis.AbortController = class { constructor() { this.signal = { aborted: false }; } abort() { this.signal.aborted = true; } };

// ─── Load every module ────────────────────────────────────────────────────
const { Modules } = await import('../core/modules-registry.js');
const ids = ['home','ops-hub','correspondence','orchestrator','fasttrack','registry','assistant',
  'response-tracking','approvals','comments','executive','stats','reports','assignment',
  'single-item-ops','bulk-assignment','diagnostics','lookup','settings'];
const errs = [];
for (const id of ids) {
  try { await import(`../modules/${id}/index.js`); }
  catch (e) { errs.push(`  ${id}: ${e.message.split('\n')[0]}`); }
}

// ─── Invariants ───────────────────────────────────────────────────────────
const all = Modules.all();
const expected = 19;
let fails = 0;
if (errs.length) { console.error('IMPORT ERRORS:'); errs.forEach(e => console.error(e)); fails += errs.length; }
if (all.length !== expected) { console.error(`module count FAIL: expected ${expected}, got ${all.length}`); fails++; }
const adminGroups = Modules.navGroups('admin');
// J-1/U2 — 6-phase nav groups. DISPATCH and ARCHIVE are legitimately empty until their modules ship
// (nav-controller filters empty groups), so they are NOT asserted here.
const navGroups = ['INTAKE','ROUTING','ACTION','REVIEW','CrossPhase','System'];
for (const g of navGroups) {
  if (!adminGroups[g] || !adminGroups[g].length) { console.error(`nav group "${g}" is empty`); fails++; }
}
// comments must NOT appear in nav (it's hidden)
const hiddenInNav = Object.values(adminGroups).flat().some(m => m.id === 'comments');
if (hiddenInNav) { console.error('FAIL: "comments" should be hidden from nav (nav.hidden:true)'); fails++; }
// but comments MUST still be registered (routable)
const commentsRegistered = all.some(m => m.id === 'comments');
if (!commentsRegistered) { console.error('FAIL: "comments" must remain registered (routable)'); fails++; }

if (fails) { console.error(`\nBOOT SMOKE: FAIL (${fails} issue(s))`); process.exit(1); }

console.log(`BOOT SMOKE: PASS — ${all.length} modules registered`);
for (const g of navGroups) console.log(`  ${g}: ${adminGroups[g].map(m => m.id).join(', ')}`);
console.log(`  hidden (contextual): comments`);
