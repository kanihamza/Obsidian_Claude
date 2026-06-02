# OBSIDIAN v4.0 — Phase 3 Consolidation Architecture

> End-state blueprint mapping the cure for all 109 catalogued defects (Sections A–J = 92, Section K = 17)
> onto a strictly sequenced, zero-dependency implementation plan. No execution code — this is the
> contract Phase 4 builds against. Companion: `PHASE2_SUPPLEMENTAL_AUDIT.md` (register + PA contracts).

## 3.0 Purpose & scope
Four mandated subsystems are specified, followed by Phase 4 vertical execution slices. Locked baseline
parameters (zero-build ESM, no external deps, token-only style, console purity, sealed fabric) are
preserved by construction.

---

## 3.1 The Native Lexical Security Layer (A-1, A-2, A-3, A-4, A-7, A-8, J-2)

Make `_store`/`_byRef` permanently unreachable from `globalThis.Platform`, enforce
`(directorate ∩ persona-scope)` on every read, hand out only frozen deep copies.

### 3.1.1 Sealing IIFE (blueprint, not yet emitted)
```javascript
// core/entity-store.js — end-state shape
const Entities = (function sealFabric() {
  // ── PRIVATE — never exported, never on globalThis.Platform ──
  const _store      = {};                 // type -> Map(id -> record)
  const _byRef      = {};                 // type -> Map(refId -> [records])
  const _archive    = new Map();          // ref -> Object.freeze(bundle)   (A-4)
  const _quarantine = new Map();          // id  -> orphan record           (A-3)
  const _dedup      = new Map();          // hash -> ref (rolling 30-day)    (A-6)
  for (const t of Object.keys(ENTITY_TYPES)) { _store[t] = new Map(); _byRef[t] = new Map(); }

  function _scopeOf(rec) {            // A-2 directorate derivation
    return String(rec.__directorate
      || rec.PrimaryDSU || rec.AssignedDSU || rec.DSU_KEY
      || (Lookups.dsuFor && Lookups.dsuFor(rec)) || '').trim();
  }
  function _visible(rec) {           // read filter: directorate ∩ persona
    const scope = Context.directorate();          // sealed; UI-read-only (A-7)
    if (!Persona.canSee(rec)) return false;       // persona scope (A-8)
    return scope === 'all' || _scopeOf(rec) === scope;
  }
  const _frozen = (v) => Object.freeze(structuredClone(v));   // defensive copy

  return {
    byReference(refId) {
      const out = { referenceId: String(refId) };
      for (const child of RELATIONSHIPS.reference)
        out[child] = [...(_byRef[child]?.get(String(refId)) || [])].filter(_visible);
      out.reference = (_store.reference.get(String(refId)) || null);
      return _frozen(out);
    },
    all(type)  { return _store[type] ? [..._store[type].values()].filter(_visible).map(_frozen) : []; },
    counts()   { /* same rollups, iterate only _visible(rec) */ },
    upsert(type, record)            { /* normalize → derive __directorate → orphan→_quarantine → index → emit */ },
    transitionStatus(ref, from, to, by) { /* C-7 phase-gated writer; see 3.1.3 */ },
    canClose(ref)                   { /* A-5 closure-gate evaluator */ },
    archive(ref)                    { /* A-4/H-3 atomic, Object.freeze at write */ },
    quarantine()                    { return Persona.isAdmin() ? [..._quarantine.values()].map(_frozen) : []; },
    isHydrated, bootstrap, ingest, lastRawResponse
  };
})();
export const Entities = /* the sealed object only */;
```
`core/platform.js` exposes only the facade (line 39). Gate adds a grep that fails if `_store`/`_byRef`
appear in any `export`/`globalThis.`/`window.`/`Platform.` assignment.

### 3.1.2 Five defensive layers → sites
| Layer | Site | Closes |
|---|---|---|
| Fabric enclosure | IIFE `const _store/_byRef` | A-1 |
| Read filter | `_visible()` in every getter | A-2, A-8 |
| Defensive copy | `_frozen()` on every return | A-1 |
| Persona scope | `Persona.canSee(rec)` + `directorateScope` in personas.config.js | A-8, J-2 |
| Context seal | `Context.directorate()` read-only; `setDirectorate()` internal-only | A-7, J-5 |

### 3.1.3 Phase-gated writer (C-7 root → fixes C-7/D-10/F-6/G-6)
`transitionStatus(ref, from, to, by)` is the sole status mutator: (a) validates `from`→`to` against the
canonical state machine (rejects `Rejected`-style drift), (b) checks authority (`canReview`/`canClose`),
(c) enforces No Orphan / Closure Gate / Atomic Archive / Audit Thread, (d) emits `audit:phase-transition`.
Modules stop writing status via `upsert`.

