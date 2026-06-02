# OBSIDIAN v4.0 — Phase 2 Supplemental Audit & Integration Contract Baseline

> **Scope:** Deep source-read audit of the 9 modules previously deferred as `[content-unverified]`
> (Section 9 of `CLAUDE.md`), plus the four authoritative Power Automate integration contracts.
> **Method:** Real source reads of the checkpoint tree (`OBSIDIAN_v4_handoff_phase2_signoff_20260601b`).
> No execution code written — Phase 4 remains unauthorized. This turn is source-read-and-classify only.
> **Static baseline at audit time:** `STATIC VERIFICATION: PASS` · 19 modules registered.

---

## 0. Audit Authority & Close-Out Gate Resolutions (as directed)

| Gate | Decision (locked this turn) |
|---|---|
| **Gate I — Sub-Turn Audit Mandate** | Execute immediately. All 9 modules audited below from disk. |
| **Gate II — Phase 4 Build Sequencing** | Approved as proposed (Waves 1→11 linear dependency chain). |
| **Gate III — Browser Verification Harness** | Programmatic spec required in Phase 3 doc (native zero-dependency smoke harness). Captured as carry-forward **CF-1**. |
| **Gate IV — Power Automate API Contracts** | Drafted immediately. See Part B. |
| **Gate V — Phase 3 Entry Transition** | Conditioned on completion of this audit + Part B contracts. |

---

## 1. Three Mandated Questions — Direct Answers (source-verified)

### Q1. `modules/assistant/` — does its design allow direct access to `_store` / `_byRef`, bypassing directorate/persona scopes?

**No — it cannot reach the raw maps, but for a structural reason, not a designed safeguard.**

- In `core/entity-store.js`, `store` and `byRef` are **module-scope `const` maps** (lines 9–11). They are **never exported** and **never attached to `globalThis.Platform`** (confirmed in `core/platform.js` lines 34–42: only the `Entities` facade is exposed). The assistant therefore has no reachable handle to the raw maps — the same is true of every module.
- The assistant (`modules/assistant/index.js`) does **not** read the fabric at all. It holds conversation turns in `this._messages` and posts them to the `AI_CHAT` Power Automate flow via `AI.chat()` (`shared/utils/ai.js`). It never calls `Entities.byReference/all/get/counts`.

**However — the leak vector is real and must be tracked, just relocated:**
1. **No scope enforcement exists to bypass yet.** The current `Entities` readers (`all`, `byReference`, `counts`) apply **no directorate/persona filter and return live object references, not frozen copies** (entity-store.js lines 167–217). This is exactly defect **A-1/A-2** — unimplemented. So "assistant doesn't bypass scope" is true only because **no module is scoped today**. The moment the sealed-closure scope lands (Wave 1), the assistant must consume the **scoped** readers if it is ever extended to inject fabric context into prompts.
2. **Server-side exposure is out of platform scope but must be documented.** `AI_CHAT` (and `AI_DOC_ANALYSIS`, `AI_EMAIL_ANALYSIS`) run inside Power Automate with whatever data access NITDA grants the flow. Per Section 5.3, that is a PA-side auth concern. The platform's obligation is to never send cross-directorate fabric context into a prompt for a scoped persona.
3. **No persona/directorate stamping on the chat payload.** `AI.chat(messages)` sends only `{ messages }`. There is no `persona`, `directorateScope`, or `userEmail` carried, so the flow cannot enforce per-user scoping even if it wanted to.

**Verdict:** Not a present `_store` bypass. It is a **future leak vector at the prompt-context boundary** + a **missing scope stamp on the AI payload**. Logged as **K-8a / K-8b** below.

### Q2. `modules/approvals/` — does it enforce original-assigner validation and the terminal DG Escalation Cap?

**No on both counts.**

