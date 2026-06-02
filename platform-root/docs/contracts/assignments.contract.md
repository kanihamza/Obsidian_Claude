# Contract Family — Single + Bulk Action (F2/F3)

Canonical Wire Tickets for the Single + Bulk Action family. Authority: Power Automate HTTP Flows — Canonical Response Contract v1. Pointers in `/config/endpoints.config.js` (`@see` this file).

**`data.*` shape:** F2: scalar/object with createdTaskId/assignedTo/status/referenceId. F3: { selectedCount:N, assignedTo, assignmentType, category, … }.

## BULK_ASSIGNMENT
- **Flow:** `Docoument_Bulk_Task_Assignment_Create`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F3
- **request.action:** `bulkassignment`
- **URL:** see `Endpoints.BULK_ASSIGNMENT.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('BULK_ASSIGNMENT', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.

## SINGLE_ASSIGNMENT
- **Flow:** `Docoument_Single_Task_Assignment_Create`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F2
- **request.action:** `singleassignment`
- **URL:** see `Endpoints.SINGLE_ASSIGNMENT.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('SINGLE_ASSIGNMENT', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.

## EMAIL_RELATED_TASK
- **Flow:** `Email_Related_Task_Create`
- **Method:** POST
- **Envelope:** v1  ·  **Family:** F2
- **request.action:** `emailtotaskassignment`
- **URL:** see `Endpoints.EMAIL_RELATED_TASK.url` in `/config/endpoints.config.js` (registry-verbatim, signature-bearing).
- **Consumers:** modules wiring `BaseService.endpoint('EMAIL_RELATED_TASK', …)` — see /docs/ENDPOINTS.md.
- **Notes:** Active.
