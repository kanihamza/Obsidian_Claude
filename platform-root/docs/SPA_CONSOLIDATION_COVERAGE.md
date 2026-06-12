# SPA → Platform Consolidation Coverage (baseline)

> **Status: DECLARED coverage, NOT verified parity.** This map is reconstructed from each module's
> provenance header in the consolidated `platform-root` code. The original single-file HTML SPAs were
> **not** present in the repo when this baseline was written, so "all features captured / nothing lost"
> is **unverified** (Strict Output Rule 11.4). When the SPA sources land in the repo, run the audit
> protocol below and replace each "declared" row with a verified gap list.

## Declared coverage (module ← source SPA/surface)

| Platform module | Source SPA / surface (per provenance) | Key features the module declares it carries |
|---|---|---|
| `correspondence` | **Correspondence_Tracker** + **DGCEO Decision Hub** | records table (Reference·Subject·Sender·Dates·Priority·Status), CSV export, create, AI classification, decision detail + cross-links, `<pf-triage-bar>` (Phase-1 intake) |
| `registry` | **registry_movement.html** | per-Reference file-movement timeline (grouped vertical timeline) |
| `ops-hub` | **NITDA hub "Docs" view** | doc gallery + detail, Assign-from-doc, Flag-for-DG-attention, bulk-select → bulk-assignment, routing-queue scope (D-1) |
| `fasttrack` | **DGO_FastTrack_Monitoring** | SLA board: On-track / Due-soon / Overdue with live counts (K-1: working-hours math blocked on Q-5) |
| `single-item-ops` | **live single-assignment SPA** | rich pickers (category/assignee/co-assignee/CC), category cascade, chip groups (assignment type/priority/action-required), inline validation, live summary, canonical payload, draft autosave |
| `bulk-assignment` | **NITDA Digital Ops Hub bulk-assignment** | category/sub-category selects, assignee + co-assignee typeaheads, CC list, priority + action-required, stepper, handoff selection |
| `response-tracking` | **NITDA hub Response-Tracking matrix** | 5 sub-views (All · Docs · Emails · Tasks · Pairs), doc↔email pairing, task update |
| `orchestrator` | task-orchestration surface | filterable task list, row → active Reference, cross-links, CSV, task deep-link home |
| `comments` | comment-thread surface | threaded reply/edit/delete via `DYNAMIC_GLOBAL_ACTIONS`, follows cross-module context |
| `approvals` | approvals SPA (subsidiary actions) | pending queue, approve/reject, reason-gate, cross-links |
| `executive` | DG/CEO overview | top-line KPIs, priority mix, overdue attention, recent references, cross-links |
| `stats` | analytics SPA | KPI tiles, by-status bar, status donut, 14-day sparkline |
| `reports` | analytics/report SPA | KPI tiles + reference table + CSV |
| `home` | daily ops dashboard | greeting, hero KPIs + trend, attention/pulse, status-mix donut, quick actions, heatmap |
| `lookup` | **"System Record Lookup" SPA** | cross-source search, scope chips, advanced filters, grouped results, click-through |
| `assistant` | AI assistant SPA | `AI_CHAT` conversation with session history, scoped payload |
| `diagnostics` | operator diagnostics | endpoint health, per-endpoint ping, fabric telemetry, request log, audit |
| `settings` | **SPA settings screen** | per-endpoint URL override workspace (localStorage; admin-gated) |
| `assignment` | (legacy assignment SPA) | **marked for deletion (D-5)** pending disposition ruling — features claimed absorbed by single/bulk |

~18 named source surfaces across 19 active modules (+ `assignment`). The operator references **20** SPAs;
the exact 20-file manifest must come from the uploaded sources.

## Known parity-relevant gaps already on record

The CLAUDE.md 92-point register (Sections C–I) is an audit of these modules **against the Phase-1 spec**
(not a literal SPA diff). Several open Must-Fix items are "feature incompletely ported" in nature, e.g.:
correspondence triage gating (C-1), registry quarantine view (C-2), ops-hub scoping (D-1, done),
response-tracking my/team filter (E-2), pf-rich-picker fuzzy/virtual/recent (D-6), lookup archive scope
(I-5/H-9). See `docs/REGISTER_RECONCILIATION.md` for live status.

## Audit protocol (run when the SPA sources are in the repo)

For each uploaded SPA file:
1. Inventory its **UI controls**, **event handlers**, **endpoint calls** (and payload shapes), and
   **business rules / validation**.
2. Map each to its platform module (or mark **UNCAPTURED**).
3. Record a per-SPA gap list with severity (Must/Should/Defer) and disposition (Salvage/Build).
4. Add verified entries to `docs/REGISTER_RECONCILIATION.md` and close unblocked gaps with the standard
   gate (`tools/verify.sh`) + browser harness (`tools/ui-smoke.mjs`) discipline.
5. Re-present the coverage matrix with each row marked **VERIFIED** / **GAP** rather than **DECLARED**.
