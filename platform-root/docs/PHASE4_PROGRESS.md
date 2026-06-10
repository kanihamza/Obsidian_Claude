# OBSIDIAN v4.0 — Phase 4 Progress Ledger

> Live status of Phase 4 execution slices. Authoritative for "what is implemented vs. browser-verified."
> Companion docs: `PHASE2_SUPPLEMENTAL_AUDIT.md`, `PHASE3_CONSOLIDATION_ARCHITECTURE.md`.
> Rule (CLAUDE.md §11.8): static-gate-green ≠ delivered. Browser-confirmed-by-user is the only "delivered".

## Slice status

| Slice | Scope (register items) | Code | Static gate | Synthetic test | Browser-verified |
|---|---|---|---|---|---|
| **S0** Engine Foundations | A-1 seal, A-2 directorate, A-3 quarantine, A-4 archive, A-5 canClose, A-6 dedup, A-7 context seal, C-7 transitionStatus | ✅ | ✅ 12/12 | ✅ 20/20 | ✅ (sandbox + walkthrough) |
| **S1** Security & OTP | A-10 error taxonomy, error-router, B-1 pf-otp-modal rebuild, A-23 toast aria-live, K-8b assistant scope stamp | ✅ | ✅ 12/12 | ✅ 13/13 | ✅ (OTP handshake both branches) |
| **A-11** Idempotency upgrade | stable fingerprint, 300s bucket, normalizeInput, callAPI safeguard | ✅ | ✅ 12/12 | ✅ 7/7 | ⏳ (covered by S1 walkthrough) |
| **S2** UX/Memory (B-2) | A-14 timeline virtualization, A-15 DOM flatten, A-16 audit-event folding, A-17 ListLens snapshot scoping | ✅ | ✅ 12/12 | ✅ 9/9 | ⏳ DOM virtualization `[browser-unverified]` |
| **S1.5** Live-Data Conformance Patch | Q-6 derivation rewrite (AssignedToDSU/RoutedToDSU/CoAssigneeDSU/Category→DPR + HTML-bleed guard), OTP input contract (`action`/`identifier`/`otp_code`) + defensive output parse, DISPATCH_OUTBOUND doc-marked non-existent | ✅ | ✅ | ⏳ browser-verify |
| **S1.5c** Ingestion Restitution | sentinel filter (`isBlankVal`: empties + null-words + "No &lt;field&gt;" family) on ref/id/DSU fields; type-prefixed self-reference for refless correspondence (DOC-/EML-/TASK-); cross-type id-collision guard; directorate-underivable now ADMITTED-with-null (not quarantined) | ✅ | ✅ 12/12 | ✅ 14/14 synthetic | ✅ **live 4.6MB smoke PASS** (1300 accepted, 2 child-orphans, 0 dir-quarantine, 99.8%) |
| **S3** INTAKE Triage Surface (C-3 + C-1 triage integration + J-5 handoff) | new `<pf-triage-bar>` chip row (Acknowledge / Tag Category / Flag Urgency / Mark Duplicate / Send to Routing); `Context.setHandoff/getHandoff` (deep-copy) slice; correspondence detail Phase-1 framing + dedup banner; all status writes via `transitionStatus` (C-7) | ✅ | ✅ 12/12 | ✅ 13/13 contract | ⏳ DOM `[browser-unverified]` (walkthrough pending) |

## U-series — Cross-cutting usability (authorized 2026-06-10, deviates from locked wave order)

User direction after the first browser walkthrough: **fix what makes every screen feel broken before
building more phase surfaces.** This reorders the CLAUDE.md §10 wave plan (in-session authorization).

### U2 — Nav coherence: 6-phase groups (J-1) — 2026-06-10

Replaced the pre-rebrief nav groups (Operations / Governance / Intelligence / Assignments / System)
with the **6-Phase Unified Correspondence Lifecycle** model (CLAUDE.md §3.1): **INTAKE · ROUTING ·
ACTION · REVIEW · DISPATCH · ARCHIVE · Cross-Phase · System**. Done at the nav layer only (no file
moves): `NAV_GROUPS` reordered in `config/nav.config.js`, each module's `static nav.group` remapped,
new `nav.group.*` i18n labels, and `tools/boot-smoke.mjs`'s hardcoded group list updated (J-6, partial).

Group assignment: INTAKE=correspondence,registry · ROUTING=ops-hub,single-item-ops,bulk-assignment,
fasttrack · ACTION=orchestrator,response-tracking · REVIEW=approvals,executive · Cross-Phase=home,
lookup,stats,reports,assistant · System=diagnostics,settings. `comments` stays hidden (contextual);
`assignment` (slated for deletion, D-5) is now hidden from nav but remains route-reachable. DISPATCH
and ARCHIVE are empty until their modules ship — `nav-controller` filters empty groups, so they
appear automatically then. Static gate 12/12; boot-smoke 19 modules. **Browser-unverified** (confirm
the nav renders the phase groups in order).

