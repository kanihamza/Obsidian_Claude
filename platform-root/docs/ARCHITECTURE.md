# OBSIDIAN v4.0 — Architecture Guide

OBSIDIAN is the NITDA DGO platform: a single, zero-build, native-ESM web application that consolidates
~20 legacy single-file HTML SPAs into one integrated platform for the Director-General's Office. It manages
document and email correspondence end-to-end through a 6-phase workflow over a single Reference-keyed data
fabric.

> This guide describes the **actual** implementation. The authoritative operating brief is `CLAUDE.md`;
> where the two differ, `CLAUDE.md` wins.

---

## 1. System Overview

- **Zero-build, native ESM.** No bundler, transpiler, or build step. Modules use native `import`/`export`
  and run directly in the browser. The entry point is `index.html` → `core/boot.js`.
- **Custom Elements** for all reusable UI (`<pf-*>`), built on `PfBaseElement` (Shadow DOM + an adopted
  stylesheet so design tokens pierce the shadow boundary).
- **CSS Cascade Layers** (`styles/layers.css`) for deterministic style precedence; design tokens in `themes/`.
- **No external dependencies.** No CDN, no npm runtime deps. Verified by the static gate.
- **Live-direct integration.** All data comes from Power Automate (PA) HTTP flows called directly; there is
  no local seed/demo data and no proxy.
- **Target runtime:** mobile tablet, landscape (Samsung Tab A9 class). Performance-sensitive paths respect
  mobile-browser memory limits.

### Design philosophy
1. **Consolidation over fragmentation** — one platform, many lenses; never isolated feature silos.
2. **One fabric, many lenses** — every module reads/writes the same Reference-keyed store.
3. **End-to-end workflow as the organizing principle** — the 6-phase lifecycle, not feature-by-feature.
4. **Security in the fabric, not the UI** — directorate isolation is enforced in a sealed closure.

---

## 2. The `window.Platform` namespace

`core/platform.js` composes a single global, `window.Platform`, from the core singletons and config. Modules
and components don't import core engine modules for runtime access — they read `globalThis.Platform`.

| Group | Members |
|---|---|
| Config | `Config`, `Endpoints`, `Flags`, `Routes`, `Personas`, `StateSchema`, `BrandConfig` |
| Kernel | `Log`, `Bus`, `Storage`, `State`, `Errors`, `Format`, `A11y`, `I18n`, `Lifecycle` |
| Data | `API`, `BaseService`, `Entities`, `Context`, `Lookups`, `Idempotency`, `AuditLog` |
| UI / Nav | `Modules`, `Router`, `Nav`, `UI`, `Theme`, `Brand`, `Persona`, `goToEntity` |
| Workflow | `Actions` (Dynamic Global Actions), `Directory`, `Reviewers`, `SLA`, `ErrorRouter` |

`Platform.extend(obj)` attaches later singletons. The namespace is the integration contract — if it isn't on
`Platform`, a module shouldn't reach for it.

---

## 3. Directory structure

