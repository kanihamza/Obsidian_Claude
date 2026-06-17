# OBSIDIAN v4.0 — Component Library

All reusable UI is built as native **Custom Elements** (`<pf-*>`) on the `PfBaseElement` base class. There
is no framework and no build step — components are plain ES modules registered with `customElements.define`.

> Registration: `shared/components/index.js` imports every component (which self-registers). The app shell
> imports that index once at boot.

---

## 1. The base class — `PfBaseElement` (`shared/components/_base.js`)

Every component extends `PfBaseElement`, which provides:

- **Shadow DOM** attached in the constructor, with a single shared, cached `CSSStyleSheet` adopted into every
  shadow root. Design tokens (`var(--*)`) pierce the boundary, so themes apply inside the shadow tree.
- **Lifecycle hooks:** `onConnect()`, `onDisconnect()`, `onAttrChange(name, old, new)` (override these rather
  than the raw `connectedCallback` etc.).
- **Auto-cleanup listeners:** `this.on(target, event, handler)` and `this.bus(event, handler)` push disposers
  that run on disconnect — no manual teardown, no leaks.
- **Scoped queries:** `this.$(sel)` / `this.$$(sel)` query the shadow root.
- **Rendering:** `this.render(html)` sets shadow innerHTML; `this.emit(name, detail)` dispatches a bubbling,
  composed `CustomEvent`.
- **i18n:** `this.t(key, vars)` resolves through `Platform.I18n`.
- **`observedAttributes`** comes from `static attrs = [...]`.

```js
import { PfBaseElement } from './_base.js';

class PfExample extends PfBaseElement {
  static attrs = ['label'];
  onConnect() {
    this.render(`<style>:host{ display:block; }</style>
      <button id="go">${this.t('example.action')}</button>`);
    this.on(this.$('#go'), 'click', () => this.emit('pf-example:go', { at: Date.now() }));
  }
  onAttrChange(name, _old, val) { if (name === 'label') this.$('#go').textContent = val; }
}
customElements.define('pf-example', PfExample);
export default PfExample;
```

### Conventions
- Read the platform lazily at call time (`globalThis.Platform.…`) — never capture singletons at module load.
- Style with tokens only (`var(--token)`); literal hex is gate-blocked outside `themes/`.
- Bind data via JS **properties** (e.g. `el.reference = refId`), not stringly-typed attributes, for objects.
- Emit `pf-<name>:<event>` custom events for host modules to listen to.

---

## 2. Shell & chrome

| Element | Purpose |
|---|---|
| `<pf-app-shell>` | Top-level layout: header + nav + main outlet + footer. Hosts the router outlet. |
| `<pf-app-header>` | App bar — brand, utility actions (palette/notifications/theme/persona), menu toggle. |
| `<pf-app-nav>` | Renders the audience-filtered nav model from `Platform.Nav`; reflects the active route. |
| `<pf-app-footer>` | Footer / endorsement line. |
| `<pf-breadcrumb>` | Breadcrumb trail for the active surface. |
| `<pf-skip-link>` | Accessibility skip-to-content link. |
| `<pf-persona-switcher>` | Switches the local persona (UX/audit only — not auth) via `Platform.Persona`. |
| `<pf-icon>` | Inline SVG icon by `name` + `size`. |

---

## 3. Feedback & overlays

| Element | Purpose |
|---|---|
| `<pf-toast>` | Transient notifications; danger toasts use assertive `aria-live`. Driven by `Platform.UI.toast`. |
| `<pf-modal>` | Modal dialog with focus trap. Backs `Platform.UI.modal` / `UI.confirm` (preview + confirm). |
| `<pf-side-panel>` | Slide-in panel for secondary detail; Escape-to-close with cleaned-up listeners. |
| `<pf-connectivity-banner>` | Three-band connectivity status (loading / warning / error). |
| `<pf-deprecation-banner>` | Surfaced on deprecated modules; links to the replacement. |

