/** OBSIDIAN v4.0 — <pf-dispatch-panel> · Phase-5 (DISPATCH) surface (register G-2, Rebuild Fresh).
 *  Drives one approved reference through outbound dispatch and closure, enforcing the mandated state
 *  machine (Directive 1):
 *
 *    dispatch-pending → dispatch-in-flight → ( dispatched | dispatch-failed )
 *
 *  • Routing target — recipientAddress is resolved from the LIVE directorate directory
 *    (Platform.Directory.recipientFor → DSU_Email | DSU_HeadEmail), never hard-coded (Directive 1).
 *  • Asymmetric fallback — on a gateway failure the row falls back to dispatch-failed and injects an
 *    inline, isolated Retry action directly in place (Directive 1).
 *  • Preconditions — a reference may only advance to terminal `closed` once Entities.canClose(ref) passes
 *    (all child tasks/approvals/dispatches resolved). The Close action is gated on that evaluator.
 *  • All status writes go through the SOLE phase-gate mutator Entities.transitionStatus (C-7); dispatch
 *    itself is relayed through the Dynamic Global Actions flow via the `dispatch` contract (DISPATCH_
 *    OUTBOUND repoints with no UI change once provisioned). audit:dispatched is emitted on success (G-5).
 *
 *  Bind via `el.reference = refId` (or `el.item = recordWithRef`). Emits pf-dispatch:dispatched,
 *  pf-dispatch:failed, pf-dispatch:closed (bubbling, composed). */
import { PfBaseElement } from './_base.js';

class PfDispatchPanel extends PfBaseElement {
  constructor() {
    super();
    this._ref = null;
    this._rec = null;
    this._status = '';
    this._directorate = null;
    this._recipient = null;
    this._channel = 'mailbox';   // 'mailbox' → DSU_Email · 'head' → DSU_HeadEmail
    this._busy = false;
  }

  set item(rec) { this._rec = (rec && typeof rec === 'object') ? rec : null; this._ref = this._rec && this._rec.__ref ? String(this._rec.__ref) : (this._ref || null); this._hydrate(); }
  get item() { return this._rec || null; }
  set reference(ref) { this._ref = ref ? String(ref) : null; this._hydrate(); }
  get reference() { return this._ref || null; }

