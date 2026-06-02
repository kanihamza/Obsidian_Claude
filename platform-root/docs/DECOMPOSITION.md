# SPA Decomposition & De-duplication Ledger

The unit of work is the **view/capability**, not the file. Multi-view SPAs are *unbundled* across
canonical modules; features duplicated across SPAs become **one shared resource**, consumed everywhere.

## Unbundling map (view → module)
| Source SPA | Views | Unbundles into |
|---|---|---|
| Optimized_Orchestrator (11 views) | dashboard·explorer·matrix·reports·timeline·trends·(config/edge) | home · ops-hub · response-tracking · reports · registry · stats |
| Unified_Smart_Orchestrator | dashboard·decision-hub·dgo-track·response-tracking | home · correspondence · fasttrack · response-tracking |
| NITDA_Digital_Ops_Hub_patched (7 nav views) | home·docs·emails·tasks·assign·bulk·RT | **PORTED**: docs→ops-hub gallery+detail(assign/flag); RT matrix→response-tracking 5 sub-views(All/Docs/Emails/Tasks/Pairs+buildDocEmailPairs); emails→correspondence; tasks→orchestrator; assign→single-item-ops; bulk→bulk-assignment; home→home |
| NITDA_DGO_HUB_ACK (3) | dashboard·omni·tasks | home · (omni→global search) · ops-hub/approvals(ack) |
| DGO_FastTrack (3) | matched·matrix·pairs | fasttrack (internal sub-views) |
| DAA_DGO_HUB (4) | entry/single panels | single-item-ops |
| dg_ceo_office (57 fns) + Executive_Ops_Hub | DG/CEO OS | executive |
| HTML_Reports_Builder + Reports_Dashboard_Live | builder + live | reports |
| _Response_Tracking + Response_matrix_v2 | matrix + tracking | response-tracking (newest baseline + backport) |
| Correspondence_Tracker + DGCEO_Correspondence_Decision_Hub | tracker + decisions | correspondence |
| approvals · comments · registry_movement · Assignment_Intelligence · stats_screen · REGEN | 1:1 | approvals · comments · registry · assignment · stats · bulk-assignment |

## De-duplication ledger (feature in ≥2 SPAs → shared resource)
| Duplicated feature | Shared resource (single implementation) |
|---|---|
| Status badge | `styles/components.css .pf-badge--*` + status taxonomy in tokens |
| Reference search / filter bar | `shared/components/pf-filter-bar` (EMITTED, shared) → search+status, reads `Entities` |
| Data table + CSV export | `shared/utils/render.js#renderTable` (done) |
| Stat cards / KPI tiles | `render.js#renderStats` (done) → fed by `Entities.counts()` |
| Attachment chip | `shared/components/pf-attachment` (EMITTED) → FETCH_EMAIL_ATTACHMENTS; consumed by single-item-ops |
|  Comment thread | `shared/components/pf-comment-thread` (EMITTED, shared) consumed by `comments` lens |
| OTP gate | `pf-otp-modal` (EMITTED) → OTP_GENERATE/VERIFY; gates the bulk-assignment write |
| AI-analyse action | `shared/utils/ai.js` (EMITTED) → AI_DOC_ANALYSIS / AI_EMAIL_ANALYSIS / AI_CHAT; analyse wired in single-item-ops (AI_CHAT util ready, no chat UI yet) |
| Toast / modal / loading | `pf-toast` / `pf-modal` / orbit loader (done) |
| Entity cross-link | `Platform.goToEntity` (done) |

Rule: when porting a module, if a feature appears in another SPA, **promote it to the shared resource
above and consume it** — never re-implement module-locally. New shared widgets are emitted into
`shared/components` / `shared/utils` and recorded here.