---

## 3.2 The Virtual Routing Engine (J-1)

Group 19 modules into 6 phases + Cross-Phase + System at the nav layer only — no directory moves.

### 3.2.1 New `config/nav.config.js`
```javascript
export const NAV_GROUPS = [
  { id: 'INTAKE',     phase: 1, labelKey: 'nav.group.intake',     icon: 'inbox' },
  { id: 'ROUTING',    phase: 2, labelKey: 'nav.group.routing',    icon: 'shuffle' },
  { id: 'ACTION',     phase: 3, labelKey: 'nav.group.action',     icon: 'workflow' },
  { id: 'REVIEW',     phase: 4, labelKey: 'nav.group.review',     icon: 'check-circle' },
  { id: 'DISPATCH',   phase: 5, labelKey: 'nav.group.dispatch',   icon: 'send' },
  { id: 'ARCHIVE',    phase: 6, labelKey: 'nav.group.archive',    icon: 'archive' },
  { id: 'CROSS_PHASE',phase: 0, labelKey: 'nav.group.crossPhase', icon: 'layers' },
  { id: 'SYSTEM',     phase: 0, labelKey: 'nav.group.system',     icon: 'settings' }
];
export const NAV_BINDINGS = {
  INTAKE:      ['correspondence', 'registry'],
  ROUTING:     ['ops-hub', 'fasttrack', 'single-item-ops', 'bulk-assignment'],
  ACTION:      ['orchestrator', 'response-tracking', 'comments', 'assistant'],
  REVIEW:      ['approvals', 'executive'],
  DISPATCH:    ['dispatch'],
  ARCHIVE:     ['archive'],
  CROSS_PHASE: ['home', 'lookup', 'stats', 'reports'],
  SYSTEM:      ['settings', 'diagnostics']
  // DELETED: 'assignment' → redirect to 'executive' (D-5 corrected / J-4)
};
```

### 3.2.2 Full 19-module → phase mapping
| Module | Pre-rebrief group | New group / phase | Note |
|---|---|---|---|
| correspondence | Operations | INTAKE / P1 | `<pf-triage-bar>` host (C-3) |
| registry | Operations | INTAKE / P1 | quarantine view (C-2) |
| ops-hub | Operations | ROUTING / P2 | scope to `triage_complete` (D-1) |
| fasttrack | Operations | ROUTING / P2 | SLA→Working-Hours (K) |
| single-item-ops | Assignments | ROUTING / P2 | phase-gate + draft save (D-3) |
| bulk-assignment | Assignments | ROUTING / P2 | OTP handshake (B-1, D-4) |
| orchestrator | Operations | ACTION / P3 | task lens home (K) |
| response-tracking | Operations | ACTION / P3 | split P3/P4 tabs (E-2) |
| comments | hidden | ACTION / P3 | immutability on close (E-3) |
| assistant | Operations | ACTION / P3 | scope stamp on AI payload (K-8) |
| approvals | Governance | REVIEW / P4 | authority + escalation cap + bug (K) |
| executive | Intelligence | REVIEW / P4 | scoped counts (K) |
| dispatch (new) | — | DISPATCH / P5 | scaffold (G-1) |
| archive (new) | — | ARCHIVE / P6 | scaffold (H-1) |
| home | — | CROSS_PHASE | phase-aware KPIs (I-1) |
| lookup | — | CROSS_PHASE | + archive scope (H-9, I-5) |
| stats | Intelligence | CROSS_PHASE | per-directorate (K) |
| reports | Intelligence | CROSS_PHASE | per-directorate (K) |
| settings | System | SYSTEM | endpoint gate (A-9, I-7) |
| diagnostics | System | SYSTEM | ref-filter audit log (I-8) |
| ~~assignment~~ | Intelligence | DELETED | redirect → `executive` |

`nav-controller.js` reads `NAV_GROUPS`/`NAV_BINDINGS`; `boot-smoke.mjs` (J-6) + `routes.config.js` (J-4) updated.

---

## 3.3 The Zero-Dependency Browser Smoke Harness (CF-1 / Gate III)

Single static `tools/browser-smoke.html` + `tools/browser-smoke.js`: boot the real platform offscreen
against a stubbed `fetch` (preserved `/tmp/real-response.json`), drive Custom Elements via dispatched DOM
events, assert deterministic DOM-state checkpoints. Runs in any Chromium/WebView (incl. Galaxy Tab A9
WebView under Termux). Prints `SMOKE: PASS/FAIL` scrapeable by `verify.sh`.

