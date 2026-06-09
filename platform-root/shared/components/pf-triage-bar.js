/** OBSIDIAN v4.0 — <pf-triage-bar> · Phase-1 (INTAKE) triage surface (register C-3, Rebuild Fresh).
 *  A chip row that drives one correspondence reference through INTAKE and hands it to ROUTING:
 *
 *    Acknowledge      registered → triaged          (first triage touch; phase-gated via C-7 writer)
 *    Tag Category     captures triageMeta.category  (from Lookups option-set)
 *    Flag Urgency     captures triageMeta.urgency   (P1–P4, mapped to SLA windows §3.3)
 *    Mark Duplicate   captures triageMeta.duplicate (pre-flagged from the fabric's __duplicateOf)
 *    Send to Routing  triaged → triage_complete, writes Context.handoff {fromPhase:1,toPhase:2,…},
 *                     then navigates to the ROUTING surface (Phase-1 §4.1 handshake).
 *
 *  All status writes go through the SOLE phase-gate mutator Entities.transitionStatus (C-7); the bar
 *  never writes status directly. It reads the live canonical status from the fabric so it works on
 *  records whose imported status is non-canonical (those are treated as freshly-arrived → registered).
 *  Bind a record via `el.item = recordWithRef` (or `el.reference = refId`). Emits pf-triage:acknowledged,
 *  pf-triage:changed, pf-triage:routed (bubbling, composed). */
import { PfBaseElement } from './_base.js';

const INTAKE_PATH = ['registered', 'triaged', 'triage_complete'];
const URGENCIES = ['p1', 'p2', 'p3', 'p4'];

class PfTriageBar extends PfBaseElement {
  /** Primary binding: the selected record (carries __ref, status, __duplicateOf). */
  set item(rec) {
    this._rec = (rec && typeof rec === 'object') ? rec : null;
    this._ref = this._rec && this._rec.__ref ? String(this._rec.__ref) : (this._ref || null);
    this._hydrate();
  }
  get item() { return this._rec || null; }

  /** Fallback binding when only a reference id is available. */
  set reference(ref) {
    this._ref = ref ? String(ref) : null;
    if (!this._rec) this._rec = null;
    this._hydrate();
  }
  get reference() { return this._ref || null; }

