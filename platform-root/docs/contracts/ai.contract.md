# Contract Family — AI / Asynchronous (F5)

Canonical Wire Tickets for the AI / Asynchronous family. Authority: Power Automate HTTP Flows — Canonical Response Contract v1. Pointers in `/config/endpoints.config.js` (`@see` this file).

**`data.*` shape:** { "<resultObject>": {…}, "model":"…", "tokensUsed":N }.

## AI_EMAIL_ANALYSIS
- **Flow:** `AI_Assisted_Email_Analysis`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F5
- **request.action:** `aiAnalyseEmail`
- **URL:** see `Endpoints.AI_EMAIL_ANALYSIS.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('AI_EMAIL_ANALYSIS', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.

## AI_DOC_ANALYSIS
- **Flow:** `AI_Assisted_Event Related_Document_Analysis_Processing`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F5
- **request.action:** `aiAnalyseEventDocs`
- **URL:** see `Endpoints.AI_DOC_ANALYSIS.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('AI_DOC_ANALYSIS', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.

## AI_CHAT
- **Flow:** `AI_Chat`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F5
- **request.action:** `aiChat`
- **URL:** see `Endpoints.AI_CHAT.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('AI_CHAT', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.