- **Original-assigner / reviewer-authority validation: absent.** `decide()` and `commit()` (index.js lines 136–179) run for any persona that can see the surface. There is no `Persona.canReview(record)` check (confirmed: `core/persona-controller.js` exposes only `canSee(audience)` — no `canReview`/`canClose`). Any viewer can approve or reject any item. This is defect **F-7**, here confirmed live.
- **DG Escalation Cap: not implemented — the escalate action does not exist.** The module offers only `approve` / `reject`. Phase 4's canonical terminal transition `escalated` (DG-only, terminal) has no UI, no writer, and no authority gate.
- **Lexicon drift (new finding):** the module writes status `'Approved'` / `'Rejected'` and filters on `/approved|rejected|closed/i`. The canonical Phase-4 vocabulary is `approved | approved-with-edit | returned | escalated` (Section 3.2). `'Rejected'` is **not a canonical token** — the correct token is `returned`. No `approved-with-edit` path and no edit-diff preservation exist.
- **Runtime bug (new finding):** `commit()` references `it.__ref` in the `actionCompleted` call (index.js line 177) but `it` is undefined in that scope — the in-scope variable is `existing`. This throws a `ReferenceError` on the success path. Logged **K-2c**.
- Status is written directly via `Entities.upsert(...)` with **no `transitionStatus` phase gate** (C-7 root).

### Q3. `modules/assignment/` — is it structurally ready for absolute deprecation and absorption?

**Yes — but the handoff's stated absorption target is wrong and must be corrected.**

- Despite the name, `modules/assignment/` is **not** an assignment-creation surface. Its header and body (index.js lines 1–62) show it is an **executive read-only AGGREGATOR**: "Assignment Intelligence" — workload-by-assignee bars, priority-mix bars, overdue attention list, and a task CSV export, all computed from `Entities.counts()`. It performs **no writes** and creates **no assignments**.
- It is therefore **safe to deprecate**: it holds no unique write capability and no state authority. Pure lens.
- **Correction to D-5:** the handoff says verify each feature "maps to single-item-ops or bulk-assignment." That is a misread of the module's purpose. Its capabilities are **already duplicated by `modules/executive/` and `modules/stats/`** (same `counts()` source: workload, priority mix, overdue, charts). The CSV-of-tasks export overlaps `modules/reports/` / the `assignment.csv` path. **The correct absorption targets are `executive` + `stats` (+ `reports` for the CSV), not the assignment-creation modules.** The route redirect in J-4 should therefore point `assignment/*` → `executive` (analytics home), **not** → single-item-ops.
- The keyboard-shortcut map in `core/platform.js` (line 71, `a:'assignment'`) and boot-smoke's module list (J-6) still reference it; both must be updated on deletion.

---

## 2. Part A — Supplemental Defect Register (9 modules)

> Continues the master register numbering with a new **Section K** (Supplemental Audit).
> Severity ∈ {Must-Fix, Should-Fix, Defer}. Disposition ∈ {Salvage & Refactor, Rebuild Fresh, Delete}.
> Cross-refs (`A-n`, `F-7`, etc.) point at the existing Section 8 register.