  onConnect() {
    this._meta = { acknowledged: false, category: null, urgency: null, duplicate: false };
    this._status = '';
    this._panel = null;     // 'cat' | 'urg' | null — which inline panel is open
    this.render(`<style>
      :host{ display:block; }
      .wrap{ background:var(--color-surface-raised); border:1px solid var(--color-border);
        border-radius:var(--radius-md); padding:var(--space-2) var(--space-3); }
      .bar{ display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap; }
      .lead{ display:flex; align-items:center; gap:var(--space-2); margin-right:var(--space-1); }
      .pill{ font-size:var(--size-caption); font-weight:var(--fw-semibold); padding:var(--space-1) var(--space-2);
        border-radius:var(--radius-pill); background:var(--color-surface); border:1px solid var(--color-border);
        color:var(--color-text-muted); white-space:nowrap; }
      .chips{ display:flex; gap:var(--space-1); flex-wrap:wrap; align-items:center; }
      .chip{ font:inherit; font-size:var(--size-caption); font-weight:var(--fw-semibold);
        padding:var(--space-1) var(--space-3); border-radius:var(--radius-pill);
        border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text-muted);
        cursor:pointer; transition:all var(--duration-fast) var(--easing-standard); }
      .chip:hover:not([disabled]){ border-color:var(--color-brand-primary); color:var(--color-text); }
      .chip[aria-pressed="true"]{ background:var(--color-brand-primary); color:var(--color-text-inverse); border-color:var(--color-brand-primary); }
      .chip[disabled]{ opacity:.5; cursor:not-allowed; }
      .chip:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:2px; }
      .chip--send{ margin-left:auto; border-color:var(--color-brand-primary); color:var(--color-brand-primary); }
      .chip--send[aria-disabled="true"]{ opacity:.5; cursor:not-allowed; }
      .panel{ display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap;
        margin-top:var(--space-2); padding-top:var(--space-2); border-top:1px dashed var(--color-border); }
      .panel[hidden]{ display:none; }
      label.fld{ font-size:var(--size-caption); color:var(--color-text-muted); display:flex; align-items:center; gap:var(--space-2); }
      select{ font:inherit; font-size:var(--size-body-sm); padding:var(--space-1) var(--space-2);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-sm);
        background:var(--color-surface); color:var(--color-text); }
      select:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:1px; }
      .dup{ display:flex; align-items:center; gap:var(--space-2); margin-top:var(--space-2);
        padding:var(--space-1) var(--space-3); border-radius:var(--radius-sm);
        background:var(--color-warning-soft, var(--color-surface)); border:1px solid var(--color-warning, var(--color-border));
        color:var(--color-text); font-size:var(--size-caption); }
      .dup[hidden]{ display:none; }
    </style>
    <div class="wrap">
      <div class="bar">
        <span class="lead"><span class="pf-overline">${this.t('triage.bar')}</span>
          <span class="pill" id="status" aria-live="polite"></span></span>
        <div class="chips" role="group" aria-label="${this.t('triage.bar')}">
          <button class="chip" id="ack"  type="button" aria-pressed="false">${this.t('triage.acknowledge')}</button>
          <button class="chip" id="cat"  type="button" aria-pressed="false" aria-expanded="false">${this.t('triage.tagCategory')}</button>
          <button class="chip" id="urg"  type="button" aria-pressed="false" aria-expanded="false">${this.t('triage.flagUrgency')}</button>
          <button class="chip" id="dup"  type="button" aria-pressed="false">${this.t('triage.markDuplicate')}</button>
          <button class="chip chip--send" id="send" type="button" aria-disabled="true">${this.t('triage.sendToRouting')}</button>
        </div>
      </div>
      <div class="panel" id="cat-panel" hidden>
        <label class="fld" for="cat-sel">${this.t('triage.tagCategory')}
          <select id="cat-sel"><option value="">${this.t('triage.categoryPlaceholder')}</option></select></label>
      </div>
      <div class="panel" id="urg-panel" hidden>
        <label class="fld" for="urg-sel">${this.t('triage.flagUrgency')}
          <select id="urg-sel"><option value="">${this.t('triage.urgencyPlaceholder')}</option></select></label>
      </div>
      <div class="dup" id="dup-banner" hidden><pf-icon name="activity" size="14"></pf-icon><span id="dup-text"></span></div>
    </div>`);

    this._fillCategories();
    this._fillUrgencies();
    this.on(this.$('#ack'), 'click', () => this._acknowledge());
    this.on(this.$('#cat'), 'click', () => this._togglePanel('cat'));
    this.on(this.$('#urg'), 'click', () => this._togglePanel('urg'));
    this.on(this.$('#dup'), 'click', () => this._toggleDuplicate());
    this.on(this.$('#send'), 'click', () => this._sendToRouting());
    this.on(this.$('#cat-sel'), 'change', (e) => this._setCategory(e.target.value));
    this.on(this.$('#urg-sel'), 'change', (e) => this._setUrgency(e.target.value));
    this._hydrate();
  }

  // ── platform accessors (lazy; never captured at module load) ───────────────
  get _E() { return globalThis.Platform && globalThis.Platform.Entities; }
  get _by() { const P = globalThis.Platform && globalThis.Platform.Persona; return (P && typeof P.email === 'function') ? P.email() : null; }

  _fillCategories() {
    const sel = this.$('#cat-sel'); if (!sel) return;
    const L = globalThis.Platform && globalThis.Platform.Lookups;
    const rows = (L && typeof L.categories === 'function') ? L.categories() : null;
    if (!Array.isArray(rows) || !rows.length) return;     // placeholder option stays; no fabrication
    for (const o of rows) {
      if (!o || o.value == null || o.value === '') continue;
      const opt = document.createElement('option');
      opt.value = String(o.value); opt.textContent = String(o.label || o.value);
      sel.appendChild(opt);
    }
  }
  _fillUrgencies() {
    const sel = this.$('#urg-sel'); if (!sel) return;
    for (const u of URGENCIES) {
      const opt = document.createElement('option');
      opt.value = u; opt.textContent = this.t('triage.urgency.' + u);
      sel.appendChild(opt);
    }
  }

