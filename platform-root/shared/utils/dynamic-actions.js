/** OBSIDIAN v4.0 — shared/utils/dynamic-actions.js · DynamicActions (Platform.Actions)
 *  The universal channel for any workflow action/function that has NO dedicated Power Automate flow.
 *  Wraps DYNAMIC_GLOBAL_ACTIONS using the "Dynamic Global Actions Trigger Contract" (x-flow-variant:
 *  dynamic-global-actions, v2.0.0): builds the standardized envelope —
 *    action · operation · mode · source · userEmail · requestId · timestamp · client · payload
 *  — and dispatches through BaseService so every endpoint-less action is contract-correct, idempotency-
 *  keyed, and recorded in the request log. Consumed by fabric status transitions, the triage bar, and
 *  any module action that lacks its own flow (acknowledge / triage / route / escalate / reopen / …). */
import { BaseService } from '../../core/base-service.js';

const APP_VERSION = '4.0';
const _dispatch = BaseService.endpoint('DYNAMIC_GLOBAL_ACTIONS', { expectedKeys: ['ok', 'data'] });

/** requestId per the contract — crypto.randomUUID when available, dependency-free fallback otherwise. */
function requestId() {
  try { if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID(); } catch (_) { /* ignore */ }
  return 'req-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
function currentUserEmail() {
  const P = globalThis.Platform;
  try { return (P && P.Persona && P.Persona.email && P.Persona.email()) || null; } catch (_) { return null; }
}

export const DynamicActions = {
  /** Dispatch an endpoint-less action through the Dynamic Global Actions flow and await the result.
   *  @param {string} action  canonical workflow verb (acknowledge / triage / route / escalate / …)
   *  @param {object} fields  { operation?, mode?, payload?, ...topLevel } merged into the envelope
   *                          (top-level contract fields like ref / docId / taskId / status pass through). */
  async dispatch(action, fields = {}) {
    const { operation, mode, payload, ...rest } = fields;
    const now = new Date().toISOString();
    const envelope = {
      action,
      operation: operation || 'dispatch',
      mode: mode || 'single',
      userEmail: currentUserEmail(),
      requestId: requestId(),
      timestamp: now,
      client: { app: 'obsidian', version: APP_VERSION, submittedAt: now },
      ...(payload ? { payload } : {}),
      ...rest
    };
    return _dispatch(envelope);
  },

  /** Fire-and-forget variant for optimistic UI: dispatch without blocking the local mutation, but log
   *  failures and emit an audit event so a server-side reject is visible without diverging local state. */
  emit(action, fields = {}) {
    Promise.resolve()
      .then(() => DynamicActions.dispatch(action, fields))
      .then((res) => {
        if (res && res.ok) return;
        const P = globalThis.Platform;
        P && P.Log && P.Log.warn && P.Log.warn('actions.dispatch-failed', { action, kind: res && res.kind, ref: (fields && fields.ref) || null });
        P && P.Bus && P.Bus.emit && P.Bus.emit('audit:action-dispatch-failed', { action, ref: (fields && fields.ref) || null, ts: new Date().toISOString() });
      })
      .catch((e) => {
        const P = globalThis.Platform;
        P && P.Log && P.Log.warn && P.Log.warn('actions.dispatch-error', { action, message: String((e && e.message) || e) });
      });
  }
};
export default DynamicActions;