| Nav Group / Utility | Module / Component File | Discovered Defect / Structural Gap | Severity | Disposition |
|---|---|---|---|---|
| **ROUTING (P2)** | `modules/fasttrack/index.js` | SLA model is **wrong**: `sla()` (lines 9–16) computes age in **raw calendar days** (`>7` overdue, `>3` due-soon) from `Date.now()`. Violates the locked **Working-Hours** SLA model (P1=2WH/P2=6WH/P3=24WH/P4=72WH). Not priority-aware — every record gets the same fixed thresholds regardless of P1–P4. | Must-Fix | Salvage & Refactor |
| **ROUTING (P2)** | `modules/fasttrack/index.js` | No directorate scope (waits A-2). Mixes `task` + `document` rows with no phase scoping (shows all statuses, not just `triage_complete`). Nav group still pre-rebrief `Operations`, not `ROUTING` (J-1). | Should-Fix | Salvage & Refactor |
| **ROUTING (P2)** | `modules/fasttrack/index.js` | Builds a full `<table>` per `paint()` with no virtualization; on a 300-document fabric this is an O(n) DOM build on the Galaxy Tab A9 target. Cross-ref A-14/B-2. | Should-Fix | Salvage & Refactor |
| **INTELLIGENCE → DELETE** | `modules/assignment/index.js` | **Deprecate.** Read-only aggregator fully duplicated by `executive` + `stats` (+ `reports` CSV). No unique write/state authority. **Correction to D-5:** absorption target is `executive`/`stats`, **not** single-item-ops/bulk-assignment. Redirect `assignment/*`→`executive`. Remove from `platform.js` shortcut map (line 71) and `boot-smoke.mjs` (J-6). | Must-Fix | Delete (after redirect lands) |
| **ACTION (P3)** | `modules/orchestrator/index.js` | Thin wrapper over `mountListLens` for `type:'task'`. Inherits A-17 (filter re-reads all types per keystroke). No phase scoping — lists tasks in every status (`assigned`…`action-complete`) with no ACTION-phase filter. No directorate scope (A-2). Deep-link home for tasks is correct and should be preserved. | Must-Fix | Salvage & Refactor |
| **ACTION (P3)** | `modules/orchestrator/index.js` | No `transitionStatus` writer wired for row actions (C-7 root). Detail actions delegate to shared lens, which writes status directly. | Must-Fix | Salvage & Refactor |
| **REVIEW (P4)** | `modules/approvals/index.js` | **No reviewer-authority check** — any persona can approve/reject (F-7 confirmed live). `decide/commit` never calls a `Persona.canReview`. | Must-Fix | Salvage & Refactor |
| **REVIEW (P4)** | `modules/approvals/index.js` | **DG Escalation Cap not implemented** — no `escalate` action, writer, or terminal gate. Only approve/reject exist. | Must-Fix | Salvage & Refactor |
| **REVIEW (P4)** | `modules/approvals/index.js` | **Lexicon drift** — writes non-canonical `'Approved'`/`'Rejected'`; canonical Phase-4 tokens are `approved \| approved-with-edit \| returned \| escalated`. No `approved-with-edit` path; **no edit-diff preservation** (F-3/F-5). Status written via raw `upsert`, no phase gate (C-7). | Must-Fix | Salvage & Refactor |
| **REVIEW (P4)** | `modules/approvals/index.js` | **Runtime bug** — `commit()` line 177 references `it.__ref`, but `it` is out of scope (var is `existing`). Throws `ReferenceError` on the approve/reject success path. | Must-Fix | Salvage & Refactor |
| **REVIEW (P4)** | `modules/approvals/service.js` | Points at `SUBSIDIARY_ACTIONS` with v4 envelope. Decision payload hand-builds `AssignmentType: 'ACKNOWLEDGE'|'UPDATE_TASK'` — semantically a routing action, not an approval verb. Needs a dedicated approval route-key once the Phase-4 contract is finalized (Part B). | Should-Fix | Salvage & Refactor |
| **REVIEW (P4) — security** | `modules/executive/index.js` | DG/CEO dashboard reads `counts()` over the **whole fabric** with **no directorate filter** (entity-store has none yet, A-2). Acceptable only while `audience:'executive'` ⇒ DG-scope-all; **the moment a directorate persona is granted `executive` audience, this leaks all-directorate rollups.** Must consume scoped `counts()` post-Wave-1. | Must-Fix | Salvage & Refactor |
| **REVIEW (P4)** | `modules/executive/index.js` | KPI "pendingApprovals" uses raw `c.approval` (total approvals), not pending-only — overstates the DG queue. Nav group still pre-rebrief `Intelligence`. | Should-Fix | Salvage & Refactor |
| **CROSS-PHASE** | `modules/stats/index.js` | Pure aggregator over `counts()`; structurally sound. Gaps: not phase-aware; no per-directorate breakdown (waits A-2); donut/sparkline re-render on every `entity:changed` with no throttle (cross-ref I-8). | Should-Fix | Salvage & Refactor |
| **CROSS-PHASE** | `modules/reports/index.js` | One-line aggregator + reference CSV. Structurally sound. Gaps: no per-directorate breakdown (A-2); no archive scope (waits H-9); CSV export not persona-scoped. | Should-Fix | Salvage & Refactor |
| **ACTION (P3)** | `modules/assistant/index.js` | **Leak vector at prompt boundary (future):** does not read the fabric today, but if extended to inject reference/bundle context it must use the **scoped** readers (post A-1/A-2), never raw `byReference`. No `_store`/`_byRef` access is possible (sealed by module scope). | Must-Fix | Salvage & Refactor |
| **ACTION (P3)** | `modules/assistant/index.js` | **No scope stamp on AI payload:** `AI.chat()` sends only `{messages}` — no `persona`/`directorateScope`/`userEmail`. The flow cannot enforce per-user scoping. Add identity/scope envelope so PA-side can audit & restrict. | Should-Fix | Salvage & Refactor |
| **ACTION (P3)** | `modules/assistant/index.js` | `audience:'all'` + nav `Operations`; conversation state is session-only (lost on reload/sleep — same draft-loss class as D-3e). No rate-limit / abuse guard on rapid `_send()`. | Defer | Salvage & Refactor |
| **CROSS-PHASE** | `shared/components/pf-side-panel.js` | **Purpose confirmed:** generic right-side slide-over drawer with `aria-modal` + focus trap. Defect: `this.on(document,'keydown',…)` (line 25) is bound on connect and **never removed** — every mounted instance leaks a document-level Escape listener. | Should-Fix | Salvage & Refactor |
| **CROSS-PHASE** | `shared/components/pf-side-panel.js` | Focus trap depends on optional `Platform.A11y.trapFocus` and silently no-ops if absent (`?.` chains, lines 30–32) — same unverified-trap class as `pf-modal` (A-24). **No current consumer found among audited modules** — verify whether any surface mounts `<pf-side-panel>` or whether it is dead code to be wired or removed. | Should-Fix | Salvage & Refactor |

