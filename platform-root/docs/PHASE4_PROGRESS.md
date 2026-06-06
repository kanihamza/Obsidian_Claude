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

## Open carry-forward risks (require user device / data — not autonomously closable)

- **Q-6 real-response smoke:** `tools/real-response-smoke.mjs` could not run on-device because the live
  4.5 MB `FETCH_ALL` payload (`/tmp/real-response.json`) is not present. The Q-6 directorate-derivation
  (`PrimaryDSU` → `AssignedDSU` → quarantine) is therefore unconfirmed against real DGCEO data shape.
  **To close:** drop the real payload on-device and run the harness; report accepted/quarantined counts.
- **PA-flow field names `[PA-flow-unverified]`:** the OTP modal + Part-B contracts assume field names
  (`otpId`, `expiresAt`, `verificationToken`, `remainingAttempts`, `sentTo`, `codeLength`). Confirm against
  the live `OTP_GENERATE` / `OTP_VERIFY` flows. `DISPATCH_OUTBOUND` (G-4) still does not exist.
- **S2 DOM virtualization** needs the Galaxy Tab A9 to confirm smooth scroll-streaming + no layout thrash.

## Verification toolkit (committed)

- `tools/deploy-s0-s1-a11.sh` — git-free raw-file patcher (15 files; round-trips byte-exact).
- `tools/real-response-smoke.mjs` — Q-6 accepted-vs-quarantined harness.
- `ui-sandbox.html` — offline isolation harness for error-router + pf-toast + pf-otp-modal.
- `BUILD_INTEGRITY.txt` — sha256 manifest of the working tree.

## Not started (gated on per-slice acceptance, CLAUDE.md §11.6)

S3 (INTAKE: `<pf-triage-bar>`, correspondence/registry framing) → S10 (deferred/harden). Each new
user-facing surface requires its own walkthrough before the next slice begins.
