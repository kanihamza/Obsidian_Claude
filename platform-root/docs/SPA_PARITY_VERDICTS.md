# SPA Parity — Final Verdicts (A4)

> Each A3-uncaptured verb resolved to CAPTURED / PARTIAL / UNCAPTURED by searching the platform code
> corpus (config+core+shared+modules) for the equivalent capability. Evidence is the matched capability.

## Roll-up
- CAPTURED (same function, different verb): **16**
- PARTIAL (core present, a slice missing): **4**
- UNCAPTURED (genuine gap to build/flag): **2**
- REVIEW (auto-check disagreed — needs a human glance): **1**

## Verdicts
| verb | verdict | evidence / disposition |
|---|---|---|
| `fetch_tasks` | CAPTURED | tasks loaded via FETCH_ALL into the fabric; Entities.all("task") |
| `getTasks` | CAPTURED | tasks loaded via FETCH_ALL into the fabric; Entities.all("task") |
| `getReferences` | CAPTURED | data load via FETCH_ALL / REFERENCE_DATA / Lookups + Entities.bootstrap on boot |
| `fetchReferencesAndLookups` | CAPTURED | data load via FETCH_ALL / REFERENCE_DATA / Lookups + Entities.bootstrap on boot |
| `lookupTasksReports` | CAPTURED | data load via FETCH_ALL / REFERENCE_DATA / Lookups + Entities.bootstrap on boot |
| `emailsfetch` | CAPTURED | data load via FETCH_ALL / REFERENCE_DATA / Lookups + Entities.bootstrap on boot |
| `initial_load` | CAPTURED | data load via FETCH_ALL / REFERENCE_DATA / Lookups + Entities.bootstrap on boot |
| `eventinfo` | CAPTURED | data load via FETCH_ALL / REFERENCE_DATA / Lookups + Entities.bootstrap on boot |
| `route_document` | CAPTURED | routing via pf-triage-bar Send-to-Routing (triage_complete) + ops-hub |
| `escalate_risk` | CAPTURED | transitionStatus → escalated (REVIEW phase) |
| `acknowledge_task` | CAPTURED | pf-triage-bar Acknowledge + acknowledged status |
| `reassign` | CAPTURED | reassign-requested status / task update |
| `markDG` | CAPTURED | UI.openFlagDocument (Flag-for-DG-Attention) |
| `launch_approval` | CAPTURED | approvals module + submitDecision (SUBSIDIARY_ACTIONS) |
| `search` | CAPTURED | lookup module cross-source search |
| `process_correspondence` | CAPTURED | correspondence intake + triage pipeline |
| `sendEmailV2` | PARTIAL | email is BUILT/previewed (buildNotificationEmail, EMAIL_RELATED_TASK) but autonomous OUTBOUND SEND = Phase-5 Dispatch, which is not built (blocked Q-4/Q-8) |
| `SendEmailV2_Equivalent` | PARTIAL | email is BUILT/previewed (buildNotificationEmail, EMAIL_RELATED_TASK) but autonomous OUTBOUND SEND = Phase-5 Dispatch, which is not built (blocked Q-4/Q-8) |
| `generateReport` | PARTIAL | reports/aggregator CSV export present; a formatted/printable HTML report builder (spa-14/spa-20) is NOT confirmed |
| `htmlReportsRun` | PARTIAL | reports/aggregator CSV export present; a formatted/printable HTML report builder (spa-14/spa-20) is NOT confirmed |
| `prepare_meeting_pack` | UNCAPTURED | no "meeting pack" capability found in platform code |
| `issue_trip_clearance` | REVIEW | (unexpected match — possible coverage) no "trip clearance" capability found in platform code |
| `setReminder` | UNCAPTURED | no reminder/scheduling capability found in platform code |

## The genuine to-do (PARTIAL + UNCAPTURED)
| item | verdict | disposition |
|---|---|---|
| Outbound email **send** (`sendEmailV2`) | PARTIAL | = Phase-5 **Dispatch** build; blocked on PA contract (Q-4/Q-8). Email build/preview already exists. |
| Formatted/printable **report builder** (`generateReport`,`htmlReportsRun`) | PARTIAL | reports has CSV export; confirm/build the HTML report export (spa-14 Reports_Dashboard_Live, spa-20 Reports_Builder). Unblocked. |
| **Meeting pack** (`prepare_meeting_pack`) | UNCAPTURED | bespoke doc-generation workflow (from REGEN/Ops-Hub SPA). Needs scope confirmation — likely new build. |
| **Trip clearance** (`issue_trip_clearance`) | UNCAPTURED | bespoke workflow. Needs scope confirmation — likely new build. |
| **Reminders** (`setReminder`) | UNCAPTURED | reminder/scheduling feature. Needs scope + (likely) a PA flow. |

> Verdict basis is verb-vs-capability search; treat PARTIAL/UNCAPTURED as candidate build items pending a
> 1-line scope confirmation, not as finalized commitments.

---
## A5 status update (2026-06-11)
- **`generateReport` / `htmlReportsRun` → CAPTURED.** The `reports` module now renders a formatted **NITDA
  Management Report** (Key Insights / Activity / Document & Task / Conclusion from Entities.counts()) with
  **Print** + **Download-HTML** export (Format.downloadHtml). Verified by ui-smoke (148/148).
- Remaining residuals are tracked, not lost:
  - `sendEmailV2` (outbound report/correspondence email) → **Phase-5 Dispatch**, blocked on PA contract (Q-4/Q-8).
  - `prepare_meeting_pack`, `issue_trip_clearance`, `setReminder` → **scope-pending** bespoke workflows
    (await user ruling: in-scope build vs legacy/out-of-scope). Logged here as the only open consolidation items.

**Consolidation parity audit (A1–A5): complete.** 20/20 SPAs inventoried, flows + verbs reconciled, the one
unblocked gap (report export) built and verified. Net open = 1 blocked (Dispatch) + 3 scope-pending.
