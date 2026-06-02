# Contract Family — Orchestration (F7)

Canonical Wire Tickets for the Orchestration family. Authority: Power Automate HTTP Flows — Canonical Response Contract v1. Pointers in `/config/endpoints.config.js` (`@see` this file).

**`data.*` shape:** { "actionKey":…, "dispatched":bool, "downstreamResults":[{step,ok,itemCount},…] }.

## DYNAMIC_GLOBAL_ACTIONS
- **Flow:** `Dynamic_Global_Actions`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F7
- **request.action:** `dynamicGlobalAction`
- **URL:** see `Endpoints.DYNAMIC_GLOBAL_ACTIONS.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('DYNAMIC_GLOBAL_ACTIONS', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.
