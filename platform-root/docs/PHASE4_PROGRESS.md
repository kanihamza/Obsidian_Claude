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
| **S1.5** Live-Data Conformance Patch | Q-6 derivation rewrite (AssignedToDSU/RoutedToDSU/CoAssigneeDSU/Category→DPR + HTML-bleed guard), OTP input contract (`action`/`identifier`/`otp_code`) + defensive output parse, DISPATCH_OUTBOUND doc-marked non-existent | ✅ | run it | ⏳ browser-verify |

## Live-data audit closures (2026-06-08)

- **Q-6 — CLOSED against live data.** Live `FETCH_ALL` has **zero** `PrimaryDSU`/`AssignedDSU` fields → the
  prior derivation quarantined 100% of records. Rewritten precedence (S1.5): `AssignedToDSU` (tasks 100%) →
  `RoutedToDSU` (docs 51.7%, mostly rich-text bleed) → `CoAssigneeDSU` → `Category` → category row's
  `Default Primary Responsible` → legacy `PrimaryDSU`/`AssignedDSU` → quarantine. Every candidate is
  HTML-bleed-validated (no `<`, not whitespace-only, length ≤ 32). **Ordering caveat:** step (d) needs the
  `Lookups.categories()` option-set loaded; if FETCH_ALL ingest precedes the lookups load, Category-only docs
  resolve on the next bootstrap. Confirm un-quarantine on the browser walkthrough.
- **OTP input contract — CONFIRMED & FIXED.** Real `OTP_GENERATE` Compose_1 contract: `action`
  ('generate'/'verify'), `identifier` (email/phone — **not** `userEmail`), `otp_code` (verify-only). Modal
  now sends these; `userEmail` retained envelope-only for audit. **Output contract still PARTIAL:** success
  path unobserved, so `data` is parsed defensively and `otpId`/`expiresAt`/`verificationToken`/
  `remainingAttempts`/`sentTo`/`codeLength` are treated as optional/best-effort.
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
