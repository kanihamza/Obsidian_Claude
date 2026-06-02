# OBSIDIAN v4 — Flow URL Configuration & Rotation (LIVE / DIRECT)

## Configuration model (platform directive)
This is a **live platform with direct flow integration**. The full Power Automate HTTP-trigger URL
for every flow — environment host, workflow id, `api-version`, `sp`, `sv`, and the SAS `sig` — is
**embedded directly** in `config/endpoints.config.js`. The platform sends requests **directly** to
the flows and the flows respond **directly** to the platform. There is **no** proxy, gateway,
intermediary, or runtime injection. All **14** endpoints are active and directly callable.

## Where the URLs live
- Single source: `config/endpoints.config.js` → `Endpoints.<KEY>.url = PATH('<workflowId>', '<sig>')`.
- `PATH()` composes the canonical invoke URL. `/core/api.js` is the only module that calls `fetch()`,
  and it reads `Endpoints[key].url` directly.

## Rotating a flow signature
When a flow's SAS is regenerated in Power Automate:
1. Copy the new `sig=` value from the flow's HTTP-trigger URL.
2. Replace the `sig` (2nd `PATH(...)` argument) for that flow's key in `config/endpoints.config.js`.
   Two keys share one workflow (`REFERENCE_DATA`, `AI_DOC_ANALYSIS`) — update both (same value).
3. `bash tools/verify.sh` → `embedded-url-scan PASS`; regenerate `BUILD_INTEGRITY.txt`.

## Operational security note
Because signed URLs are embedded in source by directive, the repository and any deployed copy are
**sensitive** — anyone with the files can invoke the flows. Restrict access to the source and the
served origin accordingly, and rotate signatures on any suspected exposure.

## Workflow → endpoint map (workflow ids are identifiers, not secrets)
| workflowId | endpoint key(s) |
|---|---|
| `7995c1eb50d94d5daa2780e71391d874` | GET_DOCS |
| `fe794e0139784ac694768e5a716e0be7` | AI_EMAIL_ANALYSIS |
| `bc83d98acf474a088832d78f50085388` | DYNAMIC_GLOBAL_ACTIONS |
| `20e6340941ce4b1bbb87b43c9102a777` | FETCH_EMAIL_ATTACHMENTS |
| `20e3b003a57f47febae8a24ad5b9acd4` | REFERENCE_DATA, AI_DOC_ANALYSIS |
| `314aaf27593147089b38322e5ca25936` | OTP_GENERATE |
| `43879c5165de439680055ab4258b3f27` | OTP_VERIFY |
| `a13c8b577bd44f8787c50d095ea3faf9` | AI_CHAT |
| `1d56be97cd184fd9b2facede12b17c34` | FETCH_ALL |
| `1154b50e1d17420dadb3b012e7e2a02c` | BULK_ASSIGNMENT |
| `6b3bad3005b44bf6bced0f8074d3f2ed` | SINGLE_ASSIGNMENT |
| `85c556f10b8244ba9d839a2ebe240b91` | SUBSIDIARY_ACTIONS |
| `a942d230337c4ddfa9a386e92bbd048b` | EMAIL_RELATED_TASK |

## Verify
1. `bash tools/verify.sh` → all PASS.
2. Serve the root and open `#/diagnostics` (admin) — all 14 endpoints ping the live flows directly
   and report status · latency · data-presence.
3. Capture one live `FETCH_ALL` and confirm its `data` collection keys match `entity-store.ingest()`.