`Platform.UI.confirm({ titleKey, summaryKey | summary, details, confirmKey, danger })` resolves `true` only on
explicit confirm — the mandatory preview gate before any write or flow trigger.

---

## 4. Workflow surface components

| Element | Phase | Purpose |
|---|---|---|
| `<pf-triage-bar>` | INTAKE | Chip row: Acknowledge / Tag Category / Flag Urgency / Mark Duplicate / Send to Routing. Advances `registered → triaged → triage_complete` via `Entities.transitionStatus`, then stages `Context.handoff` and navigates to ROUTING. Bind `el.item` or `el.reference`. |
| `<pf-rich-picker>` | ROUTING | Searchable single/multi/tab picker for assignees, categories, departments (from `Platform.Lookups`). |
| `<pf-otp-modal>` | ROUTING | Thin UI over the PA OTP handshake (`OTP_GENERATE` / `OTP_VERIFY`); the server validates the code. |
| `<pf-comment-thread>` | ACTION | Threaded comments with reply / edit / delete; immutable after closure. Backs `UI.openComments`. |
| `<pf-dispatch-panel>` | DISPATCH | Drives `dispatch-pending → dispatch-in-flight → dispatched \| dispatch-failed`. Resolves the recipient from the live directory (`Platform.Directory` → `DSU_Email \| DSU_HeadEmail`), shows a preview + confirm, dispatches via the `dispatch` contract, injects an inline **Retry** on failure (asymmetric fallback), and offers **Close** gated on `Entities.canClose`. Bind `el.reference`. Emits `pf-dispatch:dispatched` / `:failed` / `:closed`. |

---

## 5. Content & data components

| Element | Purpose |
|---|---|
| `<pf-attachment>` | Inline preview of email/document attachments (image / PDF / text), fetched via `FETCH_EMAIL_ATTACHMENTS`. |
| `<pf-sandboxed-iframe>` | XSS-hardened sandboxed iframe for rendering untrusted HTML/PDF, with `cid:` image mapping. |
| `<pf-filter-bar>` | Status/keyword filter chips emitting filter-change events for list lenses. |

---

## 6. Shared render utilities (`shared/utils/`)

Components and modules compose UI through these helpers (not a component, but the rendering toolkit):

- **`lens.js`** — `mountMasterDetail`, `mountListLens`, `mountAggregator`, `renderFabricTable`,
  `renderActivityTimeline`, `appendRichSections`, `breakdownBars`, `attentionList`, `renderHeatmap`.
  These read the fabric and render the standard table / master-detail / aggregator surfaces, including the
  shared rich-detail workspace (comments + activity timeline + reminder).
- **`dom.js`** — `el(tag, attrs, children)`, `clear`, `firstArray` — the tiny DOM builder used everywhere.
- **`render.js`** — `emptyState`, skeleton helpers.
- **`lookups.js`** — `Platform.Lookups`: users / categories / departments option-sets + the category routing
  cascade (`resolveCategory`).
- **`directory.js`** — `Platform.Directory`: DSU_KEY → routing addresses + the assistant prompt parser.
- **`reviewers.js`** — `Platform.Reviewers`: the sequential reviewer engine.
- **`dynamic-actions.js`** — `Platform.Actions`: the Dynamic Global Actions client.
- **`filter-cache.js`** — LRU + debounce for list filtering.
- **`ai.js`** — the assistant's AI-flow client.

---

## 7. Authoring a new component — checklist

1. Extend `PfBaseElement`; render in `onConnect`; use `this.on` / `this.bus` so cleanup is automatic.
2. Tokens only for colour/spacing; no literal hex outside `themes/`.
3. Expose data via JS properties; emit `pf-*` events for the host.
4. Add any new i18n keys to `config/i18n/en.json` (every `this.t(...)` key must resolve there).
5. Register with `customElements.define('pf-…', Class)` and add the import to `shared/components/index.js`.
6. Run `bash tools/verify.sh` (imports, hex-lock, i18n, console-purity, syntax) and `tools/ui-smoke.mjs`.
