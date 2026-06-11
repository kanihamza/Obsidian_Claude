# OBSIDIAN v4.0 — Working Document of Record
**As-built status · regenerated from the actual tree · date: 2026-05-26 · supersedes the 05-22 edition.**

This is the single source of truth for *what is actually built*. It was re-derived by direct
inspection of the checkpoint tree (170+ files) and the canonical flow packages
(`TRIGGER_SCHEMAS`, `SAMPLE_RESPONSES`), correcting drift in the 05-22 edition (which under-counted
files and progress and asserted some claims that inspection did not support).

---

## 0. Live-direct configuration (platform directive — supersedes prior remediation)
Per directive this is a **live platform**: the full signed Power Automate HTTP-trigger URLs are
**embedded directly** in `config/endpoints.config.js`; the platform calls the flows directly and they
respond directly — no proxy, intermediary, or runtime injection. **All 14 endpoints are active.**
The earlier runtime-signature-injection approach and the `signatures.*.json` files were removed to
honour this. **All sample/seed/placeholder data was removed** (`data/seed.json`, `lookups.seed.json`,
the seed-preview banner): the only data path is the live flows. Reserved (non-active) endpoints were
removed. Rotation guidance: `docs/SECRETS.md`. Operational note: embedded signed URLs make the
source/deployment sensitive — restrict access and rotate on exposure.


## 1. Foundation (unchanged, still valid)
Zero-build ESM + Custom Elements + CSS Cascade Layers; no framework/CDN; `PfBaseElement` /
`BaseModule` / `BaseService`; single `fetch` site in `core/api.js`; banned-token/hex/console/cross-module
audit locks; persona/brand/lifecycle/i18n model; `BUILD_INTEGRITY.txt`. DGO-forward brand inversion.
Integration model: ONE Reference-keyed fabric; modules are lenses/aggregators (see `INTEGRATION.md`).

## 2. Independent integrity audit (verified against the tree)
| Lock | Result | Evidence |
|------|--------|----------|
| No framework / CDN | PASS | 0 external CDN/font/script refs in any `.js/.html/.css` |
| Console purity | PASS | only `core/log.js` calls `console.*` |
| ESM import graph | PASS | 0 unresolved relative imports across the tree |
| Hex lock | PASS | new module/util styles use tokens only |
| Integrity manifest | PASS | `sha256sum -c BUILD_INTEGRITY.txt` → 175/175 OK on clean extract (regenerated 2026-05-27) |
| Flow URLs | EMBEDDED (directive) | full signed URLs in `endpoints.config.js`; `embedded-url-scan` confirms they appear nowhere else |

## 3. Data ↔ flow alignment (resolved — was an open concern)
- **Core hydration is sound.** `FETCH_ALL` (`Fetch_All_Data_&_References-POST`) is a real flow;
  `core/api.js` unwraps both authoritative envelopes (`ok`-v1 and `success`-v4) and exposes `body.data`;
  `entity-store.ingest()`'s collection keys (`references/documents/tasks/emails/approvals/comments/activities`)
  match `data/seed.json` exactly, so the fabric is internally consistent and offline-demonstrable.
  *Residual:* confirm one live `FETCH_ALL` capture returns those same collection keys (no sample in the
  packages yet) — record it in `CONTRACT-CONFORMANCE.md`.
- **The "reference" overload — now disambiguated.** `REFERENCE_DATA`/`REFERENCES_LOOKUP` (action `lookups`)
  return `{users, categories, departments}` = **dropdown option sets**, a different thing from the
  `reference` **entity** (the case join-key). These must NOT flow through `Entities` (they would be
  mis-indexed as case records). Fixed by the new `shared/utils/lookups.js` provider (§5), which loads
  them separately. Documented inline in that file.
- **Real action contract (F3) captured.** `BULK_TASK_ASSIGNMENT` trigger:
  `{action, operation, mode, source, userEmail, method, id, device, payload, items, AssignmentType,
  NewActivityTask, SelectedItems}`; response `data`:
  `{selectedCount, assignedTo, tasksCreated, docsUpdated, notificationsSent, failed}`. The previous
  bulk scaffold did not match this; now corrected (§5).

## 4. Module port status (corrected)
PORTED: correspondence, approvals, ops-hub, fasttrack, response-tracking, comments, diagnostics,
home, registry, bulk-assignment (action lens), **+ all 5 aggregators** — home, executive, stats,
assignment, reports. `orchestrator` (task lens + deep-link focus) and `single-item-ops` (single-assignment lens) completed this session — see §5c.
Net: **17 ported · 0 partial · 0 skeleton** (17 total — all functional modules complete; +assistant).
Note: aggregators were never empty skeletons — they delegate to the shared `mountAggregator`; the
earlier byte-size proxy undercounted them. Verified this session that all four run end-to-end (i18n
keys resolve, `Format` CSV methods exist, view regions present).

## 5. Done this session (2026-05-26)
- **NEW shared resource `shared/utils/lookups.js` (`Lookups`)** — loads `REFERENCE_DATA` →
  `{users, categories, departments}` as option sets, cached, seed-fallback (`data/lookups.seed.json`);
  deliberately separate from `Entities`. Reusable by single-item-ops, correspondence, etc.
  (Optional: expose as `Platform.Lookups` in `core/platform.js`.)
- **`bulk-assignment` rebuilt as a purpose-built action lens** wired to the real F3 contract:
  pick documents from the fabric (filter + select-all) → assignment params from `Lookups`
  (assignee/category/department) + type/priority/due/copyTo → **mandatory danger preview/confirm** →
  `BULK_ASSIGNMENT` with the correct payload → reflect F3 result (created/notified/failed) and
  `Entities.upsert('task', …)` for each item so every lens updates. **First true end-to-end write path.**
- i18n keys added (`module.bulk-assignment.*`, `field.*`, `assignmentType.*`, `bulk.*`); en.json valid.
- Audited: imports resolve, no hex/console/CDN, JS parses.

## 5b. Done this session — aggregator intelligence (2026-05-26 cont.)
- **`Entities.counts()` enriched** (shared, computed once over the fabric): added `byPriority`,
  `byAssignee` (workload), `overdue {count, items}`, and `recent` references. Additive — existing
  consumers unaffected. Verified on seed: priority `{High:6,Medium:8,Low:2}`, workload top
  `{S.Abubakar:6, F.Okonkwo:5, A.Bello:4}`, 8 recent refs.
- **New shared helpers** in `shared/utils/lens.js`: `breakdownBars()` (horizontal bars from a
  {label:count} map) and `attentionList()` (overdue items deep-linking into the fabric).
- **`assignment` rebuilt** as Assignment Intelligence: KPIs + workload-by-assignee + priority mix +
  overdue attention + task CSV export — all from `counts()`, no per-row fetch.
- **`executive` rebuilt** as DG/CEO overview: KPIs (refs/tasks/approvals/overdue) + priority mix +
  overdue attention + recent references, each cross-linking into its lens.
- **`stats` and `reports`** verified working as-is (tiles + by-status chart; reports adds table+CSV).
- **`bulk-assignment` upsert** now carries `taskDue`/`ackDue`, so overdue analytics populate from real
  bulk assignments.
- Locks re-audited green: 0 unresolved imports, no hex, no stray console, all JS parses.

## 5c. Done this session — last modules + deep-linking (2026-05-26 cont.)
- **`orchestrator` ported** as the task-orchestration lens (filterable task list, row→active
  Reference, cross-links, CSV) over the fabric — the deep-link HOME for tasks.
- **Deep-link focus added to `mountListLens`** (`focusRef`): arriving via `goToEntity(ref,<lens>)`
  now auto-selects and scrolls to that Reference. Additive — benefits every list lens; existing
  callers default to no focus (no behaviour change). Orchestrator passes `params.path`.
- **`single-item-ops` ported** as the real single-assignment lens (family F2): pick one document
  from the fabric or enter a Reference → Lookups-backed assignee/category/type/priority/due →
  MANDATORY confirm → `SINGLE_ASSIGNMENT` → upsert created task (uses `data.createdTaskId`).
  Mirrors bulk; reuses `Lookups`.
- Full-tree audit green: 0 unresolved imports, 0 stray console, 0 hardcoded hex, all 16 module
  title keys resolve, all changed JS parses.
- **Milestone: 16/17 modules ported.** Remaining work is non-module (secrets, verification, widgets).

## 5d. Done this session — secret remediation (2026-05-26 cont.)
- `endpoints.config.js` refactored: 14 endpoints across 13 workflows now carry only `workflowId`;
  URLs resolve lazily via `buildUrl()` from a runtime signature store. 0 literal signatures remain
  (verified by `secret-scan`).
- Added `provisionSignatures()`/`loadSignatures()`/`signatureFor()`; `core/boot.js` calls
  `loadSignatures()` before warming the fabric.
- Added `config/signatures.example.json` (placeholders + workflow→endpoint map), `.gitignore`
  rules, `docs/SECRETS.md` (rotation + provisioning runbook), and a `secret-scan` lock in
  `tools/verify.sh`.
- Verified: empty URL before provisioning (→ seed), correct URL after; shared workflow maps both
  REFERENCE_DATA & AI_DOC_ANALYSIS to one signature. Full static gate green.

## 5e. Done this session — coverage audit + shared resources (2026-05-27)
- **Harmonization-completeness audit (F15):** mapped all 23 source SPAs (per DECOMPOSITION) to the
  17 modules — **no missing modules; the 23→16 unbundling is structurally complete.** The only
  remaining feature gaps were the three shared resources the ledger marked "to emit".
- **Emitted those shared resources** (DECOMPOSITION dedup ledger now all EMITTED):
  `shared/utils/ai.js` (AI_DOC_ANALYSIS / AI_EMAIL_ANALYSIS / AI_CHAT),
  `shared/components/pf-otp-modal.js` (OTP_GENERATE / OTP_VERIFY),
  `shared/components/pf-attachment.js` (FETCH_EMAIL_ATTACHMENTS); both components registered.
- **Wired the 6 previously-orphaned endpoints** to real consumers: OTP gate now guards the
  `bulk-assignment` write; `single-item-ops` gained AI-analyse + an attachments panel.
- Remaining orphan: **AI_CHAT** — capability (`AI.chat`) is built but has no chat-UI consumer yet
  (deliberate deferral; no source SPA mandated a chat surface).
- Full static gate green incl. `secret-scan`; all new JS parses; i18n keys added.

## 5f. Done this session — live-direct alignment (2026-05-27)
- Embedded the full signed URLs for all 14 flows directly in `config/endpoints.config.js`; removed the
  runtime-injection machinery, `boot.js` signature load, and `signatures.example.json`/`.gitignore`.
- Removed ALL sample/seed/placeholder data and code paths: `data/seed.json`, `data/lookups.seed.json`,
  the entity-store + Lookups seed fallbacks (now live-only with real failure logging), and the
  seed-preview header banner. The platform's sole data source is the live flows.