### Section K Roll-Up

| Severity | Count |
|---|---|
| **Must-Fix** | 8 |
| **Should-Fix** | 8 |
| **Defer** | 1 |
| **Section K total** | **17** |

Disposition: **15 Salvage & Refactor · 1 Delete (`assignment`) · 1 verify-then-wire/remove (`pf-side-panel`)**. **0 net-new Rebuild-Fresh** components surfaced by this audit (the Phase-4 review/dispatch/archive rebuilds remain as previously catalogued).

### Cross-Cutting Findings (apply beyond a single module)

- **CF-1 (Gate III).** Phase 3 architecture must specify a **native, zero-dependency programmatic browser smoke harness** to exercise the 12 `[browser-unverified]` paths (deterministic DOM-state checkpoints; no Playwright/npm). Carry-forward to the Phase 3 doc.
- **CF-2 (Nav drift).** **Every audited module still declares pre-rebrief nav groups** (`Operations`/`Governance`/`Intelligence`/`Executive`). Confirms J-1 is a blanket rewrite, not a per-module tweak. No module yet declares a `phase: 1..6`.
- **CF-3 (Endpoint reconciliation).** The live registry already provisions **`OTP_GENERATE` + `OTP_VERIFY`** (a two-step handshake) and **`DYNAMIC_GLOBAL_ACTIONS`** (`operation:'dispatch'`). It does **not** contain a `REQUEST_OTP` or `DISPATCH_OUTBOUND` key. See Part B for the corrected mapping — **B-1's "new REQUEST_OTP endpoint required" is already satisfied at the endpoint layer**; only `pf-otp-modal`'s client-side logic needs the rewrite. **G-4's `DISPATCH_OUTBOUND` genuinely does not exist** and still requires NITDA-side flow design (or adoption of `DYNAMIC_GLOBAL_ACTIONS`).

---

## 3. Part B — External Integration Contracts (Power Automate Schemas)

