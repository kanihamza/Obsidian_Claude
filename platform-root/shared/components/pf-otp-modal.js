/** OBSIDIAN v4.0 — <pf-otp-modal> · shared OTP gate (dedup target, DECOMPOSITION).
 *  Usage:  const ok = await PfOtpModal.require({ reason, recipient });  // → boolean
 *  Flow: OTP_GENERATE → user enters code → OTP_VERIFY → resolves data.verified.
 *  Self-mounting/-removing; token-driven; no hex. */
import { PfBaseElement } from './_base.js';
import { BaseService } from '../../core/base-service.js';

const genOtp = BaseService.endpoint('OTP_GENERATE', { expectedKeys: ['ok', 'data'] });
const verifyOtp = BaseService.endpoint('OTP_VERIFY', { expectedKeys: ['ok', 'data'] });

class PfOtpModal extends PfBaseElement {
  /** Mount, run the gate, resolve true only on a verified OTP. */
  static require(opts = {}) {
    return new Promise((resolve) => {
      const el = document.createElement('pf-otp-modal');
      el._opts = opts; el._resolve = resolve;
      document.body.appendChild(el);
    });
  }

  onConnect() {
    const reason = (this._opts && this._opts.reason) || this.t('otp.defaultReason');
    this.render(`<style>
      :host{ position:fixed; inset:0; z-index:1000; display:grid; place-items:center;
        background:color-mix(in srgb, var(--color-text) 45%, transparent); }
      .card{ width:min(28rem,92vw); background:var(--color-surface-raised); border:1px solid var(--color-border);
        border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); padding:var(--space-6); display:grid; gap:var(--space-4); }
      h2{ font:var(--font-display); font-size:var(--size-h3); margin:0; color:var(--color-text); }
      p{ margin:0; color:var(--color-text-muted); font-size:var(--size-body-sm); }
      input{ font:inherit; font-size:var(--size-h3); letter-spacing:.4em; text-align:center; padding:var(--space-3);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-md);
        background:var(--color-surface); color:var(--color-text); }
      .row{ display:flex; gap:var(--space-3); justify-content:flex-end; }
      button{ padding:var(--space-2) var(--space-4); border-radius:var(--radius-md); font-weight:var(--fw-semibold); font-size:var(--size-body-sm); }
      .primary{ background:var(--color-brand-primary); color:var(--color-text-inverse); }
      .ghost{ background:transparent; color:var(--color-text-muted); border:1px solid var(--color-border); }
      .status{ font-size:var(--size-caption); color:var(--color-text-muted); min-height:1.2em; }
      .status[data-err="1"]{ color:var(--color-danger); }
    </style>
    <div class="card" role="dialog" aria-modal="true" aria-label="${this.t('otp.title')}">
      <h2>${this.t('otp.title')}</h2>
      <p>${reason}</p>
      <p id="dest" class="status"></p>
      <input id="code" inputmode="numeric" autocomplete="one-time-code" placeholder="••••••" aria-label="${this.t('otp.codeLabel')}" disabled>
      <div id="msg" class="status"></div>
      <div class="row">
        <button class="ghost" id="cancel">${this.t('common.actions.cancel')}</button>
        <button class="primary" id="verify" disabled>${this.t('otp.verify')}</button>
      </div>
    </div>`);
    this.on(this.$('#cancel'), 'click', () => this._done(false));
    this.on(this.$('#verify'), 'click', () => this._verify());
    this.on(this, 'keydown', (e) => { if (e.key === 'Escape') this._done(false); });
    this._generate();
  }

  async _generate() {
    const msg = this.$('#msg');
    const res = await genOtp({ recipient: (this._opts && this._opts.recipient) || undefined });
    if (res.ok) {
      const d = res.data || {};
      this.$('#dest').textContent = this.t('otp.sent', { to: d.recipient || d.channel || '', ttl: d.ttlSeconds || 0 });
      this.$('#code').disabled = false; this.$('#verify').disabled = false; this.$('#code').focus();
    } else {
      msg.dataset.err = '1';
      msg.textContent = (res.errors && res.errors[0] && (res.errors[0].message || res.errors[0].code)) || this.t('otp.genFailed');
    }
  }

  async _verify() {
    const code = (this.$('#code').value || '').trim();
    const msg = this.$('#msg'); msg.dataset.err = '0'; msg.textContent = this.t('common.actions.processing');
    if (!code) { msg.dataset.err = '1'; msg.textContent = this.t('otp.needCode'); return; }
    const res = await verifyOtp({ code });
    const verified = !!(res.ok && res.data && (res.data.verified === true || res.data.sessionToken));
    if (verified) { this._done(true); }
    else { msg.dataset.err = '1'; msg.textContent = this.t('otp.invalid'); }
  }

  _done(ok) {
    const r = this._resolve; this._resolve = null;
    this.remove();
    if (r) r(ok);
  }
}
customElements.define('pf-otp-modal', PfOtpModal);
export { PfOtpModal };
export default PfOtpModal;