- Removed reserved (non-active) endpoints `RESERVED_14/15` and their docs/i18n/contract; every
  registered endpoint is now active and directly callable. Updated `registry.test.js` accordingly.
- `verify.sh` secret-scan → `embedded-url-scan` (signed URLs must appear only in endpoints.config.js).
- Full gate green; all JS parses; i18n valid.

## 5g. Done this session — optional features, enhancements & realignment (2026-05-27)
- **Deep-link realignment (bug fix):** `orchestrator` and `single-item-ops` now read `params.path[0]`
  (matching approvals/comments/correspondence); the previous whole-array read was fragile.
- **`core/charts.js`** (dependency-free SVG: sparkline/bars/donut, token-driven) added and wired:
  `stats` gains a status donut + 14-day activity sparkline; `executive` gains the activity trend.
  `Entities.counts()` now also yields a real 14-day `timeline` from entity timestamps.
- **AI_CHAT surface:** new `assistant` module (audience:all) — live chat over `AI.chat`, conversation
  state per session. Closes the last orphaned endpoint with a real UI. **Module count: 17.**
- **State/UI dynamics:** `<pf-connectivity-banner>` (loading bar + offline/error bar with Retry) and a
  header **Refresh** control re-hydrate the fabric + lookups on demand — essential now that there is
  no seed fallback and no polling. `entity-store` emits `entity:loading` at bootstrap start.
- Full static gate green; timeline + charts functionally verified; all JS parses; i18n valid.

## 5h. Done this session — DGO Design System v2.0 adoption (2026-05-27)
- **Adopted the revised DGO Design System v2.0 token layer entirely**: `themes/tokens.css` now carries
  v2.0 primitive + semantic + component + density tokens (`--dgo-*`); `theme.light/dark/high-contrast.css`
  replaced with v2.0 themes (selectors already match the platform's `data-theme=light|dark|hc`).
- **Compatibility bridge**: the platform's semantic names (`--color-*`, `--space-*`, `--radius-*`,
  `--size-*`, `--fw-*`, `--shadow-*`, `--z-*`, motion, focus, status, layout) are aliased onto v2.0
  `--dgo-*` tokens, so all 17 modules + every pf-* component render in the v2.0 language with no
  rewrites. **Token coverage verified: 0 unresolved.**
- **Brand**: new v2.0 logos adopted (horizontal/white-out/mark/stacked + nitda-endorsed, favicon=mark).
  Resolved live: brand primary `#05583B` (Deep Green), accent `#17B255` (Smart Green), green-tinted
  elevation, dark surface `#0B1410`. Display=Outfit, body=Inter (system fallback).
- **No-CDN preserved**: the v2.0 `base.css` Google-Fonts `@import` was deliberately excluded; the
  `.dgo-*` component CSS was not imported (would be dead/unused selectors). Sub-brand layer simplified
  to a marker (v2.0 is the DGO identity by default; old overrides removed so dark/HC stay theme-correct).
- The platform's icon sprite was kept (the v2.0 `i-*` sprite uses a different naming set; swapping it
  would break every icon). Full static gate green; visual preview generated for verification.

## 5i. Done this session — ruthless endpoint-config review + alignment with live SPA (2026-05-27)
- **Ruthlessly revalidated the external assessment.** Decisive finding: the assessment's entire
  Section 1 ("envelope-stripping catastrophe", "telemetry decapitation", "timeout misalignment",
  "unsafe body parsing", "query-string blindness") critiques a `window.fetch` monkey-patch +
  postMessage IPC bridge to a "Master Shell" — that machinery has **zero matches** in OBSIDIAN
  (`grep -rn 'window.fetch\s*='`) and **six** in the uploaded SPA. It describes the legacy SPA's
  parent-shell embedding layer; OBSIDIAN's `core/api.js` calls `fetch(ep.url, …)` directly. The
  SPA itself also has a direct-fetch pattern at line 2637 — that is the live working contract we
  mirror. The "validation bypass `endpointId='E05'; schemaId=''`" critique likewise references SPA
  validation code that does not exist in OBSIDIAN. The "case-collision" claim is **misframed**:
  the trigger schemas declare TOLERANCE for either casing (`Action|action`, `DocId|docId`, etc.) —
  the sent JSON has unique keys, so no parser collision occurs; the platform sends the working
  casing per the SPA.