```
platform-root/
├── index.html              App shell; loads core/boot.js (module script)
├── core/                   Engine (30 files)
│   ├── boot.js             Boot sequence + service-worker registration
│   ├── platform.js         Composes window.Platform; installs global shortcuts
│   ├── api.js              THE ONLY module that calls fetch()
│   ├── base-service.js     Endpoint factory over api.js
│   ├── base-module.js      BaseModule — module lifecycle base class
│   ├── modules-registry.js Module registration + audience-filtered nav groups
│   ├── entity-store.js     THE FABRIC — sealed Reference-keyed typed store
│   ├── context.js          Active reference, bulk selection, phase handoff, sealed directorate scope
│   ├── persona-controller.js  Persona + profile + directorate read-gate (canSeeRecord)
│   ├── router.js           Functional hash router (registry-derived routes + redirects)
│   ├── nav-controller.js   Audience-filtered nav model
│   ├── ui.js               Modal / confirm / toast helpers
│   ├── i18n.js             I18n with fallback chain
│   ├── bus.js              Bus — pub/sub event bus
│   ├── state.js            State — observable key-path store
│   ├── idempotency.js      Idempotency keys + bounded request log
│   ├── audit-log.js        Ref-indexed audit ring buffer (audit:* events)
│   ├── error-router.js     Canonical error-kind taxonomy → UX
│   ├── sla.js              SLA — WAT working-time SLA engine
│   ├── log.js              THE ONLY module that calls console.*
│   └── …                   a11y, charts, format, errors, lifecycle, storage,
│                           theme-manager, brand-manager, notification-email
├── config/                 Declarative configuration
│   ├── endpoints.config.js  PA HTTP-flow registry (SAS-signed URLs — SENSITIVE)
│   ├── entities.config.js   Entity types, relationships, reviewer schema
│   ├── personas.config.js   Personas + directorateScope
│   ├── directorate.config.js  Isolation policy + elevation taxonomy (Q-6)
│   ├── holidays.config.js   NITDA holiday calendar for SLA working-time
│   ├── dynamic-actions.config.js  Endpoint-less action contracts
│   ├── nav.config.js · routes.config.js · feature-flags.config.js · app.config.js · brand.config.js
│   ├── state.schema.js
│   └── i18n/{en,fr,ha}.json  en.json is canonical
├── shared/
│   ├── components/         <pf-*> Custom Elements (+ _base.js, index.js)
│   └── utils/              lens · dom · lookups · dynamic-actions · directory · reviewers · ai · render · filter-cache
├── modules/               19 application modules (+ index.js manifest)
├── themes/                Design tokens + theme variants (hex literals allowed here)
├── styles/                reset · primitives · shell · components · utilities · layers
├── docs/                  This guide, COMPONENTS.md, TESTING.md, contracts/, status & parity docs
└── tools/                 verify.sh · boot-smoke.mjs · ui-smoke.mjs
```

---

## 4. The data fabric (`core/entity-store.js`)

`Platform.Entities` is a **sealed lexical closure** (an IIFE). `_store`, `_byRef`, `_archive`, `_quarantine`,
and `_dedup` are module-private `const`s that are never exported or attached to `globalThis`. Only a gated
public facade escapes the closure.

- **Seven typed maps**, indexed by Reference (the spine join key): `reference`, `document`, `task`, `email`,
  `approval`, `comment`, `activity`.
- **Hydrated once** from the `FETCH_ALL` flow; field/collection aliases are normalized on ingest.
- **Frozen readers** — `all(type)`, `get(type,id)`, `byReference(ref)`, `counts()` return
  `Object.freeze(structuredClone(...))`, so UI mutation can never reflect back into the fabric.
- **Directorate derivation** — each record gets `__directorate`, derived hierarchically (AssignedToDSU →
  RoutedToDSU → CoAssigneeDSU → Category default → legacy fallbacks). Underivable ⇒ `null` (visible only at
  the unscoped tier, not quarantined).
- **`transitionStatus(ref, from, to, by)`** — the SOLE status mutator. It validates the canonical state
  machine, checks persona authority, enforces the four integrity contracts, audits, and relays the
  transition through the Dynamic Global Actions flow.
- **`canClose(ref)`** — Closure-Gate evaluator (all tasks terminal, approvals resolved, dispatches resolved).
- **`archive(ref)`** — atomic, deep-frozen, append-only bundle snapshot.
- **`quarantine()`** — orphan records, admin persona only.

### Multi-directorate isolation
Isolation is enforced in the fabric, not the UI. Every reader runs records through `visible()`, which calls
`Persona.canSeeRecord(rec)` and the sealed `Context.directorate()` scope. Records in an **isolated**
directorate (`config/directorate.config.js` — CS/AIC/FMC/ITPCU) are invisible unless the viewer is elevated
(CEO/EAA, or the executive/admin persona tier), the record carries a global cross-directorate flag, or the
viewer belongs to that directorate. (See `CLAUDE.md` §5 for the five defensive layers.)

---

## 5. The 6-phase correspondence lifecycle

```
INTAKE      registered → triaged → triage_complete
ROUTING     triage_complete → assigning → assigned (| assignment-failed)
ACTION      assigned → acknowledged → in-progress → action-complete (| reassign-requested)
REVIEW      action-complete → pending-review → approved | approved-with-edit | returned | escalated
DISPATCH    approved → dispatch-pending → dispatch-in-flight → dispatched | dispatch-failed | no-dispatch
            → (canClose) → closed | partial-dispatch
ARCHIVE     closed → archived → cold-archived  (immutable; reopen creates a new derived ref)
```