  onConnect() {
    this.render(`<style>
      :host{ display:block; }
      .wrap{ background:var(--color-surface-raised); border:1px solid var(--color-border);
        border-radius:var(--radius-md); padding:var(--space-3) var(--space-4); }
      .head{ display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap; margin-bottom:var(--space-3); }
      .pill{ font-size:var(--size-caption); font-weight:var(--fw-semibold); padding:var(--space-1) var(--space-2);
        border-radius:var(--radius-pill); background:var(--color-surface); border:1px solid var(--color-border);
        color:var(--color-text-muted); white-space:nowrap; }
      .grid{ display:grid; gap:var(--space-2) var(--space-4); grid-template-columns:auto 1fr; align-items:center; }
      .lbl{ font-size:var(--size-caption); color:var(--color-text-muted); font-weight:var(--fw-semibold); white-space:nowrap; }
      .val{ font-size:var(--size-body-sm); color:var(--color-text); word-break:break-word; }
      .val--missing{ color:var(--color-danger); }
      select{ font:inherit; font-size:var(--size-body-sm); padding:var(--space-1) var(--space-2);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-sm);
        background:var(--color-surface); color:var(--color-text); }
      select:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:1px; }
      .acts{ display:flex; gap:var(--space-2); flex-wrap:wrap; margin-top:var(--space-3);
        padding-top:var(--space-3); border-top:1px dashed var(--color-border); }
      .btn{ font:inherit; font-size:var(--size-body-sm); font-weight:var(--fw-semibold);
        padding:var(--space-2) var(--space-4); border-radius:var(--radius-sm); border:1px solid var(--color-border);
        background:var(--color-surface); color:var(--color-text); cursor:pointer; }
      .btn--primary{ background:var(--color-brand-primary); color:var(--color-text-inverse); border-color:var(--color-brand-primary); }
      .btn--danger{ border-color:var(--color-danger); color:var(--color-danger); }
      .btn[disabled]{ opacity:.5; cursor:not-allowed; }
      .btn:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:2px; }
      .fail{ display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap; margin-top:var(--space-3);
        padding:var(--space-2) var(--space-3); border-radius:var(--radius-sm);
        background:var(--color-danger-soft, var(--color-surface)); border:1px solid var(--color-danger); color:var(--color-text); }
      .fail[hidden]{ display:none; }
      .fail__msg{ font-size:var(--size-caption); flex:1 1 auto; }
    </style>
    <div class="wrap">
      <div class="head">
        <span class="pf-overline">${this.t('dispatch.panelTitle')}</span>
        <span class="pill" id="status" aria-live="polite"></span>
      </div>
      <div class="grid">
        <span class="lbl">${this.t('dispatch.directorate')}</span><span class="val" id="dir">—</span>
        <span class="lbl">${this.t('dispatch.channel')}</span>
        <span><select id="chan" aria-label="${this.t('dispatch.channel')}">
          <option value="mailbox">${this.t('dispatch.channelMailbox')}</option>
          <option value="head">${this.t('dispatch.channelHead')}</option>
        </select></span>
        <span class="lbl">${this.t('dispatch.recipient')}</span><span class="val" id="recip">—</span>
      </div>
      <div class="acts">
        <button class="btn btn--primary" id="send" type="button">${this.t('dispatch.dispatchBtn')}</button>
        <button class="btn" id="nodispatch" type="button">${this.t('dispatch.noDispatchBtn')}</button>
        <button class="btn" id="close" type="button" hidden>${this.t('dispatch.closeBtn')}</button>
      </div>
      <div class="fail" id="fail" hidden role="alert">
        <pf-icon name="alert-triangle" size="14"></pf-icon>
        <span class="fail__msg" id="fail-msg"></span>
        <button class="btn btn--danger" id="retry" type="button">${this.t('dispatch.retryBtn')}</button>
      </div>
    </div>`);
    this.on(this.$('#chan'), 'change', (e) => { this._channel = e.target.value; this._resolveRecipient(); this._reflect(); });
    this.on(this.$('#send'), 'click', () => this._dispatch());
    this.on(this.$('#nodispatch'), 'click', () => this._noDispatch());
    this.on(this.$('#close'), 'click', () => this._close());
    this.on(this.$('#retry'), 'click', () => this._dispatch(true));
    this.bus('data:lookups', () => { this._resolveRecipient(); this._reflect(); });
    this._hydrate();
  }

  get _E() { return globalThis.Platform && globalThis.Platform.Entities; }
  get _by() { const P = globalThis.Platform && globalThis.Platform.Persona; return (P && typeof P.email === 'function') ? P.email() : null; }

  _hydrate() {
    if (!this.shadowRoot) return;
    let status = '', directorate = null;
    const E = this._E;
    if (E && this._ref && typeof E.byReference === 'function') {
      const b = E.byReference(this._ref);
      const ref = b && b.reference;
      status = String((ref && ref.status) || '');
      directorate = (ref && ref.__directorate) || null;
      // Directorate may live on a child record when the synthesized reference row lacks it.
      if (!directorate) for (const t of ['document', 'task', 'email']) {
        const hit = (b && b[t] || []).find((r) => r && r.__directorate);
        if (hit) { directorate = hit.__directorate; break; }
      }
    } else if (this._rec) {
      status = String(this._rec.status || '');
      directorate = this._rec.__directorate || null;
    }
    this._status = status;
    this._directorate = directorate;
    this._resolveRecipient();
    this._reflect();
  }

  _resolveRecipient() {
    const D = globalThis.Platform && globalThis.Platform.Directory;
    this._recipient = (D && this._directorate) ? D.recipientFor(this._directorate, { preferHead: this._channel === 'head' }) : null;
  }