> Envelope reference (from `config/endpoints.config.js`):
> **v1** → `{ ok, status:{http}, request, timing, data, errors, meta }`
> **v4** → `{ ok, success, statusCode, action, data, errors, meta:{routeKey} }`
> All request payloads are merged by `core/api.js` under each endpoint's `defaults`
> (`action/operation/mode/source`) and stamped with an `idempotencyKey` for writes.

### B.1 — OTP Request (outbound email generation hook)

**Endpoint key:** `OTP_GENERATE` (live; family F6) — *this is the platform's `request-otp` equivalent.*

**Request — `POST` body:**
```json
{
  "action": "otpGenerate",
  "operation": "generate",
  "mode": "single",
  "source": "DGO_FAST_Track_WEB_OPS",
  "userEmail": "officer@nitda.gov.ng",
  "purpose": "BULK_ASSIGNMENT",
  "channel": "email",
  "context": {
    "batchSize": 14,
    "referenceIds": ["REF-2026-000118", "REF-2026-000119", "REF-2026-000204"],
    "initiatedAt": "2026-06-02T10:15:00Z"
  },
  "idempotencyKey": "otpGenerate:officer@nitda.gov.ng:1717322100"
}
```

**Response — success (v1 envelope):**
```json
{
  "ok": true,
  "status": { "http": 200 },
  "request": { "action": "otpGenerate", "correlationId": "c-7f3a91e2-otp-gen" },
  "timing": { "receivedAt": "2026-06-02T10:15:01Z", "durationMs": 412 },
  "data": {
    "otpId": "otp_3f9c2a77b1",
    "userEmail": "officer@nitda.gov.ng",
    "channel": "email",
    "sentTo": "officer@nitda.gov.ng",
    "expiresAt": "2026-06-02T10:20:01Z",
    "ttlSeconds": 300,
    "resendAvailableAt": "2026-06-02T10:15:31Z",
    "codeLength": 6
  },
  "errors": [],
  "meta": { "flowName": "OTP Generate", "family": "F6" }
}
```

> Security note: the OTP code itself is **never** returned to the client (server-emailed only).
> The client retains `otpId` + `expiresAt` and submits the user-typed code back in B.3.

### B.2 — OTP Verify (stateless verification handshake — standalone)

**Endpoint key:** `OTP_VERIFY` (live; family F6). Used when verification is a discrete step before the assign call; if the flow validates inline, skip to B.3 (the assign payload carries the token).

**Request — `POST` body:**
```json
{
  "action": "otpVerify",
  "operation": "verify",
  "mode": "single",
  "source": "DGO_FAST_Track_WEB_OPS",
  "userEmail": "officer@nitda.gov.ng",
  "otpId": "otp_3f9c2a77b1",
  "code": "402915",
  "idempotencyKey": "otpVerify:otp_3f9c2a77b1:1717322160"
}
```

**Response — success (v1):**
```json
{
  "ok": true,
  "status": { "http": 200 },
  "request": { "action": "otpVerify", "correlationId": "c-7f3a91e2-otp-vrf" },
  "timing": { "receivedAt": "2026-06-02T10:16:00Z", "durationMs": 188 },
  "data": {
    "otpId": "otp_3f9c2a77b1",
    "verified": true,
    "verificationToken": "vt_9a81c4ef20b7e5",
    "tokenExpiresAt": "2026-06-02T10:26:00Z",
    "remainingAttempts": 5
  },
  "errors": [],
  "meta": { "flowName": "OTP Verify", "family": "F6" }
}
```

### B.3 — Bulk Assignment (final transmission carrying the user token)

**Endpoint key:** `BULK_ASSIGNMENT` (live; family F3).

