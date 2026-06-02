/** OBSIDIAN v4.0 — <pf-side-panel open title-key="…"> · slide-over container with focus trap. */
import { PfBaseElement } from './_base.js';
class PfSidePanel extends PfBaseElement {
  static attrs = ['open', 'title-key'];
  onConnect() {
    this.render(`<style>
      :host{ position:fixed; inset:0; z-index:var(--z-drawer); display:none; }
      :host([open]){ display:block; }
      .scrim{ position:absolute; inset:0; background:var(--color-surface-inverse); opacity:.4; }
      .panel{ position:absolute; top:0; right:0; height:100%; width:min(92vw,420px);
        background:var(--color-surface-raised); box-shadow:var(--shadow-xl);
        padding:var(--space-5); overflow:auto; animation:in var(--duration-base) var(--easing-standard); }
      header{ display:flex; align-items:center; margin-bottom:var(--space-4); }
      header h2{ font-size:var(--size-h3); margin:0; }
      header button{ margin-left:auto; color:var(--color-text-muted); }
      @keyframes in{ from{ transform:translateX(16px); opacity:0; } to{ transform:none; opacity:1; } }
    </style>
    <div class="scrim"></div>
    <aside class="panel" role="dialog" aria-modal="true" aria-labelledby="sp-title">
      <header><h2 id="sp-title"></h2><button id="x" aria-label="${this.t('sidepanel.close')}">&times;</button></header>
      <div id="sp-body"><slot></slot></div>
    </aside>`);
    this.on(this.$('.scrim'), 'click', () => this.close());
    this.on(this.$('#x'), 'click', () => this.close());
    this.on(document, 'keydown', (e) => { if (e.key === 'Escape' && this.hasAttribute('open')) this.close(); });
  }
  onAttrChange(name) {
    if (name === 'title-key') { const h = this.$('#sp-title'); if (h) h.textContent = this.t(this.getAttribute('title-key') || ''); }
    if (name === 'open' && this.shadowRoot) {
      if (this.hasAttribute('open')) { this._release = globalThis.Platform?.A11y?.trapFocus?.(this.$('.panel')); globalThis.Platform?.A11y?.focusFirst?.(this.$('.panel')); }
      else this._release?.();
    }
  }
  close() { this.removeAttribute('open'); this.emit('pf-side-panel:close'); }
}
customElements.define('pf-side-panel', PfSidePanel);
export default PfSidePanel;