  /** Pull the live canonical status + duplicate flag from the fabric and reflect the chip states. */
  _hydrate() {
    if (!this.shadowRoot) return;
    let status = '';
    const E = this._E;
    if (E && this._ref && typeof E.byReference === 'function') {
      const b = E.byReference(this._ref);
      status = String((b && b.reference && b.reference.status) || '');
    } else if (this._rec) {
      status = String(this._rec.status || '');
    }
    this._status = status;
    // A record at/after 'triaged' on the INTAKE path is already acknowledged.
    if (INTAKE_PATH.indexOf(status) >= 1) this._meta.acknowledged = true;
    const dupOf = this._rec && this._rec.__duplicateOf;
    if (dupOf) this._meta.duplicate = true;
    this._reflect();
  }

  _reflect() {
    const cur = this._status || '∅';
    const statusEl = this.$('#status');
    if (statusEl) statusEl.textContent = this.t('triage.statusLabel') + ': ' + cur;
    const set = (id, pressed, disabled) => {
      const b = this.$('#' + id); if (!b) return;
      b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      if (disabled != null) { if (disabled) b.setAttribute('disabled', ''); else b.removeAttribute('disabled'); }
    };
    set('ack', this._meta.acknowledged);
    set('cat', this._meta.category != null);
    set('urg', this._meta.urgency != null);
    set('dup', this._meta.duplicate);
    // Send-to-Routing is only enabled once acknowledged and not already past INTAKE.
    const send = this.$('#send');
    const past = INTAKE_PATH.indexOf(this._status) >= 2;   // already triage_complete (or beyond)
    const canSend = this._meta.acknowledged && !past && !!this._ref;
    if (send) {
      send.setAttribute('aria-disabled', canSend ? 'false' : 'true');
      send.setAttribute('aria-pressed', past ? 'true' : 'false');
    }
    // Duplicate banner (pre-flagged by the fabric's 30-day dedup index, A-6).
    const dupOf = this._rec && this._rec.__duplicateOf;
    const banner = this.$('#dup-banner'); const text = this.$('#dup-text');
    if (banner && text) {
      if (dupOf) { text.textContent = this.t('triage.duplicateHint', { ref: String(dupOf) }); banner.hidden = false; }
      else banner.hidden = true;
    }
  }

  _togglePanel(which) {
    this._panel = (this._panel === which) ? null : which;
    const cat = this.$('#cat-panel'), urg = this.$('#urg-panel');
    if (cat) cat.hidden = this._panel !== 'cat';
    if (urg) urg.hidden = this._panel !== 'urg';
    const cb = this.$('#cat'), ub = this.$('#urg');
    if (cb) cb.setAttribute('aria-expanded', this._panel === 'cat' ? 'true' : 'false');
    if (ub) ub.setAttribute('aria-expanded', this._panel === 'urg' ? 'true' : 'false');
  }

  _setCategory(v) {
    this._meta.category = (v === '' ? null : v);
    this._reflect();
    this.emit('pf-triage:changed', { ref: this._ref, meta: { ...this._meta } });
  }
  _setUrgency(v) {
    this._meta.urgency = (v === '' ? null : v);
    this._reflect();
    this.emit('pf-triage:changed', { ref: this._ref, meta: { ...this._meta } });
  }
  _toggleDuplicate() {
    this._meta.duplicate = !this._meta.duplicate;
    this._reflect();
    if (this._meta.duplicate) this._toast('triage.duplicateConfirmed', 'info');
    this.emit('pf-triage:changed', { ref: this._ref, meta: { ...this._meta } });
  }

