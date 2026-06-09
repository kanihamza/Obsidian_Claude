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