  _reflect() {
    const statusEl = this.$('#status'); if (statusEl) statusEl.textContent = this.t('dispatch.statusLabel') + ': ' + (this._status || '∅');
    const dirEl = this.$('#dir'); if (dirEl) dirEl.textContent = this._directorate || this.t('dispatch.directorateUnknown');
    const recipEl = this.$('#recip');
    if (recipEl) {
      recipEl.textContent = this._recipient || this.t('dispatch.recipientUnresolved');
      recipEl.classList.toggle('val--missing', !this._recipient);
    }
    // Dispatchable only from approved / approved-with-edit / dispatch-pending / dispatch-failed, with a
    // resolved recipient and not mid-flight.
    const dispatchable = ['approved', 'approved-with-edit', 'dispatch-pending', 'dispatch-failed'].includes(this._status);
    const sendBtn = this.$('#send');
    if (sendBtn) { const en = dispatchable && !!this._recipient && !this._busy; sendBtn.disabled = !en; }
    const noBtn = this.$('#nodispatch');
    if (noBtn) noBtn.disabled = !(['dispatch-pending', 'approved', 'approved-with-edit'].includes(this._status)) || this._busy;
    // Close is offered once dispatched / no-dispatch / partial-dispatch.
    const closeBtn = this.$('#close');
    if (closeBtn) closeBtn.hidden = !['dispatched', 'no-dispatch', 'partial-dispatch'].includes(this._status);
    // Failure banner only when in the failed state.
    const fail = this.$('#fail'); if (fail) fail.hidden = this._status !== 'dispatch-failed';
  }

  /** Walk the canonical chain from the live status up to `target` through the phase-gate writer (C-7). */
  _advanceTo(target) {
    const PATH = ['approved', 'dispatch-pending', 'dispatch-in-flight'];
    const E = this._E;
    if (!E || !this._ref) return { ok: false, kind: 'NO_REFERENCE' };
    let cur = String((E.byReference(this._ref)?.reference?.status) || '');
    // approved-with-edit shares the approved exit; dispatch-failed re-enters at dispatch-pending.
    const stepFrom = (s) => {
      if (s === 'approved' || s === 'approved-with-edit') return 'dispatch-pending';
      if (s === 'dispatch-failed') return 'dispatch-pending';
      if (s === 'dispatch-pending') return 'dispatch-in-flight';
      return null;
    };
    let guard = 0;
    while (cur !== target && guard++ < 6) {
      const next = stepFrom(cur);
      if (!next) return { ok: false, kind: 'ILLEGAL_TRANSITION', current: cur };
      const res = E.transitionStatus(this._ref, cur, next, this._by);
      if (!res || !res.ok) return res || { ok: false, kind: 'ILLEGAL_TRANSITION' };
      cur = next;
      if (next === target) break;
    }
    this._status = cur;
    return { ok: true, finalStatus: cur };
  }

  async _dispatch(isRetry) {
    if (this._busy) return;
    if (!this._ref) { this._toast('dispatch.noRef', 'danger'); return; }
    if (!this._recipient) { this._toast('dispatch.recipientUnresolved', 'warning'); return; }
    const UI = globalThis.Platform && globalThis.Platform.UI;
    const Act = globalThis.Platform && globalThis.Platform.Actions;
    // Intermediary preview + confirmation before the dispatch flow runs (operator directive).
    if (UI && typeof UI.confirm === 'function') {
      const ok = await UI.confirm({
        titleKey: 'dispatch.confirmTitle',
        summary: this.t('dispatch.confirmSummary', { recipient: this._recipient }),
        details: [
          { label: this.t('entity.reference'), value: this._ref },
          { label: this.t('dispatch.directorate'), value: this._directorate || '—' },
          { label: this.t('dispatch.recipient'), value: this._recipient },
          { label: this.t('dispatch.channel'), value: this.t(this._channel === 'head' ? 'dispatch.channelHead' : 'dispatch.channelMailbox') }
        ],
        confirmKey: 'dispatch.dispatchBtn'
      });
      if (!ok) return;
    }
    this._busy = true; this._reflect();
    // Move to dispatch-in-flight before calling the gateway (so a timeout leaves a recoverable state).
    const adv = this._advanceTo('dispatch-in-flight');
    if (!adv.ok) { this._busy = false; this._toastError(adv); this._hydrate(); return; }

    let res = null;
    if (Act && typeof Act.run === 'function') {
      res = await Act.run('dispatch', {
        ref: this._ref,
        payload: {
          ref: this._ref, recipientAddress: this._recipient, channel: this._channel,
          directorate: this._directorate || null
        }
      });
    }
    this._busy = false;
    const ok = !!(res && res.ok);
    if (ok) {
      const done = this._E.transitionStatus(this._ref, 'dispatch-in-flight', 'dispatched', this._by);
      if (done && done.ok) {
        // G-5 — emit the dispatched audit event from the dispatch surface.
        globalThis.Platform?.Bus?.emit?.('audit:dispatched', { ref: this._ref, recipient: this._recipient, channel: this._channel, ts: new Date().toISOString() });
        this._status = 'dispatched';
        this._toast('dispatch.sent', 'success', { ref: this._ref });
        this.emit('pf-dispatch:dispatched', { ref: this._ref, recipient: this._recipient });
      }
    } else {
      // Asymmetric fallback — drop to dispatch-failed and surface the inline retry (Directive 1).
      const fail = this._E.transitionStatus(this._ref, 'dispatch-in-flight', 'dispatch-failed', this._by);
      if (fail && fail.ok) this._status = 'dispatch-failed';
      const msgEl = this.$('#fail-msg');
      const parsed = (globalThis.Platform?.Actions?.describe && res) ? globalThis.Platform.Actions.describe(res) : null;
      if (msgEl) msgEl.textContent = (parsed && parsed.message) || this.t('dispatch.failed');
      this.emit('pf-dispatch:failed', { ref: this._ref, kind: (res && res.kind) || 'DISPATCH_FAILED' });
    }
    this._reflect();
  }

