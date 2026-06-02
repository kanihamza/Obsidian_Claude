/**
 * OBSIDIAN v4.0 — Endpoint Registry (Stream-B authoritative · LIVE / DIRECT)
 * Plain ESM. No build step. Consumed by /core/api.js via key only.
 *
 * LIVE-DIRECT CONFIGURATION (platform directive): the full signed Power Automate HTTP-trigger
 * URL — including api-version, sp, sv and the SAS `sig` — is embedded directly here for every
 * flow. The platform calls these flows DIRECTLY and the flows respond DIRECTLY; there is no
 * intermediary, proxy, or runtime injection. Every endpoint below is ACTIVE.
 *
 * Authority: Power Automate HTTP Flows — Canonical Response Contract v1 (Part I).
 * Registry spellings (Docoument_*, Fech_*) are preserved verbatim in `flowName`.
 * UI labels never come from here — they resolve through Platform.I18n.t(...).
 * To rotate a flow's SAS, regenerate it in Power Automate and replace the `sig` in that URL below.
 *
 * envelope: 'v1' -> Production-v1 { ok, status:{http}, request, timing, data, errors, meta }
 * envelope: 'v4' -> Subsidiary v4 { ok, success, statusCode, action, data, errors, meta:{routeKey} }
 */

const ENV = 'https://defaultca6a4b3f912349bcbcb927085ebbf1.a1.environment.api.powerplatform.com:443';
const PATH = (wf, sig) =>
  `${ENV}/powerautomate/automations/direct/workflows/${wf}/triggers/manual/paths/invoke` +
  `?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=${sig}`;

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const SOURCE = 'DGO_FAST_Track_WEB_OPS';

/** `defaults` are merged under the caller payload by /core/api.js so the standard envelope fields
 *  (action/operation/mode/source) are always contract-correct. `expectedKeys` are validated by
 *  /core/base-service.js. */