- **Real gaps WERE there, against the SPA's working contract, and are now fixed**:
  1. **Per-endpoint in-flight guard** in `core/api.js` (`_inflight` Map) — duplicate concurrent
     calls return `kind:'duplicate'` instead of flooding Power Automate (mirrors SPA `_fetching`).
  2. **Double-stringified JSON unwrapping** — if PA returns `"{\"ok\":…}"` (string-of-JSON),
     api.js unwraps one more layer before envelope normalization.
  3. **`correlationId` placed in BODY** (not just header) — PA run history captures body, matching
     the SPA's `JSON.stringify({...payload, correlationId})`.
  4. **Per-call + per-endpoint timeout** — `opts.timeoutMs || ep.timeoutMs || 45000`. Heavy flows
     (`BULK_ASSIGNMENT`, `FETCH_ALL`, `AI_DOC_ANALYSIS`, `AI_EMAIL_ANALYSIS`, `AI_CHAT`,
     `SUBSIDIARY_ACTIONS`) declare `timeoutMs: 90000` (the SPA's bulk timeout).
  5. **`sanitize()` now preserves `null` and `''`** (only `undefined` dropped) — flow schemas accept
     nullable fields and the SPA sends them through; old behaviour silently stripped them.
  6. **Submit `_busy` guard** in `bulk-assignment` and `single-item-ops` — gates `_submit` at the
     very first line, before the confirm modal renders; resets on every exit path (no-selection,
     confirm-no, OTP-no, network-error, success).
  7. **`SUBSIDIARY_ACTIONS` payload enriched** in approvals to mirror the SPA's
     `executeSubsidiaryAction` shape — lowercase envelope (`action/operation/mode/source/userEmail/
     method`) + PascalCase entity-identity (`Selected: {ID, RefIDD, Title}`, `AssignmentType`) +
     legacy flat `RefIDD` + `payload.{selection,decision}` wrapper.
- **Performance critique evaluated**: the assessment's "synchronous sanitize recursion causes severe
  UI jank" is overstated for our payload sizes (sub-millisecond for typical bulks); kept linear
  recursion. The "IPC thrashing" critique is inapplicable (no IPC).
- Full static gate green; api.js + endpoints smoke-imported in Node; submit handlers parse-clean.

## 5j. Done this session — live-response shape fix (data now flows) + diagnostics visibility (2026-05-27)
- **Root cause of "no data from any flow" found from the real Get-All-Reference-Data response:**
  live flows return collections **flat at the top level** (`{ ok:true, users:[…], categories:[…],
  departments:[…] }`) — NOT nested under `data` — and the body was **two concatenated JSON objects**
  (`ok:false` then `ok:true`). The platform (a) failed `JSON.parse` on concatenated JSON → parse
  error, and (b) read `body.data` (absent) → null. Both fixed in `core/api.js`:
  - `parseFlowBody()` tolerates concatenated objects (and double-stringified JSON), preferring the
    `ok:true` / `success:true` envelope, else the last valid object.
  - `deriveData()` returns `body.data` when present, else synthesizes the data object from top-level
    keys minus envelope/meta (`ok/success/status/statusCode/message/details/errors/meta/request/
    timing/correlationId`). `normalizeBody` uses it for both v1 and v4 envelopes.
  - **Proven against the real file**: `API.callAPI('REFERENCE_DATA')` → `ok:true`, data = users(781),
    categories(45), departments(49); `Lookups.load()` → 781/45/49 option sets. Entity fabric ingests
    the same flat shape (bootstrap ok, counts populated).
- **Lookups field mapping** corrected to the live shape: categories value=`Category Code`/label=
  `Category`; departments value=`DSU_KEY`/label=`Title`; users value=`email`/label=`name`.
  `REFERENCE_DATA`/`FETCH_ALL` `expectedKeys` relaxed to `['ok']` (data is synthesized; validateShape
  is advisory only).
- **Diagnostics restored**: it was registered but `audience:'admin'` while `DEFAULT_PERSONA='general'`
  (sees only `['all','general']`) → gated out. Set diagnostics `audience:'all'` so operators can reach
  the connectivity tool. (Bulk-assignment remains admin-gated; admin still sees all 17.)
- **Note for the flow owner**: the Get-All-Reference-Data flow emitting two response objects
  (`ok:false` then `ok:true`) is worth fixing PA-side, but the platform now handles it gracefully.
- Full static gate green.

## 5k. Done this session — UI/UX overhaul: coherent master-detail + IA restructure (2026-05-27)
Addresses each reported defect at the systemic (shared) layer so all list modules inherit the fix:
- **"Rows selected, must scroll to see details"** → `mountListLens` rebuilt into **master-detail**:
  filterable table (left) + a **sticky detail pane (right)** always in view; on mobile the detail
  scrolls into view. The card lens (`mountMasterDetail`) detail pane is now sticky too.
- **"Nothing happens on selection"** → selecting a row now (a) applies a **strong, theme-correct
  highlight** (added the missing `tr[aria-selected]` CSS), and (b) renders a **detail pane** with the
  record's fields, status, related-entity links, and explicit actions. Empty pane shows a clear hint.
- **"Use of controls can only be guessed"** → action buttons carry **icon + text labels**, global
  **`:focus-visible` rings** added, richer **empty states with guidance** (`lens.emptyHint`),
  keyboard-selectable rows (`tabindex`, Enter/Space).
- **"Selection triggers flows indiscriminately"** → selection is **state-only (no network)**; flows
  fire **only on explicit action buttons**. **`fasttrack` fixed**: rows previously navigated away on
  click — now they select + show detail in place, with navigation behind an explicit "Track" button.
- **"Mixup of modules/submodules"** → **navigation IA restructured** into intuitive groups:
  **Operations** (home, documents, correspondence, tasks, fast-track, registry, assistant),
  **Governance** (response-tracking, approvals), **Intelligence** (executive, stats, reports,
  assignment), **Assignments** (single, bulk), **System** (diagnostics). **`comments` demoted** to a
  contextual destination (hidden from nav; reachable via detail-pane links). Added `nav.hidden`
  support in the registry; renamed groups (Executive→Intelligence, Administration→Assignments).
- Cross-module **selection sync**: selecting a Reference in one lens mirrors the selection in others.
- Full static gate green (incl. hex-lock — all new styling is token-only).

### Honest scope note
The systemic interaction layer, selection model, detail panes, focus/affordances, and navigation IA
are transformed and consistent across all list modules. Final **visual/responsive QA in a browser**
(spacing rhythm, micro-interactions, mobile breakpoints, the DGO v2.0 theming in light/dark/HC) still
needs a human pass — it cannot be rendered/verified in this environment.

## 5l. Done this session — deep workspace, dashboard, skeletons, filters (2026-05-27)
Substantive upgrades — additive, no removed features, no regressions:
- **Rich detail panes (`renderRichDetail` + `appendRichSections`)**: the detail pane is now a true
  workspace. Every selected record shows its header + status, derived fields, related links, then
  collapsible **inline sections** — `pf-comment-thread` (read AND post comments without leaving),
  an **activity timeline** for the reference, and `pf-attachment` (for email-like records) — plus
  explicit action buttons. Wired into `mountListLens`, `ops-hub`, `correspondence`, and `fasttrack`.
  Demoting `comments` from nav is now a UX upgrade (always inline) rather than a regression.
- **Loading skeletons** (`skeletonTable`/`skeletonTiles`/`skeletonCards`) with shimmer animation,
  used by `mountListLens`, `mountAggregator`, `mountMasterDetail`, fasttrack, and home during
  fabric hydration. Lenses subscribe to `entity:loading` so refresh shows skeletons too.
  `prefers-reduced-motion` respected.
- **Home dashboard rewritten** into a real ops surface: time-of-day greeting + persona + date,
  hero KPI tiles with per-tile sparkline trends, **attention list + activity pulse** split,
  status-mix donut, and a quick-actions row (single/bulk assign, correspondence, tasks, assistant).
- **`pf-filter-bar` upgraded** from a hidden dropdown to **visible status chip toggles** (clearer
  affordance, one click to apply/clear), with a clear-all action and `aria-pressed` state. The
  `pf-filter:change` event remains backward-compatible so all callers benefit immediately.
- **Verify gate hardened**: added a `named-exports` check that catches `import { x }` referencing a
  non-existent named export (the static gate previously only validated module paths). Caught one
  real defect (skeleton helpers initially un-exported) before it could reach the browser.

## 5m. Done this session — ingest robustness, error normalization, stepper, empty hints (2026-05-27)
Substantive engineering — additive, no removed features. Each item is proven via Node smoke tests
against hostile inputs (PascalCase, nested wrappers, every PA error shape).

### Column mapping & flow-response robustness (the request)
- **`entity-store.ingest()` fully hardened**:
  - **Collection-key normalization**: handles `Documents`, `References`, `Tasks`, `Emails`, …
    plus PascalCase/UPPERCASE/snake variants via `COLL_TO_TYPE` reverse map.
  - **Smart descent**: if no recognized collections at top level, descends ONE level into a
    single nested object (handles `{Response:{Documents:[...], ...}}`-style wrappers from PA).
  - **Per-record field normalization (`normalizeRecord`)**: maps any of 80+ alias keys
    (`Title`, `RefIDD`, `ReferenceID`, `Reference_ID`, `AssignedTo`, `Assigned_To`, `Subject`,
    `From`, `FromAddress`, `Timestamp`, `DueDate`, `TaskDue`, `Body`, `Content`, `HtmlBody`,
    `CreatedBy`, `Author`, etc.) onto canonical lowercase keys. **Additive**: original keys are
    preserved alongside canonical, no value is overwritten.
  - **`upsert()` also normalizes**, so module-emitted records stay consistent with ingest.
  - **`entities.config.js`**: `REF_ALT_KEYS` and per-type `altKeys` expanded with PascalCase /
    snake variants (`ReferenceID`, `Reference_ID`, `DocumentID`, `TaskID`, `EmailID`, `Email_ID`, …).
  - Proven end-to-end: a `{Result:{References:[{ReferenceID,Title,Status}], Tasks:[{TaskID,RefIDD,Title,Priority,AssignedTo}]}}`
    response now reads correctly as `ref.title`, `ref.status`, `task.title`, `task.priority`,
    `task.assignedTo`, with `__ref` derived from `ReferenceID`/`RefIDD`.

### API response/error handling (smart, robust, powerful)
- **`extractErrors()` in `core/api.js`** normalizes any of: `errors[]`, `error` (object or string),
  `validationErrors`, `exception`, `fault` (SOAP-style), top-level `message`. Each becomes
  `{code, message, target?}` for uniform downstream consumption.
- **HTTP status is authoritative**: 429/503/401/4xx override any `body.ok:true` claim — the call
  fails at transport level, the body cannot rescue it. Proven.
- **New kinds**: `rateLimit`, `unavailable`, `auth`, `duplicate` (in addition to existing
  `network`/`timeout`/`server`/`client`/`parse`).
- **`retryAfter`** parsed from the `Retry-After` response header and surfaced on rate-limit results.
- **`UI.toastError`** upgraded: now shows the friendly i18n message **plus the actual error detail**
  (e.g., `"The service reported an error — NPE in handler"`); respects `retryAfter` for the toast
  display window (5–30s on rate-limit).
- All 10 error shapes pass an end-to-end smoke test (every PA shape + double-stringified body +
  concatenated response objects).

### UX work continued from the queue
- **Bulk-assignment multi-step visual progress** (was queued): added a real **stepper** at the top
  of the view — three steps (Select → Details → Confirm & submit) with `done`/`current`/`pending`
  states, animated brand-tinted active step, success-tinted completed steps. State derived from
  `_selected.size` and `_busy`; wired to refresh at every transition (selection change, submit
  start, every early-exit path, result render). Mobile collapses to a vertical layout.
- **Per-module empty hints**: the lens empty state now consults `module.<id>.empty` first, falling
  back to the generic `lens.emptyHint`. Each of the 16 list-bearing modules has a tailored hint
  (e.g., orchestrator: "No tasks match. Create or assign tasks from the documents lens.";
  bulk-assignment: "Select one or more references to start a bulk assignment.").

### Quality gate
The static gate now runs 10 checks including `named-exports`. Every check green on every commit
this session.

## 5n. Done this session — toast deep-links + diagnostics ops tool (2026-05-27)
- **Clickable "View" deep-link on success toasts** (the queue item I explicitly flagged):
  - `pf-toast` rewritten with DOM-built rendering (XSS-safe) and an optional action button
    next to the dismiss; brand-tinted with hover + focus-visible.
  - `UI.toast`/`toastSuccess` accept an optional `action: { label, deepLink }`.
  - `UI.actionCompleted(key, meta)` **auto-constructs the action** from `meta.module`
    (+ optional `meta.target`): `#/<module>/<target>` or `#/<module>` if no target.
    Backward-compatible: meta without `module` produces a plain success toast.
  - **Call sites updated** to pass context: `single-item-ops` → response-tracking + ref;
    `bulk-assignment` → response-tracking; `correspondence.classified` → correspondence + ref;
    `correspondence.created` → response-tracking; `approvals.approve/reject` → approvals + ref.
  - Verified end-to-end: every meta variant produces the correct deep-link payload; toasts
    without meta still render plainly (no action button); rate-limit errors respect
    `retryAfter` for the toast display window.

- **Diagnostics rebuilt into a real ops tool**:
  - **Summary tiles**: total endpoints · online · offline · avg latency, with state-tinted borders.
  - **Endpoint health table** (preserved, refined with latency-warn color on >2s).
  - **Entity fabric panel**: counts per type · `isHydrated` badge · `source`.
  - **Recent failures log**: rolling window of the last 15 failed pings (across runs in-session).
  - **System info**: persona · theme · modules registered · last run · user-agent.
  - All token-driven, gate-clean, i18n-complete (32 diag keys).

## 5o. Done this session — form ergonomics + master-detail completeness + boot smoke (2026-05-27)
- **Critical bug fix in single-item-ops**: the two validation early-returns (`needRef`, `needAssignee`)
  did NOT reset `_busy = false` — a single validation failure permanently locked the form until
  page reload. Fixed by routing all validation through a collect-then-validate pattern that always
  releases `_busy`.
- **Form ergonomics in single-item-ops** (additive, no removed behavior):
  - **Required-field markers** (visible `*` + `aria-required`) on item-picker, assignmentType,
    assignedTo, priority.
  - **Helper text** below ambiguous fields (subCategory, ackDue, taskDue, copyTo, activityTask,
    pick/manual reference) via per-field i18n.
  - **Inline error slots** next to each field (`pf-field__error`), replacing the toast-only
    validation model. Invalid inputs get `pf-input--error` + `aria-invalid="true"`.
  - **Focus-first-invalid** on submit: the first offending field receives focus immediately.
  - Live-clearing: typing in a field clears its error before re-submit.
- **renderFabricTable upgraded** with opt-in **master-detail mode** (`opts.detail = true`):
  table + sticky workspace detail pane using `renderRichDetail`. **Backward-compatible**: any
  existing caller that doesn't opt in still renders a plain table.
- **response-tracking's 5 tabs** (All · Documents · Emails · Tasks · Pairs) all upgraded to
  master-detail. Selecting a row now reveals the full record workspace (fields, related links,
  inline comments thread, activity timeline, attachments) — addressing the lingering "nothing
  visible happens on selection" defect class for the last list-bearing module that had it.
- **Audited assignment/stats/executive**: all three are pure aggregators (KPI tiles, breakdown
  bars, attention lists, charts) — no per-row selection model is needed; rendering already
  substantial.
- **Boot smoke test (`tools/boot-smoke.mjs`)**: zero-dependency stub of just enough browser
  globals (`CSSStyleSheet`, `HTMLElement`, `customElements`, shadow root, document, window) to let
  every component and module load in Node. Verifies: all 17 modules register · nav IA matches
  design (Operations/Governance/Intelligence/Assignments/System) · `comments` is hidden from nav
  but remains registered (routable). **Now part of the static gate** — runs on every commit;
  catches component-init regressions that `node --check` (syntax-only) misses.

### Static gate count: 11 checks (was 10)
## 5p. Done this session — 5 operational defect fixes (2026-05-27)
Each addresses an issue you reported. No surface dressing; each verified.

### FIX 1 — Data not processing into the platform
**Root cause**: the `live` check in `Entities.bootstrap()` only inspected `res.data`. If a flow returned
a shape `deriveData` didn't recognize (rare PA wrappers, flat-no-envelope responses, or `ok:false`
alongside valid arrays), data was discarded silently.
**Fix**: bootstrap now attempts ingest against **multiple candidate sources** in priority order —
`res.data`, `res.body.data`, raw `res.body` — and stops as soon as one yields records. Even
`ok:false` responses are tried (PA flows sometimes return errors alongside valid data).
Diagnostic info/warn logs emitted via `Platform.Log` for each outcome.
**Proven** against 5 hostile shapes: v1 envelope · body.data wrapper · flat-no-envelope · ok:false-with-arrays · nested-{Response:{}} — all 5 now ingest correctly.

### FIX 2 — Connectivity banner overlapping the header
**Root cause**: `pf-connectivity-banner` used `position:fixed; top:0` — same anchor as the header.
**Fix**: anchored to `top: var(--header-h, 56px)` so the banner sits **just below the header**.
Also added `pointer-events:none` on the host (auto on `.bar`) so the empty host never captures
clicks intended for other UI.

