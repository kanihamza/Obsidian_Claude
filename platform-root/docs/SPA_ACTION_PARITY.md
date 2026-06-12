# SPA Action/Function Parity (A3 — verb-level reconciliation)

> Each SPA's invoked action/operation verbs vs the platform's real action vocabulary (endpoint defaults +
> every action:/operation: dispatched in platform-root). Normalized compare (UPDATE_TASK == updateTask).
> CAPTURED = the verb (or its normalized form) exists in the platform. UNCAPTURED verbs are the concrete
> candidate gaps — confirm each is a real feature (not a dead/legacy verb) before building.

## Summary
- Platform distinct action verbs: 32
- SPA verbs: total invocations 84 across 20 SPAs
- Distinct UNCAPTURED verbs (candidate gaps): **23**

## Per-SPA
| SPA | source | verbs | captured | UNCAPTURED verbs |
|---|---|---|---|---|
| spa-01 | REGEN_DGO_LIVE_V2_8_ENHANCED_FINAL.html | 11 | 6/11 | markDG, reassign, eventinfo, EVENT INFO, setReminder |
| spa-02 | NITDA_Digital_Ops_Hub_patched.html | 11 | 9/11 | getTasks, emailsfetch |
| spa-03 | Optimized_NITDA DGO Smart Orchestrator Merged Launcher.html | 4 | 2/4 | fetch_tasks, emailsfetch |
| spa-04 | dg_ceo_office_platform-1.html | 6 | 0/6 | route_document, process_correspondence, launch_approval, prepare_meeting_pack, issue_trip_clearance, escalate_risk |
| spa-05 | DGO_FastTrack_Monitoring_SPA.html | 5 | 3/5 | getTasks, emailsfetch |
| spa-06 | Assignment_Intelligence_Dashboard.html | 2 | 1/2 | getTasks |
| spa-07 | DAA_DGO_HUB_ASSIGN_ITEM_DIRECT_Build_v2.0.html | 9 | 7/9 | getTasks, emailsfetch |
| spa-08 | stats_screen_spa-2.html | 7 | 3/7 | generateReport, lookupTasksReports, sendEmailV2, htmlReportsRun |
| spa-09 |  Response Tracking & Matrix.html | 2 | 1/2 | acknowledge_task |
| spa-10 | Correspondence_Tracker.html | 0 | 0/0 | — |
| spa-11 | Response matrix v2.html | 5 | 2/5 | fetch_tasks, emailsfetch, fetchReferencesAndLookups |
| spa-12 | NITDA_DGO_HUB_ACK.html | 5 | 3/5 | getTasks, search |
| spa-13 | Unified Smart Orchestrator.html | 4 | 2/4 | getReferences, getTasks |
| spa-14 | Reports_Dashboard_Live.html | 2 | 0/2 | initial_load, SendEmailV2_Equivalent |
| spa-15 | DGCEO Correspondence & Decision Hub.html | 1 | 1/1 | — |
| spa-16 | registry_movement.html | 0 | 0/0 | — |
| spa-17 | approvals.html | 0 | 0/0 | — |
| spa-18 | Executive_Operations_Hub_Build_v2.0.html | 0 | 0/0 | — |
| spa-19 | Comments_Thread.html | 0 | 0/0 | — |
| spa-20 | HTML Reports_Builder_SPA.html | 10 | 8/10 | getTasks, emailsfetch |

## Distinct UNCAPTURED verbs (union — the real to-verify list)

| verb | seen in |
|---|---|
| `acknowledge_task` | spa-09 |
| `emailsfetch` | spa-02, spa-03, spa-05, spa-07, spa-11, spa-20 |
| `escalate_risk` | spa-04 |
| `eventinfo` | spa-01 |
| `fetchReferencesAndLookups` | spa-11 |
| `fetch_tasks` | spa-03, spa-11 |
| `generateReport` | spa-08 |
| `getReferences` | spa-13 |
| `getTasks` | spa-02, spa-05, spa-06, spa-07, spa-12, spa-13, spa-20 |
| `htmlReportsRun` | spa-08 |
| `initial_load` | spa-14 |
| `issue_trip_clearance` | spa-04 |
| `launch_approval` | spa-04 |
| `lookupTasksReports` | spa-08 |
| `markDG` | spa-01 |
| `prepare_meeting_pack` | spa-04 |
| `process_correspondence` | spa-04 |
| `reassign` | spa-01 |
| `route_document` | spa-04 |
| `search` | spa-12 |
| `sendEmailV2` | spa-08 |
| `SendEmailV2_Equivalent` | spa-14 |
| `setReminder` | spa-01 |

## Platform action vocabulary (reference)

`Action` · `For action` · `INIT` · `UPDATE_TASK` · `addComment` · `aiAnalyseEmail` · `aiAnalyseEventDocs` · `aiChat` · `analyse` · `bulkassignment` · `create` · `createTaskFromEmail` · `delete` · `deleteComment` · `dispatch` · `dynamicGlobalAction` · `editComment` · `emailtotaskassignment` · `fetchAll` · `fetchEmailAttachments` · `flagDocument` · `generate` · `getDocs` · `lookups` · `otpGenerate` · `otpVerify` · `ping` · `read` · `respond` · `singleassignment` · `update` · `verify`

> Note: a verb appearing UNCAPTURED may still be functionally covered if the platform implements the
> same behaviour under a different verb/endpoint (the GUID repoint, see SPA_PARITY_MATRIX.md). Verb match is
> a strong signal but each UNCAPTURED entry needs a 1-line confirm before it becomes a build item.