**Request — `POST` body:**
```json
{
  "action": "bulkassignment",
  "operation": "create",
  "mode": "bulk",
  "source": "DGO_FAST_Track_WEB_OPS",
  "userEmail": "officer@nitda.gov.ng",
  "otp": {
    "otpId": "otp_3f9c2a77b1",
    "code": "402915",
    "verificationToken": "vt_9a81c4ef20b7e5"
  },
  "assignment": {
    "assignmentType": "BULKASSIGN",
    "assignedTo": "directorate.officer@nitda.gov.ng",
    "priority": "P2",
    "dueDate": "2026-06-04T17:00:00Z",
    "instructions": "Action and revert before COB Thursday."
  },
  "items": [
    { "ID": "REF-2026-000118", "RefIDD": "REF-2026-000118", "Title": "Budget circular Q3", "directorate": "DSU-CORP" },
    { "ID": "REF-2026-000119", "RefIDD": "REF-2026-000119", "Title": "MoU draft — partner agency", "directorate": "DSU-CORP" },
    { "ID": "REF-2026-000204", "RefIDD": "REF-2026-000204", "Title": "Audit query response", "directorate": "DSU-CORP" }
  ],
  "idempotencyKey": "bulkassignment:officer@nitda.gov.ng:1717322200"
}
```

**Response — full success (v1):**
```json
{
  "ok": true,
  "status": { "http": 200 },
  "request": { "action": "bulkassignment", "correlationId": "c-bulk-55ad12" },
  "timing": { "receivedAt": "2026-06-02T10:16:40Z", "durationMs": 2140 },
  "data": {
    "otpAccepted": true,
    "requested": 3,
    "succeeded": 3,
    "failed": 0,
    "results": [
      { "ref": "REF-2026-000118", "ok": true, "taskId": "TSK-91001", "status": "assigned" },
      { "ref": "REF-2026-000119", "ok": true, "taskId": "TSK-91002", "status": "assigned" },
      { "ref": "REF-2026-000204", "ok": true, "taskId": "TSK-91003", "status": "assigned" }
    ]
  },
  "errors": [],
  "meta": { "flowName": "Docoument_Bulk_Task_Assignment_Create", "family": "F3" }
}
```

**Response — partial success (drives the partial-success UI, D-4c):**
```json
{
  "ok": true,
  "status": { "http": 207 },
  "request": { "action": "bulkassignment", "correlationId": "c-bulk-55ad13" },
  "timing": { "receivedAt": "2026-06-02T10:16:41Z", "durationMs": 2310 },
  "data": {
    "otpAccepted": true,
    "requested": 3,
    "succeeded": 2,
    "failed": 1,
    "results": [
      { "ref": "REF-2026-000118", "ok": true,  "taskId": "TSK-91004", "status": "assigned" },
      { "ref": "REF-2026-000119", "ok": true,  "taskId": "TSK-91005", "status": "assigned" },
      { "ref": "REF-2026-000204", "ok": false, "kind": "DIRECTORATE_MISMATCH", "message": "Cross-directorate assignment requires DG approval." }
    ]
  },
  "errors": [
    { "kind": "DIRECTORATE_MISMATCH", "ref": "REF-2026-000204", "message": "Cross-directorate assignment requires DG approval." }
  ],
  "meta": { "flowName": "Docoument_Bulk_Task_Assignment_Create", "family": "F3" }
}
```

**Response — OTP rejected (triggers `ASSIGNMENT-FAILED` rollback, B-1):**
```json
{
  "ok": false,
  "status": { "http": 401 },
  "request": { "action": "bulkassignment", "correlationId": "c-bulk-55ad14" },
  "timing": { "receivedAt": "2026-06-02T10:16:42Z", "durationMs": 190 },
  "data": null,
  "errors": [
    { "kind": "OTP_INVALID", "field": "otp.code", "message": "The verification code is incorrect or has expired.", "remainingAttempts": 4 }
  ],
  "meta": { "flowName": "Docoument_Bulk_Task_Assignment_Create", "family": "F3" }
}
```

### B.4 — Outbound Dispatch (Phase 5 delivery route)

**Endpoint key:** **does not yet exist.** Proposed key `DISPATCH_OUTBOUND` (G-4) — **requires NITDA-side flow design or adoption of the existing `DYNAMIC_GLOBAL_ACTIONS` flow** (`operation:'dispatch'`). Contract drafted so the PA author can build to it.