  /** Walk the INTAKE chain to `target` through the phase-gate writer (C-7). Reads live status before
   *  each step so a non-canonical imported status is treated as fresh (→ registered). */
  _advance(target) {
    const E = this._E;
    if (!E || !this._ref) return { ok: false, error: { kind: 'NO_REFERENCE' } };
    const tIdx = INTAKE_PATH.indexOf(target);
    if (tIdx < 0) return { ok: false, error: { kind: 'INVALID_STATE' } };
    let cur = String((E.byReference(this._ref)?.reference?.status) || '');
    let curIdx = INTAKE_PATH.indexOf(cur);
    if (curIdx >= tIdx) { this._status = cur; return { ok: true, finalStatus: cur, noop: true }; }
    for (let i = Math.max(curIdx + 1, 0); i <= tIdx; i++) {
      const res = E.transitionStatus(this._ref, cur, INTAKE_PATH[i], this._by);
      if (!res || !res.ok) { this._status = cur; return { ok: false, error: res || { kind: 'ILLEGAL_TRANSITION' }, finalStatus: cur }; }
      cur = INTAKE_PATH[i];
    }
    this._status = cur;
    return { ok: true, finalStatus: cur };
  }

  _acknowledge() {
    if (!this._ref) { this._toast('triage.noRef', 'danger'); return; }
    const r = this._advance('triaged');
    if (!r.ok) { this._toastError(r.error); this._reflect(); return; }
    this._meta.acknowledged = true;
    this._reflect();
    this._toast('triage.ackDone', 'success', { ref: this._ref });
    this.emit('pf-triage:acknowledged', { ref: this._ref, meta: { ...this._meta } });
    this.emit('pf-triage:changed', { ref: this._ref, meta: { ...this._meta } });
  }

  async _sendToRouting() {
    const send = this.$('#send');
    if (!this._ref) { this._toast('triage.noRef', 'danger'); return; }
    if (send && send.getAttribute('aria-disabled') === 'true') { this._toast('triage.ackFirst', 'warning'); return; }

    const UI = globalThis.Platform && globalThis.Platform.UI;
    const details = [];
    if (this._meta.category) details.push({ label: this.t('triage.metaCategory'), value: this._meta.category });
    if (this._meta.urgency) details.push({ label: this.t('triage.metaUrgency'), value: this.t('triage.urgency.' + this._meta.urgency) });
    if (this._meta.duplicate) details.push({ label: this.t('triage.markDuplicate'), value: '✓' });
    const ok = UI && typeof UI.confirm === 'function'
      ? await UI.confirm({ titleKey: 'triage.routeTitle', summaryKey: 'triage.routeSummary', details, confirmKey: 'triage.sendToRouting' })
      : true;
    if (!ok) return;

    const r = this._advance('triage_complete');
    if (!r.ok) { this._toastError(r.error); this._reflect(); return; }

    const triageMeta = {
      category: this._meta.category || null,
      urgency: this._meta.urgency || null,
      duplicate: !!this._meta.duplicate,
      duplicateOf: (this._rec && this._rec.__duplicateOf) || null,
      acknowledgedBy: this._by || null
    };
    const Context = globalThis.Platform && globalThis.Platform.Context;
    if (Context && typeof Context.setHandoff === 'function')
      Context.setHandoff({ fromPhase: 1, toPhase: 2, refs: [this._ref], triageMeta });

    this._reflect();
    this._toast('triage.routed', 'success', { ref: this._ref });
    this.emit('pf-triage:routed', { ref: this._ref, triageMeta });

    const Router = globalThis.Platform && globalThis.Platform.Router;
    if (Router && typeof Router.navigate === 'function') Router.navigate('ops-hub', this._ref);
  }

  // ── feedback helpers (route through the shared UI/toast service) ───────────
  _toast(messageKey, variant, vars) {
    const UI = globalThis.Platform && globalThis.Platform.UI;
    if (UI && typeof UI.toast === 'function') UI.toast({ messageKey, variant: variant || 'info', vars });
  }
  _toastError(result) {
    const UI = globalThis.Platform && globalThis.Platform.UI;
    if (UI && typeof UI.toastError === 'function') UI.toastError(result || {});
    else this._toast('triage.ackFirst', 'danger');
  }
}

customElements.define('pf-triage-bar', PfTriageBar);
export default PfTriageBar;
