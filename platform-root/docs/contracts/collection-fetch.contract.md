# Contract Family — Collection-Fetch (F1)

Canonical Wire Tickets for the Collection-Fetch family. Authority: Power Automate HTTP Flows — Canonical Response Contract v1. Pointers in `/config/endpoints.config.js` (`@see` this file).

**`data.*` shape:** { "<entity>":[…], "<entity>Count":N } (full-bundle adds a per-collection count object).

## GET_DOCS
- **Flow:** `GET_DOCS_OPS_2`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F1
- **request.action:** `getDocs`
- **URL:** see `Endpoints.GET_DOCS.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('GET_DOCS', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.

## FETCH_EMAIL_ATTACHMENTS
- **Flow:** `Fech_Email Attachments`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F1
- **request.action:** `fetchEmailAttachments`
- **URL:** see `Endpoints.FETCH_EMAIL_ATTACHMENTS.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('FETCH_EMAIL_ATTACHMENTS', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.

## REFERENCE_DATA
- **Flow:** `Fetch_References_and_Lookups_Data_v2_POST`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F1
- **request.action:** `lookups`
- **URL:** see `Endpoints.REFERENCE_DATA.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('REFERENCE_DATA', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.

## FETCH_ALL
- **Flow:** `Fetch_All_Data_&_References-POST`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F1
- **request.action:** `fetchAll`
- **URL:** see `Endpoints.FETCH_ALL.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('FETCH_ALL', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.