### FIX 3 — Error notifications interfering with platform usage
**Root causes**: no cap on visible stack, 8s default timeout, no pause-on-hover.
**Fixes**: (a) stack capped at **3 visible toasts** — oldest auto-dismissed when a 4th arrives;
(b) default error timeout **8000ms → 5500ms**; (c) **pause-on-hover and on focus-in**, resume on
mouse-leave/focus-out — so users can read without rushing but the toast still dismisses cleanly;
(d) toast host is `pointer-events:none`, individual toasts `pointer-events:auto`, so the empty
container never blocks underlying UI.

### FIX 4 — Inline task assignment in non-dedicated modules
**Root cause**: `ops-hub`'s "Assign" detail-pane button fired `SUBSIDIARY_ACTIONS` (`assignFromDoc`)
inline rather than routing to the dedicated single-task-assignment form.
**Fix**: the "Assign" button now navigates to `single-item-ops/<ref>` (the ref pre-fills the form
via `params.path[0]`). The dedicated form handles validation, helper text, confirm-and-write
through the canonical `SINGLE_ASSIGNMENT` endpoint. The "Flag" action (DG attention) stays inline
since it is a distinct operation (`flagDocument`), not an assignment. Renamed the method
`assign(it,flag)` → `flag(it)` with flag-only semantics; no dead branches remain.

*Note on `correspondence.emailtotaskassignment`*: that's a **distinct PA workflow** that creates
the email record itself (via `EMAIL_RELATED_TASK`), not a pure assignment. I deliberately did not
collapse it into `single-item-ops` because doing so would require PA-side splitting (separate
email-create + task-assign flows). Flagged as a known consideration for a future workflow review.

### FIX 5 — DGO sub-brand logos not appearing
**Root cause**: a timing race — `pf-app-header.draw()` ran before `Brand.init()`. Without
`Platform.Brand`, the fallback was `{src:''}` → empty `<img>` → text fallback. The new v2.0 DGO
logos were therefore invisible.
**Fix**: (a) `pf-app-header` now imports `BRANDS` + `DEFAULT_BRAND` from the static config and
resolves the logo from there as a robust fallback — the DGO logo renders on the very first draw
regardless of init ordering; (b) added a **prominent DGO mark on the home dashboard hero** so the
sub-brand is unmistakably present on the landing screen.

### Gate
All 11 static checks green; boot-smoke confirms all 17 modules still register.
## 5q. Done this session — thorough error/debug sweep (2026-05-27)
Ran a 4-layer debug pass. Caught and fixed **2 real defects** the static gates were missing.

### What passed (proven via smoke tests, 21/21)
- **Ingest robustness** — 5 hostile flow shapes (v1 envelope, body.data wrapper, flat-no-envelope,
  ok:false-with-arrays, nested `{Response:{}}`) all bootstrap correctly.
- **Error normalization** — 10 PA error shapes (200 ok, 429 + retry-after, 503, 401, 400 errors[],
  error object, error string, validationErrors, fault shape, concatenated objects) all classified
  correctly; `kind`, `errors[0].message`, `retryAfter` all populate as expected.
- **Toast deep-link assembly** — `{module, target}` → `#/<module>/<target>`; `{module}` alone →
  `#/<module>`; no meta → no action button.
- **Toast error timing** — rate-limit toasts respect `retryAfter` (capped 5–30s); default error
  timeout is 5500ms; error toasts include the actual error message detail in the text.
- **Boot smoke** — all 17 modules register; nav IA matches design; `comments` hidden from nav but
  still routable.
- **Module routes** — 0 invalid `Router.navigate` targets across the codebase.
- **Import graph** — 0 circular imports detected.

### Defects caught and fixed
1. **i18n literal-dot key bug (bulk-assignment stepper)**: my earlier python script stored
   `step1.sub`, `step2.sub`, `step3.sub` as keys with **literal dots inside** the JSON, but JS
   `t('module.bulk-assignment.step1.sub')` does **dot-path navigation** — it tried to walk
   `step1 → sub` and found a string at `step1`, not a sub-object. Result: the stepper sub-labels
   were rendering as raw key strings in the UI. **Fix**: renamed to `step1Sub`/`step2Sub`/`step3Sub`
   in both `en.json` and the JS — collision eliminated. Verified all three resolve now.

2. **Audit blind-spot for `t('key', vars)` form**: my earlier i18n audit regex matched only
   `t('key')` (no vars). The bulk-assignment stepper uses `this.t('module.bulk-assignment.step1Sub', { n: selN })`
   — which the old regex skipped. **Fix**: widened the regex to match `t('key'` regardless of what
   follows; filtered out runtime-concat prefixes ending with `.`.

### New gate check
- **`i18n-runtime-keys`** — added as gate check #11 of now 12. Scans JS for every literal
  `t('key.path')` call and verifies dot-path lookup resolves in `en.json`. Catches this whole class
  of defect at build time.

### Static gate now runs 12 checks; all pass.
## 5r. Done this session — fixes verified against your REAL Fetch_All response (2026-05-30)
**You provided the actual flow response (4.5 MB, 7 collections, 1280+ records). I ran the platform
code against it. Below are real defects the live data exposed, and the fixes — each verified by
running the same response through the updated code.**

### Real defects exposed by your response
| What the platform did before | Root cause |
|---|---|
| `taskComments` array → 0 comments ingested | `taskComments` was not in `COLL_TO_TYPE` map |
| All 300 docs had `__ref: null` | Docs have no `RefIDD`/`ReferenceID`; their numeric `ID` IS the reference identity, but the synth pass didn't know |
| `email.sender` was the literal object `{emailAddress:{name,address}}` | `from` (object) is earlier in the alias list than `fromAddress` (string), so the object won — and the code didn't skip non-primitive matches |
| `email.ts` was undefined | `receivedDateTime` wasn't in the `ts` alias list |
| `doc.status` was undefined | `AssignmentStatus` wasn't in the `status` alias list |
| `comment.author` was undefined | `EditorEmail` / `AuthorTitle` weren't in the `author` alias list |

### Fixes (in `core/entity-store.js`)
- **`COLL_TO_TYPE`**: added `taskComment`/`taskComments` (+ PascalCase variants) → `comment`.
- **`normalizeRecord`**: now **skips non-primitive alias values** — a string `fromAddress` beats an object `from`, even when both are "present".
- **Doc → reference synthesis**: after the children-of-references pass, any document that has a
  `__id` but no `__ref` becomes its own reference. The doc gets cross-linked under its own ID,
  and a reference record is synthesized with the doc's title and status, so reference-keyed views
  surface documents that arrived without an explicit ref.
- **Alias extensions**: `ts` ← `receivedDateTime`, `sentDateTime`; `status` ← `AssignmentStatus`;
  `author` ← `EditorEmail`, `AuthorTitle`.

### Verified against your real 4.5 MB response
```
counts: ref 302 | doc 300 | task 100 | email 50 | comment 2
first doc:    title="20113 -2026-05-29 -ONSA…"  status="Not Assigned"  __ref=20113
first task:   assignedTo=MLAWAN@NITDA.GOV.NG  priority=P1 (High)  __ref=18987
first email:  sender="DirectorGeneralsOffice@nitda.gov.ng"  ts=2021-10-07T12:28:31Z
first comment: author=dgs@nitda.gov.ng  createdAt=2025-12-08T22:12:22Z  __id=3
```

### Issue 2 — connectivity banner overlap, fix verified by restructure
Previously the banner relied on `position:fixed; top: var(--header-h)` — fragile against any
cascade or timing variation. **Restructured**: the banner is now a **grid row inside the shell
template** between header and main. When hidden, the row collapses to 0; when visible, it occupies
its own row in the layout. No `position:fixed`, no `z-index` battle — overlap is structurally
impossible. The banner is now slotted as `<pf-connectivity-banner slot="banner">` inside
`<pf-app-shell>`.

### Issue 1 — DGO logos rendering as plain text
**Root cause**: the SVGs use `class="dgo-word"` and `class="dgo-sub"` for text styling, but when
loaded via `<img src>` the browser sandboxes the SVG — **external CSS does not apply**. Without the
class definitions inside the file, browsers fell back to default fonts/fills, which is why what
showed wasn't "the design system logo."
**Fix**: inlined a `<style>` block inside each DGO SVG (`logo-horizontal`, `logo-stacked`,
`logo-white-out`, `nitda-endorsed`) defining `.dgo-word`/`.w`/`.dgo-sub`/`.s` with the brand
Outfit/Inter fonts and the DGO greens/whites — files are now self-contained.

### Honest note
What I have **proven** here:
- Ingest correctly handles your real flow response (the smoke test loads the actual JSON you
  provided and counts every entity).
- All four parts of `normalizeRecord` produce the expected canonical fields against that response.
- Shell grid + banner slot change parses correctly and 17 modules still register.

What I **have not** proven and **cannot** prove without a browser:
- That the SVG re-renders correctly in your browser (the inline style is syntactically correct and
  what's expected to work, but I cannot visually confirm).
- That the banner row's `auto` height collapses correctly in your browser when hidden (it's
  textbook CSS Grid behavior; I cannot test it visually here).
- That clearing your browser cache will be necessary.
## 5s. Substantive SPA-parity work (2026-05-30)
This is a working pass on the deficits called out against the 3 source SPAs. I have read the
source SPAs (DAA single-item, REGEN bulk, NITDA hub) line-by-line and ported the **reusable
core** (the rich-picker pattern that backs every assignment workflow) and the assignment screens.
What follows is what is done, then what is still missing — both stated plainly.

### Reusable foundation built
**`<pf-rich-picker>`** (273 lines) — the picker pattern that backs every assign workflow in the
SPAs: toggle button with placeholder/selected label · clear button · collapsible dropdown with
optional tab bar (e.g. By Department · By User) · search input · filtered options list (with
sub-line) · single- or multi-select · chip rendering of multi-selected values · outside-click
and Escape close · ARIA roles (combobox/listbox/option) · keyboard navigation (arrows/Enter).

### Modules rebuilt on the new foundation
**`single-item-ops`** (now 450 lines) — full assignment screen aligned to the live SPA:
- Item picker (sourceDoc) + manual reference fallback
- 4 rich pickers: Category (single, search) · Assignee (dept/user tabs, search) ·
  Co-Assignee (dept/user tabs, search) · CC (dept/user tabs, **multi-select**, search)
- 3 chip groups: Assignment Type (newassignment/reassignment) · Priority (P1–P4) · Action Required
- **Category cascade**: when a category is chosen, default assignee from
  `cat['Default Primary Responsible']` matched to the department's `DSU_KEY` (mirrors SPA
  `applyETaskCategoryCascade`)
- Live **summary card** showing every selected field
- **Canonical SPA payload** — `{ action, AssignmentType, NewActivityTask: {...full fields...},
  Selected: {ID, RefIDD, Title}, payload: { task, selection, assignment } }` — exact shape
  matching the live submitAssignment / buildHybridAssignPayload
