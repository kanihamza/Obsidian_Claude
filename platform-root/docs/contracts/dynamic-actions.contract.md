# Contract Family — Dynamic Global Actions (F7)

The **universal channel for any action/function without a dedicated Power Automate flow.** Per operator
directive, such actions are dispatched through `DYNAMIC_GLOBAL_ACTIONS` (family F7, `flowName:
Dynamic_Global_Actions`, envelope `v1`) via `Platform.Actions`. Machine-readable registry:
`config/dynamic-actions.config.js`. Lifecycle: **preview + confirm → execute → parsed feedback**
(`Platform.Actions.run`); fire-and-forget for fabric transitions (`Platform.Actions.emit`).

## Wire envelope (Dynamic Global Actions Trigger Contract v2.0.0)

Every dispatch POSTs this envelope (additional contract fields allowed):

```json
{
  "action":   "<verb>",                 // e.g. dispatchEmail, setReminder, transition
  "operation":"<operation>",            // contract default (send, create, generate, issue, transition…)
  "mode":     "single | batch",
  "source":   "DGO_FAST_Track_WEB_OPS", // injected by endpoint defaults
  "userEmail":"<actor email | null>",   // from Persona.email()
  "requestId":"<uuid>",                 // idempotency / correlation
  "timestamp":"<ISO-8601>",
  "client":   { "app": "obsidian", "version": "4.0", "submittedAt": "<ISO-8601>" },
  "payload":  { /* per-action — see below */ },
  "ref": "REF-…", "docId": null, "taskId": null, "status": null   // optional top-level contract fields
}
```

**Response (v1 envelope):** `{ ok, status:{http}, data, errors[], meta }`. The UI surfaces
`data.message` (or `errors[0].message`) verbatim via `Platform.Actions.feedback`. Idempotency keys are
auto-attached for writes; every call is recorded in the request log.

## Action registry

| action | operation | mode | required payload | optional | confirm | success i18n |
|---|---|---|---|---|---|---|
| `transition` | transition | single | `ref`, `status` | `from`,`to`,`by` | no | `flow.done` |
| `addComment` | create | single | `referenceId`, `body` | `sentiment`,`priority`,`author`,`parentId` | no | `comments.added` |
| `acknowledge` | acknowledge | single | `ref` | `by` | yes | `flow.done` |
| `route` | route | single | `ref` | `triageMeta`,`by` | yes | `flow.done` |
| `dispatchEmail` | send | single | `email` | `ref`,`kind`,`attachments` | yes | `reports.emailSent` |
| `prepareMeetingPack` | generate | batch | `refs` | `title`,`period`,`recipients` | yes | `flow.done` |
| `issueTripClearance` | issue | single | `ref`,`traveller`,`destination` | `startDate`,`endDate`,`purpose` | yes | `flow.done` |
| `setReminder` | create | single | `dueAt` | `ref`,`taskId`,`note`,`channel` | yes | `flow.done` |

Required fields are validated before dispatch (`actions.contract-missing` warning if absent); the flow
remains the server-side authority.

## Per-action request / response

### `dispatchEmail` — outbound email send  *(captures SPA `sendEmailV2` / Send DGO/GTQ Report Email)*
Request `payload`:
```json
{ "kind": "report | correspondence",
  "ref": "REF-… | null",
  "email": { "to": ["dg.office@nitda.gov.ng"], "cc": [], "subject": "NITDA Management Report",
             "bodyHtml": "<…report html…>" },
  "attachments": [ { "name": "report.html", "contentType": "text/html", "contentBase64": "…" } ] }
```
Response `data`: `{ "messageId": "<id>", "sentAt": "<ISO>", "recipients": ["…"] }`.
Errors: `kind ∈ RECIPIENT_REQUIRED | SEND_FAILED`.
**Note:** this is the UI hand-off to **Phase-5 Dispatch**. Until `DISPATCH_OUTBOUND` lands, the dynamic
flow performs/relays the send; when Dispatch ships, repoint `dispatchEmail` there with no UI change.

### `prepareMeetingPack` — consolidate references into a meeting pack
Request `payload`:
```json
{ "refs": ["REF-1","REF-2"], "title": "DG Weekly Pack", "period": "2026-W24",
  "recipients": ["dg.office@nitda.gov.ng"] }
```
Response `data`: `{ "packId": "<id>", "packUrl": "<url> | null", "packHtml": "<html> | null", "count": 2 }`.
Errors: `kind ∈ NO_REFERENCES | PACK_FAILED`.

### `issueTripClearance` — issue a travel-clearance document/approval
Request `payload`:
```json
{ "ref": "REF-…", "traveller": { "name": "…", "email": "…", "directorate": "…" },
  "destination": "Abuja", "startDate": "2026-06-20", "endDate": "2026-06-24", "purpose": "…" }
```
Response `data`: `{ "clearanceId": "<id>", "status": "issued | pending-approval", "documentUrl": "<url> | null" }`.
Errors: `kind ∈ TRAVELLER_REQUIRED | NOT_AUTHORIZED | ISSUE_FAILED`.

### `setReminder` — schedule a reminder
Request `payload`:
```json
{ "ref": "REF-… | null", "taskId": "T-… | null", "dueAt": "2026-06-20T09:00:00Z",
  "note": "Follow up on procurement memo", "channel": "email | inapp" }
```
Response `data`: `{ "reminderId": "<id>", "dueAt": "<ISO>", "channel": "email" }`.
Errors: `kind ∈ DUEAT_REQUIRED | SCHEDULE_FAILED`.

## Integration points (UI homes)

- **`dispatchEmail`** — wired: `reports` Management Report → *Send Report Email* (this release). Also the
  intended hook for correspondence/approval email sends and Phase-5 Dispatch.
- **`prepareMeetingPack`** — wired: `ops-hub` multi-select bulk bar → *Prepare Meeting Pack*
  (selection → `refs`, preview + confirm + parsed feedback; this release).
- **`issueTripClearance`** — intended home: a document/correspondence detail action. [UI not yet placed.]
- **`setReminder`** — wired: shared rich-detail workspace (`appendRichSections`) on every record/task
  detail (ops-hub / correspondence / fasttrack) → *Set a reminder* (due picker + note + channel →
  `ref`/`taskId` + `dueAt`, preview + confirm + parsed feedback; this release).

> Contracts are complete and callable now (`Platform.Actions.run('<action>', { preview, payload })`).
> The PA-side flow must implement the matching server behaviour for each `action`; until then responses
> are `[PA-flow-unverified]`. No new endpoints are introduced — all route through `DYNAMIC_GLOBAL_ACTIONS`.
