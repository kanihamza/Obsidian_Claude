/** OBSIDIAN v4.0 — <pf-otp-modal> · stateless PA-handshake OTP gate (register B-1 / D-7).
 *
 *  This component holds NO OTP logic of its own. It is a thin UI consumer of the two-step Power
 *  Automate handshake:
 *    1. request-otp  → OTP_GENERATE  : server emails the code; UI caches { otpId, expiresAt }.
 *    2. verify-otp   → OTP_VERIFY     : UI submits the user-typed code; PA validates server-side.
 *  The plaintext code is NEVER generated or compared client-side.
 *
 *  Usage:  const r = await PfOtpModal.require({ purpose:'BULK_ASSIGNMENT', userEmail, context });
 *    resolves → { ok:true,  verificationToken, otpId, code }                       (verified)
 *             → { ok:false, kind:'ASSIGNMENT_FAILED' }   on exhausted attempts (B-1 rollback)
 *             → { ok:false, kind:'CANCELLED' }           on user cancel / Escape
 *             → { ok:false, kind:'GENERATE_FAILED' }     if the code could not be sent
 *
 *  On OTP_INVALID the attempt matrix decrements; at zero it fires an ASSIGNMENT-FAILED rollback
 *  (audit + bus event) so the caller can revert the optimistic `assigning` state. */
import { PfBaseElement } from './_base.js';
import { BaseService } from '../../core/base-service.js';

const requestOtp = BaseService.endpoint('OTP_GENERATE', { expectedKeys: ['ok', 'data'] });
const verifyOtp  = BaseService.endpoint('OTP_VERIFY', { expectedKeys: ['ok', 'data'] });

const DEFAULT_ATTEMPTS = 5;

class PfOtpModal extends PfBaseElement {
  /** Mount, run the handshake, resolve a structured result (see file header). */
  static require(opts = {}) {
    return new Promise((resolve) => {
      const el = document.createElement('pf-otp-modal');
      el._opts = opts || {};
      el._resolve = resolve;
      document.body.appendChild(el);
    });
  }

