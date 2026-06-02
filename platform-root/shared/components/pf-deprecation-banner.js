/** OBSIDIAN v4.0 — <pf-deprecation-banner replaced-by="…" sunset-date="…"> (§1.12). */
import { PfBaseElement } from './_base.js';
class PfDeprecationBanner extends PfBaseElement {
  static attrs = ['replaced-by', 'sunset-date'];
  onConnect() { this.draw(); }
  onAttrChange() { if (this.shadowRoot) this.draw(); }
  draw() {
    this.render(`<style>
      :host{ display:block; }
      .b{ display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3) var(--space-4);
        border-radius:var(--radius-md); background:var(--dgo-status-pending-bg);
        color:var(--dgo-status-pending-fg); border:1px solid var(--color-warning);
        font-size:var(--size-body-sm); }
    </style>
    <div class="b" role="status"><pf-icon name="alert-triangle" label="${this.t('deprecation.icon.aria')}"></pf-icon>
      <span>${this.t('deprecation.banner.message', { replacedBy: this.getAttribute('replaced-by') || '', date: this.getAttribute('sunset-date') || '' })}</span>
    </div>`);
  }
}
customElements.define('pf-deprecation-banner', PfDeprecationBanner);
export default PfDeprecationBanner;