These tokens are the only allowed status values; module code never invents tokens and never writes status
directly — it calls `Entities.transitionStatus`, which gates every move. Nav groups mirror the phases
(`INTAKE / ROUTING / ACTION / REVIEW / DISPATCH / ARCHIVE` + `CrossPhase` + `System`).

---

## 6. Module system (`core/base-module.js`)

A module is a `BaseModule` subclass registered via `Modules.register`. It declares static metadata and
implements lifecycle hooks:

```js
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';

class DispatchModule extends BaseModule {
  static id = 'dispatch';
  static label = 'module.dispatch.title';      // i18n key
  static icon = 'send';
  static nav = { group: 'DISPATCH', order: 1 };
  static audience = 'executive';               // gates visibility via Persona.canSee
  static status = 'active';
  static base = new URL('.', import.meta.url);  // for default view.html / styles.css fetch

  async onVisible(root, params) { /* read fabric, render, wire events */ }
}
Modules.register(DispatchModule);
```

- `onMount` (default) fetches `view.html` and injects `styles.css` once; `onVisible` does the data work.
- `this.call(serviceFn, payload)` invokes a `BaseService` endpoint with module-scoped error toasting.
- `this.bus(event, handler)`, `this.on(el, evt, handler)`, `this.interval/timeout` are auto-cleaned on hide.
- `this.t(key, vars)` resolves i18n.
- Modules are **lenses** or **aggregators** over the fabric (`config/entities.config.js#MODULE_ROLES`); they
  never re-fetch per row and never touch `_store`/`_byRef`.

The 19 modules: `home`, `ops-hub`, `fasttrack`, `orchestrator`, `registry`, `correspondence`,
`response-tracking`, `comments`, `approvals`, `executive`, `stats`, `reports`, `single-item-ops`,
`bulk-assignment`, `dispatch`, `assistant`, `diagnostics`, `lookup`, `settings`.

---

## 7. Routing (`core/router.js`)

A **functional** hash router. Routes are derived from the module registry — `#/<moduleId>[/<param>]` — there
is no separate route table to maintain.

- `Router.init(outletEl)` wires `hashchange` and renders the default route.
- `Router.navigate(id, param)` sets the hash; `Router.current()` returns `{ id, instance }`.
- Each transition: resolve module → audience gate (`Persona.canSee`) → tear down previous → mount next
  (`onMount`/`onVisible`) → emit `platform:nav:changed` + `platform:route:changed` → announce to a11y.
- **Deprecation redirects** — `RoutesConfig.redirects` maps a retired route to its successor, intercepted
  before module resolution (e.g. `#/assignment/*` → `#/executive`, the D-5 deprecation).
- Unknown routes fall back to the not-found route; audience-denied routes redirect home.

---

## 8. Event-driven communication (`core/bus.js`)

`Platform.Bus` is a lightweight pub/sub (`Bus.on / once / emit`). Conventions:

- `platform:*` — shell / router / nav / persona / theme lifecycle.
- `entity:*` — fabric mutations (`entity:bootstrapped`, `entity:<type>:changed`, `entity:reference:updated`).
- `context:*` — active reference / handoff / directorate-scope changes.
- `audit:*` — audit-thread events (ref-indexed by `core/audit-log.js`): `audit:phase-transition`,
  `audit:dispatched`, `audit:archived`, `audit:unauthorized-access-attempt`, `audit:route-redirected`, …

`core/audit-log.js` indexes every `audit:*` event by reference, so the audit thread is queryable per ref.

---

## 9. Workflow services

- **Dynamic Global Actions (`Platform.Actions`)** — the universal channel for any action without a dedicated
  PA flow. It builds the v2.0.0 envelope (`action / operation / mode / source / userEmail / requestId /
  timestamp / client / payload`) and dispatches through the `DYNAMIC_GLOBAL_ACTIONS` flow. Contracts live in
  `config/dynamic-actions.config.js` (`transition`, `addComment`, `acknowledge`, `route`, `dispatchEmail`,
  `prepareMeetingPack`, `setReminder`, `dispatch`, …). Lifecycle: **preview + confirm → execute → parsed
  feedback** (`Actions.run`); `Actions.emit` is the fire-and-forget variant used by fabric transitions.
  Full request/response shapes: `docs/contracts/dynamic-actions.contract.md`.