  async _noDispatch() {
    if (!this._ref || this._busy) return;
    const UI = globalThis.Platform && globalThis.Platform.UI;
    let reason = '';
    if (UI && typeof UI.confirm === 'function') {
      const ok = await UI.confirm({ titleKey: 'dispatch.noDispatchTitle', summaryKey: 'dispatch.noDispatchSummary',
        details: [{ label: this.t('entity.reference'), value: this._ref }], confirmKey: 'dispatch.noDispatchBtn', danger: true });
      if (!ok) return;
    }
    // approved → dispatch-pending → no-dispatch.
    let adv = this._advanceTo('dispatch-pending');
    if (!adv.ok && this._status !== 'dispatch-pending') { this._toastError(adv); this._hydrate(); return; }
    const res = this._E.transitionStatus(this._ref, 'dispatch-pending', 'no-dispatch', this._by);
    if (res && res.ok) { this._status = 'no-dispatch'; this._toast('dispatch.markedNoDispatch', 'info', { ref: this._ref }); }
    else this._toastError(res);
    this._reflect();
  }

  async _close() {
    if (!this._ref || this._busy) return;
    const E = this._E;
    const gate = (E && typeof E.canClose === 'function') ? E.canClose(this._ref) : { ok: false, reasons: ['no-evaluator'] };
    if (!gate.ok) { this._toast('dispatch.closeBlocked', 'warning', { reasons: (gate.reasons || []).length }); return; }
    const UI = globalThis.Platform && globalThis.Platform.UI;
    if (UI && typeof UI.confirm === 'function') {
      const ok = await UI.confirm({ titleKey: 'dispatch.closeTitle', summaryKey: 'dispatch.closeSummary',
        details: [{ label: this.t('entity.reference'), value: this._ref }], confirmKey: 'dispatch.closeBtn', danger: true });
      if (!ok) return;
    }
    const res = E.transitionStatus(this._ref, this._status, 'closed', this._by);
    if (res && res.ok) { this._status = 'closed'; this._toast('dispatch.closed', 'success', { ref: this._ref }); this.emit('pf-dispatch:closed', { ref: this._ref }); }
    else this._toastError(res);
    this._reflect();
  }

  _toast(messageKey, variant, vars) { const UI = globalThis.Platform && globalThis.Platform.UI; if (UI && typeof UI.toast === 'function') UI.toast({ messageKey, variant: variant || 'info', vars }); }
  _toastError(result) { const UI = globalThis.Platform && globalThis.Platform.UI; if (UI && typeof UI.toastError === 'function') UI.toastError(result || {}); else this._toast('dispatch.failed', 'danger'); }
}

customElements.define('pf-dispatch-panel', PfDispatchPanel);
export default PfDispatchPanel;
