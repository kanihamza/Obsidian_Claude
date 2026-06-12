/** OBSIDIAN v4.0 — shared/utils/dynamic-actions.js · DynamicActions (Platform.Actions)
 *  The universal channel for any workflow action/function that has NO dedicated Power Automate flow.
 *  Wraps DYNAMIC_GLOBAL_ACTIONS using the "Dynamic Global Actions Trigger Contract" (x-flow-variant:
 *  dynamic-global-actions, v2.0.0): builds the standardized envelope —
 *    action · operation · mode · source · userEmail · requestId · timestamp · client · payload
 *  — and dispatches through BaseService so every endpoint-less action is contract-correct, idempotency-
 *  keyed, and recorded in the request log.
 *
 *  Action lifecycle (operator directive): every flow-triggering action goes
 *    preview + confirm  →  execute  →  parsed feedback from the flow response.
 *  Use DynamicActions.run() for discrete user actions (it owns the whole cycle); transitions persisted
 *  by the fabric use emit() (optimistic) and still surface the parsed flow response. */
import { BaseService } from '../../core/base-service.js';
import { dynamicActionContract } from '../../config/dynamic-actions.config.js';

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
  /** Low-level dispatch through the Dynamic Global Actions flow; awaits the normalized result. */
  async dispatch(action, fields = {}) {
    const { operation, mode, payload, ...rest } = fields;
    const contract = dynamicActionContract(action);
    // Contract validation (non-blocking): warn if a required payload field is missing so server rejects
    // are diagnosable, but still dispatch (the flow remains the authority).
    if (contract && Array.isArray(contract.required)) {
      const p = payload || {};
      const missing = contract.required.filter((k) => !(k in p) && !(k in rest));
      if (missing.length) { const L = globalThis.Platform && globalThis.Platform.Log; L && L.warn && L.warn('actions.contract-missing', { action, missing }); }
    }
    const now = new Date().toISOString();
    const envelope = {
      action,
      operation: operation || (contract && contract.operation) || 'dispatch',
      mode: mode || (contract && contract.mode) || 'single',
      userEmail: currentUserEmail(),
      requestId: requestId(),
      timestamp: now,
      client: { app: 'obsidian', version: APP_VERSION, submittedAt: now },
      ...(payload ? { payload } : {}),
      ...rest
    };
    return _dispatch(envelope);
  },

  /** Parse a normalized API result into a human-facing outcome { ok, kind, message, data }. The flow's
   *  own message (data.message / body.message / errors[0].message) is preferred so feedback reflects the
   *  actual server response, not a generic string. */
  describe(res) {
    if (!res) return { ok: false, kind: 'error', message: null, data: null };
    const data = res.data;
    const body = res.body || {};
    const raw =
      (data && (data.message || data.Message || data.result || data.status)) ||
      body.message || body.Message ||
      (Array.isArray(res.errors) && res.errors[0] && res.errors[0].message) || null;
    return { ok: !!res.ok, kind: res.kind || (res.ok ? 'ok' : 'error'), message: (typeof raw === 'string' && raw.trim()) ? raw.trim() : null, data: data || null };
  },

  /** Toast the parsed outcome of a flow response. Success shows the flow's message (or successKey);
   *  failure shows the parsed error so the user sees WHY the flow rejected. */
  feedback(res, opts = {}) {
    const UI = globalThis.Platform && globalThis.Platform.UI;
    const d = DynamicActions.describe(res);
    if (!UI || !UI.toast) return d;
    if (d.ok) UI.toast({ messageKey: opts.successKey || 'flow.done', message: d.message || undefined, variant: 'success', vars: opts.vars });
    else UI.toast({ messageKey: 'flow.failed', message: d.message || undefined, variant: 'danger', vars: { kind: d.kind } });
    return d;
  },

  /** The canonical user-action runner: intermediary preview + confirmation → execute → parsed feedback.
   *  @param {string} action  workflow verb (acknowledge / route / escalate / reopen / …)
   *  @param {object} opts     { preview:{titleKey,summaryKey,summary,details,confirmKey}, danger,
   *                             successKey, vars, payload, ...topLevelContractFields } */
  async run(action, opts = {}) {
    const { preview, danger, successKey, vars, payload, ...fields } = opts;
    const contract = dynamicActionContract(action);
    const okKey = successKey || (contract && contract.successKey);
    const UI = globalThis.Platform && globalThis.Platform.UI;
    if (preview && UI && typeof UI.confirm === 'function') {
      const ok = await UI.confirm({
        titleKey: preview.titleKey || 'flow.confirmTitle',
        summaryKey: preview.summaryKey, summary: preview.summary,
        details: preview.details || [],
        confirmKey: preview.confirmKey || 'common.actions.confirm',
        danger: !!danger
      });
      if (!ok) return { ok: false, cancelled: true };
    }
    const res = await DynamicActions.dispatch(action, { payload, ...fields });
    DynamicActions.feedback(res, { successKey: okKey, vars });
    return res;
  },

  /** Fire-and-forget variant for optimistic UI (fabric transitions): dispatch without blocking the local
   *  mutation, but still surface the parsed flow response — the flow's own message on success (if any)
   *  and a warning with the parsed reason on failure — plus a request-log warning + audit event. */
  emit(action, fields = {}) {
    Promise.resolve()
      .then(() => DynamicActions.dispatch(action, fields))
      .then((res) => {
        const P = globalThis.Platform;
        const d = DynamicActions.describe(res);
        if (res && res.ok) {
          if (d.message && P && P.UI && P.UI.toast) P.UI.toast({ message: d.message, variant: 'info', timeout: 4000 });
          return;
        }
        if (P && P.UI && P.UI.toast) P.UI.toast({ messageKey: 'flow.syncFailed', message: d.message || undefined, variant: 'warning', vars: { action } });
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
