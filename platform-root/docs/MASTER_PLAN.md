# OBSIDIAN v4.0 — Master Plan & Blueprint Index

> Single entry point that ties the existing blueprint documents to the **current** status and the
> **path to completion**. It does not duplicate the detailed docs — it indexes them and adds the plan.
> Authoritative operating contract remains `CLAUDE.md`; this plan sits under it.

---

## 0. Do we have a blueprint? — Yes, distributed; this is the index

A comprehensive blueprint already exists across `platform-root/docs/`. It was just not indexed in one
place with live status. Map of what exists and what it answers:

| Concern | Document(s) | Currency |
|---|---|---|
| **Operating contract** (constraints, lexicon, security, 6-phase lifecycle, defect register, wave plan) | `CLAUDE.md` | Authoritative; register section reconciled (see below) |
| **Architecture** (runtime `window.Platform`, base classes, API path, CSS layers, inter-module discipline) | `docs/ARCHITECTURE.md`, `docs/PHASE3_CONSOLIDATION_ARCHITECTURE.md` | Current |
| **Components / Modules / Navigation** | `docs/COMPONENTS.md`, `docs/MODULES.md`, `docs/NAVIGATION.md` | Current |
| **Data fabric & events** | `docs/EVENTS.md`, `entities.config.js`, `core/entity-store.js` (sealed) | Current |
| **Endpoints / Integration / Contracts** | `docs/ENDPOINTS.md`, `docs/INTEGRATION.md`, `docs/contracts/`, `docs/CONTRACT-CONFORMANCE.md` | Current |
| **Personas / Theming / Brand** | `docs/PERSONAS.md`, `docs/THEMING.md`, `docs/BRAND.md` | Current |
| **Deployment / Secrets / Testing** | `docs/DEPLOYMENT.md`, `docs/SECRETS.md`, `docs/TESTING.md` | Current |
| **Workflow/process spec** (6 phases, gates, transitions) | `CLAUDE.md` §3–4 + `core/entity-store.js` STATUS_PHASE / transitionStatus | Implemented |
| **Defect register (92 pts) + live status** | `CLAUDE.md` §8 + `docs/REGISTER_RECONCILIATION.md` | Reconciled 2026-06-11 |
| **SPA consolidation parity** | `docs/SPA_CONSOLIDATION_COVERAGE.md`, `spa-manifests/`, `spa-manifest.schema.json` | In progress (this plan) |
| **Session journal** | `docs/PROJECT_STATUS.md`, `docs/PHASE4_PROGRESS.md` | Append-only history |

**Gap this doc closes:** no single navigable plan + live roadmap. (No new architecture is being invented;
the architecture is settled in the docs above.)

---

## 1. Architecture at a glance (1 page)

- **Zero-build native ESM**, Custom Elements (`PfBaseElement`), CSS `@layer` cascade, **no external deps**.
- **`window.Platform`** namespace is the runtime surface (API, Entities, UI, Router, Nav, Persona, Theme,
  Brand, Bus, Actions, AuditLog, Lookups, …).
- **Single Reference-keyed data fabric** (`core/entity-store.js`) — 7 typed maps, **sealed in a closure**,
  frozen readers, directorate scope filter; the ONLY status mutator is `transitionStatus()` (phase-gated).
- **One fetch site** (`core/api.js`) → `BaseService` endpoint factory → 15 Power Automate flows
  (`config/endpoints.config.js`), idempotency-keyed + request-logged. Endpoint-less actions go through
  **`DYNAMIC_GLOBAL_ACTIONS`** via `Platform.Actions` (preview→confirm→execute→parsed feedback).
- **19 modules** (lenses/aggregators) + ~20 shared components, grouped by the 6 workflow phases in nav.
- **Verification:** `tools/verify.sh` (12 static gates) + `tools/ui-smoke.mjs` (147 real-browser
  assertions: mount, interaction, cross-module handoff, 3-width responsive, theme, dark-contrast, a11y).

## 2. The 6-phase workflow / process model

`INTAKE → ROUTING → ACTION → REVIEW → DISPATCH → ARCHIVE` (+ Cross-Phase, System). Each phase has
surfaces, canonical status tokens, integrity gates, and handoffs — specified in `CLAUDE.md` §3–4 and
enforced by `entity-store.transitionStatus()`. Status lifecycle, authority matrix, and SLA windows are in
`CLAUDE.md` §15.

