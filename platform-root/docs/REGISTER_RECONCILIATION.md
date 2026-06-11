# OBSIDIAN v4.0 — Defect Register Reconciliation (as of 2026-06-11)

> **Why this exists.** The 92-point register in `CLAUDE.md` §8 was written at the
> `20260601a` handoff checkpoint. Substantial work has landed *since* (the in-session
> "S0 / S1.5" engine slices and many surface fixes), so the register is **stale as a
> to-do list**. This document reconciles each register area against the **actual source**
> (verified this session per Rule 11.4) and classifies it:
>
> - **DONE** — implemented and present in source (evidence cited).
> - **PARTIAL** — core present; named sub-gaps remain.
> - **OPEN·UNBLOCKED** — genuinely outstanding and safe to do without new input.
> - **OPEN·BLOCKED** — outstanding but needs a user decision / PA contract / policy.
>
> Verification depth is tagged: `[source]` = read the implementing code; `[grep]` =
> confirmed by symbol search; `[absent]` = confirmed file/symbol does not exist.

---

## Wave 1 — Engine Foundations

| Item | Status | Evidence |
|---|---|---|
| A-1 sealed fabric closure + frozen readers | **DONE** `[source]` | `entity-store.js` `sealFabric()` IIFE; `_store/_byRef/_archive/_quarantine/_dedup` module-private; readers `Object.freeze(structuredClone())` |
| A-2 `__directorate` derivation | **DONE** `[source]` | hierarchical S1.5 derivation in `normalizeRecord`/admit |
| A-3 quarantine map | **DONE** `[grep]` | `_quarantine` map + child-only orphan path |
| A-4 archive map + `archive()` | **DONE** `[grep]` | `_archive` Map; `archive(ref)` facade |
| A-5 `canClose(ref)` | **DONE** `[grep]` | closure-gate evaluator present |
| A-6 dedup index | **DONE** `[source]` | `_dedup` + `dedupHash()` + 30-day prune window |
| A-7 `Context.directorate()` sealed | **DONE** `[source]` | `context.js` module-scoped `_directorate`; getter + `setDirectorate` |
| A-10 error-`kind` taxonomy | **DONE** `[source]` | `api.js` AUTH_FAILED/OTP_REQUIRED/RATE_LIMITED/… map |
| A-11 idempotency bucket | **DONE** `[source]` | `idempotency.js` 5-min default bucket + `isReadAction` |
| A-12 audit ref-index | **DONE — this session** `[source]` | `audit-log.js` ref index + `forRef(ref)` + `ref` filter + `refs()` |
| C-7 `transitionStatus()` | **DONE** `[source]` | canonical `STATUS_PHASE` state machine gate |
| **A-8 `Persona.directorateScope`** | **OPEN·BLOCKED** `[source]` | personas have `audienceSees` only; **no persona→DSU map** exists; needs **Q-6** + directorate model |

## Cross-cutting Should-Fix

| Item | Status | Evidence |
|---|---|---|
| A-9 endpoint-override persona gate | **DONE — this session** `[source]` | `api._resolveUrl` honours override only for admin persona |
| A-16 audit events in timeline | **DONE** `[source]` | `lens.buildActivityTimeline` folds `audit:*` via AuditLog |
| A-17 list-lens type scoping | **DONE** `[source]` | `mountListLens` snapshots `E.all(type)` once per fabric version + LRU cache |
| A-21 SW path-prefix safe | **DONE — this session** `[source]` | `boot.js` `new URL('../service-worker.js', import.meta.url)` |
| A-23 toast assertive region | **DONE** `[source]` | `pf-toast` danger/critical → `#stack-assertive` |
| A-24 modal focus trap | **DONE** `[source]` | `pf-modal` `A11y.trapFocus`/`focusFirst`/`_release` |
| A-13 Bus middleware (vs monkey-patch) | **OPEN·UNBLOCKED (deferred)** `[source]` | audit still intercepts `Bus.emit`; defensive refactor, low payoff vs risk now |
| A-18 modal-helper eager import | **OPEN·UNBLOCKED** `[not re-verified]` | latency optimisation; not yet confirmed |
| A-19 modal-stack manager | **OPEN·UNBLOCKED** `[not re-verified]` | z-index race on stacked modals |
| A-20 endpoint phase metadata | **OPEN·UNBLOCKED (Defer)** | additive metadata |
| A-22 shortcut opt-out | **OPEN·UNBLOCKED (Defer)** | a11y opt-out |
| A-25 verify.sh phase check | **OPEN·UNBLOCKED (Defer)** | premature until modules declare `phase` |