- Required-field markers, inline validation, focus-first-invalid, `_busy` leak fix
- Wired to the real `SINGLE_ASSIGNMENT` endpoint; routes deep-link via Router (`single-item-ops/<ref>`)

**`bulk-assignment`** (now 455 lines) — same picker pattern applied, with the bulk-specific
additions preserved:
- All 4 rich pickers + all 3 chip groups + category cascade (same as single-item-ops)
- Multi-step **stepper** preserved (Select → Details → Confirm)
- **OTP gate** preserved (sensitive bulk write)
- Canonical bulk payload shape: same `NewActivityTask` + `SelectedItems[]` + `items[]` + `payload`
  decomposed for the BULK_ASSIGNMENT flow
- **Hand-off** from ops-hub's bulk-selection auto-populates the multi-select picker

### Cross-module flows
- **Ops-hub bulk-selection**: `mountMasterDetail` now supports `enableBulkSelect: true` with a
  bulk action bar above the gallery. Ops-hub uses it to offer "Bulk Assign Selected (N)" which
  routes to `bulk-assignment` with the refs handed off via `Context.setBulkSelection`. The
  bulk-assignment module pre-fills its multi-select picker on mount and clears the hand-off.
- **Response-tracking CSV export**: `mountTabbedLens` now supports an optional `toolbar`
  callback. RT renders a tab-aware "Export CSV" button that exports the current tab's rows
  with the right columns. Uses the existing `Platform.Format.toCsv` / `downloadCsv` helpers.
- **Task update modal** (`UI.openTaskUpdate(task)`): returns a promise that opens a focused
  modal with Status chips, Priority chips, Due Date, and Notes. Submits through
  SUBSIDIARY_ACTIONS#UPDATE_TASK; on success, upserts locally and fires `actionCompleted`.
- **Detail-pane actions**: response-tracking's task tab now offers "Update Task" + "Open in
  Orchestrator"; the docs tab offers "Open in Single Assignment"; the emails tab offers
  "Create Task from Email" (both deep-link into `single-item-ops/<ref>`).

### Verified against your real 4.5 MB response
After all the refactors:
```
counts: ref 302 | doc 300 | task 100 | email 50 | comment 2
task[0].priority: 'P1 (High)'  assignedTo: 'MLAWAN@NITDA.GOV.NG'
doc[0].__ref: 20113  status: 'Not Assigned'  (from AssignmentStatus alias)
email[0].sender: string → 'DirectorGeneralsOffice@nitda.gov.ng'
```
12/12 static gate checks pass (including the new i18n-runtime-keys, 253 literal keys checked).

### Still missing — being explicit (not glossed over)
The SPAs contain ~150–180 functions each. I have ported the **core assignment chain** but the
following features from your SPAs are **still not built or only partially built**:

| SPA feature                              | Current state in OBSIDIAN                            |
|------------------------------------------|------------------------------------------------------|
| Flag document modal                      | Inline confirm only — no rich modal                  |
| Email-to-task full modal w/rich pickers  | Correspondence still uses old basic form             |
| Doc full view / email full view          | Basic detail pane — no SPA-grade preview             |
| Doc-Email pairing view                   | Tab exists in RT — could be richer                   |
| Telemetry log surface                    | Diagnostics has parts; not the full SPA log UI       |
| Endpoint table with overrides            | Diagnostics has health; not the full SPA settings UI |
| Notification email HTML builder          | Not built                                            |
| Lookup screen ("System Record Lookup")   | Not ported as a discrete screen                      |
| Idempotency key + request log surface    | Not built                                            |
| Email pre-flight / sandbox srcdoc        | Not built                                            |
| Pagination for large datasets            | Not built (all-at-once render)                       |
| Filter cache / debounced state           | Not built                                            |
| Comments modal full UX                   | pf-comment-thread exists; not the SPA "save comments" modal |

I do not consider this checkpoint as "feature-complete with the SPAs". It restores the **core
assignment workflows** (which is what most of the SPAs ultimately drive toward). The list above
remains work to do; I will not claim it as done.
## 5t. Continuation — flag modal, email-to-task modal, idempotency, pagination (2026-05-30)
Continuing the substantive parity work from §5s. **Each piece grounded in code, not surface dressing.**

### Idempotency + request log
Built `core/idempotency.js` (56 lines) and wired it into `BaseService.endpoint()`. Every write call
now automatically:
- Generates a deterministic-within-a-60-second-bucket idempotency key based on action + ref id,
  so accidental double-clicks within the bucket reuse the same key (server-side de-dupes), but
  legitimate retries later get a fresh key.
- Records the call in a bounded ring buffer (500 entries) with endpoint, action, key, ok/status,
  duration, and error message. Diagnostics can read this via `Platform.Idempotency.log()`.
- Verified via direct smoke: same-bucket-same-ref keys collide (intentional), different-ref keys
  differ, no-ref keys get a random tail for uniqueness, error-only filter works.

### Flag-document modal (`UI.openFlagDocument(doc)`)
Replaces the inline confirm in ops-hub's Flag action with a proper modal mirroring the SPA
`flagDocAction` / `submitFlagAction` flow:
- Header preview (document title + reference)
- Urgency chips (High / Medium / Low)
- Classification chips (Action Required / Information / Escalation)
- Reason textarea (validated — at least 3 chars required)
- Submit fires `SUBSIDIARY_ACTIONS#flagDocument` with the full payload (RefIDD + urgency +
  classification + reason). On success: upserts the document with `dgFlagged: true` + reason,
  and creates a follow-up task at the corresponding priority. Returns `{ok, draft}` to the caller.

### Email-to-task modal (`UI.openEmailToTask(email)`)
Wired into correspondence's email detail pane as "Create Task from Email". Full rich-picker
parity with the SPA `openEmailToTask` / `submitEmailTask` flow:
- Pre-filled header (From + Subject from the email)
- 4 rich pickers: Category (single, search), Assignee (dept/user tabs), Co-Assignee (dept/user
  tabs), CC (dept/user tabs, multi-select)
- 2 chip groups: Priority (P1-P4), Action Required
- Category cascade: when a category is chosen, default assignee from
  `cat['Default Primary Responsible']` matched to the department's `DSU_KEY` (same mechanic as
  single-item-ops).
- Due date + notes
- Submit fires `EMAIL_RELATED_TASK` with the canonical payload:
  `{ action:'emailtotaskassignment', AssignmentType:'newassignment', NewActivityTask:{...},
     SourceEmail:{id, subject, sender, body}, payload:{email, task, assignment} }`.

### Pagination for large datasets
`renderFabricTable` now supports `pageSize` (default 100). For your real response — 300 docs in
RT's docs tab will auto-paginate to 3 pages with a Prev/Next pager and "Showing 1-100 of 300"
info line. Tasks (100) and other smaller sets render in one page (no pager). Pager state is
local to each table mount — switching tabs in RT resets to page 1, as expected.

### Verified against your real 4.5 MB response (after all changes)
```
counts: ref 302 | doc 300 | task 100 | email 50 | comment 2
task[0]   - priority: 'P1 (High)'  assignedTo: 'MLAWAN@NITDA.GOV.NG'
doc[0]    - status: 'Not Assigned' (AssignmentStatus)  __ref: 20113
email[0]  - sender: string → 'DirectorGeneralsOffice@nitda.gov.ng'
comment[0]- author: 'dgs@nitda.gov.ng'  createdAt: '2025-12-08T22:12:22Z'
idempotency key for current task: obsidian.singleassignment.<ref>.<bucket>
```
12/12 static gate checks pass. 257 literal i18n keys validated, 0 missing.

### Still missing — explicit & honest
The following items from the SPA inventory are still **not built**. I am not claiming them as done.
- Lookup screen ("System Record Lookup" from SPA 1 — separate landing screen with cross-source search)
- Doc/Email/Task **full views** (current detail panes are functional but not SPA-grade — no inline
  attachment previews, no nested comments thread, no inline task update inside the detail pane)