### U1 — Lookups resilience (empty dropdowns everywhere) — 2026-06-10

The `inspect-lookups.mjs` probe against the live `REFERENCE_DATA` flow revealed **two** root causes for
the empty category/assignee/co-assignee/CC dropdowns:

1. **`Platform.Lookups` was never wired.** `core/platform.js` never imported `shared/utils/lookups.js`,
   so every consumer reading `globalThis.Platform.Lookups` (the triage bar's category list, the fabric's
   Category→`Default Primary Responsible` directorate derivation, the connectivity-banner / `r`-shortcut
   warm) silently got `undefined`. Fixed: import + add to the namespace.
2. **Shape mismatch.** `REFERENCE_DATA` returns `users`/`categories`/`departments` at the **top level**
   of the body (flat), but `Lookups.load()` read `res.data.users/...` (nested) → nothing parsed. Fixed:
   read from `res.body` (flat) → `res.data` (nested) → and a **FETCH_ALL fallback** — the fabric now
   captures the user/category/department collections that ride inside FETCH_ALL (`Entities.lookupSource`)
   and Lookups uses them when `REFERENCE_DATA` is empty/unreachable.

Also warms Lookups at boot (non-blocking) so pickers populate without a manual Refresh. Guard:
`tools/lookups-resilience-test.mjs` (10/10) covers the flat-body parse, the FETCH_ALL fallback, and the
`Platform.Lookups` wiring. Static gate 12/12; fabric harnesses unaffected (14/14, 13/13).
**Browser-unverified** until you confirm the dropdowns populate.

## S3 — INTAKE triage surface (2026-06-09)

**C-3 `<pf-triage-bar>` (Rebuild Fresh) + C-1 triage integration + J-5 handoff slice.** New Phase-1
chip surface that walks one correspondence reference through INTAKE and hands it to ROUTING:

| Chip | Effect |
|---|---|
| Acknowledge | `registered → triaged` via `Entities.transitionStatus` (C-7) — the bar never writes status directly |
| Tag Category | captures `triageMeta.category` from the `Lookups` option-set (no fabrication if unloaded) |
| Flag Urgency | captures `triageMeta.urgency` P1–P4, mapped to the SLA windows (§3.3) |
| Mark Duplicate | toggles `triageMeta.duplicate`; pre-flagged from the fabric's 30-day dedup `__duplicateOf` (A-6) |
| Send to Routing | confirms, `triaged → triage_complete`, writes `Context.handoff {fromPhase:1,toPhase:2,refs,triageMeta}`, navigates to `ops-hub` |

Design notes:
- **Phase-gate honoured (C-7).** `_advance()` reads the *live* canonical status before each step, so a
  record imported with a non-canonical status (e.g. live docs are `"Open"`/`"Pending"`) is treated as
  freshly-arrived and walked `→ registered → triaged → triage_complete`. Illegal jumps are rejected by
  the writer and surfaced via `UI.toastError`.
- **Confirmation gate.** The consequential phase commit (Send to Routing) is preceded by `UI.confirm`
  with the captured triageMeta; the intra-phase staging chips act immediately with a toast.
- **`Context.handoff` (J-5)** added with deep (`structuredClone`) copies — a contract test caught a
  shallow-copy leak of the nested `refs[]` array; fixed.
- **Correspondence (C-1)** mounts the bar atop the detail pane and refreshes the lens on acknowledge/route.

**Scoped OUT of S3 (next sub-slice):** registry Phase-1 framing + admin quarantine view (C-2); the
deeper correspondence items — directorate filter (waits A-8 wiring) and the `openEmailToTask` phase-gate
(D-9, a Phase-2/ROUTING item). Component polish C-4/C-5/C-6 remain.

Guards: `tools/triage-flow-test.mjs` (13/13) proves the INTAKE chain + handoff contract against the
real fabric + context. The bar's **DOM rendering/interaction is `[browser-unverified]`** until the
walkthrough. Static gate 12/12 (i18n 390 keys, boot-smoke registers the component).

## S1.5c — Ingestion restitution (2026-06-09)

The real-payload smoke (4.6 MB live FETCH_ALL) exposed a second-order ingestion regression even
after S1.5 fixed directorate derivation: **352 records reference-missing-quarantined, document = 0,
email = 0, reference = 1.** Two root causes, both fixed:

1. **Sentinel strings, not nulls.** Live rows carry explicit placeholders — tasks `RefIDD:"No RefIDD"`,
   routing `RoutedToDSU:"No Route"`, emails `RefIDD:"null"`. The old `!= ''` test accepted them as
   real, so all tasks collapsed onto one bogus reference and the bogus DSU falsely satisfied
   derivation. New `isBlankVal()` rejects empties, null-words, and the `^no\s+` sentinel family on
   identity/DSU fields only (a genuine `NO-2024-001` — no space after "no" — survives).