## Phase 1 — INTAKE (C)

| Item | Status | Evidence |
|---|---|---|
| C-3 `<pf-triage-bar>` | **DONE** `[absent→present]` | `shared/components/pf-triage-bar.js` exists |
| C-1 correspondence Phase-1 framing | **PARTIAL** `[source]` | triage bar integrated on row-select; deeper gate flow not re-audited |
| C-6 filter-bar chip a11y | **DONE** `[source]` | `aria-pressed` chips + `aria-live` count |
| C-2 registry quarantine view | **OPEN·UNBLOCKED** `[grep absent]` | no `_quarantine` view in registry; admin-only panel not built |
| C-4 pf-attachment polish | **OPEN·UNBLOCKED** `[browser-unverified]` | text-cap signal / scan badge |
| C-5 pf-sandboxed-iframe cid | **OPEN·UNBLOCKED** `[browser-unverified]` | cross-browser PDF / cid normalisation |

## Phase 2 — ROUTING (D)

| Item | Status | Evidence |
|---|---|---|
| D-3 single-item-ops draft autosave | **DONE** `[source]` | localStorage draft save/restore (`_saveDraft`/`_draftKey`) |
| D-3 cascade + item-details + pickers | **DONE — prior session** `[source+browser]` | ui-smoke deep checks pass |
| D-1 ops-hub scope to `triage_complete` | **OPEN·UNBLOCKED** `[grep]` | shows all records; no status scoping |
| D-4 bulk partial-success + draft persist | **PARTIAL** `[not re-verified]` | parity present; partial-success UI unconfirmed |
| D-6 pf-rich-picker fuzzy / virtual / recent | **OPEN·UNBLOCKED** `[grep absent]` | enhancements not present (works without them) |
| **D-5 delete `modules/assignment` + redirect** | **OPEN·BLOCKED** `[source]` | module still present + imported; **disposition conflict** (single/bulk vs executive) needs a ruling |
| D-7 OTP rebuild | **BLOCKED / superseded** | bulk OTP removed in-session; single/>5 OTP needs **Q-4** REQUEST_OTP contract |

## Phase 3 — ACTION (E)

| Item | Status | Evidence |
|---|---|---|
| E-2 response-tracking my/team/all filter | **OPEN·UNBLOCKED** `[grep absent]` | no mine/team scoping |
| E-8 sub-task linkage | **OPEN·UNBLOCKED** `[grep absent]` | not enforced |
| E-9 cross-reference fork (`linkedRefs`) | **OPEN·UNBLOCKED** `[grep absent]` | not implemented |
| E-3/E-4/E-6 comments + task-update gates | **PARTIAL** `[not re-verified]` | components exist; phase-gates unconfirmed |

## Phase 4 — REVIEW (F)

| Item | Status | Evidence |
|---|---|---|
| F-7 `Persona.canReview` | **PARTIAL** `[source]` | `transitionStatus` *calls* `P.canReview(refRec)` defensively, but the evaluator is not defined on Persona → falls back to assigner. Needs **Q-7** (designated-approver config) |
| F-1 approvals queue/gates | **DONE (core)** `[source+browser]` | approve/reject + reason-gate verified by ui-smoke; K-2 fixed |
| F-3 `<pf-review-panel>` | **OPEN·BLOCKED** `[absent]` | does not exist; Phase-4 build |
| F-5 approval schema | **OPEN·UNBLOCKED** `[not re-verified]` | schema fields unconfirmed |

