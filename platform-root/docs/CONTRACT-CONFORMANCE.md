# Contract Conformance Ledger — OBSIDIAN v4.0

Authority order (§1.4 / §2.2): canonical contract (Part I) > sample response > SPA inference.
Every delta between a source artifact and the contract is resolved in favor of the contract and logged here.

## Response envelope normalization (Finding F2)
Two authoritative envelopes exist and are the only parse paths:

- **Production-v1** — 15 flows. Detected by `ok`; HTTP status read from `status.http`.
- **Subsidiary-Actions-v4** — `flow_12` only. Detected by `success`; status from `statusCode`; `meta.routeKey` carried through.

The Part-II per-flow "success examples" use a third, simplified shape
(`{ success, message, data, errors, meta:{flow} }`). These are **illustrative legacy**
and are excluded from the parser. `/core/api.js#normalizeBody` resolves on `ok` first,
then `success`; a body with neither resolves `kind:'parse'`. `errors[]` is preserved even
when `ok:true` (warnings are non-fatal per contract §E.2). No service unwraps to bare
`.data`; the full normalized result is returned so warnings survive.

## Shared physical workflow (Finding F3)
`REFERENCE_DATA` and `AI_DOC_ANALYSIS` resolve to the same workflow
(`…20e3b003a57f47febae8a24ad5b9acd4…`, identical signature). Both registry keys are
retained (registry authority); disambiguated by request payload: `lookups`/`read` versus
`aiAnalyseEventDocs`/`analyse`. They are NOT collapsed.

## Verbatim registry identifiers (Finding F4)
Endpoint keys, `flowName`, contract filenames, and request fields preserve registry
spelling byte-exact, including `Docoument_Bulk_Task_Assignment_Create`,
`Docoument_Single_Task_Assignment_Create`, `Fech_Email Attachments`, and the field
`RefIDD`. UI labels never read these; they resolve through `Platform.I18n.t(...)` from
`/config/i18n/en.json` under the locked `<scope>.<context>.<element>` convention
(e.g. `endpoint.bulkAssignment.label`). The §1.6 banned-token scan targets
demo/placeholder words and is not triggered by these proper identifiers.

## Reserved flows (Finding F1 / Item 6)
resolves them locally to a normalized 501 (`kind:'notImplemented'`,
`errors[0].code = 'NOT_IMPLEMENTED'`) without touching the network. They are excluded
from active call sites and from `ACTIVE_ENDPOINT_KEYS`, and documented in ENDPOINTS.md.

## SPA-declared endpoints
Every source SPA declares zero endpoints; the manifest reports `all_endpoints: []`.
Endpoint wiring is therefore driven entirely by Stream B (Finding F1). SPA inference is
descriptive only and contributes no endpoint of its own.

## SPA inline endpoints vs Stream-B (source-port finding, 2026-05-22)
Reading the 20 SPA sources revealed inline endpoints (the SPA manifest's `endpoints: []` was a
detection miss). Eight workflow IDs the SPAs call are absent from the canonical Stream-B registry;
four are high-frequency. DAA_DGO_HUB's own endpoint map names them, establishing they are the **same
logical operations under legacy physical workflow IDs**, superseded by the canonical flows:

| SPA operation (legacy workflow) | Canonical Stream-B endpoint |
|---|---|
| references — `ff455c68…` (E01) | REFERENCE_DATA |
| get-docs — `818ec405…` (E02) | GET_DOCS |
| fetch-tasks — `37642ba3…` (E03) | SUBSIDIARY_ACTIONS{GET_ALL} (bulk: FETCH_ALL) |
| get-emails — `3931e2ff…` (E04) | FETCH_EMAIL_ATTACHMENTS / SUBSIDIARY{REFRESH_EMAILS} |
| create/update/flag — `6b3bad30…` (E05/E08/E10) | SINGLE_ASSIGNMENT (identical URL+sig) |
| reports read — `7e71fffe…` | FETCH_ALL |
| approval action — `f71397ff…` (approvals.html, self-described placeholder) | SUBSIDIARY_ACTIONS{ACKNOWLEDGE} / {UPDATE_TASK} |

**Ruling (binding, per §1.4 + locked F1):** Stream-B remains the wiring authority. Legacy physical
URLs are NOT added to the registry. Ported modules re-point each SPA operation to its canonical
endpoint above. This is logged, not silently dropped.