### 3.3.1 Three native primitives (zero deps)
1. Real-DOM mount via `core/boot.js` ESM import + stubbed `fetch` (no network).
2. Event-driven actuation: `el.dispatchEvent(new Event('click'|'keydown'))`, `element.focus()`.
3. Deterministic checkpoints: `getAttribute('aria-selected')`, `shadowRoot.querySelector`,
   `document.activeElement`, `getBoundingClientRect()` (layout-thrash regression).

### 3.3.2 The 12 `[browser-unverified]` paths → checkpoints
| # | Path | Checkpoint |
|---|---|---|
| 1 | pf-attachment PDF (C-4) | iframe node present + 200KB cap banner |
| 2 | pf-sandboxed-iframe cidMap (C-5) | normalized cid: key resolves to blob/data URL |
| 3 | ops-hub bulk-select (D-1) | N rows aria-selected ⇒ Context.bulk length N |
| 4 | single-item-ops preview (D-3c) | modal mounts; body non-empty |
| 5 | pf-rich-picker keyboard (D-6) | ArrowDown moves activedescendant; Enter selects |
| 6 | pf-comment-thread CRUD (E-4d) | reply appends; edit mutates; delete removes |
| 7 | comments via UI.openComments (E-3c) | renders for ref; immutable after closed |
| 8 | home click-cell (I-1) | sets Context.active + navigates |
| 9 | pf-side-panel focus trap (K) | Tab cycles in .panel; Escape closes; listener released |
| 10 | pf-modal focus trap (A-24) | first focusable focused; Tab contained |
| 11 | pf-toast assertive (A-23) | danger toast aria-live=assertive |
| 12 | approvals decision (K bug) | approve fires w/o ReferenceError; canonical token |

### 3.3.3 Integration
`verify.sh` gains a 13th `browser-smoke` check: loads `browser-smoke.html?headless=1`, waits for
`window.__SMOKE_DONE__`, greps `SMOKE: PASS`. No browser present ⇒ `SKIPPED (no browser)` — never a
false PASS.

---

## 3.4 Phase 4 Execution Slices (vertical burn-down of 109 defects)

| Slice | Name | Defects closed | Exit criterion |
|---|---|---|---|
| S0 | Engine Foundations | A-1,A-2,A-3,A-4,A-5,A-6,A-7,A-8,A-10,A-11,A-12,C-7 | sealed fabric + transitionStatus + scoped readers; real-response counts unchanged |
| S1 | Security & OTP | B-1,A-9,A-13,K-8a/b; wire OTP_GENERATE/OTP_VERIFY | OTP modal = thin PA-handshake; rollback on OTP_INVALID |
| S2 | UX/Memory (mobile) | A-14,A-15,A-16,A-17,B-2 | timeline virtualized; DOM flattened; Tab A9 thrash checkpoint green |
| S3 | INTAKE (P1) | C-1,C-2,C-3,C-4,C-5,C-6 | `<pf-triage-bar>`; registered→triage_complete gated |
| S4 | ROUTING (P2) | D-1,D-3,D-4,D-5(delete+redirect),D-6,D-8,D-9,K-fasttrack | assignment deleted→executive; SLA Working-Hours |
| S5 | ACTION (P3) | E-1…E-9,K-orchestrator,K-assistant | sub-task linkage + fork; comment immutability |
| S6 | REVIEW (P4) | F-1…F-7,K-approvals(authority,escalation cap,lexicon,line-177,edit-diff),K-executive | `<pf-review-panel>`; canReview; canonical tokens |
| S7 | DISPATCH (P5) | G-1…G-7 (+G-4 PA coordination) | dispatch module + `<pf-dispatch-panel>`; canClose gate |
| S8 | ARCHIVE (P6) | H-1…H-10 | atomic immutable archive; reopen→derivedFrom |
| S9 | Cross-Phase + System | I-1…I-8,K-stats,K-reports,K-pf-side-panel,J-1,J-2,J-4,J-5,J-6;CF-2 | nav rewrite; per-directorate analytics |
| S10 | Deferred / Harden | A-18..A-25,H-11,CF-1 harness check | browser-smoke wired into verify.sh |

**Dependency rule:** S0 first (all slices consume sealed fabric + transitionStatus). S1 depends on S0
(api.js error kinds). S2 parallelizable after S0. S3–S8 are lifecycle-order phase slices. S9/S10 close
cross-cutting + deferred. Each slice: `verify.sh` 12/12 → `browser-smoke` checkpoint → user walkthrough →
checkpoint zip.

---

**Phase 3 deliverable complete.** Awaiting user sign-off to authorize Phase 4 / Slice S0.