2. **Refless correspondence was quarantined before it could self-reference.** `admit()` quarantined
   refless documents/emails/tasks immediately, so the downstream document-self-reference step never
   ran. Now `admit()` self-references correspondence-bearing types via a **type-prefixed** key
   (`DOC-<id>` / `EML-<id>` / `TASK-<id>`) — the prefix prevents a document with list-id 5 and a task
   with list-id 5 from colliding on one synthetic reference. Child-only types (approval/comment/
   activity) stay quarantine-eligible.

> **POLICY DECISION — SIGNED OFF (kanihamza, 2026-06-09): keep admit-with-null.** A record whose
> directorate is underivable is **ADMITTED with `__directorate = null`**, NOT quarantined. This
> consciously supersedes the literal Q-6 "quarantine if no DSU" wording. Rationale: (a) the confirmed
> bug was 100% quarantine; (b) `visible()` only matches a record to a *specific* directorate scope, so
> a null-DSU record surfaces **only at the unscoped `all` tier (DG's Office)** and can never leak into
> another directorate — isolation is preserved; (c) against live data this affects all 300 tasks + 50
> emails (every DSU field is a sentinel) — quarantining them would hide the bulk of the workload. Only
> true identity orphans (child-only records with no resolvable parent) are quarantined.

Synthetic guard: `tools/livedata-shape-test.mjs` (14/14) reproduces the live shape incl. the
cross-type id collision. **CLOSED against live data (2026-06-09):** `tools/real-response-smoke.mjs`
on the 4.6 MB payload accepted **1300** records (document 300 · task 300 · email 50 · reference
650), quarantined **2** child-only orphan `taskComments`, **0** directorate-quarantine, 99.8% accept
rate. Directorate derived for 147/300 docs (RoutedToDSU/Category); the remaining 153 docs + all 300
tasks + 50 emails carry sentinel-only DSU fields and surface at the `all` tier per the signed-off
admit-with-null policy.

## Live-data audit closures (2026-06-08)

- **Q-6 — CLOSED against live data.** Live `FETCH_ALL` has **zero** `PrimaryDSU`/`AssignedDSU` fields → the
  prior derivation quarantined 100% of records. Rewritten precedence (S1.5): `AssignedToDSU` (tasks 100%) →
  `RoutedToDSU` (docs 51.7%, mostly rich-text bleed) → `CoAssigneeDSU` → `Category` → category row's
  `Default Primary Responsible` → legacy `PrimaryDSU`/`AssignedDSU` → quarantine. Every candidate is
  HTML-bleed-validated (no `<`, not whitespace-only, length ≤ 32). **Ordering caveat:** step (d) needs the
  `Lookups.categories()` option-set loaded; if FETCH_ALL ingest precedes the lookups load, Category-only docs
  resolve on the next bootstrap. Confirm un-quarantine on the browser walkthrough.
- **OTP input + output contract — CONFIRMED & FIXED (live records 2026-06-09).** Input: `action`
  ('generate'/'verify'), `identifier` (email/phone — **not** `userEmail`), `otp_code` (verify-only); modal
  sends these, `userEmail` envelope-only for audit. **Output now observed:** `data` is a **JSON string**
  parsing to `{ valid:boolean, message:string }`; success keyed on `valid`, human text in `message`. The
  six previously-assumed fields (`otpId`/`expiresAt`/`verificationToken`/`remainingAttempts`/`sentTo`/
  `codeLength`) are **NOT emitted** by the live flow. Bug fixed: verify previously keyed on `verified`
  (would false-pass `{valid:false}`) — now keys on `valid`. Sandbox stub aligned to the live shape.
- **DISPATCH_OUTBOUND — CONFIRMED non-existent.** Zero references in live `FETCH_ALL`, OTP_GENERATE, or
  OTP_VERIFY records, **and zero `.js`/`endpoints.config.js` references in this repo** — no dead code to
  excise. Doc occurrences marked intended-not-implemented (`PHASE2_SUPPLEMENTAL_AUDIT.md §B.4`).

## Remaining open risks (require user device / data)

- **S2 DOM virtualization** needs the Galaxy Tab A9 to confirm smooth scroll-streaming + no layout thrash.
- **OTP success-path output shape** still `[PA-flow-unverified]` (only error-path probes available).

## Verification toolkit (committed)

- `tools/deploy-s0-s1-a11.sh` — git-free raw-file patcher (15 files; round-trips byte-exact).
- `tools/real-response-smoke.mjs` — Q-6 accepted-vs-quarantined harness.
- `ui-sandbox.html` — offline isolation harness for error-router + pf-toast + pf-otp-modal.
- `BUILD_INTEGRITY.txt` — sha256 manifest of the working tree.

## Not started (gated on per-slice acceptance, CLAUDE.md §11.6)

S3 (INTAKE: `<pf-triage-bar>`, correspondence/registry framing) → S10 (deferred/harden). Each new
user-facing surface requires its own walkthrough before the next slice begins.