## Phase 5 — DISPATCH (G) · Phase 6 — ARCHIVE (H)

| Item | Status | Evidence |
|---|---|---|
| G-1 `modules/dispatch` | **OPEN·BLOCKED** `[absent]` | new build; needs **Q-4/Q-8/Q-9** + `DISPATCH_OUTBOUND` contract |
| G-2 `<pf-dispatch-panel>` | **OPEN·BLOCKED** `[absent]` | new build |
| H-1 `modules/archive` | **OPEN·BLOCKED** `[absent]` | new build; needs retention policy **Q-10** |
| H-2 `<pf-archive-thread>` | **OPEN·BLOCKED** `[absent]` | wraps timeline + `AuditLog.forRef` (now available via A-12) |
| H-9 lookup archive scope | **OPEN·UNBLOCKED** | depends on archive build |

## Cross-Phase + System (I, J)

| Item | Status | Evidence |
|---|---|---|
| I-1 home crash + render | **DONE — this session** `[source+browser]` | `host` ReferenceError fixed; ui-smoke green |
| J-1 nav 6 workflow groups | **DONE** `[grep]` | boot-smoke asserts INTAKE/ROUTING/ACTION/REVIEW/CrossPhase/System |
| I-8 diagnostics audit ref-filter | **OPEN·UNBLOCKED** `[source]` | diagnostics shows the **request** log (filterable), not an audit-events viewer; an audit viewer using `AuditLog.forRef` would be a new panel |
| J-4 routes assignment redirect | **OPEN·BLOCKED** | tied to D-5 ruling |
| J-6 boot-smoke list | **OPEN·BLOCKED** | still lists `assignment`; add `dispatch`/`archive` when built |

## Section K (supplemental)

| Item | Status |
|---|---|
| K-2 approvals `commit()` ReferenceError | **DONE** (fixed 2026-06-10; re-verified in-browser this session) |
| K-1 fasttrack SLA = raw calendar days | **OPEN·BLOCKED** — needs **Q-5** (working-hours definition) |
| K-12 assistant RBP stamping | **No action** (already stamps directorate/persona/userEmail) |
| K-15 pf-side-panel listener leak | **No action** (false positive; disposer cleans up) |

---

## Decision surface (what unblocks the next substantive batch)

1. **D-5 disposition** — redirect `assignment` → single/bulk (CLAUDE.md) **or** → executive (other roadmap)? Unblocks a clean delete + redirect + `boot-smoke` update (J-6).
2. **Q-5 working hours** — confirm Mon–Fri 09:00–17:00 WAT (+ holiday source) to fix **K-1** (false weekend SLA breaches).
3. **Q-6 directorate model** — provide a persona→DSU map, or confirm "single 'all' scope for now" to formally close **A-8**.
4. **Q-7 reviewer config** — does a designated-approver-per-category config exist, or is it new? Unblocks **F-7**.
5. **Q-4 / Q-8 / Q-9 / Q-10 PA contracts** — ownership + shape of `REQUEST_OTP`, `DISPATCH_OUTBOUND`, error taxonomy, retention policy. Gate the **dispatch/archive/review-panel** builds (G/H/F-3).

## Safe-to-proceed without new input (OPEN·UNBLOCKED, non-destructive)

- C-2 registry admin quarantine view · D-1 ops-hub status scoping · D-6 picker fuzzy/recent ·
  E-2 my/team/all filter · A-13 Bus middleware · A-18/A-19 modal latency + stack manager.
  (Each is a real register item; none changes data contracts. Pick a lane and I'll execute it
  with the gate + 140-assertion harness as the regression net.)
