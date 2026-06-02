# Contract Family — Switch-Routed (v4) (F4)

Canonical Wire Tickets for the Switch-Routed (v4) family. Authority: Power Automate HTTP Flows — Canonical Response Contract v1. Pointers in `/config/endpoints.config.js` (`@see` this file).

**`data.*` shape:** Branch-specific per meta.routeKey; envelope uses success/statusCode/action (§B v4).

## SUBSIDIARY_ACTIONS
- **Flow:** `Subsidiary_Actions`
- **Method:** POST
- **Envelope:** v4  ·  **Family:** F4
- **request.action:** `INIT`
- **URL:** see `Endpoints.SUBSIDIARY_ACTIONS.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('SUBSIDIARY_ACTIONS', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.