export const Endpoints = {
  /** @see /docs/contracts/collection-fetch.contract.md#GET_DOCS */
  GET_DOCS: {
    url: PATH('7995c1eb50d94d5daa2780e71391d874', 'G9ti0-fzVRwt8fdGGheNgSrvIoMCcXKEibCaBDci4oE'),
    method: 'POST', headers: JSON_HEADERS, family: 'F1', envelope: 'v1', flowName: 'GET_DOCS_OPS_2',
    defaults: { action: 'getDocs', operation: 'read', mode: 'read', source: SOURCE }, expectedKeys: ['ok', 'data']
  },
  /** @see /docs/contracts/ai.contract.md#AI_EMAIL_ANALYSIS */
  AI_EMAIL_ANALYSIS: {
    url: PATH('fe794e0139784ac694768e5a716e0be7', 'lD76CTAMr77WcIpmZCx7Xqv10-6hybEB6ieFewDOt2k'),
    method: 'POST', headers: JSON_HEADERS, family: 'F5', envelope: 'v1', flowName: 'AI_Assisted_Email_Analysis',
    defaults: { action: 'aiAnalyseEmail', operation: 'analyse', mode: 'single', source: SOURCE }, requires: ['emailId'], expectedKeys: ['ok', 'data'], timeoutMs: 90000
  },
  /** @see /docs/contracts/orchestration.contract.md#DYNAMIC_GLOBAL_ACTIONS */
  DYNAMIC_GLOBAL_ACTIONS: {
    url: PATH('bc83d98acf474a088832d78f50085388', '_Co-r3TG6rtP0yGDDJXIM90WD4Wpym2NmR5OyOSsgnY'),
    method: 'POST', headers: JSON_HEADERS, family: 'F7', envelope: 'v1', flowName: 'Dynamic_Global_Actions',
    defaults: { action: 'dynamicGlobalAction', operation: 'dispatch', mode: 'single', source: SOURCE }, expectedKeys: ['ok', 'data']
  },
  /** @see /docs/contracts/collection-fetch.contract.md#FETCH_EMAIL_ATTACHMENTS */
  FETCH_EMAIL_ATTACHMENTS: {
    url: PATH('20e6340941ce4b1bbb87b43c9102a777', 'aoDNRVjvGpUWGq2zB7H5JG10xQTEFhFLt1PTxmpCX6Y'),
    method: 'POST', headers: JSON_HEADERS, family: 'F1', envelope: 'v1', flowName: 'Fech_Email Attachments',
    defaults: { action: 'fetchEmailAttachments', operation: 'read', mode: 'read', source: SOURCE }, expectedKeys: ['ok', 'data']
  },
  /** @see /docs/contracts/collection-fetch.contract.md#REFERENCE_DATA
   *  Shares one physical workflow (20e3b003…) with AI_DOC_ANALYSIS; disambiguated by action. */
  REFERENCE_DATA: {
    url: PATH('20e3b003a57f47febae8a24ad5b9acd4', 'TVPVBWHGec5Yt7oY_jtUyIIF4yQdkZgFrxy3oCNG0pk'),
    method: 'POST', headers: JSON_HEADERS, family: 'F1', envelope: 'v1', flowName: 'Fetch_References_and_Lookups_Data_v2_POST',
    sharesWorkflowWith: 'AI_DOC_ANALYSIS',
    defaults: { action: 'lookups', operation: 'read', mode: 'read', source: SOURCE }, expectedKeys: ['ok', 'data']
  },
  /** @see /docs/contracts/ai.contract.md#AI_DOC_ANALYSIS (shares workflow with REFERENCE_DATA) */
  AI_DOC_ANALYSIS: {
    url: PATH('20e3b003a57f47febae8a24ad5b9acd4', 'TVPVBWHGec5Yt7oY_jtUyIIF4yQdkZgFrxy3oCNG0pk'),
    method: 'POST', headers: JSON_HEADERS, family: 'F5', envelope: 'v1', flowName: 'AI_Assisted_Event Related_Document_Analysis_Processing',
    sharesWorkflowWith: 'REFERENCE_DATA',
    defaults: { action: 'aiAnalyseEventDocs', operation: 'analyse', mode: 'batch', source: SOURCE }, expectedKeys: ['ok', 'data'], timeoutMs: 90000
  },
  /** @see /docs/contracts/security.contract.md#OTP_GENERATE */
  OTP_GENERATE: {
    url: PATH('314aaf27593147089b38322e5ca25936', 'OWBIO1ooq0y8Zh9BTPp3sBOQoyVWs_a463FhFUT66fU'),
    method: 'POST', headers: JSON_HEADERS, family: 'F6', envelope: 'v1', flowName: 'OTP Generate',
    defaults: { action: 'otpGenerate', operation: 'generate', mode: 'single', source: SOURCE }, expectedKeys: ['ok', 'data']
  },
  /** @see /docs/contracts/security.contract.md#OTP_VERIFY */
  OTP_VERIFY: {
    url: PATH('43879c5165de439680055ab4258b3f27', 'zO21cB8Gn-LDklvld-xWtGUuZDvCleHWR6j5N6s5Dyo'),
    method: 'POST', headers: JSON_HEADERS, family: 'F6', envelope: 'v1', flowName: 'OTP Verify',
    defaults: { action: 'otpVerify', operation: 'verify', mode: 'single', source: SOURCE }, expectedKeys: ['ok', 'data']
  },
  /** @see /docs/contracts/ai.contract.md#AI_CHAT */
  AI_CHAT: {
    url: PATH('a13c8b577bd44f8787c50d095ea3faf9', 'gtXPGBgn00fpw7ORkWQvzaNNQ8qwSHUahBodUv7AyX8'),
    method: 'POST', headers: JSON_HEADERS, family: 'F5', envelope: 'v1', flowName: 'AI_Chat',
    defaults: { action: 'aiChat', operation: 'respond', mode: 'single', source: SOURCE }, expectedKeys: ['ok', 'data'], timeoutMs: 90000
  },
  /** @see /docs/contracts/collection-fetch.contract.md#FETCH_ALL */
  FETCH_ALL: {
    url: PATH('1d56be97cd184fd9b2facede12b17c34', 'UMJ2Eg42bxwHH7uvUoHOpKhbUGrZX4QPz492ZV3Gs-s'),
    method: 'POST', headers: JSON_HEADERS, family: 'F1', envelope: 'v1', flowName: 'Fetch_All_Data_&_References-POST',
    defaults: { action: 'fetchAll', operation: 'read', mode: 'read', source: SOURCE }, expectedKeys: ['ok', 'data'], timeoutMs: 90000
  },
  /** @see /docs/contracts/assignments.contract.md#BULK_ASSIGNMENT */
  BULK_ASSIGNMENT: {
    url: PATH('1154b50e1d17420dadb3b012e7e2a02c', 'Swbi7nJCn3-VSSz4KN1YxHfxFPfO-EUWsF-czBS3zs4'),
    method: 'POST', headers: JSON_HEADERS, family: 'F3', envelope: 'v1', flowName: 'Docoument_Bulk_Task_Assignment_Create',
    defaults: { action: 'bulkassignment', operation: 'create', mode: 'bulk', source: SOURCE }, expectedKeys: ['ok', 'data'], timeoutMs: 90000
  },
  /** @see /docs/contracts/assignments.contract.md#SINGLE_ASSIGNMENT */
  SINGLE_ASSIGNMENT: {
    url: PATH('6b3bad3005b44bf6bced0f8074d3f2ed', '1kJge9P2IOMOLRZOK-cVb3bcDJbuDhbR8x9h0TvHspQ'),
    method: 'POST', headers: JSON_HEADERS, family: 'F2', envelope: 'v1', flowName: 'Docoument_Single_Task_Assignment_Create',
    defaults: { action: 'singleassignment', operation: 'create', mode: 'single', source: SOURCE }, expectedKeys: ['ok', 'data']
  },
  /** @see /docs/contracts/subsidiary.contract.md#SUBSIDIARY_ACTIONS · v4 switch-routed (18 cases). */
  SUBSIDIARY_ACTIONS: {
    url: PATH('85c556f10b8244ba9d839a2ebe240b91', '8ikbMhXrOn_L4QRUBF94wiq2swh7GlNVY_GZ5BD5jK0'),
    method: 'POST', headers: JSON_HEADERS, family: 'F4', envelope: 'v4', flowName: 'Subsidiary_Actions',
    routeKeys: ['INIT', 'REFRESH_EMAILS', 'LOAD_EMAIL_DETAILS', 'AI_ANALYSE_EMAIL', 'CREATE_TASK',
      'UPDATE_TASK', 'LOAD_EVENT_INFO', 'AI_CHAT', 'TRACK', 'ACKNOWLEDGE', 'GET_ALL', 'GET_BOOTSTRAP',
      'LISTDOCS', 'GETDOC', 'BULKASSIGN', 'CREATESUPPORTREQUEST', 'GETREFERENCES', 'LIST-ACTIVITIES'],
    defaults: { action: 'INIT', operation: 'init', mode: 'switch', source: SOURCE }, expectedKeys: ['success', 'data'], timeoutMs: 90000
  },
  /** @see /docs/contracts/assignments.contract.md#EMAIL_RELATED_TASK */
  EMAIL_RELATED_TASK: {
    url: PATH('a942d230337c4ddfa9a386e92bbd048b', 'KAItnmgczUUEDkJQvICwLdfbTZ3IBbPpaPePNqz0A7U'),
    method: 'POST', headers: JSON_HEADERS, family: 'F2', envelope: 'v1', flowName: 'Email_Related_Task_Create',
    defaults: { action: 'emailtotaskassignment', operation: 'createTaskFromEmail', mode: 'single', source: SOURCE }, expectedKeys: ['ok', 'data']
  }
};

export const ENDPOINT_KEYS = Object.keys(Endpoints);
// Every endpoint is active and directly callable; retained for /modules/diagnostics.
export const ACTIVE_ENDPOINT_KEYS = ENDPOINT_KEYS.slice();
