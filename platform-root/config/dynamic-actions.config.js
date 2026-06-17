/** OBSIDIAN v4.0 — config/dynamic-actions.config.js
 *  Contract registry for every endpoint-less action routed through the Dynamic Global Actions flow
 *  (DYNAMIC_GLOBAL_ACTIONS, family F7). Per the operator directive, any action/function WITHOUT a
 *  dedicated Power Automate flow is dispatched here via Platform.Actions, using these contracts.
 *
 *  Each entry: { operation, mode, required[], optional[], confirm, successKey }
 *   - operation/mode  → default envelope fields (overridable per call)
 *   - required/optional → payload field contract (required are validated before dispatch)
 *   - confirm         → whether the action SHOULD show a preview+confirm before running (UI guidance)
 *   - successKey      → i18n key for the success toast (parsed flow message wins when present)
 *
 *  The wire envelope is the "Dynamic Global Actions Trigger Contract" (v2.0.0):
 *    { action, operation, mode, source, userEmail, requestId, timestamp, client, payload, ...top-level }
 *  The full per-action request/response shapes are documented in
 *  docs/contracts/dynamic-actions.contract.md. */

export const DYNAMIC_ACTIONS = {
  // ── Existing endpoint-less actions (already wired; documented for completeness) ──
  transition:         { operation: 'transition', mode: 'single', required: ['ref', 'status'], optional: ['from', 'to', 'by'], confirm: false, successKey: 'flow.done' },
  addComment:         { operation: 'create', mode: 'single', required: ['referenceId', 'body'], optional: ['sentiment', 'priority', 'author', 'parentId'], confirm: false, successKey: 'comments.added' },
  acknowledge:        { operation: 'acknowledge', mode: 'single', required: ['ref'], optional: ['by'], confirm: true, successKey: 'flow.done' },
  route:              { operation: 'route', mode: 'single', required: ['ref'], optional: ['triageMeta', 'by'], confirm: true, successKey: 'flow.done' },

  // ── New actions captured over the dynamic flow (no dedicated endpoint) ──
  /** Outbound email send (report or correspondence). Captures the SPAs' Send DGO/GTQ Report Email +
   *  SendEmailV2. This is the UI-layer hand-off to the Phase-5 Dispatch flow when that lands; until then
   *  the dynamic flow performs/relays the send. */
  dispatchEmail:      { operation: 'send', mode: 'single', required: ['email'], optional: ['ref', 'kind', 'attachments'], confirm: true, successKey: 'reports.emailSent' },
  /** Generate a consolidated meeting pack (bundle of references into a printable/emailable pack). */
  prepareMeetingPack: { operation: 'generate', mode: 'batch', required: ['refs'], optional: ['title', 'period', 'recipients'], confirm: true, successKey: 'flow.done' },
  /** Issue a trip-clearance document/approval for a traveller against a reference. */
  issueTripClearance: { operation: 'issue', mode: 'single', required: ['ref', 'traveller', 'destination'], optional: ['startDate', 'endDate', 'purpose'], confirm: true, successKey: 'flow.done' },
  /** Set a reminder against a reference/task, delivered by the chosen channel at dueAt. */
  setReminder:        { operation: 'create', mode: 'single', required: ['dueAt'], optional: ['ref', 'taskId', 'note', 'channel'], confirm: true, successKey: 'flow.done' },

  /** Phase-5 outbound dispatch (DISPATCH_OUTBOUND contract). No dedicated PA endpoint is provisioned yet
   *  (Q-4/Q-8 pending), so — per the standing directive — dispatch is relayed through the Dynamic Global
   *  Actions flow until DISPATCH_OUTBOUND lands, at which point this contract repoints with no UI change.
   *  recipientAddress is resolved from the live directorate directory (DSU_Email | DSU_HeadEmail). */
  dispatch:           { operation: 'dispatch', mode: 'single', required: ['ref', 'recipientAddress'], optional: ['channel', 'subject', 'bodyHtml', 'directorate', 'attachments', 'reviewers'], confirm: true, successKey: 'dispatch.sent' }
};

export const dynamicActionContract = (action) => DYNAMIC_ACTIONS[action] || null;
export default DYNAMIC_ACTIONS;
