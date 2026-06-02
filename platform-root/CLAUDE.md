# OBSIDIAN v4.0 — Project Handoff to Claude Code (`CLAUDE.md`)

> **Read this entire document before performing any action in this codebase.**
> This file is the authoritative operating brief. It supersedes session memory, transcript reconstruction, and any inference from file contents alone. If a directive here conflicts with anything you find in the code or docs, this document wins.

**Status as of handoff:** Phase 2 (Gap Audit) is **complete and signed off**. Phase 3 (Consolidation Architecture) is **pending user authorization**. **No platform execution code may be written until Phase 3 is signed off and Phase 4 is explicitly authorized.**

**Checkpoint:** `OBSIDIAN_v4_platform-root_checkpoint_20260601a_ship.zip` (198 files · 12/12 static gates green · 19 modules registered).
**Working tree:** `/home/claude/obsidian/platform-root/`
**Deliverables go to:** `/mnt/user-data/outputs/`

---

## Table of Contents

1. [Project Objective](#1-project-objective)
2. [Locked Baseline Parameters](#2-locked-baseline-parameters)
3. [Operational Lexicon](#3-operational-lexicon)
4. [The 6-Phase Unified Correspondence Lifecycle](#4-the-6-phase-unified-correspondence-lifecycle)
5. [Security & Multi-Directorate Architecture](#5-security--multi-directorate-architecture)
6. [Codebase Map](#6-codebase-map)
7. [Gate Decisions (Phases 0, 1, 2)](#7-gate-decisions)
8. [Phase 2 Defect Register — 92 Points](#8-phase-2-defect-register)
9. [Modules Pending Deep Audit — 9 Items](#9-modules-pending-deep-audit)
10. [Phase 4 Execution Sequencing](#10-phase-4-execution-sequencing)
11. [Strict Output Rules](#11-strict-output-rules)
12. [How to Work in This Codebase](#12-how-to-work-in-this-codebase)
13. [Verification Harness](#13-verification-harness)
14. [Open Questions Pending User Direction](#14-open-questions-pending-user-direction)

---

## 1. Project Objective

Deliver a single, well-designed, intelligent, and fully integrated end-to-end platform that enables the **Director-General (DG)** and the **DG's Office** to manage **document correspondence, email correspondence, and all related operations** completely and seamlessly. The platform must be coherent, logic-driven, effective, efficient, and scalable. While the immediate focus is the DG's Office, its architecture must be built to extend into an **enterprise-wide solution scoped to multi-directorate expansion within the agency** (NOT external multi-tenant SaaS).

### Core Ask
Consolidate the fragmented SPAs and all their existing features into one robust, smart, modern, integrated platform — **without losing any capability already developed**. The platform must provide end-to-end visibility and control, support complex task relationships and dependencies, and enforce timelines, SLAs, and accountability through a single, intuitive interface.

### Direction
- **Consolidation over fragmentation** — no further isolated feature development.
- **End-to-end workflow as the organizing principle**, not feature-by-feature expansion.
- **Full preservation of existing capability** during integration.
- **Enterprise scalability designed in from the start**, not deferred.

### Target Runtime
Mobile tablet, landscape orientation. All performance-sensitive code paths must respect mobile-browser memory constraints.

---

## 2. Locked Baseline Parameters

These are **non-negotiable architectural constraints**. They were set in the original brief and reaffirmed in the rebrief. Any code you write must conform.

### 2.1. Build Architecture
- **Zero-build ESM.** No bundler, no transpiler, no build step. Modules use native `import` / `export`.
- **Custom Elements** for UI. Base classes: `PfBaseElement` (in `shared/components/_base.js`), `BaseModule` (in `core/base-module.js`), `BaseService` (in `core/base-service.js`).
- **CSS Cascade Layers** for style isolation. Layer order defined in `styles/layers.css`.
- **No external dependencies.** No npm install, no CDN, no script tag pointing outside the bundle.

### 2.2. Build-Lock Hygiene (Enforced by `tools/verify.sh`)
- **No CDN, no external script, no external font references.** Anywhere. Ever.
- **Absolute console purity** — only `core/log.js` may invoke `console.*`. Every other module logs through `Log.info` / `Log.warn` / `Log.error`.
- **Clean ESM import graph** — no circular imports, no unresolved imports. Verified by `imports` check.
- **Token-only style.** Literal hex colours are allowed ONLY in `themes/*.css` and `assets/subbrands/dgo/*`. Everywhere else, use `var(--token-name)`. Verified by `hex-lock` check.
- **All endpoint URLs embedded directly** in `config/endpoints.config.js`. No runtime signature injection. No proxy. No intermediary.
- **i18n keys validated** — every `I18n.t('foo.bar')` reference in code must resolve to a key in `config/i18n/en.json`. Verified by `i18n-runtime-keys` check.
- **JSON validity** — all JSON config files must parse cleanly. Verified by `json-valid` check.
- **JS syntax** — every `.js` file must pass `node --check`. Verified by `js-syntax` check.
- **No placeholder strings** in any module — no `lorem ipsum`, no `TODO: rest of`, no `sample`/`seed`/`demo` data anywhere.
- **No embedded URLs** outside `config/endpoints.config.js`. Verified by `embedded-url-scan`.
- **Module boot smoke** — every module must register cleanly. Verified by `tools/boot-smoke.mjs`.

### 2.3. Data Architecture
- **Single Reference-keyed data fabric** in `core/entity-store.js`. Seven typed maps: `reference`, `document`, `task`, `email`, `comment`, `approval`, `activity`.
- **All API access through `core/api.js`** — the SOLE module permitted to call `fetch()`. Services go through `BaseService`. Modules never call `fetch()` directly.
- **14 active Power Automate endpoints** in `config/endpoints.config.js` with full SAS-signed URLs. Treat this file as highly sensitive — do not commit to public repos.
- **Live-direct integration** — no local seed data, no placeholders, no proxies. All data comes from PA flows.
- **Idempotency keys** on every write (60s bucket by default; per-action override allowed).
- **Request log** — every API call logged via `core/idempotency.js`, persisted to localStorage `obsidian.requestLog.v1`.

### 2.4. Forbidden Practices
- **Do not** introduce any new external dependency, even via `unpkg` or `jsdelivr`.
- **Do not** add `console.log` outside `core/log.js`.
- **Do not** invent fictional PA endpoint URLs. If a workflow needs an endpoint that doesn't exist, **flag it for user approval before proceeding**.
- **Do not** add seed data, demo data, sample data, or placeholder records to any module.
- **Do not** filter directorate data only at the UI read layer. Use the sealed fabric closure (Section 5).
- **Do not** verify OTPs client-side. Use the PA handshake (Section 8 item B-1).
- **Do not** claim a module is "done" or "verified" based on static gates alone. Browser verification by the user is the only proof of "delivered."
- **Do not** truncate, omit, or use placeholder language in any deliverable (Section 11).

---

## 3. Operational Lexicon

### 3.1. Phase Names
The platform operates on a **6-Phase Unified Correspondence Lifecycle**:

1. **Ingestion & Triage** (`Phase 1` / `INTAKE`)
2. **Routing & Assignment** (`Phase 2` / `ROUTING`)
3. **Action & Collaboration** (`Phase 3` / `ACTION`)
4. **Review & Approval** (`Phase 4` / `REVIEW`)
5. **Dispatch & Closure** (`Phase 5` / `DISPATCH`)
6. **Audit & Archive** (`Phase 6` / `ARCHIVE`)

Plus two cross-cutting layers: `CROSS-PHASE` (utilities) and `SYSTEM` (settings, diagnostics).

### 3.2. Canonical Status Vocabulary
The following tokens are the **only** allowed status values for records. Module code must use them verbatim. The status state machine is gated by `Entities.transitionStatus()` (to be implemented in Phase 4).

```
Phase 1 (INTAKE):       registered          (was: ingested)
                        triaged
                        triage_complete     (was: routing-ready)

Phase 2 (ROUTING):      assigning           (in-flight)
                        assigned
                        assignment-failed   (rollback state)

Phase 3 (ACTION):       acknowledged
                        in-progress
                        action-complete
                        reassign-requested

Phase 4 (REVIEW):       pending-review
                        approved
                        approved-with-edit
                        returned
                        escalated

Phase 5 (DISPATCH):     dispatch-pending
                        dispatch-in-flight
                        dispatched
                        dispatch-failed
                        no-dispatch
                        closed
                        partial-dispatch

Phase 6 (ARCHIVE):      archived
                        cold-archived
                        (immutable from this point)
```

**Renames mandated by Phase 1 Gate B sign-off** (compared to draft spec):
- `ingested` → `registered`
- `routing-ready` → `triage_complete`

### 3.3. SLA Windows
SLAs are measured in **Working Hours (WH)**, not raw chronological time. Working hours: Monday–Friday, 09:00–17:00 NITDA local time (verify exact bounds with user before implementation). Weekend and after-hours periods do NOT count toward SLA elapsed time.

| Priority | SLA Window |
|----------|-----------|
| **P1** (DG Attention / Immediate) | **2 Working Hours (strict)** |
| **P2** (High Priority) | **6 Working Hours** |
| **P3** (Routine) | **24 Working Hours** |
| **P4** (Deferred / Informational) | **72 Working Hours** |

### 3.4. Role / Persona Terms
- **DG** — Director-General. Highest authority. Sees all directorates. Can close, escalate-final, archive.
- **DG's Office** — DG support staff. Same scope as DG for most operations.
- **Directorate Officer** — Scoped to own directorate (`directorateScope: [<dsuId>]`).
- **Reviewer / Approver** — Designated by category config OR original assigner OR DG.
- **Admin** — System-level access. Sees `_quarantine`. Can override endpoint URLs.
- **Audit** — Read-only access to archive and audit log across all directorates.

### 3.5. Workflow Action Verbs
Use these verbs consistently in UI, audit events, and code identifiers:

```
register · triage · route · assign · acknowledge · update · comment ·
complete · review · approve · return · escalate · dispatch · close · archive · reopen
```

### 3.6. Architectural Terms
- **Fabric** — the in-memory typed-record store (`_store`) plus its reference indexes (`_byRef`).
- **Reference / Ref** — the spine ID that ties documents, emails, tasks, comments, approvals, and activities together. Accessed as `record.__ref`.
- **Bundle** — the full set of records attached to a single reference, returned by `Entities.byReference(ref)`.
- **Lens** — a module that reads the fabric and renders a view. Lenses never write to `_store` or `_byRef` directly; they use writers like `Entities.upsert()` and `Entities.transitionStatus()`.
- **Surface** — a user-facing screen tied to a workflow phase.
- **Handoff** — the explicit data transfer between phases via `Context.handoff`.
- **Audit Thread** — the complete chronological event history for a single reference.
- **Quarantine** — the `_quarantine` map holding orphan records (refs missing, directorate underivable, etc.). Visible only to admin persona.

---

## 4. The 6-Phase Unified Correspondence Lifecycle

For each phase, the surfaces, state transitions, integrity gates, and downstream handshakes are fully specified in the Phase 1 Workflow Specification (signed off Gate A through Gate F). The canonical reference is the conversation transcript at `/mnt/transcripts/`. The summary below is sufficient for day-to-day Claude Code work; for ambiguous cases, consult the transcript.

### 4.1. Phase 1 — Ingestion & Triage
- **Triggers:** PA flow delivers new email/document; manual draft from phone call / hand-delivery.
- **Surfaces:** `modules/correspondence/`, `modules/registry/`, new `<pf-triage-bar>` (to build).
- **Key transitions:** arrival → `registered` → `triaged` → `triage_complete`.
- **Gates:** reference exists; directorate derivable; deduplication check (rolling 30-day hash); required metadata complete.
- **Handoff:** writes to `Context.handoff = {fromPhase:1, toPhase:2, refs, triageMeta}`, navigates to routing surface.

### 4.2. Phase 2 — Routing & Assignment
- **Triggers:** advance from Phase 1; manual selection from `ops-hub`; bulk selection.
- **Surfaces:** `modules/ops-hub/`, `modules/fasttrack/`, `modules/single-item-ops/`, `modules/bulk-assignment/`.
- **Key transitions:** `triage_complete` → `assigning` → `assigned` (or `assignment-failed` on rollback).
- **Gates:** required fields populated; directorate consistency (cross-directorate needs DG approval); bulk OTP via PA handshake for batches >5; idempotency key; no orphan tasks.
- **Handoff:** task upsert into `_byRef.task[ref]`; `audit:phase-transition {from:2, to:3}` fires; `Context.lastAction` set.

### 4.3. Phase 3 — Action & Collaboration
- **Triggers:** task creation from Phase 2; officer opens queue; officer drills into task.
- **Surfaces:** `modules/orchestrator/`, `modules/response-tracking/`, `modules/comments/`, `<pf-comment-thread>`, activity timeline.
- **Key transitions:** `assigned` → `acknowledged` → `in-progress` → `action-complete` (or `reassign-requested`).
- **Gates:** acknowledgement SLA; sub-task linkage to parent ref; cross-reference fork creates new ref with `linkedRefs`; completion requires response text/attachment; comment immutability after closure.
- **Handoff:** approval-request upsert into `_byRef.approval[ref]`; transition to Phase 4.

### 4.4. Phase 4 — Review & Approval
- **Triggers:** task reaches `action-complete`; officer escalates draft; DG flags for personal attention.
- **Surfaces:** `modules/approvals/`, new `<pf-review-panel>`, `modules/executive/` (DG view).
- **Key transitions:** `pending-review` → `approved` | `approved-with-edit` | `returned` | `escalated`.
- **Gates:** reviewer authority check; return-reason required; edit-diff preserved (original + edited both kept); single-approval-at-a-time per task; DG escalation is terminal.
- **Handoff:** on approval, dispatch-request upsert into `_store.activity` (kind: `dispatch-request`); transition to Phase 5. On return, task reverts to `in-progress` with banner.

### 4.5. Phase 5 — Dispatch & Closure
- **Triggers:** approval reaches `approved`; DG's Office direct-closes; external system confirms delivery.
- **Surfaces:** new `modules/dispatch/`, new `<pf-dispatch-panel>`.
- **Key transitions:** `dispatch-pending` → `dispatch-in-flight` → `dispatched` | `dispatch-failed` | `no-dispatch`. After dispatch, closure check (`Entities.canClose(ref)`) → `closed` or `partial-dispatch`.
- **Gates:** approval required before dispatch; closure prerequisites (all tasks terminal, all approvals closed, all dispatches resolved); dispatch idempotency; no-dispatch reason required; closure authority (original assigner, DG, DG's Office only).
- **Handoff:** reference status → `closed`; frozen snapshot written to `_store.archive[ref]`; transition to Phase 6; reference removed from active queues.

### 4.6. Phase 6 — Audit & Archive
- **Triggers:** Phase 5 closure; retention policy job; audit query.
- **Surfaces:** new `modules/archive/`, new `<pf-archive-thread>`, existing `modules/diagnostics/` audit log viewer, `modules/lookup/` extended scope.
- **Key transitions:** `closed` → `archived` → (eventually) `cold-archived`. Append-only — no further state transitions on the archived bundle itself.
- **Gates:** immutability (`Object.freeze`'d at write); atomic archive (all-or-nothing bundle write); audit thread completeness (all `audit:*` events for ref included); access authority by persona; retention enforcement.
- **Reopen flow:** creates NEW reference with `derivedFrom: <archivedRef>`. Old archive remains immutable. Requires DG approval.

---

## 5. Security & Multi-Directorate Architecture

### 5.1. The Corrected Architecture (Mandated)

Multi-directorate data isolation **cannot** be enforced solely at the UI read layer. The full payload from PA flows contains all-directorate data (this is a fact of the live-direct architecture). Therefore, isolation is enforced by a **sealed lexical closure** around the fabric:

```javascript
// core/entity-store.js
(function () {
  // PRIVATE — module-scope, never exported, never assigned to globalThis.
  const _store     = { reference: new Map(), document: new Map(), /* … */ };
  const _byRef     = { reference: new Map(), document: new Map(), /* … */ };
  const _archive   = new Map();
  const _quarantine = new Map();
  const _dedupIndex = new Map();
  let   _raw       = null;          // last Fetch_All envelope

  // PUBLIC — only readers and gated writers escape the closure.
  function _applyScope(records) {
    const scope = Context.directorate();          // sealed; never UI-settable
    const persona = Persona.current();
    return records
      .filter((r) => Persona.canSee(r, persona, scope))
      .filter((r) => scope === 'all' || r.__directorate === scope);
  }

  function _frozenCopy(value) {
    return Object.freeze(structuredClone(value));
  }

  Entities.byReference = function (ref) {
    const bundle = { /* assemble from _byRef[type].get(ref) */ };
    return _frozenCopy(_applyScope(bundle));
  };

  // … other readers similarly defensive
  // writers gated by Entities.transitionStatus / .upsert / .archive
})();
```

### 5.2. Five Defensive Layers

| Layer | Implementation | Defends Against |
|-------|----------------|-----------------|
| **Fabric enclosure** | `_store` and `_byRef` are module-scope `const`s inside an IIFE. Never exported. Never on `globalThis`. | Console pokers, accidental global leaks, shared-screen exposure. |
| **Read filter** | Every public getter applies `(directorate ∩ persona-scope)` filter before return. | Modules reading data they shouldn't see. |
| **Defensive copy** | Every return is `Object.freeze(structuredClone(...))`. | UI-side mutation reflecting back into the fabric. |
| **Persona scope** | `personas.config.js` extended: each persona declares `directorateScope: ['all' \| <dsuId>[]]`. | Persona-bypass attempts. |
| **Context seal** | `Context.directorate()` is read-only from UI. Setter is internal-only, called only by authenticated persona switch. | UI-driven directorate spoof. |

### 5.3. Explicit Scope Limitation

This protects the **UI layer**. It does NOT protect against an attacker with valid credentials who calls PA flows directly via `curl` / `fetch` from outside the platform. That class of threat must be addressed in **the PA flow's own auth design** — outside this platform's scope. Document this in any user-facing security posture statement.

### 5.4. Audit-Trail of Unauthorized Attempts
Every blocked read fires `audit:unauthorized-access-attempt` with `{persona, attemptedRef, requiredDirectorate, ts}`. The audit log viewer surfaces these for compliance review.

---

## 6. Codebase Map

### 6.1. Tree Structure (198 files at handoff)

```
/home/claude/obsidian/platform-root/
├── core/                    27 files — engine
│   ├── a11y.js
│   ├── api.js               THE ONLY module that calls fetch()
│   ├── audit-log.js         Bus monkey-patch for audit:* events
│   ├── base-module.js       BaseModule class
│   ├── base-service.js      BaseService class — endpoint factory
│   ├── boot.js              Boot sequence; SW registration
│   ├── brand-manager.js
│   ├── bus.js               Event bus
│   ├── charts.js            Charts.bars / .sparkline / .heatmap
│   ├── context.js           Active reference, bulk selection, handoff
│   ├── entity-store.js      THE FABRIC — Reference-keyed typed maps
│   ├── errors.js
│   ├── format.js
│   ├── i18n.js              Fallback chain + RTL detection
│   ├── idempotency.js       Keys + bounded request log
│   ├── lifecycle.js
│   ├── log.js               THE ONLY module that calls console.*
│   ├── modules-registry.js
│   ├── nav-controller.js
│   ├── notification-email.js  buildNotificationEmail()
│   ├── persona-controller.js  Persona + profile
│   ├── platform.js          Platform namespace; global shortcuts
│   ├── router.js
│   ├── state.js
│   ├── storage.js
│   ├── theme-manager.js
│   └── ui.js                UI helpers: openComments / openFlagDocument / etc.
│
├── shared/
│   ├── components/          19 Custom Elements
│   │   ├── _base.js         PfBaseElement
│   │   ├── index.js
│   │   ├── pf-app-footer.js
│   │   ├── pf-app-header.js
│   │   ├── pf-app-nav.js
│   │   ├── pf-app-shell.js
│   │   ├── pf-attachment.js          Inline preview (image/PDF/text)
│   │   ├── pf-breadcrumb.js
│   │   ├── pf-comment-thread.js      Reply/edit/delete, threaded
│   │   ├── pf-connectivity-banner.js 3-band (loading/warning/error)
│   │   ├── pf-deprecation-banner.js
│   │   ├── pf-filter-bar.js
│   │   ├── pf-icon.js
│   │   ├── pf-modal.js
│   │   ├── pf-otp-modal.js           CLIENT-SIDE — must be rebuilt (B-1)
│   │   ├── pf-persona-switcher.js
│   │   ├── pf-rich-picker.js         273 lines — search + tabs + select
│   │   ├── pf-sandboxed-iframe.js    XSS-hardened; cidMap support
│   │   ├── pf-side-panel.js          [content-unverified]
│   │   ├── pf-skip-link.js
│   │   └── pf-toast.js
│   └── utils/               6 utilities
│       ├── ai.js
│       ├── dom.js
│       ├── filter-cache.js  LRU-16 cache + debounce
│       ├── lens.js          renderRichDetail / renderFabricTable / renderHeatmap / renderActivityTimeline / mountListLens / etc.
│       ├── lookups.js
│       └── render.js
│
├── modules/                 19 application modules (+1 marked for deletion)
│   ├── index.js             Module manifest — registers all modules
│   ├── approvals/           [content-unverified]
│   ├── assignment/          MARKED FOR DELETION (per Phase 0 Decision 1)
│   ├── assistant/           [content-unverified] AI surface
│   ├── bulk-assignment/     455 lines · OTP gate (must rebuild B-1)
│   ├── comments/            Hidden from nav; reachable via deep-link
│   ├── correspondence/      Phase 1 — Email intake
│   ├── diagnostics/         System — telemetry, audit, last response
│   ├── executive/           [content-unverified] DG view
│   ├── fasttrack/           [content-unverified] Phase 2 accelerator
│   ├── home/                Dashboard — KPIs, attention, heatmap (regex-integrated; verify)
│   ├── lookup/              Cross-source search + advanced filters
│   ├── ops-hub/             Phase 2 — master-detail with bulk select
│   ├── orchestrator/        [content-unverified] Phase 3
│   ├── registry/            Phase 1 — Document register
│   ├── reports/             [content-unverified]
│   ├── response-tracking/   Phase 3/4 — 5-tab master-detail
│   ├── settings/            System — endpoint overrides + language
│   ├── single-item-ops/     450 lines — Phase 2 single assignment
│   └── stats/               [content-unverified]
│
├── config/                  12 files
│   ├── app.config.js
│   ├── brand.config.js
│   ├── endpoints.config.js  14 PA URLs — TREAT AS SENSITIVE
│   ├── entities.config.js
│   ├── feature-flags.config.js
│   ├── i18n/
│   │   ├── en.json          340+ keys (canonical)
│   │   ├── fr.json          ~157 keys (selective)
│   │   └── ha.json          ~40 keys (selective)
│   ├── nav.config.js        TO REWRITE for 6 workflow groups
│   ├── personas.config.js   TO EXTEND with directorateScope
│   ├── routes.config.js
│   └── state.schema.js
│
├── themes/                  5 files — DGO Design System v2.0
│   ├── tokens.css           Hex literals allowed here ONLY
│   ├── theme.light.css
│   ├── theme.dark.css
│   ├── theme.high-contrast.css
│   └── subbrand.dgo.css
│
├── styles/                  6 files
│   ├── reset.css
│   ├── primitives.css
│   ├── shell.css
│   ├── components.css
│   ├── utilities.css
│   └── layers.css           Cascade layer order
│
├── tools/                   2 files
│   ├── verify.sh            12-check static gate
│   └── boot-smoke.mjs       Module-registration smoke test
│
├── docs/                    24 files
│   └── PROJECT_STATUS.md    Historical session journal (pre-rebrief)
│
├── assets/
│   └── subbrands/dgo/       v2.0 logos (hex allowed here)
│
└── sw.js                    Service worker for offline shell cache
```

### 6.2. Key File Reference

| Need to… | Look at… |
|----------|----------|
| Make an API call | `core/base-service.js` — never call `fetch` directly |
| Add an endpoint | `config/endpoints.config.js` — coordinate URL with user |
| Read/write fabric | `core/entity-store.js` — through public getters only |
| Read active ref / handoff | `core/context.js` |
| Log something | `core/log.js` — never `console.*` outside this file |
| Translate text | `core/i18n.js` + `config/i18n/en.json` |
| Open a modal | `core/ui.js` — `UI.modal({title, bodyEl, actions})` |
| Toast | `UI.toast({messageKey, variant, timeout})` |
| Confirm | `await UI.confirm({titleKey, summaryKey, danger})` |
| Build a Custom Element | Extend `PfBaseElement` from `shared/components/_base.js` |
| Build a module | Extend `BaseModule` from `core/base-module.js` |
| Render a table | `shared/utils/lens.js` → `renderFabricTable()` |
| Render a list with master-detail | `lens.mountListLens()` |
| Build an audit event | `Bus.emit('audit:<verb>', {ref, by, ts, ...})` — note B-1 of register: payload must include `ref` |
| Run gate | `bash tools/verify.sh` — must show 12/12 PASS |

### 6.3. Currently Working Tree State

The tree is **at checkpoint `20260601a_ship`**. Twelve of twelve static gates pass. The user has signed off Phase 0, Phase 1, and Phase 2. No code edits have been made since Phase 2 sign-off.

**Modules pending deletion:** `modules/assignment/` (marked, not yet deleted — see Section 9 for the audit-first protocol).

**New module stubs to scaffold (Phase 4):** `modules/dispatch/`, `modules/archive/`.

---

## 7. Gate Decisions

This section is the locked record of every architectural decision made during Phases 0, 1, and 2. **Do not deviate from these decisions without explicit re-authorization from the user.**

### 7.1. Phase 0 Decisions (Reground)

| Decision | Resolution |
|---|---|
| **Decision 1: Structural Grouping** | Approved. Six virtual nav groups: INTAKE, ROUTING, ACTION, REVIEW, DISPATCH, ARCHIVE + Cross-Phase + System. Implemented at nav-layer (`config/nav.config.js`), NOT by physical file moves. `modules/assignment/` flagged for deletion after feature-absorption verification. `modules/dispatch/` and `modules/archive/` to be scaffolded. |
| **Decision 2: Unverified Content** | Defer deep audit of `fasttrack`, `executive`, `stats`, `reports`, `assistant`, `orchestrator`, `approvals` to Phase 2 sub-turn. Assume intended functionality for Phase 1 spec purposes. |
| **Decision 3: Multi-Directorate Security** | Approved with critical correction: **enforce isolation in sealed fabric closure, NOT at UI layer.** `_store` and `_byRef` in lexical closure; public getters apply directorate filter + frozen deep copy before return. (See Section 5.) |
| **Decision 4: Multi-Relationship Integrity** | Four contracts adopted as mandatory: **No Orphan**, **Closure Gate**, **Atomic Archive**, **Activity Audit Thread**. Programmatically enforced inside `core/entity-store.js`. |
| **Decision 5: Phase 1 Scope** | Single comprehensive pass for all 6 workflows. Granted. |

### 7.2. Phase 1 Decisions (Workflow Specification)

| Gate | Resolution |
|---|---|
| **Gate A: Phase Semantics** | Approved as drafted. Triggers, interfaces, transitions, gates, handshakes accepted for all 6 phases. |
| **Gate B: State Vocabulary** | Renamed: `ingested` → `registered`, `routing-ready` → `triage_complete`. All other tokens approved. (Full lexicon in Section 3.2.) |
| **Gate C: SLA Windows** | Calibrated to **Working Hours**: P1=2h, P2=6h, P3=24h, P4=72h. Working hours definition pending user confirmation (Section 14). |
| **Gate D: Gates and Authorities** | All cross-directorate routing, DG escalation cap, closure authority, archive access rules approved. Fabric must reject violations. |
| **Gate E: Cross-Cutting Contracts** | All four (No Orphan / Closure Gate / Atomic Archive / Audit Thread) accepted as Phase 4 mandates, enforced in fabric. |
| **Gate F: Phase 2 Entry** | Authorized. |

### 7.3. Phase 2 Architectural Corrections (Issued in Phase 2 Authorization)

| Correction | Implementation Mandate |
|---|---|
| **B-1: Client-Side OTP Paradox** | OTP must be PA-handshake-driven. UI calls `REQUEST_OTP` endpoint (server emails code). UI collects code. Final assign payload includes code. PA validates server-side; on failure returns `ok:false` with `kind:'OTP_INVALID'`. Trigger `ASSIGNMENT-FAILED` rollback. **Discard current `pf-otp-modal.js` logic.** |
| **B-2: Mobile UI/UX & Memory** | Target runtime: mobile tablet, landscape. (a) Deduplication and matrix tracking run on raw memory indexes, not DOM. (b) Flatten DOM nesting in `renderActivityTimeline` and consolidated matrix views. Avoid layout thrash. |

### 7.4. Phase 2 Sign-Off Status

Phase 2 (Gap Audit) **complete and signed off**. 81-point defect register issued (Section 8). 9 modules pending deep audit (Section 9). Phase 3 (Consolidation Architecture) **pending user authorization to begin**.

---

## 8. Phase 2 Defect Register

> **Counting correction (recorded for transparency):** The Phase 2 sign-off summary originally reported 81 entries (56 Must-Fix / 19 Should-Fix / 6 Defer). Verification during this handoff revealed the actual count is **92 entries (65 Must-Fix / 22 Should-Fix / 5 Defer)**. The discrepancy was an arithmetic error in the summary table, not missing or fabricated work — every individual entry was real and signed off. The corrected totals below are the authoritative figures. Per Strict Output Rule 11.8, this correction is logged here rather than silently revised.

**92 total defects.** 65 Must-Fix, 22 Should-Fix, 5 Defer. 71 Salvage-and-Refactor, 9 Rebuild-Fresh, 9 Pending Audit (resolved in Section 9 sub-turn), 3 Other (PA coordination / deferred build).

Severity tiers:
- **Must-Fix** — blocks Phase 4 entry or violates a signed contract.
- **Should-Fix** — must land within Phase 4 but does not block entry.
- **Defer** — non-blocking; tracked for later.

Disposition:
- **Salvage & Refactor** — existing code is the right start; targeted fixes.
- **Rebuild Fresh** — existing code structurally wrong; discard.

### Section A — Cross-Cutting Engine Defects (25 items)

| # | File / Subsystem | Defect | Severity | Disposition |
|---|---|---|---|---|
| **A-1** | `core/entity-store.js` | `_store` and `_byRef` are module-scope `let` declarations, not sealed in lexical closure. No `Object.freeze(structuredClone(...))` defensive copy on any reader. Violates Phase 1 Decision 3. | Must-Fix | Salvage & Refactor |
| **A-2** | `core/entity-store.js` | No `__directorate` field on normalised records. `normalizeRecord()` does not derive directorate from `PrimaryDSU`/`AssignedDSU`/`DSU_KEY`. Required by Phase 1 Decision 3. | Must-Fix | Salvage & Refactor |
| **A-3** | `core/entity-store.js` | No `_quarantine` map for orphan records. "No Orphan" contract requires fabric to reject orphans into quarantine. | Must-Fix | Salvage & Refactor |
| **A-4** | `core/entity-store.js` | No `_archive` map. Phase 6 requires append-only frozen archive. | Must-Fix | Salvage & Refactor |
| **A-5** | `core/entity-store.js` | No `Entities.canClose(ref)` closure-gate evaluator. Violates Phase 1 Decision 4. | Must-Fix | Salvage & Refactor |
| **A-6** | `core/entity-store.js` | No deduplication index. Phase 1 needs rolling 30-day dedup hash (sender + subject + day + ref-pattern). | Must-Fix | Salvage & Refactor |
| **A-7** | `core/context.js` | No `directorate()` getter or sealed `setDirectorate(id)` setter. Required by Phase 1 Decision 3. | Must-Fix | Salvage & Refactor |
| **A-8** | `core/persona-controller.js` | Personas have no `directorateScope` attribute. Required by Phase 1 Decision 3. | Must-Fix | Salvage & Refactor |
| **A-9** | `core/api.js` | `_resolveUrl` reads `localStorage[obsidian.endpoint.*]` without persona check. Settings UI gates write but API reads unauthenticated. | Should-Fix | Salvage & Refactor |
| **A-10** | `core/api.js` | No structured error categorisation. Downstream code can only read `res.errors[0].message`. No machine-readable `kind` (`AUTH_FAILED`, `OTP_INVALID`, `RATE_LIMITED`). Blocks B-1 OTP handshake. | Must-Fix | Salvage & Refactor |
| **A-11** | `core/idempotency.js` | 60-second bucket too narrow for OTP-gated bulk flow. If operator takes 90 seconds reading OTP email, retry produces different key. | Must-Fix | Salvage & Refactor |
| **A-12** | `core/audit-log.js` | Audit log captures events but does NOT index them by reference. Phase 1 Decision 4 (Audit Thread) requires ref-queryable audit log. | Must-Fix | Salvage & Refactor |
| **A-13** | `core/bus.js` | Monkey-patched `Bus.emit` in `audit-log.js` is fragile. Later module overriding emit silently breaks audit interceptor. | Should-Fix | Salvage & Refactor |
| **A-14** | `shared/utils/lens.js` | `renderActivityTimeline` builds DOM element-by-element with no virtualization. O(n) on mobile tablet for archive views (potentially 100+ events). Violates B-2. | Must-Fix | Salvage & Refactor |
| **A-15** | `shared/utils/lens.js` | `renderRichDetail` nests `<div>` N-deep. Mobile layout cost non-trivial. Violates B-2. | Should-Fix | Salvage & Refactor |
| **A-16** | `shared/utils/lens.js` | `buildActivityTimeline` does NOT include `audit:*` events. Phase 4 review + Phase 6 archive need the full audit history. | Must-Fix | Salvage & Refactor |
| **A-17** | `shared/utils/lens.js` | `mountListLens` filter re-reads ALL types on every keystroke. ~700+ records per scan. Filter cache helps but doesn't fix root inefficiency. | Should-Fix | Salvage & Refactor |
| **A-18** | `core/ui.js` | All modal helpers (`openFlagDocument`, `openEmailToTask`, `openComments`, `openTaskUpdate`, `openProfileSetup`, `openShortcuts`, `previewNotification`) dynamic-import dependencies per call. ~200-400ms first-click latency on mobile. | Should-Fix | Salvage & Refactor |
| **A-19** | `core/ui.js` | No global modal-stack manager. Two simultaneous modals race on z-index. | Should-Fix | Salvage & Refactor |
| **A-20** | `config/endpoints.config.js` | 14 URLs present and correct. Defect: endpoints have no `phase: 1..6` metadata. Hard to audit which flows serve which phase. | Defer | Salvage & Refactor |
| **A-21** | `core/boot.js` | Service worker registration uses `/sw.js` absolute path. Breaks under path-prefix deployment. | Should-Fix | Salvage & Refactor |
| **A-22** | `core/platform.js` | Global keyboard shortcut handler installs unconditionally. No accessibility opt-out. | Defer | Salvage & Refactor |
| **A-23** | `shared/components/pf-toast.js` | Danger toasts not `aria-live="assertive"`. Screen-reader users miss errors. | Should-Fix | Salvage & Refactor |
| **A-24** | `shared/components/pf-modal.js` | Focus trap unverified. Tab key may escape modal. | Should-Fix | Salvage & Refactor |
| **A-25** | `tools/verify.sh` | No workflow-phase declaration check. Once modules declare phase, the gate should validate. | Defer | Salvage & Refactor |

### Section B — Architectural Corrections from Phase 2 Directive (2 items)

| # | Correction | Severity | Disposition |
|---|---|---|---|
| **B-1** | **Client-Side OTP Paradox.** Current `pf-otp-modal.js` generates and verifies OTP client-side. Discard. Rebuild as thin UI over PA handshake: `REQUEST_OTP` flow → operator input → final assign payload includes OTP → PA validates server-side → returns `ok:false / kind:'OTP_INVALID'` on failure → triggers `ASSIGNMENT-FAILED` rollback. New endpoint required in `endpoints.config.js`. | Must-Fix | Rebuild Fresh |
| **B-2** | **Mobile UI/UX & Memory Optimization.** Target: mobile tablet landscape. Dedup + matrix operations on raw memory indexes. Flatten DOM in timeline + matrix views. Cross-refs A-14, A-15, A-17. | Must-Fix | Salvage & Refactor (performance pass) |

### Section C — Navigation Group 1: INTAKE (Phase 1) — 7 items

| # | Module / Component | Defect | Severity | Disposition |
|---|---|---|---|---|
| **C-1** | `modules/correspondence/` | No Phase-1 framing — passive email catalogue. No triage workflow gate. No `<pf-triage-bar>` integration. Detail action "Create Task from Email" bypasses `registered → triage_complete` transition. No dedup warning UI. No directorate filter (waits on A-7/A-8). | Must-Fix | Salvage & Refactor |
| **C-2** | `modules/registry/` | Flat document list, no workflow phase. No scan-source channel display. No metadata-completion gate. No `_quarantine` view for admin. No archive-state filter. | Must-Fix | Salvage & Refactor |
| **C-3** | `<pf-triage-bar>` | **Does not exist.** New Phase-1 surface component. Chip row: Acknowledge / Tag Category / Flag Urgency / Mark Duplicate / Send to Routing. Drives Phase 1 → Phase 2 handoff. | Must-Fix | Rebuild Fresh |
| **C-4** | `shared/components/pf-attachment.js` | `[browser-unverified]` in real PDF rendering. Text-cap silent at 200KB (no UI signal). No virus-scan badge from PA metadata. | Should-Fix | Salvage & Refactor |
| **C-5** | `shared/components/pf-sandboxed-iframe.js` | `[browser-unverified]` in cross-browser PDF. `cidMap` key-lookup may fail on Outlook-style `cid:image001@01D7AB12.34567890` if map key not normalized identically. | Should-Fix | Salvage & Refactor |
| **C-6** | `shared/components/pf-filter-bar.js` | Chip selection state not aria-live announced. | Should-Fix | Salvage & Refactor |
| **C-7** | Phase 1 status transitions | No `Entities.transitionStatus(ref, from, to, by)` writer. Modules write status directly with no phase-gate validation. | Must-Fix | Salvage & Refactor |

### Section D — Navigation Group 2: ROUTING (Phase 2) — 10 items

| # | Module / Component | Defect | Severity | Disposition |
|---|---|---|---|---|
| **D-1** | `modules/ops-hub/` | Module shows ALL records, not just `triage_complete`. Mixes Phase 3/4/5 records. Bulk-select via Context `[browser-unverified]` end-to-end. "Assign Selected" CTA does not pre-check directorate-consistency. | Must-Fix | Salvage & Refactor |
| **D-2** | `modules/fasttrack/` | `[content-unverified]` — audit pending (Section 9). Should filter to P1/urgent only, pre-resolve assignee from category, skip full cascade UI. | Should-Fix | Pending audit |
| **D-3** | `modules/single-item-ops/` | 450 lines, well-structured. Gaps: (a) Submit doesn't call `transitionStatus` before PA write — fabric inconsistent on timeout; (b) No cross-directorate check before submit; (c) Preview Notification `[browser-unverified]`; (d) Cascade applied without loud user signal; (e) No draft auto-save (sleep loses work). | Must-Fix | Salvage & Refactor |
| **D-4** | `modules/bulk-assignment/` | 455 lines, well-structured. Gaps: (a) OTP client-side (B-1); (b) Sequential per-task PA writes (50 items = 50 calls — verify if PA supports batched payload); (c) No partial-success UI; (d) Stepper does not persist across page reloads. | Must-Fix | Salvage & Refactor |
| **D-5** | `modules/assignment/` | `[content-unverified]` MARKED FOR DELETION. Audit: read file, inventory features, verify each maps to single-item-ops or bulk-assignment, write `assignment/*` route redirect, remove from `modules/index.js` and `boot-smoke.mjs`. | Must-Fix | Rebuild Fresh (= delete) |
| **D-6** | `shared/components/pf-rich-picker.js` | 273 lines, supports single/multi/tabs/search/ARIA. `[browser-unverified]` keyboard nav. Gaps: no virtualization (800 users sluggish); no fuzzy match (typo = no results); no recent-selections memory. | Must-Fix | Salvage & Refactor |
| **D-7** | `pf-otp-modal` | B-1: discard client-side logic, rebuild as PA-handshake UI. | Must-Fix | Rebuild Fresh |
| **D-8** | `UI.openFlagDocument` | Modal correct. Gap: bypasses Phase boundary by creating follow-up task as Phase-2 side effect (should be Phase 3 transition). No persona check on cross-directorate flag. | Must-Fix | Salvage & Refactor |
| **D-9** | `UI.openEmailToTask` | Modal correct. Gap: bypasses Phase 1 transition (email goes `registered → assigned` skipping `triage_complete`). No duplicate-task-from-same-email guard. | Must-Fix | Salvage & Refactor |
| **D-10** | Phase 2 status transitions | Same root as C-7. | Must-Fix | Salvage & Refactor |

### Section E — Navigation Group 3: ACTION (Phase 3) — 9 items

| # | Module / Component | Defect | Severity | Disposition |
|---|---|---|---|---|
| **E-1** | `modules/orchestrator/` | `[content-unverified]` — audit pending (Section 9). | Should-Fix | Pending audit |
| **E-2** | `modules/response-tracking/` | 5-tab master-detail verified by read. Gaps: (a) Tabs span Phase 3 AND Phase 4 — tasks in `pending-review` mix with `in-progress`; (b) Detail actions don't enforce phase-gate authority; (c) CSV export lacks audit history; (d) No "my tasks / team tasks / all tasks" filter. | Must-Fix | Salvage & Refactor |
| **E-3** | `modules/comments/` | Hidden from nav, routable. Gaps: (a) Does not enforce comment-immutability rule on closed tasks; (b) No "report comment" action; (c) `[browser-unverified]` reply/edit/delete end-to-end. | Must-Fix | Salvage & Refactor |
| **E-4** | `shared/components/pf-comment-thread.js` | 271 lines rebuilt with reply/edit/delete. Gaps: (a) Silent fail if `currentUser` not set externally — no Edit/Delete buttons render; (b) Deeper-than-1-level thread nests collapse silently — visual confusion; (c) Edit form has no character counter (PA body length limit unknown); (d) `[browser-unverified]` end-to-end via `UI.openComments`. | Must-Fix | Salvage & Refactor |
| **E-5** | `shared/components/pf-side-panel.js` | `[content-unverified]` — audit pending (Section 9). | Should-Fix | Pending audit |
| **E-6** | `UI.openTaskUpdate` | Modal opens. Gaps: (a) Submit writes status directly — no phase gate; (b) "Mark complete" doesn't check response captured (Phase 3 Gate 4); (c) No "request reassignment" action. | Must-Fix | Salvage & Refactor |
| **E-7** | `renderActivityTimeline` | Cross-ref A-14 (virtualization), A-16 (audit log inclusion). Phase 3 specific: timeline omits Phase 1 triage events + Phase 2 assignment events. Fragmented history. | Must-Fix | Salvage & Refactor |
| **E-8** | Sub-task linkage | Phase 3 Gate 2 (sub-task must share parent ref). Unenforced. | Must-Fix | Salvage & Refactor |
| **E-9** | Cross-reference fork | Phase 3 Gate 3 (fork creates new ref with `linkedRefs: [parentRef]`). Unimplemented. | Must-Fix | Salvage & Refactor |

### Section F — Navigation Group 4: REVIEW (Phase 4) — 7 items

| # | Module / Component | Defect | Severity | Disposition |
|---|---|---|---|---|
| **F-1** | `modules/approvals/` | `[content-unverified]` — audit pending. Likely substantial gap closure needed: queue grouping, reviewer-authority check, return-reason gate, edit-diff preservation, DG-escalation-cap. | Must-Fix | Pending audit |
| **F-2** | `modules/executive/` | `[content-unverified]` — audit pending. DG-flagged filter, persona restriction, escalation path display all unconfirmed. | Must-Fix | Pending audit |
| **F-3** | `<pf-review-panel>` | **Does not exist.** New component: side-by-side original + draft + approve/return/edit controls. | Must-Fix | Rebuild Fresh |
| **F-4** | `<pf-comment-thread>` review-comments | No `kind: 'review-comment'` distinction in component. Reviewers can't distinguish notes-for-author from public comments. | Should-Fix | Salvage & Refactor |
| **F-5** | Approval-request writer | `_store.approval` exists but no schema defined (linkedTaskId, reviewerEmail, status, editDiff, escalatedFrom). | Must-Fix | Salvage & Refactor |
| **F-6** | Phase 4 status transitions | Same root as C-7. | Must-Fix | Salvage & Refactor |
| **F-7** | Reviewer authority check | No `Persona.canReview(record)` evaluator. Must check (a) original assigner, (b) designated approver in category config, (c) DG/DG's Office for DG-flagged. | Must-Fix | Salvage & Refactor |

### Section G — Navigation Group 5: DISPATCH (Phase 5) — 7 items

| # | Module / Component | Defect | Severity | Disposition |
|---|---|---|---|---|
| **G-1** | `modules/dispatch/` | **Does not exist.** Scaffold stubs in Phase 2 close-out; full build in Phase 4. Outbound queue, per-card view (record + response + recipients + channel + CTA), retry handling. | Must-Fix | Rebuild Fresh |
| **G-2** | `<pf-dispatch-panel>` | **Does not exist.** Channel selector, recipient confirmation, dispatch-receipt capture. | Must-Fix | Rebuild Fresh |
| **G-3** | `Entities.canClose(ref)` | Cross-ref A-5. | Must-Fix | Salvage & Refactor |
| **G-4** | `DISPATCH_OUTBOUND` endpoint | **Does not exist** in `endpoints.config.js`. PA flow must be designed (NITDA-side). Contract must include `kind: 'DISPATCH_FAILED'` error class per A-10. | Must-Fix | Coordinate with PA author |
| **G-5** | `audit:dispatched`-class events | Capture works (A-12). Emit side does not exist — dispatch module must fire these. | Must-Fix | Salvage & Refactor |
| **G-6** | Phase 5 status transitions | Same root as C-7. | Must-Fix | Salvage & Refactor |
| **G-7** | Closure authority check | Phase 5 Gate 5 (original assigner / DG / DG's Office only). No `Persona.canClose(record)`. | Must-Fix | Salvage & Refactor |

### Section H — Navigation Group 6: ARCHIVE (Phase 6) — 11 items

| # | Module / Component | Defect | Severity | Disposition |
|---|---|---|---|---|
| **H-1** | `modules/archive/` | **Does not exist.** Read-only browser. Search by date / ref / directorate / actor. Full chronological thread per ref. Export buttons. | Must-Fix | Rebuild Fresh |
| **H-2** | `<pf-archive-thread>` | **Does not exist.** Wraps `renderActivityTimeline` with archive framing: closure summary, immutable badge, export-to-PDF / email-bundle. | Must-Fix | Rebuild Fresh |
| **H-3** | `_store.archive` + `Entities.archive(ref)` | Cross-ref A-4. | Must-Fix | Salvage & Refactor |
| **H-4** | Audit-trail inclusion in archive | Phase 6 Gate 3 requires archive writer query `AuditLog.log({ref})` and include in snapshot. Compound with A-4 + A-12. | Must-Fix | Salvage & Refactor |
| **H-5** | Atomic archive write | Phase 6 Gate 2 — all-or-nothing transaction. | Must-Fix | Salvage & Refactor |
| **H-6** | Immutability enforcement | Phase 6 Gate 1 — `Object.freeze` at write; fabric rejects mutations of existing archive entries. Depends on A-1. | Must-Fix | Salvage & Refactor |
| **H-7** | Retention dates | Phase 6 Gate 5 — `retentionUntil` on archive entries; cold-sweep cannot prune before elapsed. | Must-Fix | Salvage & Refactor |
| **H-8** | `audit:archive-accessed` / `audit:unauthorized-access-attempt` | Emit side does not exist. Archive module must fire. | Must-Fix | Salvage & Refactor |
| **H-9** | Lookup module archive scope | Currently queries active records only. Must extend with archived scope + `archived: true` chip (defaulting off). | Must-Fix | Salvage & Refactor |
| **H-10** | Reopen-request flow | New ref with `derivedFrom: <archivedRef>`. Old archive immutable. Requires DG approval. Unimplemented. | Should-Fix | Salvage & Refactor |
| **H-11** | Cold-archive sweep | Background job or on-demand prune of live records once retention elapsed. | Defer | Build later |

### Section I — Cross-Phase Utility Modules — 8 items

| # | Module / Component | Defect | Severity | Disposition |
|---|---|---|---|---|
| **I-1** | `modules/home/` | Heatmap integrated via fragile regex string-replace on `paint()`. Reliability across render paths unverified. KPIs not phase-aware. Attention list ignores directorate scope (waits on A-8). Heatmap unfiltered for directorate users. `[browser-unverified]` click-cell interaction. | Must-Fix | Salvage & Refactor |
| **I-2** | `modules/executive/` | Cross-ref F-2. | Must-Fix | Pending audit |
| **I-3** | `modules/stats/` | `[content-unverified]` — audit pending. Need: phase-aware metrics, per-directorate breakdown, trend charts. | Should-Fix | Pending audit |
| **I-4** | `modules/reports/` | `[content-unverified]` — audit pending. | Should-Fix | Pending audit |
| **I-5** | `modules/lookup/` | Verified by read, well-structured. Gaps: (a) No archive scope (waits H-9); (b) No directorate filter in advanced panel (waits A-2); (c) Results capped at 200 — too low for archive search; (d) No pagination/progressive load. | Should-Fix | Salvage & Refactor |
| **I-6** | `modules/assistant/` | `[content-unverified]` — AI surface. **Security-critical**: confirm it does NOT bypass engine read filters. | Must-Fix | Pending audit |
| **I-7** | `modules/settings/` | Endpoint override UI correct. Gap: A-9 (API.js localStorage read unauthenticated). Language switcher: keep, no further translation work. | Should-Fix | Salvage & Refactor |
| **I-8** | `modules/diagnostics/` | Comprehensive suite. Gaps: (a) Telemetry chart re-renders on every paint (throttle); (b) Audit log viewer has no ref-filter. | Should-Fix | Salvage & Refactor |

### Section J — System Foundations — 6 items

| # | File | Defect | Severity | Disposition |
|---|---|---|---|---|
| **J-1** | `config/nav.config.js` | Per Phase 0 Decision 1 — rewrite for 6 workflow groups + Cross-Phase + System. Current structure (Operations/Governance/Intelligence/Assignments/System) is pre-rebrief. | Must-Fix | Salvage & Refactor |
| **J-2** | `config/personas.config.js` | Cross-ref A-8. | Must-Fix | Salvage & Refactor |
| **J-3** | `config/feature-flags.config.js` | Add flags for new modules: `dispatch.enabled`, `archive.enabled`. | Defer | Salvage & Refactor |
| **J-4** | `config/routes.config.js` | New routes for `dispatch`, `archive`. Redirect `assignment/*` to single-item-ops / bulk-assignment. | Must-Fix | Salvage & Refactor |
| **J-5** | `config/state.schema.js` | New slices: `Context.directorate`, `Context.handoff` (phase transitions), `Context.lastAction`. | Must-Fix | Salvage & Refactor |
| **J-6** | `tools/boot-smoke.mjs` | Hardcoded module list. Update: remove `assignment`, add `dispatch`, add `archive`. | Must-Fix | Salvage & Refactor |

### Severity Roll-up

| Severity | Count | Salvage | Rebuild | Pending Audit | Other |
|---|---|---|---|---|---|
| **Must-Fix** | 65 | 50 | 9 | 5 | 1 |
| **Should-Fix** | 22 | 17 | 0 | 4 | 1 |
| **Defer** | 5 | 4 | 0 | 0 | 1 |
| **TOTAL** | **92** | **71** | **9** | **9** | **3** |

The nine Rebuild-Fresh items:
1. `<pf-triage-bar>` (new — C-3)
2. `modules/assignment/` (delete after verified absorption — D-5)
3. `pf-otp-modal` rewrite (B-1 / D-7)
4. `<pf-review-panel>` (new — F-3)
5. `modules/dispatch/` (new — G-1)
6. `<pf-dispatch-panel>` (new — G-2)
7. `modules/archive/` (new — H-1)
8. `<pf-archive-thread>` (new — H-2)
9. `DISPATCH_OUTBOUND` endpoint contract (new, coordinate with PA team — G-4 if classified Rebuild after coordination)

The nine Pending-Audit items are listed in Section 9.

The three Other items are:
- G-4 (`DISPATCH_OUTBOUND` endpoint — coordinate with PA author; final disposition pending NITDA-side flow design)
- H-11 (Cold-archive sweep — defer/build later)
- A residual classification edge case to be resolved in the Phase 2 sub-turn (when the 9 pending-audit modules return their final dispositions).

---

## 9. Modules Pending Deep Audit

These 9 items have NOT had source reads in the audit session. Per Phase 0 Decision 2, the deep audit is deferred to a Phase 2 sub-turn (still no code, source-read-and-classify only). Phase 4 work on these items is blocked until classification.

| # | Item | Priority for Audit | Notes |
|---|---|---|---|
| 1 | `modules/fasttrack/` | Medium | Phase 2 surface; ROUTING accelerator |
| 2 | `modules/assignment/` | **High** | Marked for deletion — must verify absorption first |
| 3 | `modules/orchestrator/` | **High** | Phase 3 primary surface — depth unconfirmed |
| 4 | `modules/approvals/` | **High** | Phase 4 primary — critical path |
| 5 | `modules/executive/` | **High** | DG dashboard — security-sensitive |
| 6 | `modules/stats/` | Low | Analytics |
| 7 | `modules/reports/` | Low | Analytics |
| 8 | `modules/assistant/` | **Critical** | AI surface — potential leak vector |
| 9 | `shared/components/pf-side-panel.js` | Low | Purpose unconfirmed |

### Audit Protocol (When Authorized)
For each item:
1. `view` the actual source file from disk
2. Inventory features against Phase 1 spec
3. Classify each gap with Must-Fix / Should-Fix / Defer
4. Assign Salvage / Rebuild disposition
5. Add entries to the register (Section 8)
6. Re-present the register total for user sign-off
7. **Do not delete `modules/assignment/`** until features are confirmed absorbed by single-item-ops + bulk-assignment AND a route-redirect lands.

---

## 10. Phase 4 Execution Sequencing

**Pending user approval at Phase 3 sign-off.** The proposed Phase 4 execution sequence is layered to respect dependencies. **Do not start Phase 4 work in any order other than the approved sequence.**

### Recommended Sequence (Proposed; Awaiting Approval)

```
Wave 1 — Engine Foundations (Must land first; everything depends)
  A-1   Fabric lexical closure + frozen reader contract
  A-2   __directorate derivation in normalizeRecord
  A-7   Context.directorate getter + sealed setter
  A-8   Persona.directorateScope + canSee extension
  A-10  Structured error-kind taxonomy in api.js
  A-12  Audit log ref-indexing
  C-7   Entities.transitionStatus() phase-gated writer
  A-3   Quarantine map for orphan records
  A-5   Entities.canClose(ref) evaluator
  A-6   Deduplication index
  A-11  Per-action idempotency bucket override
  A-4   _archive map + Entities.archive(ref)

Wave 2 — Security & OTP Correction
  B-1   pf-otp-modal rebuild + REQUEST_OTP endpoint + validation handshake
  A-9   API.js localStorage gate to admin persona
  A-13  Bus middleware replacing monkey-patch (defensive)

Wave 3 — Cross-Cutting UX Performance (B-2 cluster)
  A-14  Timeline virtualization
  A-15  Detail-pane DOM flattening
  A-17  ListLens active-type scoping
  A-16  Audit events folded into timeline synthesizer

Wave 4 — Phase 1 (INTAKE) Surface Completion
  C-3   <pf-triage-bar> new component
  C-1   correspondence module Phase-1 framing
  C-2   registry module Phase-1 framing + quarantine view
  C-4, C-5, C-6  Component polish

Wave 5 — Phase 2 (ROUTING) Retrofit
  D-5   assignment module audit + redirect + delete
  D-3   single-item-ops gate + directorate check + draft auto-save
  D-4   bulk-assignment OTP integration + partial-success UI + draft persist
  D-1   ops-hub scoping to triage_complete + pre-check
  D-6   pf-rich-picker virtualization + recent-memory + fuzzy
  D-8, D-9, D-10  Modal phase-gate fixes

Wave 6 — Phase 3 (ACTION) Retrofit
  E-8   Sub-task linkage enforcement
  E-9   Cross-reference fork
  E-7   Activity timeline completeness
  E-4   pf-comment-thread polish (currentUser warning, deeper-thread, char count)
  E-2, E-3, E-6  Module gate + action fixes
  E-1, E-5  Pending audits (Section 9)

Wave 7 — Phase 4 (REVIEW) Build-Out
  F-5   Approval schema in entity-store
  F-7   Persona.canReview evaluator
  F-3   <pf-review-panel> new component
  F-4   Review-comment kind distinction
  F-6   Phase 4 transitions
  F-1, F-2  Pending audits (Section 9)

Wave 8 — Phase 5 (DISPATCH) Build-Out
  G-4   DISPATCH_OUTBOUND endpoint (coordinate with PA author)
  G-3   canClose(ref) (already in Wave 1)
  G-7   Persona.canClose evaluator
  G-1   modules/dispatch/ scaffold + build
  G-2   <pf-dispatch-panel> new component
  G-5, G-6  Audit emit + phase 5 transitions

Wave 9 — Phase 6 (ARCHIVE) Build-Out
  H-3   Archive map + Entities.archive (already in Wave 1)
  H-5   Atomic archive transaction
  H-6   Immutability enforcement (depends on A-1 from Wave 1)
  H-4   Audit-trail inclusion in archive
  H-7   Retention dates
  H-8   Archive access audit events
  H-1   modules/archive/ build
  H-2   <pf-archive-thread> new component
  H-9   Lookup archive scope
  H-10  Reopen flow

Wave 10 — Cross-Phase Polish + Pending Audits
  I-1   home dashboard cleanup + phase-aware KPIs
  I-3, I-4, I-6  Pending audits (Section 9)
  I-5   Lookup polish
  I-7, I-8  Settings + diagnostics polish
  Cross-cutting Should-Fix items: A-18, A-19, A-21, A-23, A-24

Wave 11 — System & Verification
  J-1   nav.config.js rewrite for workflow groups
  J-4   routes.config.js redirects
  J-5   state.schema.js extensions
  J-6   boot-smoke.mjs update
  A-25  verify.sh phase-declaration check (defer)
  A-20  endpoints phase metadata (defer)
  A-22  Shortcut handler opt-out (defer)
```

### Per-Wave Acceptance Criteria

A wave is **complete** only when:
1. All items in the wave pass `tools/verify.sh` (12/12 gates green).
2. All items have a **user-side browser walkthrough** on staging.
3. The user explicitly confirms acceptance.
4. The wave's diffs are bundled into a checkpoint zip.

**Static gate green ≠ wave complete.** Browser-confirmed-by-user is the only proof.

---

## 11. Strict Output Rules

These rules apply to **every deliverable** generated for this project. They are absolute. Violations require redoing the deliverable.

### 11.1. No Truncation
- **Never** emit partial code blocks.
- **Never** use ellipses (`...` / `…`) inside code or schemas to indicate omitted content.
- **Never** truncate a file, register, or specification mid-content.

### 11.2. No Placeholders
- **No `// TODO`, `// FIXME`, `// rest of audit`, `// stub`, or any other defer-marker** unless it represents an explicit user-approved deferral item. Even then, the marker must reference the register entry (e.g., `// Deferred per A-22`).
- **No `lorem ipsum`, `sample data`, `seed records`, `mock responses`, or `demo content`** anywhere in production code paths.
- **No "fill this in later" language** in specifications or documentation.

### 11.3. No Lazy Output
- Every register, table, list, and specification must be **exhaustive within its declared scope**.
- If a deliverable promises "all 81 defects," it must enumerate all 81.
- If a deliverable promises "module-by-module," every module gets coverage, including the unverified ones (which must be explicitly tagged).

### 11.4. Honest Uncertainty Tagging
When you cannot verify something from source-read alone (e.g., visual rendering, cross-browser behavior, runtime PA flow response shape), tag it `[browser-unverified]` or `[content-unverified]` or `[PA-flow-unverified]` — do NOT fabricate confidence.

### 11.5. No Speculative Additions
- **Do not** add features the user did not request.
- **Do not** add multi-language support, accessibility helpers, performance optimizations, or "nice-to-haves" without explicit authorization.
- The rebrief reaffirmed: consolidation over fragmentation. Every addition must trace to a register item or an explicit user directive.

### 11.6. Phase Gate Discipline
- **Do not** start Phase N+1 work until Phase N is explicitly signed off by the user.
- **Do not** start Wave N+1 work in Phase 4 until Wave N is accepted.
- **Do not** mark an item complete based on static gate alone.

### 11.7. Architectural Discipline
- Every change must respect the Locked Baseline Parameters (Section 2).
- Every change must respect the Operational Lexicon (Section 3) — never invent new status tokens or phase names.
- Every change must respect the Security & Multi-Directorate Architecture (Section 5) — never expose `_store` or `_byRef`.
- Every change must trace to a register entry (Section 8) or an explicit user authorization.

### 11.8. Communication Discipline
- **Never** claim work is "production-ready" or "shippable" based on static gates.
- **Always** distinguish between "implemented per spec" and "browser-verified end-to-end."
- **Always** report defects honestly, including any introduced by your own work.
- **Never** add filler / marketing language ("polished", "premium", "world-class") to status reports.

---

## 12. How to Work in This Codebase

### 12.1. Before Any Code Change

1. **Verify phase authorization.** Has the user authorized Phase 4? Which wave? Which items?
2. **Locate the register entry.** Every change must trace to a Section-8 item.
3. **Re-read affected files.** Don't rely on session memory.
4. **Identify dependencies.** Is the work blocked by a wave-earlier item?

### 12.2. Code Change Workflow

```bash
cd /home/claude/obsidian/platform-root

# 1. Make the change (use str_replace or create_file)

# 2. Syntax-check the changed file
node --check core/path-to-file.js

# 3. Run the static gate
bash tools/verify.sh

# Must show: STATIC VERIFICATION: PASS  (12/12)

# 4. Run boot smoke
node tools/boot-smoke.mjs

# Must show: BOOT SMOKE: PASS — N modules registered

# 5. If touching the fabric, smoke-test against real response
echo '{"type":"module"}' > package.json
node --input-type=module -e '
  import { Entities } from "./core/entity-store.js";
  import { readFileSync } from "node:fs";
  globalThis.fetch = async () => ({
    ok: true, status: 200,
    headers: { forEach: (cb) => cb("application/json", "content-type") },
    text: async () => readFileSync("/tmp/real-response.json", "utf8")
  });
  await Entities.bootstrap(true);
  console.log("counts:", Entities.counts());
  // Expect: ref 302 | doc 300 | task 100 | email 50 | comment 2
' 2>&1
rm -f package.json

# 6. Update PROJECT_STATUS.md with the change

# 7. Regenerate BUILD_INTEGRITY.txt
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
{ echo "# OBSIDIAN BUILD INTEGRITY — $ts";
  find . -type f -not -name 'BUILD_INTEGRITY.txt' -not -path '*/\.*' \
    | sed 's|^\./||' | sort \
    | while IFS= read -r f; do
        printf '%s  %s\n' "$(sha256sum "$f" | cut -d' ' -f1)" "$f"
      done
} > BUILD_INTEGRITY.txt
```

### 12.3. Checkpoint Workflow

When a wave is complete and user-accepted:
```bash
cd /home/claude/obsidian
zipname="OBSIDIAN_v4_platform-root_checkpoint_<date>_<wave>.zip"
zip -qr "/mnt/user-data/outputs/$zipname" platform-root \
  -x "*/\.*" "*/package.json"

# Verify clean extract
cd /tmp && rm -rf verify-extract && mkdir verify-extract
cd verify-extract && unzip -q "/mnt/user-data/outputs/$zipname"
cd platform-root
sha256sum -c BUILD_INTEGRITY.txt | grep -v ': OK$' | head
bash tools/verify.sh
```

### 12.4. Editing Rules

- **`str_replace` for surgical edits.** Always re-view the file immediately before editing — earlier `view` output goes stale after `str_replace`.
- **`create_file` for new files.** Fails if path exists.
- **`bash_tool` with `cat > path << 'EOF'`** to overwrite an existing file when full replacement is needed.
- **Never** edit files in `/mnt/skills/` (read-only).
- **Never** edit `/mnt/user-data/uploads/` (read-only, expires between turns).

### 12.5. Working With the Fabric

**DO:**
- Read via `Entities.byReference(ref)`, `Entities.all(type)`, `Entities.counts()`.
- Write via `Entities.upsert(type, record)`.
- Transition status via `Entities.transitionStatus(ref, from, to, by)` (to be implemented).
- Listen via `Bus.on('entity:*', ...)`.

**DO NOT:**
- Access `_store` or `_byRef` directly. They are sealed.
- Mutate any returned record. They are `Object.freeze`'d (after A-1 lands).
- Call `fetch()` directly. Use `BaseService`.
- Write `console.log`. Use `Log.*`.

### 12.6. Working With PA Endpoints

- All endpoints live in `config/endpoints.config.js` with full SAS-signed URLs.
- Each endpoint has: `flowName`, `url`, `method`, optionally `expectedKeys`.
- To call: `BaseService.endpoint('ENDPOINT_KEY', {expectedKeys})({...payload})`.
- Idempotency key auto-attached for writes. Logged to request log.
- Response envelope: `{ok, kind, status, data, body, errors, durationMs, correlationId}`.

---

## 13. Verification Harness

### 13.1. Current Static Gate (`tools/verify.sh`)

12 checks, all must pass:
1. **imports** — no unresolved imports in ESM graph
2. **named-exports** — every imported name is actually exported
3. **no-CDN** — no external `https://` script/font/style references
4. **console-purity** — only `core/log.js` calls `console.*`
5. **hex-lock** — hex colors only in `themes/` and `assets/subbrands/dgo/`
6. **json-valid** — every JSON file parses
7. **js-syntax** — every `.js` passes `node --check`
8. **i18n-static-keys** — static `data-i18n` attributes resolve
9. **placeholder-scan** — no `lorem/sample/seed/demo/placeholder` strings
10. **embedded-url-scan** — no URLs outside `endpoints.config.js`
11. **i18n-runtime-keys** — every `I18n.t(...)` reference resolves in en.json
12. **boot-smoke** — every module registers cleanly

Run: `bash tools/verify.sh` — must show `STATIC VERIFICATION: PASS`.

### 13.2. Real-Response Smoke (Manual)

A real 4.5 MB Fetch_All response is preserved at `/tmp/real-response.json` for ingest verification:
```
counts: reference 302 | document 300 | task 100 | email 50 | comment 2
```
Use the snippet in Section 12.2 step 5 to verify ingest against it after any fabric change.

### 13.3. Browser Verification (Phase 4)

To be designed in Phase 3. Options:
- **Operator-driven** — user walks each surface on staging URL, reports defects.
- **Playwright harness** — automated browser-render checks for each wave.
- **Hybrid** — Playwright for regression, operator for new surfaces.

User decision pending (Section 14).

---

## 14. Open Questions Pending User Direction

These items must be resolved before specific waves can execute. Track them as blockers.

### Pre-Phase 3 (Architecture Document)
| # | Question | Blocking |
|---|---|---|
| Q-1 | Sub-turn audit of the 9 unverified modules — execute now (extends Phase 2) or absorb into Phase 3 architecture pass? | Section 9 items |
| Q-2 | Phase 4 execution sequence — accept proposed Wave 1–11 ordering (Section 10) or restructure (e.g., vertical workflow slices)? | All Phase 4 work |
| Q-3 | Browser verification harness — operator-driven, Playwright, or hybrid? | Phase 4 acceptance protocol |
| Q-4 | PA flow contracts — Does NITDA-side own design of `REQUEST_OTP` (B-1), `DISPATCH_OUTBOUND` (G-4), and error-class taxonomy (A-10)? Or does platform deliver a draft contract spec for PA team? | B-1, G-1–G-6 |

### Pre-Wave 1 (Engine Foundations)
| # | Question | Blocking |
|---|---|---|
| Q-5 | Working hours definition for SLA calculation — Monday–Friday 09:00–17:00 NITDA local time confirmed? Holiday calendar source? | SLA computation across all phases |
| Q-6 | Directorate identification source — `DSU_KEY` from category records authoritative? Mapping table needed for legacy records without `DSU_KEY`? | A-2 (`__directorate` derivation) |
| Q-7 | Reviewer authority — "designated approver per category config" mentioned in Phase 4 Gate 1. Does this config exist today (verify in `entities.config.js`) or is it new? | F-7 |

### Pre-Wave 8 (Dispatch)
| # | Question | Blocking |
|---|---|---|
| Q-8 | Dispatch channels — confirm: email via PA flow; physical mail via separate flow; "both" combinator? Any other channels (SMS, internal portal)? | G-1, G-2 |
| Q-9 | Dispatch-receipt source — PA returns confirmation synchronously, or async callback? | G-1 transition logic |

### Pre-Wave 9 (Archive)
| # | Question | Blocking |
|---|---|---|
| Q-10 | Retention policy — default retention years? Categories with different retention (e.g., financial = 7y, general = 3y)? Source of category-retention mapping? | H-7 |
| Q-11 | Cold-archive sweep — on-demand admin action, scheduled job, or never (deferred indefinitely)? | H-11 |

---

## 15. Quick Reference

### Phase Sign-Off Status
- ✅ **Phase 0 — Reground** — signed off
- ✅ **Phase 1 — Workflow Specification** — signed off (Gates A–F)
- ✅ **Phase 2 — Gap Audit** — signed off (81-point register)
- ⏸ **Phase 3 — Consolidation Architecture** — pending user authorization
- ⏸ **Phase 4 — Execute** — pending Phase 3 sign-off

### Header File Mapping
- `core/api.js` — fetch site
- `core/entity-store.js` — fabric
- `core/ui.js` — modal helpers
- `core/log.js` — only `console.*` site
- `core/idempotency.js` — request log
- `core/audit-log.js` — audit ring buffer
- `core/persona-controller.js` — persona + profile + email
- `core/context.js` — active state + handoff
- `tools/verify.sh` — 12-check static gate
- `tools/boot-smoke.mjs` — module registration smoke

### Lifecycle State Cheat Sheet
```
INTAKE      registered → triaged → triage_complete
ROUTING     assigning → assigned (or assignment-failed → routing-ready)
ACTION      acknowledged → in-progress → action-complete (or reassign-requested)
REVIEW      pending-review → approved | approved-with-edit | returned | escalated
DISPATCH    dispatch-pending → dispatch-in-flight → dispatched | dispatch-failed | no-dispatch
            then closure-check → closed (or partial-dispatch)
ARCHIVE     archived → cold-archived (immutable; reopen creates new ref derivedFrom)
```

### Authority Cheat Sheet
| Action | Authority |
|---|---|
| Triage / Route own directorate | Directorate Officer |
| Route cross-directorate | DG / DG's Office |
| Acknowledge / progress own task | Assigned Officer |
| Mark task complete | Assigned Officer (with response captured) |
| Review approval | Original Assigner / Designated Approver / DG (for flagged) |
| Escalate (terminal) | DG only |
| Dispatch | Original Assigner / DG / DG's Office |
| Close reference | Original Assigner / DG / DG's Office (canClose gates passed) |
| Archive | Auto on closure (atomic, immutable) |
| Reopen archived | DG approval required |
| Access archived (read) | DG / DG's Office / Audit / Own-directorate (own records only) |
| Override endpoint URL | Admin only |
| View quarantine | Admin only |

---

**END OF CLAUDE.md**

This document is the operating contract for any subsequent work on OBSIDIAN v4.0. It supersedes prior transcripts where they conflict. Any deviation must be authorized by the user in writing within the current session.

When in doubt: ask the user. Do not assume. Do not infer. Do not speculate.

— End handoff —