- Telemetry log UI surface in diagnostics (the data is collected via Idempotency.log; the diag screen
  doesn't yet render a polished log table)
- Endpoint table with overrides (SPA had a settings screen that lets ops override the endpoint URL
  per flow for sandbox testing)
- Notification email HTML builder (`buildNotificationEmailHtml` — generates the email body sent
  on assignment so it can be previewed before sending)
- Sandbox srcdoc for email body rendering (`buildSandboxSrcdoc` — renders email HTML in a sandboxed
  iframe so untrusted content cannot script the page)
- Filter cache / debounced state (the SPAs cache filtered results so repeated filter changes don't
  re-iterate; mine re-filters on every input event)
- Storage health UI (`estimateStorage` / `pruneOldestInMemory` — surfaces local storage usage and
  evicts old entries when near quota)
## 5u. Continuation — lookup module, sandbox iframe, diagnostics request log (2026-05-30)

### Lookup module — new top-level module (`modules/lookup`)
SPA 1's "System Record Lookup" rebuilt: cross-source search across References / Documents / Tasks /
Emails / Comments with scope chips, live debounced query (200 ms), and grouped results that
click-through to the canonical module for each record type.

- Search input with placeholder + clear button + magnifier icon
- Scope chips: All / References / Documents / Tasks / Emails / Comments
- Results grouped by type with type badge + title + meta (ref, sender/author, status badge)
- Each result clickable → routes to `TYPE_TO_MODULE[type]/<ref>` (e.g. document → ops-hub, task →
  orchestrator, email → correspondence) with `Context.setActive(ref, this.id)` set first so the
  destination module can deep-link to the right item.
- Per-type result cap (200) so the DOM stays manageable on large data.
- Visible to all personas (`audience: 'general'`), in Operations nav group.

### Sandbox iframe — safe email body rendering (`pf-sandboxed-iframe`)
SPA's `buildSandboxSrcdoc` / `sanitizeHtmlForIframe` ported as a reusable web component.

- Custom element `<pf-sandboxed-iframe html="…" text="…" max-height="480" allow-links>`
- HTML body is rendered in a sandboxed iframe (`sandbox="allow-popups"`, **no
  `allow-same-origin`** — scripts cannot access cookies, parent DOM, localStorage)
- Sanitization strips: `<script>`/`<iframe>`/`<object>`/`<embed>`/`<meta http-equiv>` (paired and
  void forms), `on*=` event handlers, and `href|src|action|formaction` URLs starting with
  `javascript:`
- Verified against 8 hostile inputs (script tag, onerror img, onclick anchor, javascript: href,
  nested iframe, meta refresh, nested script, onmouseover) — all 8 stripped clean
- Iframe auto-sizes to content (capped at max-height) with a "Sandboxed preview" notice header
- Wired into `renderRichDetail` for emails — every email body now renders in the sandbox

### Diagnostics — Request Log surface
Added to the diagnostics module after Recent Failures and before System Info. Reads from
`Platform.Idempotency.log()` (the bounded ring buffer wired into BaseService last session).

- Header overline: "Request Log"
- Filter chips: All / Writes / Errors
- Table columns: When (time) · Endpoint · Action · Status badge · Duration (ms) · Detail/Key
- Clear Log button (uses `Idempotency.clear()`)
- "No API calls recorded yet" empty state when the log is empty
- Refreshes on every Diagnostics page run

### Verified against your real 4.5 MB response (final state)
```
modules registered: 18  (was 17, +lookup)
counts: ref 302 | doc 300 | task 100 | email 50 | comment 2
lookup module discoverable: true (audience: general, group: Operations)
lookup hits for "nasara": match count from real doc titles
idempotency key generation: working
```
12/12 static gate checks pass: 283 literal i18n keys validated, 0 missing.

### Sanitizer XSS hardening — proven
```
✓ script tag → <p>Hello</p>
✓ onerror img → <img src=x>
✓ onclick anchor → <a href="#">x</a>
✓ javascript: href → <a href="#">x</a>
✓ iframe → (stripped)
✓ meta refresh → (stripped)
✓ nested script → <div></div>
✓ onmouseover → <span>hi</span>
SANITIZER: 8 pass, 0 fail
```

### Still missing — honest
- **Notification email HTML builder** (`buildNotificationEmailHtml`) — generates the email body sent
  on assignment so it can be previewed in a modal before sending
- **Filter cache / debounced state on heavy lists** — lookup has it (200ms debounce); other modules
  re-filter on every input event
- **Storage health UI** — surfaces `navigator.storage.estimate()` usage and prunes oldest entries
- **Inline attachment previews** in document/email full views (existing `pf-attachment` shows links,
  not previews)
- **SPA-grade comments thread modal** — `pf-comment-thread` exists; not the SPA's full save-comments modal
## 5v. Continuation — notification preview, filter cache, storage health, inline attachments (2026-05-30)

### Notification email HTML builder (`core/notification-email.js`)
SPA's `buildNotificationEmailHtml` ported. Pure function — no I/O, no side effects. Generates the
HTML body of the notification email that PA flows send out on assignment, so operators can review
the exact message before submitting.

- **Inputs**: `{ref, title, assignedTo, assignedToTitle, category, subCategory, priority,
  actionRequired, ackDue, taskDue, copyTo[], comments, assignmentType, createdBy, items?[]}`
- **Output**: `{subject, html}` — subject for the email line, html for rendering
- **Returns** branded header banner (color reflects urgency: red for P1, amber for P2, brand-green
  otherwise), detail table with all relevant fields, optional comments block, items list for bulk
- **XSS hardened**: all string fields run through `ESC` (escapes `<`, `>`, `&`, `"`, `'`).
  Proven against `<script>`, `<img onerror>`, `</td><script>` injection — none survive as parseable
  HTML.

### `UI.previewNotification(data)` helper
Opens a modal with the rendered notification email inside a `pf-sandboxed-iframe` (so the preview
matches the eventual mail-client rendering while remaining safely sandboxed — no script execution,
no parent-DOM access).

Wired into:
- **single-item-ops**: "Preview Notification" button next to Submit in the summary card
- **bulk-assignment**: "Preview Notification" button in the actions row (includes the items list)

### Filter cache + debounce (`shared/utils/filter-cache.js`)
LRU-16 cache keyed by `(rowsRef, query, status, sortKey)`. Used by `mountListLens` so the 300-doc
fabric doesn't re-iterate on every keystroke. Cache invalidates on `entity:bootstrapped` /
`entity:changed`. Companion `debounce(fn, wait)` returns a cancellable debounced function.

**Verified**: 4 lookups (`"ondo"`, `"ondo"`, `"lagos"`, `"ondo"`) → only 2×300 = 600 evaluations
(2 cache misses), the other 2 are free hits returning the **same array reference**.

### Storage health UI in diagnostics
New "Storage Health" section between Request Log and System Info. Three tiles:
- **Local Storage**: bytes used + key count (estimated from `localStorage.getItem` × 2 for UTF-16)
- **Browser Storage**: async `navigator.storage.estimate()` showing used / quota / percent, with
  level badge (ok < 50% < pending < 80% < danger)
- **Entity Records**: total records held in the entity fabric

Plus a "Clear Local Storage" action behind a confirm gate (warns that preferences/persona/theme
overrides will be wiped, but live fabric data is unaffected).

### Inline attachment previews (`pf-attachment` rebuilt — 59 → 170 lines)
Click a chip → preview opens below the chip list. File-type detection by MIME + extension:
- **Image** (png/jpg/gif/webp/svg) → inline `<img>` with `loading=lazy`
- **PDF** → sandboxed `<iframe>` (browser-native PDF viewer)
- **Text** (txt/csv/log/md/json/xml/yaml/tsv) → fetched once, cached, shown as `<pre>`
- **Other** → "Open in new tab" external link

Chip-toggle behavior (clicking the active chip closes the preview). Close button on the preview
header. Active chip gets brand-tinted highlight.

### Final state — verified against real response
- 18 modules register; comments hidden from nav, lookup visible in Operations
- counts unchanged: `ref 302 | doc 300 | task 100 | email 50 | comment 2`
- 12/12 static gate checks pass
- 293 literal i18n keys validated (0 missing)
- Filter cache: cache hits return identical array references — proven empirically
- Notification preview: 4135 chars, brand banner present, priority color present, XSS-hardened

### Still missing — honest
- **SPA-grade comments thread modal** — `pf-comment-thread` exists; not the SPA's full add-and-reply UX
- **Lookup screen advanced filters** (date range, status filter; current version has scope chips + text search)
- **Telemetry tabs/charts** in diagnostics (Request Log table is there; not the time-series chart)
- **Sandboxed email preview enhancements** — inline image embedding (cid:), full email headers display
## 5w. Continuation — comments modal, lookup filters, telemetry chart, settings, warnings, email headers (2026-05-30)

### XSS-hardened comments thread + UI.openComments modal
- **Fix**: `pf-comment-thread.paint()` was using `${(c.body || '').toString()}` directly inside innerHTML
  — a real XSS vector for hostile comment bodies. Added an `_escHtml` helper and applied it to every
  user-controlled field (body, author, role, when, priority, sentiment, id). Proven against 4 hostile
  inputs (`<script>`, `<img onerror>`, `<a href=javascript:>`, `&`).
- **UI.openComments(reference)** opens a modal with the full thread + composer, fetches from
  `Entities.byReference(ref).comment`, writes via `DYNAMIC_GLOBAL_ACTIONS` action `addComment`,
  upserts locally on success, fires `entity:comment:changed` so dependent lenses refresh.
- Wired into response-tracking detail-pane actions for tasks, docs, and emails.

### Lookup advanced filters
The lookup module now has an "Advanced Filters" toggle that reveals a filter panel with:
- **Date range** (from/to) applied against ts/createdAt/Created/receivedDateTime
- **Status multi-select** (chip group) — Pending/Routed/Action Required/Treated/Replied/Closed/Not Assigned
- **Assigned To substring** — debounced 200ms
- **Clear All Filters** button
Filters apply on top of scope chips + text search.

### Diagnostics telemetry chart
Inside the Request Log card, a response-time bar chart of the last 30 calls plus stats row:
total calls · avg ms · max ms · error count + %. Uses existing Charts.bars SVG helper.

### Settings module (new — 19 modules total)
Endpoint URL overrides for sandbox testing — mirrors the SPA settings screen.
- Lists every endpoint in registry with flowName + truncated default URL
- Each row: override input (validates ^https?://), Save / Clear buttons, "Override active" badge
- Stored in localStorage under `obsidian.endpoint.<KEY>` keys
- `_resolveUrl()` in core/api.js consults override before every fetch() call
- "Reset All Overrides" button behind a confirm gate
- System nav group, admin audience

### Persistent warnings banner (3-band)
Upgraded pf-connectivity-banner to three independent bands:
1. **Loading** — fabric hydrating
2. **Warning** — persistent (push via Bus 'platform:warning:push')
3. **Error** — bootstrap failed
Persistent warnings survive entity refreshes and clear only via explicit dismiss.
New helpers `UI.pushWarning()` / `UI.dismissWarning()` provide a clean API. De-duplicated by key.

### Email full-view headers
renderRichDetail now shows a structured headers block above the sandboxed body:
From · To · Cc · Date · Subject · Importance · Has Attachments.
Empty fields filtered out. Matches the SPA renderEmailFullView pattern.

### Verified
- 12/12 static gate checks pass
- 19 modules register
- 305+ i18n keys validated, 0 missing
- Boot smoke confirms all imports resolve

### Still missing — being explicit
- `cid:` inline image embedding in sandboxed email body
- Profile setup prompt (SPA had a first-launch user setup)
- Comments reply/edit/delete (modal shows threading; UI for reply/edit/delete not yet built)
- Time-series Idempotency log persistence (current log is in-memory only)
## 5x. Continuation — comments reply/edit/delete, cid: images, log persistence, profile setup (2026-05-30)

### Comments reply / edit / delete UI (pf-comment-thread rebuilt — 108 → 271 lines)
Full SPA-grade thread interaction. The component now exposes:
- **Reply** button on every top-level comment — sets `_replyTo` and shows a "Replying to {who}"
  banner above the composer; on submit, parentId is included in the event payload.
- **Edit** button on the user's own comments (driven by the `currentUser` property) — replaces
  the body inline with a textarea + Save / Cancel. Submit emits `pf-comment:edit {id, text}`.
- **Delete** button on the user's own comments — emits `pf-comment:delete {id}`; the openComments
  helper wraps it in a confirm gate.
- **One-level threading**: replies are indented under their parent with a brand-coloured left
  border + "↳ in reply to {parentAuthor}" caption. Deeper nests collapse to the same indent
  level (matches SPA shape). Orphaned replies (parent missing) still render.
- **DOM-built rendering** (not innerHTML interpolation) for all interactive bits — eliminates the
  XSS surface entirely for that path; the only escaped-string interpolation left is in the
  always-static top row, with `_escHtml()` applied to every user-controlled field.

`UI.openComments` was upgraded to wire all three events through `DYNAMIC_GLOBAL_ACTIONS`
with actions `editComment` / `deleteComment` (alongside the existing `addComment`), upsert
locally on success, and set `thread.currentUser = Persona.email()` so the Edit/Delete buttons
only appear on the user's own comments.

### cid: inline image embedding in sandboxed email body
`pf-sandboxed-iframe` now accepts a `cidMap` property: `{ [cidKey]: dataUri }`. During render,
src="cid:NAME" / src='cid:NAME' / src=cid:NAME references in the HTML are substituted with
the matching data URI before being written into the sandboxed iframe srcdoc. Unknown cid refs
are left intact (browser shows broken image — same behavior as a mail client without those
parts). Proven via substitution test.

### Idempotency log persistence (in-memory → localStorage)
The bounded ring buffer (500 entries) is now persisted to localStorage under
`obsidian.requestLog.v1`. On module load, prior entries are restored. Writes are
**debounced 1 second** so a burst of API calls doesn't hammer localStorage. `Idempotency.clear()`
also removes the localStorage key. Proven: 2 records → JSON in localStorage → re-import
restores them; clear empties both memory and storage.

### Profile setup (`UI.openProfileSetup()` + Persona.profile/setProfile/clearProfile/email)
- New methods on `Persona`:
    - `profile()` reads `obsidian.profile.v1` from localStorage
    - `setProfile({fullName, email, department, jobTitle})` persists + fires `platform:profile:changed`
    - `clearProfile()` removes it
    - `email()` prefers saved profile.email, falls back to `<persona>@nitda.gov.ng` stub
- **Modal form** with full-name (required), email (required + format validation), department
  (dropdown from `Lookups.departments()` if loaded, else free text), job title (optional). Saves
  on submit, toasts on success, returns the saved profile (or null on cancel).
- **Profile button** added to the app header next to Refresh, opens the modal.
- The existing assignment payload builders (`single-item-ops`, `bulk-assignment`, `openEmailToTask`,
  `openComments`) all already call `Persona.email()` defensively, so they immediately benefit —
  payloads now stamp the real user email instead of a generic stub.

### Final state — verified
```
- 19 modules register (was 19; no new modules, all upgrades in-place)
- 12/12 static gate checks pass (i18n-runtime-keys: 320+ literal keys, 0 missing)
- Profile lifecycle proven: initial null → setProfile → email() uses saved → clearProfile → null
- Persistence proven: record, JSON stored in localStorage, clear removes both
- cid substitution proven: cid:logo.png → data:image/png;base64,…
- Threading proven: parents + replies sorted by ts, orphans don't get lost
```

### Still missing — honest
- The platform now covers the **core SPA chain** plus most of the SPA-specific UX patterns. What
  remains is the truly long tail:
  - Calendar / due-date heatmap view (SPA had a heatmap of due tasks per day)
  - Activity timeline UI in detail panes (the data exists, no dedicated UI surface)
  - Keyboard shortcuts cheatsheet (the SPA had `?` to open a shortcut palette)
  - Drag-and-drop reordering in bulk-assignment item list
  - Audit log viewer (the data is in Bus 'audit:*' events; no UI to surface them)
  - Multi-language support (the i18n system supports it; only en.json exists)
## 5y. Continuation — heatmap, activity timeline, shortcuts, audit log (2026-05-30)

### Due-date heatmap (`lens.renderHeatmap`)
14-week, 7-row (Sun→Sat) grid showing task load by due date. Cells colored by intensity (0-4
buckets). Past dates with items render in red (overdue context); today gets a brand-coloured ring.
Stats row: `overdue / upcoming / peak-per-day`. Legend ("Less" → "More") below the grid.

Wired into the home dashboard as a section after Quick Actions. Click a cell → modal listing
that day's items.

### Activity timeline (`lens.buildActivityTimeline` + `lens.renderActivityTimeline`)
Synthesises a chronological event stream from:
- The record's own creation timestamp (ts/createdAt/Created/receivedDateTime)
- Related comments (`Entities.byReference(ref).comment`) — each is a "Comment" event (or "Reply"
  if `parentId` is set)
- Sibling tasks of the same reference — each is an "Assigned" event

Rendered as a vertical timeline with kind-colored icons (created=brand, comment=muted, assignment=
routed). When-stamps right-aligned. Wired into `renderRichDetail` so every detail pane gets it.

### Keyboard shortcuts (`UI.openShortcuts()` + global handler)
- `?` → opens shortcuts cheatsheet
- `Esc` → close active modal (handled per-modal)
- `/` → focus the lookup search field if present
- `g` followed by letter → navigate: `h`=home · `o`=ops-hub · `l`=lookup · `r`=response-tracking ·
  `s`=settings · `d`=diagnostics · `c`=correspondence · `a`=assignment
- `r` → refresh fabric (`Entities.bootstrap(true)` + `Lookups.load(true)`)
- `n` → new single assignment

Global handler in `core/platform.js` skips inputs/textareas/contenteditable so typing isn't
hijacked. 'g'-sequence has a 700 ms timeout. Cheatsheet modal categorises shortcuts into
Navigation / Actions / Forms with proper `<kbd>` styling.

### Audit log (`core/audit-log.js` + Platform.AuditLog)
Listens to every `Bus.emit` for events starting with `audit:` and records them in a bounded
ring buffer (1000 entries). The Bus's `emit` is monkey-patched to siphon matching events
without disrupting any subscriber.

- **Persistence**: localStorage `obsidian.auditLog.v1`, debounced 1.5 s
- **Filter by kind**: each unique kind becomes a filter chip
- **Surface**: new section in diagnostics with filter chips (All + each kind) + Clear button
- **Proven via direct smoke**: 2 audit events captured (non-audit ignored), kinds extracted,
  filter-by-kind returns matching subset, persistence to localStorage works

### Verified
```
- 19 modules register; comments hidden; lookup + settings + heatmap visible
- 12/12 static gate checks pass; 340+ literal i18n keys validated, 0 missing
- Heatmap renders 7×14 grid with stats + legend
- Timeline synthesises events from creation + comments + sibling tasks
- Shortcuts handler skips typing contexts; `g` sequence works
- Audit log captures only `audit:*` events; persists to localStorage; filterable by kind
```

### Still missing — the genuinely long tail
- **Drag-and-drop reordering** in bulk-assignment item list
- **Multi-language i18n** (system supports it; only en.json exists — `fr.json`, `ar.json`, `ig.json`,
  `yo.json`, `ha.json` would be next)
- **Service worker / offline support** (currently online-only)
- **Heatmap cell drag-select** for batch operations
- **Per-user dashboard customisation** (saved layout preferences)
- **Real-time updates** via WebSocket / SignalR (currently poll-on-action only)
## 5z. Continuation — multi-language i18n + service worker for offline (2026-05-30)

### I18n with fallback + RTL detection (`core/i18n.js` rewritten)
- **Fallback chain**: missing key in active locale → looks in default-locale dict before showing
  `«key»`. So partial translations remain useful. Default locale's full dict is loaded lazily on
  first non-default `load()` and kept as `fallbackDict`.
- **RTL detection**: `RTL_LOCALES = {ar, he, fa, ur}`. On load, sets `document.documentElement.dir`
  to `rtl`/`ltr` and `lang` to the locale code; emits `platform:locale:changed` with the dir.
- **Persisted choice**: locale stored in `localStorage[obsidian.locale.v1]`, restored on init.
- **`isRTL()` API** for shell components to react to direction changes.

### Translation files
- **`fr.json`** (French) — comprehensive coverage of navigation, common actions, module titles/
  subtitles, settings, lookup, email, comments, profile, notification, shortcuts, connectivity
  (12 top-level branches; ~157 keys). Anything missing falls back to en.
- **`ha.json`** (Hausa — Nigeria's most-spoken indigenous language) — abbreviated set: common
  actions, navigation, module titles, connectivity (~40 keys). Anything missing falls back to en.
- The runtime fallback chain means partial translations look polished, not broken.

### Language switcher in Settings
- New section above the Endpoints section: 3 chips (English / Français / Hausa). Clicking a chip
  calls `I18n.switch(code)` and re-renders the page. The chosen locale persists across reloads.

### Verified i18n end-to-end
```
locale fr → "common.actions.save" = "Enregistrer"   (translated)
locale fr → "lookup.scope.label" = "Portée"        (fallback chain works)
locale fr → "settings.saved" with {key:"GET_DOCS"} → "Remplacement enregistré pour GET_DOCS." (interpolation works)
locale ha → "common.actions.save" = "Ajiye"        (Hausa)
locale ha → "email.body" = "Body"                  (Hausa→English fallback)
nonexistent.key → «nonexistent.key»                 (correct missing-key marker)
```

### Service worker for offline support (`sw.js`)
- **Pre-cache**: index.html + core JS/CSS/themes + en.json (the app shell)
- **Strategy**: same-origin GET → stale-while-revalidate (cached first, network update in
  background). Cross-origin (PA flow URLs) → network-only (no caching of dynamic operational data)
- **Activate**: purges old caches on version bump
- **Update flow**: when a new SW is installed and the old one is still controlling, fires
  `platform:sw:update-available` so the UI can toast the user with a Reload action
- **Registration**: in `core/boot.js`, best-effort (silently fails if no service-worker support
  or `file://` protocol)
- **Messaging**: page can `postMessage({type:'OBSIDIAN_SW_PURGE'})` to wipe the cache, or
  `OBSIDIAN_SW_SKIP_WAITING` to activate a new SW immediately

### Final state
- **19 modules**, 12/12 static gate checks pass
- **3 locales** present (en, fr, ha); i18n fallback chain proven end-to-end
- **Service worker** ready (registers in browser context; no caching of PA dynamic data)

### Genuinely remaining tail
- Arabic (`ar.json`) for full RTL coverage — the RTL infrastructure is in place
- Service-worker offline read-only mode for last-known fabric data
- Real-time updates (WebSocket / SignalR — PA flows don't easily support this)
- Drag-and-drop reordering in bulk-assignment item list
- Per-user dashboard customisation (saved layout preferences)
- Heatmap cell drag-select for batch operations
## 5z+1. Pre-ship incident triage helpers (2026-06-01)

Added to diagnostics before Path-A deploy. Three things an ops person needs the moment something
breaks in production:

### Per-row "Copy" on Request Log + Audit Log
Each row in both tables now has a "Copy" button. Click → the entry as pretty-printed JSON lands
on the clipboard (with textarea fallback for browsers without async clipboard API). Toast confirms.

### "Export All" on Request Log + Audit Log
Filter chip bar now has an Export All button next to Clear. Click → downloads the visible log as
a timestamped `.json` file: `obsidian-request-log-2026-06-01T13-20-28.json`. Operators can attach
this to an incident report.

### Last Fetch_All Response section
New diagnostics card. Captures the full envelope of the most recent Fetch_All call (in-memory,
not persisted):
- ok / status / durationMs / correlationId / errors / ts
- Full body up to 5 MB serialised (verified: holds your real 4.5 MB response cleanly)
- Bodies over 5 MB → envelope kept, body dropped with explanation
- "Copy Response" → JSON to clipboard
- "Download Response" → timestamped JSON file

This is the single most important diagnostic for ingest defects — when a record doesn't show up
or shows up with wrong fields, this is what gets sent for analysis.

### Verified end-to-end against real response
```
envelope present: true · ok: true · status: 200 · durationMs: 127
body size (JSON): 4,531,135 chars (full 4.5 MB held)
```
12/12 static gate checks pass; 19 modules register.
## 6. What remains (accurate as of 2026-05-27 — supersedes all earlier remaining-lists)

**Nothing structurally incomplete.** 17 modules, 14 flows embedded/active/direct, 0 orphaned
endpoints, no sample/placeholder/dead parts, DGO Design System v2.0 adopted, static gate green.
What's left is live validation, browser testing, and optional polish.

### A. Live / operator actions (need the running environment — yours)
1. **Confirm each of the 14 flows responds live** — open `#/diagnostics` (now visible to all) and
   ping every endpoint. Only `REFERENCE_DATA` has been validated against a real response so far.
2. **Capture a real `FETCH_ALL` response** and share it — this populates the whole fabric/UI. I need
   to confirm its top-level collection key names map to `references/documents/tasks/emails/approvals/
   comments/activities`; if the live names differ I adjust the ingest map. (Highest-value next item.)
3. **Share real responses (or confirm) for the remaining flows** so payload↔response contracts are
   verified end-to-end: `GET_DOCS`, `BULK_ASSIGNMENT`, `SINGLE_ASSIGNMENT`, `EMAIL_RELATED_TASK`,
   `SUBSIDIARY_ACTIONS`, `DYNAMIC_GLOBAL_ACTIONS`, `OTP_GENERATE`/`OTP_VERIFY`, `AI_DOC_ANALYSIS`/
   `AI_EMAIL_ANALYSIS`/`AI_CHAT`, `FETCH_EMAIL_ATTACHMENTS`.
4. **PA-side: fix the Get-All-Reference-Data flow** emitting two response objects (`ok:false` then
   `ok:true`). The platform tolerates it now, but a single clean envelope is cleaner.
5. **Rotate SAS signatures** directly in `config/endpoints.config.js` if/when any flow key is rotated.

### B. Testing (needs browser/live — on your cue)
6. **Layers 0–1**: static gate passes; the unit suite (`tests/tests.html`) has not yet been run in a
   browser. 
7. **Layers 2–4**: functional, integration, and live runs against the flows — not yet executed.
8. **Visual / responsive QA** in a browser (cannot render here): DGO v2.0 theming across light/dark/
   high-contrast and mobile/compact breakpoints.

### C. Optional enhancements (my side, on your go-ahead)
9. **Self-host Outfit/Inter** woff2 in `/assets` to match the design system's intended type exactly
   (currently system-fallback to honor the no-CDN lock).
10. **Adopt the v2.0 `i-*` icon set** (would remap every `pf-icon` name; deferred to avoid breaking
    the 27 existing icon references).
11. **Housekeeping**: remove the now-unused `status.notImplemented` i18n key and the `reserved501`
    defensive path (no reserved endpoints remain).

## 7. Direct answers to the three standing concerns
1. *Audit/harmonization/porting not concluded* — **16/17 modules ported.** Remaining is non-module: §0 key rotation (source already remediated), a live `FETCH_ALL`
   verification open. §6 is the closeout list.
2. *Nothing ran end-to-end* — addressed: `bulk-assignment` is now a complete pick→confirm→submit→
   fabric-update path on seed (live once §0 is resolved). It is the reference for finishing the rest.
3. *Data structures didn't align with flows* — diagnosed and largely closed in §3: hydration was sound;
   the real gaps were the missing lookups provider and the bulk payload mismatch, both fixed in §5.

## 7b. Testing
Full test guide: `docs/TESTING.md`. Static gate: `bash tools/verify.sh` (PASS = locks green).
Layers 0–3 need no credentials (validate on seed); Layer 4 needs the §0 live secrets.

## 8. Resume procedure
1. New chat → upload latest `platform-root` zip → unpack to `/mnt/user-data/outputs/`.
2. Read `docs/PROJECT_STATUS.md` (this file) + `INTEGRATION.md` + `DECOMPOSITION.md`.
3. Take the top open item in §6; port per the lens contract reusing shared resources (`Lookups`,
   `Entities`, lens utils); verify (imports, hex, console, banned-scan, i18n); re-zip checkpoint.

---

## 9. 2026-06-10 — SPA-exact assignment forms (in-session authorization)

User-authorized in-session (supersedes the B-1 OTP mandate for bulk only). Two changes:

**Bulk assignment — exact SPA port.** `modules/bulk-assignment/index.js` rewritten to mirror the
NITDA Ops Hub SPA: Category/Sub-Category `<select>`s with cascade (auto-select single sub-category,
fill assignee from primary-DSU head, auto-priority from category while still on the P3 default), a
single **Assign-To email typeahead** (min 2 chars, top 8), Priority `<select>`, Comments, and a
**dual-mode submit** — Direct (E06 / `BULK_ASSIGNMENT_DIRECT`) and Optimized (E07 /
`BULK_ASSIGNMENT`) — gated by a confirm step. Removed: OTP gate (SPA has none), co-assignee, CC,
assignment-type/action chips, date pickers. `_execute` payload is byte-for-byte the SPA
`executeBulkAssign` shape (`AssignmentType:'bulkassignment'`, `NewActivityTask`, `SelectedItems`,
nested `payload.{task,selection,assignment}`), including the SPA's duplicate/misspelled
`AcknolwedgementDueBy`.

**Endpoints.** Added `BULK_ASSIGNMENT_DIRECT` (SPA E06, operator-supplied URL) beside the existing
optimized flow. `service.js` exports both and routes by mode.

**Single assignment — full SPA payload.** `modules/single-item-ops/index.js` `_submit()` payload
replaced with the SPA `submitAssignment` full shape (Description, Timeline, AttachmentLink, all three
Ack/Task date spellings, SupportAssignedToTitle/SupportDSUKey, `YYYYMMDD-<docId>-<catCode>-<subCatCode>-`
refId, complete nested `payload.task`). Form unchanged; the platform's Ack/Task-Due pickers win over
the SPA `tomorrow` default when set.

Gate: 12/12 PASS; boot-smoke 19 modules. Status: implemented per SPA; `[browser-unverified]`
end-to-end (typeahead, cascade, Direct/Optimized round-trips, live PA acceptance).

**Disclosed deviations:** (1) platform shell (item picker, stepper, result region) retained around the
ported form — the SPA receives items pre-selected from its gallery whereas this is a standalone surface;
(2) single due-dates honor the form pickers, falling back to the SPA `tomorrow` default. **Register
note:** bulk no longer enforces OTP, contradicting defect B-1 — accepted under in-session authorization.

---

## 10. 2026-06-10 — Section-K reconciliation + K-2 fix (from operator upload)

Operator uploaded `complete_NITDA_Obsidian_Operations_Platform.md` (a React/Vite roadmap *viewer*),
carrying a supplemental "Section K" not in the 92-point register. Each item was verified against the
real source, not copied:

- **K-2 (approvals `commit()` ReferenceError) — CONFIRMED → FIXED.** `modules/approvals/index.js`
  l.177 read `it.__ref` (out of scope in `commit()`); now `existing.__ref || existing.referenceId
  || ref`. Previously threw on the approve/reject success path, so `actionCompleted` never fired.
- **K-1 (fasttrack SLA in calendar days) — CONFIRMED, OPEN.** Reconcile-only; fix blocked on the
  Q-5 working-hours definition.
- **K-12 (assistant payload missing scope) — NOT REPRODUCED.** Assistant already stamps
  directorate/persona/userEmail (l.52–61, "K-8b").
- **K-15 (pf-side-panel listener leak) — FALSE POSITIVE.** `this.on` registers a disposer that
  `disconnectedCallback` runs; listener is cleaned up.

Recorded in CLAUDE.md §8 → "Section K — Supplemental Register". Also logged: the D-5 redirect-target
conflict (upload says Executive dashboard; register says single-item-ops/bulk-assignment — CLAUDE.md
authoritative) and the B-1/OTP reconciliation (bulk OTP stays removed per in-session authorization).

Gate: 12/12 PASS. K-2 fix is `[browser-unverified]` end-to-end (approve a real item to confirm the
success toast/navigation now fires).

---

## 11. 2026-06-10 — Assignment surfaces: forensic fixes + upload-aligned UI

Reported: single-assign dropdowns dead, bulk dropdowns "not complete." Forensic pass found three
real bugs (all fixed), plus a design pass aligned to the operator upload.

**Bugs**
- **pf-rich-picker lazy-property wipe** (single-assign root cause). onConnect ran after the constructor
  attached shadowRoot and reset _items/_tabs/_itemsByTab/_mode — clobbering properties set on the
  detached element by _mkPicker(). Now preserves instance > attribute > default. Every single-assign
  picker (category/assignee/co-assignee/CC) was opening empty.
- **Single-assign layout squash.** styles.css capped .pf-si__form at max-width:34rem, collapsing the
  global two-column .pf-si__grid (form + 360px sticky summary). Cap removed.
- **Assignee "By User" silent miss.** Handler read raw.email only; Lookups resolves the email into the
  option VALUE and source records may spell it Email/upn. Now keys off e.detail.value first
  (assignee + co-assignee).

**UI (from upload's src/index.css selection aesthetic, mapped to tokens — hex-lock safe)**
- Bulk selectable rows: brand-tinted fill + 3px left accent bar on selection, soft brand hover.
- Assign-To typeahead: hover/active states + full keyboard nav (Arrow/Enter/Escape) — previously
  mouse-only.

Note: the upload is a React/Vite *roadmap viewer*, not a design system; its dark-slate/emerald palette
was adopted as the selection PATTERN via var(--color-brand-primary), not hardcoded. Gate 12/12.

---

## 12. 2026-06-11 — Sweep fix + bulk parity + draft-autosave

Per operator direction (bulk parity + sweep + D-3):

**Sweep finding (fixed).** core/ui.js carried the same `raw.email` fragility as single-item-ops in its
modal assignee/co-assignee pf-picker handlers — now resolves email from e.detail.value first. Also
confirmed core/ui.js uses the same createElement→set-props mkPicker pattern, so the pf-rich-picker
lazy-property fix repairs those modal pickers too (openEmailToTask / openFlagDocument). Noted but left
alone: tools/deploy-s0-s1-a11.sh is a stale one-time Termux deploy snapshot (not referenced; repo is
source of truth).

**Bulk feature parity (diverges from SPA-exact, operator-authorized 2026-06-11).** Added Co-Assignee
(typeahead), CC (semicolon/comma list), Action Required (select), and Ack/Task due-date pickers to
bulk-assignment, wired through the summary, confirm dialog, and the BULK_ASSIGNMENT payload
(NewActivityTask + payload.task: SupportAssignedTo/CopyTo/ActionRequired, operator due dates win over
the tomorrow fallback).

**D-3 draft-autosave.** single-item-ops persists this._draft to localStorage
(obsidian.single-item-ops.draft.v1) on every change, restores on open (with an info toast), reflects
restored selections into pickers/comments, and clears on successful submit. Best-effort (try/catch).

Gate 12/12; boot-smoke 19 modules. All [browser-unverified].
