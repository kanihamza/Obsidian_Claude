/** OBSIDIAN v4.0 — <pf-otp-modal> · stateless PA-handshake OTP gate (register B-1 / D-7).
 *
 *  This component holds NO OTP logic of its own. It is a thin UI consumer of the Power Automate
 *  OTP handshake. The live flow contract (OTP_GENERATE Compose_1, S1.5 Live-Data Conformance Patch):
 *    request body = { action:'generate'|'verify', identifier:<email|phone>, otp_code:<verify only> }
 *    - `identifier` is the OTP target (NOT userEmail); `action` must be exactly 'generate'/'verify'.
 *    - userEmail is still sent in the envelope for audit, but the flow consumes `identifier`.
 *  RESPONSE shape (confirmed against live OTP_GENERATE/OTP_VERIFY run records 2026-06-09): the envelope
 *  is v1 ({ ok, status, request, timing, data, results, errors, meta }) and `data` is a JSON STRING that
 *  parses to { valid:boolean, message:string, ... }. Success/failure is keyed on `valid`; the assumed
 *  fields otpId/expiresAt/verificationToken/remainingAttempts/sentTo/codeLength are NOT emitted by the
 *  live flow — `data` is parsed defensively (string → JSON.parse) and all such fields are best-effort.
 *  The plaintext code is NEVER generated or compared client-side.
 *
 *  Usage:  const r = await PfOtpModal.require({ identifier, userEmail, purpose, context });
 *    resolves → { ok:true,  identifier, code, verificationToken? }                 (verified)
 *             → { ok:false, kind:'ASSIGNMENT_FAILED' }   on exhausted attempts (B-1 rollback)
 *             → { ok:false, kind:'CANCELLED' }           on user cancel / Escape
 *
 *  On OTP_INVALID the attempt matrix decrements; at zero it fires an ASSIGNMENT-FAILED rollback
 *  (audit + bus event) so the caller can revert the optimistic `assigning` state. */
import { PfBaseElement } from './_base.js';
import { BaseService } from '../../core/base-service.js';

// Success-path `data` shape is unobserved (S1.5 Finding 5) — only require the `ok` envelope key.
const requestOtp = BaseService.endpoint('OTP_GENERATE', { expectedKeys: ['ok'] });
const verifyOtp  = BaseService.endpoint('OTP_VERIFY', { expectedKeys: ['ok'] });

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
    this._sent = false;         // a code has been requested for this identifier (gates verify)
    this._otpId = null;         // best-effort only; the flow identifies by `identifier`, not otpId
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

  /** The OTP target the flow consumes: `identifier` (email or phone), falling back to userEmail. */
  _identifier() {
    return this._opts.identifier || this._opts.userEmail || this._personaEmail();
  }

  /** Defensive parse of the response `data` (S1.5 Finding 5): string → JSON.parse; object → as-is. */
  _parseData(res) {
    let d = res && res.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (_) { d = {}; } }
    if (!d || typeof d !== 'object') d = {};
    return d;
  }

  /** Step 1 — request a fresh code (OTP_GENERATE, action:'generate'). */
  async _request() {
    this._stopCountdown();
    this._sent = false;
    const msg = this.$('#msg'); msg.textContent = '';
    this.$('#resend').hidden = true;
    this.$('#dest').textContent = this.t('otp.sendingCode');
    this.$('#code').disabled = true; this.$('#verify').disabled = true;

    const identifier = this._identifier();
    const res = await requestOtp({
      action: 'generate',
      identifier,
      userEmail: identifier,            // envelope-only, for audit; flow consumes `identifier`
      purpose: this._opts.purpose || 'VERIFICATION',
      channel: 'email',
      context: this._opts.context || {}
    });

    if (!res.ok) {
      this.$('#dest').textContent = '';
      msg.textContent = this._detail(res) || this.t('otp.genFailed');
      this.$('#resend').hidden = false;
      return;
    }
    // Live flow returns `data` as a JSON STRING keyed on `valid` (boolean); human text in `message`
    // (confirmed against OTP_GENERATE run record 2026-06-09). valid:false ⇒ the request was rejected.
    const d = this._parseData(res);
    if (d.valid === false) {
      this.$('#dest').textContent = '';
      msg.textContent = d.message || this.t('otp.genFailed');
      this.$('#resend').hidden = false;
      return;
    }
    this._sent = true;
    this._otpId = d.otpId || d.id || null;
    this._attemptsLeft = Number(this._opts.maxAttempts) || DEFAULT_ATTEMPTS;
    const ttl = Number(d.ttlSeconds) || 0;
    this._expiresAt = d.expiresAt ? Date.parse(d.expiresAt) : (ttl ? Date.now() + ttl * 1000 : 0);
    this.$('#dest').textContent = this.t('otp.sent', { to: d.sentTo || identifier || 'email', ttl: ttl || 0 });
    const input = this.$('#code');
    input.disabled = false; input.value = ''; input.maxLength = Number(d.codeLength) || 8;
    this.$('#verify').disabled = false;
    input.focus();
    this._startCountdown();
  }

  /** Step 2 — verify the user-typed code (OTP_VERIFY, action:'verify'). */
  async _verify() {
    const input = this.$('#code');
    const code = (input.value || '').trim();
    const msg = this.$('#msg'); msg.textContent = '';
    if (!this._sent) { msg.textContent = this.t('otp.expired'); this.$('#resend').hidden = false; return; }
    if (!code) { msg.textContent = this.t('otp.needCode'); return; }
    if (this._expiresAt && Date.now() > this._expiresAt) { this._onExpired(); return; }

    this.$('#verify').disabled = true;
    this.$('#countdown').textContent = this.t('otp.verifying');
    const identifier = this._identifier();
    const res = await verifyOtp({ action: 'verify', identifier, otp_code: code, userEmail: identifier });
    this.$('#verify').disabled = false;

    // Live flow keys success on `data.valid` (boolean), human text in `data.message`; `data` arrives as
    // a JSON string (confirmed against OTP_VERIFY run record 2026-06-09). Verified ⇒ ok AND valid !== false.
    const d = this._parseData(res);
    if (res.ok && d.valid !== false) {
      this._finish({ ok: true, identifier, code, verificationToken: d.verificationToken || d.token || null });
      return;
    }

    const kind = res.errorKind || '';
    if (kind === 'OTP_EXPIRED') { this._onExpired(); return; }

    // valid:false / ok:false — decrement the attempt matrix; surface the flow's own message when present.
    const serverLeft = Number.isFinite(d.remainingAttempts) ? Number(d.remainingAttempts) : null;
    this._attemptsLeft = serverLeft != null ? serverLeft : (this._attemptsLeft - 1);
    if (this._attemptsLeft <= 0) { this._rollback(); return; }
    msg.textContent = (d.message || this.t('otp.invalid')) + ' ' + this.t('otp.attemptsLeft', { n: this._attemptsLeft });
    input.focus(); input.select();
  }

  _onExpired() {
    this._stopCountdown();
    this._sent = false;
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