  onConnect() {
    this._settled = false;
    this._otpId = null;
    this._expiresAt = 0;
    this._attemptsLeft = Number(this._opts.maxAttempts) || DEFAULT_ATTEMPTS;
    this._countdownTimer = null;

    const reason = this._opts.reason || this.t('otp.defaultReason');
    this.render(`<style>
      :host{ position:fixed; inset:0; z-index:var(--z-modal, 1000); display:grid; place-items:center;
        background:color-mix(in srgb, var(--color-text) 45%, transparent); }
      .card{ width:min(28rem,92vw); background:var(--color-surface-raised); border:1px solid var(--color-border);
        border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); padding:var(--space-6); display:grid; gap:var(--space-4); }
      h2{ font:var(--font-display); font-size:var(--size-h3); margin:0; color:var(--color-text); }
      p{ margin:0; color:var(--color-text-muted); font-size:var(--size-body-sm); }
      input{ font:inherit; font-size:var(--size-h3); letter-spacing:.4em; text-align:center; padding:var(--space-3);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-md);
        background:var(--color-surface); color:var(--color-text); }
      input:disabled{ opacity:.5; }
      .row{ display:flex; gap:var(--space-3); justify-content:flex-end; align-items:center; }
      .row .spacer{ margin-right:auto; }
      button{ padding:var(--space-2) var(--space-4); border-radius:var(--radius-md); font-weight:var(--fw-semibold); font-size:var(--size-body-sm); }
      button:disabled{ opacity:.5; cursor:not-allowed; }
      .primary{ background:var(--color-brand-primary); color:var(--color-text-inverse); }
      .ghost{ background:transparent; color:var(--color-text-muted); border:1px solid var(--color-border); }
      .link{ background:none; color:var(--color-brand-primary); padding:var(--space-1) var(--space-2); }
      .meta{ font-size:var(--size-caption); color:var(--color-text-muted); min-height:1.2em; }
      .err{ font-size:var(--size-caption); color:var(--color-danger); min-height:1.2em; }
    </style>
    <div class="card" role="dialog" aria-modal="true" aria-label="${this.t('otp.title')}">
      <h2>${this.t('otp.title')}</h2>
      <p>${reason}</p>
      <p id="dest" class="meta" role="status" aria-live="polite"></p>
      <input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8"
             placeholder="••••••" aria-label="${this.t('otp.codeLabel')}" disabled>
      <p id="countdown" class="meta" role="status" aria-live="polite"></p>
      <div id="msg" class="err" role="alert" aria-live="assertive"></div>
      <div class="row">
        <button class="link spacer" id="resend" hidden>${this.t('otp.resend')}</button>
        <button class="ghost" id="cancel">${this.t('common.actions.cancel')}</button>
        <button class="primary" id="verify" disabled>${this.t('otp.verify')}</button>
      </div>
    </div>`);

    this.on(this.$('#cancel'), 'click', () => this._finish({ ok: false, kind: 'CANCELLED' }));
    this.on(this.$('#verify'), 'click', () => this._verify());
    this.on(this.$('#resend'), 'click', () => this._request());
    this.on(this.$('#code'), 'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this._verify(); } });
    this.on(this, 'keydown', (e) => { if (e.key === 'Escape') this._finish({ ok: false, kind: 'CANCELLED' }); });

    this._request();
  }

  onDisconnect() { this._stopCountdown(); }

  /** Step 1 — request a fresh code (request-otp → OTP_GENERATE). */
  async _request() {
    this._stopCountdown();
    const msg = this.$('#msg'); msg.textContent = '';
    this.$('#resend').hidden = true;
    this.$('#dest').textContent = this.t('otp.sendingCode');
    this.$('#code').disabled = true; this.$('#verify').disabled = true;

    const res = await requestOtp({
      purpose: this._opts.purpose || 'VERIFICATION',
      channel: 'email',
      userEmail: this._opts.userEmail || this._personaEmail(),
      context: this._opts.context || {}
    });

    if (!res.ok) {
      this._otpId = null;
      this.$('#dest').textContent = '';
      msg.textContent = this._detail(res) || this.t('otp.genFailed');
      this.$('#resend').hidden = false;
      return;
    }
    const d = res.data || {};
    this._otpId = d.otpId || d.id || null;
    this._attemptsLeft = Number(this._opts.maxAttempts) || DEFAULT_ATTEMPTS;
    const ttl = Number(d.ttlSeconds) || 0;
    this._expiresAt = d.expiresAt ? Date.parse(d.expiresAt) : (ttl ? Date.now() + ttl * 1000 : 0);
    this.$('#dest').textContent = this.t('otp.sent', { to: d.sentTo || d.channel || 'email', ttl: ttl || 0 });
    const input = this.$('#code');
    input.disabled = false; input.value = ''; input.maxLength = Number(d.codeLength) || 8;
    this.$('#verify').disabled = false;
    input.focus();
    this._startCountdown();
  }

  /** Step 2 — verify the user-typed code (verify-otp → OTP_VERIFY). */
  async _verify() {
    const input = this.$('#code');
    const code = (input.value || '').trim();
    const msg = this.$('#msg'); msg.textContent = '';
    if (!this._otpId) { msg.textContent = this.t('otp.expired'); this.$('#resend').hidden = false; return; }
    if (!code) { msg.textContent = this.t('otp.needCode'); return; }
    if (this._expiresAt && Date.now() > this._expiresAt) { this._onExpired(); return; }

    this.$('#verify').disabled = true;
    this.$('#countdown').textContent = this.t('otp.verifying');
    const res = await verifyOtp({ otpId: this._otpId, code, userEmail: this._opts.userEmail || this._personaEmail() });
    this.$('#verify').disabled = false;

    const verified = !!(res.ok && res.data && (res.data.verified === true || res.data.verificationToken));
    if (verified) {
      this._finish({ ok: true, otpId: this._otpId, code,
        verificationToken: (res.data && res.data.verificationToken) || null });
      return;
    }

    const kind = res.errorKind || '';
    if (kind === 'OTP_EXPIRED') { this._onExpired(); return; }

    // OTP_INVALID (or any other non-verified result) — decrement the attempt matrix.
    const serverLeft = res.data && Number.isFinite(res.data.remainingAttempts) ? Number(res.data.remainingAttempts) : null;
    this._attemptsLeft = serverLeft != null ? serverLeft : (this._attemptsLeft - 1);
    if (this._attemptsLeft <= 0) { this._rollback(); return; }
    msg.textContent = this.t('otp.invalid') + ' ' + this.t('otp.attemptsLeft', { n: this._attemptsLeft });
    input.focus(); input.select();
  }

  _onExpired() {
    this._stopCountdown();
    this._otpId = null;
    this.$('#code').disabled = true; this.$('#verify').disabled = true;
    this.$('#countdown').textContent = '';
    this.$('#msg').textContent = this.t('otp.expired');
    this.$('#resend').hidden = false;
  }

  /** B-1 rollback — attempts exhausted: fire ASSIGNMENT-FAILED so the caller reverts optimistic state. */
  _rollback() {
    const Bus = globalThis.Platform && globalThis.Platform.Bus;
    const payload = { reason: 'otp-attempts-exhausted', purpose: this._opts.purpose || null,
      context: this._opts.context || {}, ts: new Date().toISOString() };
    if (Bus) { Bus.emit('assignment:failed', payload); Bus.emit('audit:assignment-failed', payload); }
    this.$('#msg').textContent = this.t('otp.rollback');
    this._finish({ ok: false, kind: 'ASSIGNMENT_FAILED' });
  }

  _startCountdown() {
    if (!this._expiresAt) { this.$('#countdown').textContent = ''; return; }
    const tick = () => {
      const s = Math.max(0, Math.round((this._expiresAt - Date.now()) / 1000));
      this.$('#countdown').textContent = this.t('otp.expiresIn', { s });
      if (s <= 0) this._onExpired();
    };
    tick();
    this._countdownTimer = setInterval(tick, 1000);
  }
  _stopCountdown() { if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; } }

  _personaEmail() {
    const P = globalThis.Platform && globalThis.Platform.Persona;
    return (P && P.email && P.email()) || null;
  }
  _detail(res) {
    return (res && Array.isArray(res.errors) && res.errors[0] && res.errors[0].message) || '';
  }

  _finish(result) {
    if (this._settled) return;
    this._settled = true;
    this._stopCountdown();
    const resolve = this._resolve; this._resolve = null;
    this.remove();
    if (resolve) resolve(result);
  }
}
customElements.define('pf-otp-modal', PfOtpModal);
export { PfOtpModal };
export default PfOtpModal;