**Request — `POST` body:**
```json
{
  "action": "dispatchOutbound",
  "operation": "dispatch",
  "mode": "single",
  "source": "DGO_FAST_Track_WEB_OPS",
  "userEmail": "dgoffice@nitda.gov.ng",
  "referenceId": "REF-2026-000118",
  "approvalId": "APR-77120",
  "channel": "email",
  "recipients": {
    "to": ["partner.agency@example.gov.ng"],
    "cc": ["records@nitda.gov.ng"],
    "physical": []
  },
  "payload": {
    "subject": "NITDA response — Budget circular Q3",
    "bodyRef": "DOC-44218",
    "attachments": ["DOC-44218", "DOC-44219"]
  },
  "dispatchOptions": {
    "requireDeliveryReceipt": true,
    "noDispatchReason": null
  },
  "idempotencyKey": "dispatchOutbound:REF-2026-000118:1717322500"
}
```

**Response — accepted / in-flight (async confirmation, see Q-9):**
```json
{
  "ok": true,
  "status": { "http": 202 },
  "request": { "action": "dispatchOutbound", "correlationId": "c-disp-001a" },
  "timing": { "receivedAt": "2026-06-02T10:21:40Z", "durationMs": 880 },
  "data": {
    "dispatchId": "DSP-60012",
    "referenceId": "REF-2026-000118",
    "channel": "email",
    "state": "dispatch-in-flight",
    "acceptedAt": "2026-06-02T10:21:40Z",
    "receiptExpected": true,
    "receiptCallbackVia": "FETCH_ALL"
  },
  "errors": [],
  "meta": { "flowName": "DISPATCH_OUTBOUND (proposed)", "family": "F7" }
}
```

**Response — delivered (synchronous confirmation path):**
```json
{
  "ok": true,
  "status": { "http": 200 },
  "request": { "action": "dispatchOutbound", "correlationId": "c-disp-001b" },
  "timing": { "receivedAt": "2026-06-02T10:21:41Z", "durationMs": 1620 },
  "data": {
    "dispatchId": "DSP-60013",
    "referenceId": "REF-2026-000118",
    "channel": "email",
    "state": "dispatched",
    "deliveredAt": "2026-06-02T10:21:43Z",
    "receipt": { "messageId": "<a1b2@mail.example.gov.ng>", "acceptedBy": "mx.example.gov.ng" }
  },
  "errors": [],
  "meta": { "flowName": "DISPATCH_OUTBOUND (proposed)", "family": "F7" }
}
```

**Response — dispatch failed (drives `dispatch-failed` + retry UI):**
```json
{
  "ok": false,
  "status": { "http": 502 },
  "request": { "action": "dispatchOutbound", "correlationId": "c-disp-001c" },
  "timing": { "receivedAt": "2026-06-02T10:21:42Z", "durationMs": 5300 },
  "data": { "dispatchId": "DSP-60014", "referenceId": "REF-2026-000118", "state": "dispatch-failed" },
  "errors": [
    { "kind": "DISPATCH_FAILED", "ref": "REF-2026-000118", "retryable": true, "message": "Downstream mail relay timed out.", "retryAfterSeconds": 60 }
  ],
  "meta": { "flowName": "DISPATCH_OUTBOUND (proposed)", "family": "F7" }
}
```

### B.5 — Error Taxonomy Matrix (the exact `ok:false` shape and `kind` → UI mapping)

**Canonical failure envelope (v1):**
```json
{
  "ok": false,
  "status": { "http": 401 },
  "request": { "action": "<action>", "correlationId": "<id>" },
  "timing": { "receivedAt": "<iso>", "durationMs": 0 },
  "data": null,
  "errors": [
    {
      "kind": "OTP_INVALID",
      "field": "otp.code",
      "ref": "REF-2026-000204",
      "message": "Human-readable, surfaced via I18n key — never rendered raw.",
      "retryable": true,
      "retryAfterSeconds": 0,
      "remainingAttempts": 4
    }
  ],
  "meta": { "flowName": "<flow>", "family": "<Fn>" }
}
```