| Phase | Primary surfaces | Status tokens |
|---|---|---|
| 1 INTAKE | correspondence, registry, `<pf-triage-bar>` | registered → triaged → triage_complete |
| 2 ROUTING | ops-hub, fasttrack, single-item-ops, bulk-assignment | assigning → assigned (assignment-failed) |
| 3 ACTION | orchestrator, response-tracking, comments | acknowledged → in-progress → action-complete |
| 4 REVIEW | approvals, executive | pending-review → approved/returned/escalated |
| 5 DISPATCH | dispatch* (to build) | dispatch-pending → dispatched → closed |
| 6 ARCHIVE | archive* (to build), lookup, diagnostics | archived → cold-archived (immutable) |

\* Dispatch/Archive are the two genuinely-new builds; both **blocked on PA contracts** (Q-4/8/9/10).

---

## 3. Execution plan

Two parallel workstreams, both run **token-efficiently** (heavy reads inside Node/scripts; the model
only ingests compact summaries; subagents used in their own budget when available).

### Workstream A — SPA consolidation parity audit (current focus)

Goal: prove every feature of the 20 legacy SPAs is captured (or log the gap). Method = script-first.

| Step | What | Status | Cost |
|---|---|---|---|
| A1 | Inventory 20 SPAs → schema manifests (`spa-manifests/`) | **Done** (3 verified + 17 auto-draft) + signals dumps | low (node) |
| A2 | **Reconcile** manifests vs platform → `docs/SPA_PARITY_MATRIX.md` marking each offering/view/flow **CAPTURED / PARTIAL / UNCAPTURED** (script cross-refs flows + module coverage) | Next | low (script) |
| A3 | Enrich the 17 auto-draft manifests where the matrix flags a gap — from the small `_signals/` files or subagents (their budget) | After A2 | low–med |
| A4 | Close **UNCAPTURED/PARTIAL** features that are unblocked, with gate + ui-smoke; log blocked ones into `REGISTER_RECONCILIATION.md` | Iterative | med |
| A5 | Re-present the matrix as **VERIFIED** + sign-off | End | low |

Acceptance: a parity matrix where every SPA feature is CAPTURED or has a tracked, dispositioned gap.

### Workstream B — Defect-register remediation (per `REGISTER_RECONCILIATION.md`)

Engine foundations (Wave 1) and most cross-cutting items are **already implemented**; remaining work is:
- **Unblocked, in progress:** ops-hub routing scope (D-1, done), registry quarantine view (C-2),
  response-tracking my/team filter (E-2), pf-rich-picker fuzzy/recent (D-6), Bus middleware (A-13).
- **Blocked on decisions/contracts:** A-8 directorate model (Q-6), K-1 SLA working-hours (Q-5), F-7
  reviewer config (Q-7), D-5 assignment delete (disposition ruling), dispatch/archive/review-panel
  builds (Q-4/8/9/10).

Sequencing: finish A2–A3 (parity matrix) → it will surface the true union of "missing features", which we
merge with the open register items → execute unblocked items in dependency order → checkpoint.

---

## 4. Decision register (what unblocks the most work)

| # | Decision needed | Unblocks |
|---|---|---|
| D-5 | Redirect `assignment` → single/bulk **or** executive? | clean delete + redirect + boot-smoke |
| Q-5 | Working hours for SLA (Mon–Fri 09:00–17:00 WAT?) | K-1 fasttrack SLA fix |
| Q-6 | Directorate model / persona→DSU map (or "single scope now") | A-8 isolation |
| Q-7 | Designated-approver-per-category config (exists or new?) | F-7 reviewer authority |
| Q-4/8/9/10 | PA contracts for REQUEST_OTP, DISPATCH_OUTBOUND, retention | Dispatch + Archive builds |

## 5. Governance & verification (every change)

1. `tools/verify.sh` → 12/12 static gates (imports, console-purity, hex-lock, i18n, boot-smoke, …).
2. `RUN_UI_SMOKE=1` → `tools/ui-smoke.mjs` (currently 147 browser assertions; extend per surface).
3. Journal in `PROJECT_STATUS.md`; update `REGISTER_RECONCILIATION.md` / `SPA_PARITY_MATRIX.md`.
4. Commit + push; **browser-confirmed-by-operator remains the only "delivered" proof** (Rule 11.6/11.8).

## 6. Immediate next action

Run **A2** — the script-driven `SPA_PARITY_MATRIX.md` (low token). It converts the inventory into a
concrete CAPTURED/PARTIAL/UNCAPTURED ledger and becomes the master to-do for the rest of consolidation.
