# Endpoints — OBSIDIAN v4.0

Wiring authority: Stream B (Power Automate HTTP Flows, Canonical Response Contract v1).
Call sites use the registry **key** only — never a raw URL (`fetch` lives solely in
`/core/api.js`). Full Wire Tickets live in `/docs/contracts/<family>.contract.md`.

## Active endpoints (14)
| Key | Flow | Family | Envelope | action / operation / mode |
|---|---|---|---|---|
| GET_DOCS | GET_DOCS_OPS_2 | F1 | v1 | getDocs / read / read |
| AI_EMAIL_ANALYSIS | AI_Assisted_Email_Analysis | F5 | v1 | aiAnalyseEmail / analyse / single |
| DYNAMIC_GLOBAL_ACTIONS | Dynamic_Global_Actions | F7 | v1 | dynamicGlobalAction / dispatch / single |
| FETCH_EMAIL_ATTACHMENTS | Fech_Email Attachments | F1 | v1 | fetchEmailAttachments / read / read |
| REFERENCE_DATA | Fetch_References_and_Lookups_Data_v2_POST | F1 | v1 | lookups / read / read |
| AI_DOC_ANALYSIS | AI_Assisted_Event Related_Document_Analysis_Processing | F5 | v1 | aiAnalyseEventDocs / analyse / batch |
| OTP_GENERATE | OTP Generate | F6 | v1 | otpGenerate / generate / single |
| OTP_VERIFY | OTP Verify | F6 | v1 | otpVerify / verify / single |
| AI_CHAT | AI_Chat | F5 | v1 | aiChat / respond / single |
| FETCH_ALL | Fetch_All_Data_&_References-POST | F1 | v1 | fetchAll / read / read |
| BULK_ASSIGNMENT | Docoument_Bulk_Task_Assignment_Create | F3 | v1 | bulkassignment / create / bulk |
| SINGLE_ASSIGNMENT | Docoument_Single_Task_Assignment_Create | F2 | v1 | singleassignment / create / single |
| SUBSIDIARY_ACTIONS | Subsidiary_Actions | F4 | v4 | per routeKey (18 cases) |
| EMAIL_RELATED_TASK | Email_Related_Task_Create | F2 | v1 | emailtotaskassignment / createTaskFromEmail / single |

REFERENCE_DATA and AI_DOC_ANALYSIS share one physical workflow; see CONTRACT-CONFORMANCE.md (F3).
SUBSIDIARY_ACTIONS routeKeys: INIT, REFRESH_EMAILS, LOAD_EMAIL_DETAILS, AI_ANALYSE_EMAIL,
CREATE_TASK, UPDATE_TASK, LOAD_EVENT_INFO, AI_CHAT, TRACK, ACKNOWLEDGE, GET_ALL, GET_BOOTSTRAP,
LISTDOCS, GETDOC, BULKASSIGN, CREATESUPPORTREQUEST, GETREFERENCES, LIST-ACTIVITIES.

## Reserved endpoints (2)

## CORS
Configured flow-side by the canonical Response node: `Access-Control-Allow-Origin: *`,
`Allow-Methods: GET, POST, OPTIONS`, `Allow-Headers: Content-Type`. No client CORS work required.