**`kind` → platform UI behavior (machine-readable taxonomy, cross-ref A-10):**

| `kind` | HTTP | Platform reaction | UI surface (i18n key) | Retryable |
|---|---|---|---|---|
| `OK` | 200/202/207 | proceed / partial-merge | — | — |
| `AUTH_FAILED` | 401 | force persona re-auth; abort write | `error.auth.failed` (danger toast) | no |
| `OTP_REQUIRED` | 428 | open OTP modal (PA-handshake) | `otp.required` (modal) | n/a |
| `OTP_INVALID` | 401 | keep modal open; decrement attempts; on 0 → `ASSIGNMENT-FAILED` rollback | `otp.invalid` (inline field error) | yes |
| `OTP_EXPIRED` | 410 | offer resend (`OTP_GENERATE`) | `otp.expired` (inline + resend) | yes |
| `DIRECTORATE_MISMATCH` | 403 | block item; flag for DG approval | `error.directorate.mismatch` (per-row badge) | no |
| `RATE_LIMITED` | 429 | back off `retryAfterSeconds`; disable submit | `error.rateLimited` (warning banner) | yes |
| `VALIDATION_FAILED` | 422 | focus offending `field`; block submit | `error.validation` (inline field) | yes |
| `NOT_AUTHORIZED` | 403 | hide/disable action; audit attempt | `error.notAuthorized` (toast) | no |
| `DISPATCH_FAILED` | 502/504 | mark `dispatch-failed`; show retry | `dispatch.failed` (card action) | yes |
| `CONFLICT_IDEMPOTENT` | 409 | treat as success (already applied) | silent / `info.alreadyApplied` | no |
| `UPSTREAM_TIMEOUT` | 504 | retry w/ backoff; preserve draft | `error.timeout` (warning) | yes |
| `INTERNAL_ERROR` | 500 | abort; capture correlationId to Diagnostics | `error.internal` (danger toast) | no |

> **Partial-batch rule:** for batch writes the top-level may be `ok:true, http:207` while individual
> `data.results[]` entries carry their own `ok:false` + `kind`. The UI must render per-row outcomes
> (D-4c) and only roll back the failed subset — never the whole batch.

---

## 4. Phase 2 Close-Out Status

- **9/9 deferred modules audited from source.** 17 new defects logged as **Section K** (8 Must-Fix / 8 Should-Fix / 1 Defer).
- **3 mandated questions answered** with source citations (assistant leak vector relocated, not present; approvals authority + escalation cap both absent; assignment safe to delete with corrected absorption target).
- **4 Power Automate contracts drafted** non-truncated (OTP generate, OTP verify, bulk assign w/ token, dispatch outbound) + full error taxonomy matrix.
- **Master register total** moves from **92 → 109** entries (Sections A–J = 92, Section K = 17). The 9 "Pending Audit" placeholders in the old roll-up are now **resolved** into concrete Section-K entries.
- **No Phase-4 execution code written.** Phase 3 remains the next gate.

### Carry-forward into Phase 3 (Consolidation Architecture)
1. **CF-1** — programmatic zero-dependency browser smoke harness (Gate III).
2. **CF-2** — blanket `nav.config.js` rewrite + per-module `phase:` declaration (J-1).
3. **CF-3** — endpoint reconciliation: B-1 OTP handshake already provisioned (`OTP_GENERATE`+`OTP_VERIFY`); only `pf-otp-modal` client logic to rewrite. `DISPATCH_OUTBOUND` still needs NITDA-side flow (G-4).
4. **Approvals** is heavier than F-1 implied: authority gate + escalation cap + lexicon correction + edit-diff + a live `ReferenceError` — schedule early in Wave 7.

**Phase 3 authorization is now unblocked pending user sign-off of this supplemental register.**