- **Directory (`Platform.Directory`)** — resolves a `DSU_KEY` to its live routing addresses
  (`DSU_Email` / `DSU_HeadEmail`) from `Lookups.departments()` (the Reference_Data flow). Powers Phase-5
  recipient resolution and the assistant's shorthand routing parser. Keys are derived authoritatively from
  the endpoint, never hard-coded.
- **Reviewers (`Platform.Reviewers`)** — the sequential reviewer engine. Reviewers are an ordered array of
  signature blocks `{ sequence, userId, role, targetEmail, status }`; the active approval token advances to
  `N+1` only once `N` records a verified approval (a reject/return breaks the chain).
- **SLA (`Platform.SLA`)** — working-time SLA, fully decoupled from rendering. Elapsed time is counted in WAT
  working minutes (Mon–Fri 08:00–16:00) excluding national holidays (`config/holidays.config.js`). Budgets:
  P1 = 2h, P2 = 6h, P3 = 24h, P4 = 72h (working hours).

---

## 10. Data access & endpoints

- `core/api.js` is the **only** module that calls `fetch()`. Everything goes through `BaseService`
  endpoints created from `config/endpoints.config.js`.
- Each endpoint carries `url` (full SAS-signed PA URL), `method`, `flowName`, `defaults`, `expectedKeys`.
- Writes attach an idempotency key (bounded request log in `core/idempotency.js`).
- Response envelope: `{ ok, kind, status, data, body, errors, durationMs, correlationId }`.
  `core/error-router.js` maps machine-readable error kinds to UX.
- Key flows include `FETCH_ALL` (fabric hydration), `REFERENCE_DATA` (users/categories/departments lookups),
  `SINGLE_ASSIGNMENT` / `BULK_ASSIGNMENT`, `EMAIL_RELATED_TASK`, `SUBSIDIARY_ACTIONS`, `AI_*`, `OTP_*`, and
  `DYNAMIC_GLOBAL_ACTIONS`.

---

## 11. State, i18n, theming

- **State** (`Platform.State`) — observable key-path store persisted via `Storage`; the schema is
  `config/state.schema.js`. `Context` holds active reference, bulk selection, phase handoff, and the sealed
  directorate scope.
- **I18n** (`Platform.I18n`) — `t(key, vars)` with an en → locale fallback chain; `en.json` is canonical.
  Every runtime key must resolve in `en.json` (gate-enforced).
- **Theming** — `themes/tokens.css` plus light / dark / high-contrast variants; the only place literal hex
  colours are permitted. Everywhere else uses `var(--token)`.

---

## 12. Accessibility & performance

- `core/a11y.js` announces route changes; components manage focus and ARIA. `<pf-toast>` uses appropriate
  `aria-live`; modals trap focus.
- Mobile-first: dedup / matrix work runs on raw memory indexes (not the DOM); detail / timeline DOM is
  flattened to avoid layout thrash on tablet hardware.
- Zero-build means no compile step and HTTP/2-friendly granular caching; the service worker (`sw.js`) caches
  the shell.

---

## 13. Security posture

- No external dependencies, no CDN, no inline secrets outside `config/endpoints.config.js`.
- Directorate isolation is enforced in the sealed fabric closure (the UI cannot bypass it).
- **Scope limitation:** this protects the UI layer. It does not defend against an attacker with valid
  credentials calling PA flows directly — that is the PA flow's own auth responsibility.

---

## 14. Deployment

OBSIDIAN is a static bundle. Deploy `platform-root/` to any static host (the hash router needs no server
rewrites). `core/boot.js` registers the service worker. Rotate a flow's SAS by replacing its `sig` in
`config/endpoints.config.js`. Always run the verification harness (see `TESTING.md`) before shipping — a
green static gate plus `ui-smoke` is the bar; a user browser walkthrough is the final proof of "delivered."
