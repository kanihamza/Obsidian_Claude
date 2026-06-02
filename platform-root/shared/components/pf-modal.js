/** OBSIDIAN v4.0 — <pf-modal> · focus-trapped dialog driven by platform:ui:modal. */
import { PfBaseElement } from './_base.js';
class PfModal extends PfBaseElement {
  onConnect() {
    this.render(`<style>
      :host{ position:fixed; inset:0; z-index:var(--z-modal); display:none; }
      :host([open]){ display:grid; place-items:center; }
      .scrim{ position:absolute; inset:0; background:var(--color-surface-inverse); opacity:.45; }
      .dialog{ position:relative; width:min(92vw,560px); max-height:86vh; overflow:auto;
        background:var(--color-surface-raised); border-radius:var(--radius-frame);
        box-shadow:var(--shadow-xl); padding:var(--space-6); }
      header{ display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4); }
      header h2{ font-size:var(--size-h3); margin:0; }
      header button{ margin-left:auto; color:var(--color-text-muted); }
      .actions{ display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-5); }
      .actions button{ padding:var(--space-2) var(--space-4); border-radius:var(--radius-md);
        font-weight:var(--fw-semibold); font-size:var(--size-body-sm); }
      .actions .primary{ background:var(--color-brand-primary); color:var(--color-text-inverse); }
      .actions .ghost{ color:var(--color-text); border:1px solid var(--color-border-strong); }
    
      .pf-preview{ display:flex; flex-direction:column; gap:var(--space-1); margin-top:var(--space-2); }
      .pf-preview .row{ display:flex; justify-content:space-between; gap:var(--space-4); padding:var(--space-2) var(--space-3); border:1px solid var(--color-border); border-radius:var(--radius-sm); background:var(--color-surface-sunken); }
      .pf-preview .k{ color:var(--color-text-muted); font-size:var(--size-caption); }
      .pf-preview .v{ font-weight:var(--fw-semibold); font-size:var(--size-body-sm); }
      .pf-btn--danger{ background:var(--dgo-status-action-fg, var(--color-danger)); color:var(--color-text-inverse); }
    </style>
    <div class="scrim"></div>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <header><h2 id="m-title"></h2><button id="x" aria-label="${this.t('modal.close')}">&times;</button></header>
      <div id="m-body"></div><div class="actions" id="m-actions"></div>
    </div>`);
    this.bus('platform:ui:modal', (d) => this.open(d));
    this.bus('platform:ui:modal-close', () => this.close());
    this.on(this.$('.scrim'), 'click', () => this.close());
    this.on(this.$('#x'), 'click', () => this.close());
    this.on(document, 'keydown', (e) => { if (e.key === 'Escape' && this.hasAttribute('open')) this.close(); });
  }
  open({ titleKey, title, bodyKey, bodyEl, component, props, preview, actions = [] }) {
    this.$('#m-title').textContent = title || (titleKey ? this.t(titleKey) : '');
    const body = this.$('#m-body');
    body.innerHTML = '';
    if (bodyEl instanceof Node) {
      body.appendChild(bodyEl);
    } else if (preview) {
      if (preview.summaryKey || preview.summary) {
        const pEl = document.createElement('p');
        pEl.style.cssText = 'color:var(--color-text-muted);font-size:var(--size-body-sm);margin-bottom:var(--space-3)';
        pEl.textContent = preview.summaryKey ? this.t(preview.summaryKey) : preview.summary;
        body.appendChild(pEl);
      }
      if (Array.isArray(preview.details) && preview.details.length) {
        const dl = document.createElement('div'); dl.className = 'pf-preview';
        dl.innerHTML = preview.details.map((d) => `<div class="row"><span class="k">${d.label}</span><span class="v">${d.value}</span></div>`).join('');
        body.appendChild(dl);
      }
    } else if (component) { const el = document.createElement(component); if (props) Object.assign(el, { props }); body.appendChild(el); }
    else if (bodyKey) body.textContent = this.t(bodyKey);
    const acts = this.$('#m-actions'); acts.innerHTML = '';
    for (const a of actions) {
      const b = document.createElement('button');
      b.className = a.variant === 'danger' ? 'danger' : a.variant === 'primary' ? 'primary' : 'ghost';
      b.textContent = this.t(a.labelKey); this.on(b, 'click', () => { a.event && globalThis.Platform?.Bus?.emit(a.event, a.detail || {}); if (a.close !== false) this.close(); });
      acts.appendChild(b);
    }
    this.setAttribute('open', '');
    this._release = globalThis.Platform?.A11y?.trapFocus?.(this.$('.dialog'));
    globalThis.Platform?.A11y?.focusFirst?.(this.$('.dialog'));
  }
  close() { this.removeAttribute('open'); this._release?.(); }
}
customElements.define('pf-modal', PfModal);
export default PfModal;
