/** OBSIDIAN v4.0 — <pf-app-footer> · NITDA endorsement + year + build marker. */
import { PfBaseElement } from './_base.js';
import { BUILD_INFO } from '../../config/build-info.js';
class PfAppFooter extends PfBaseElement {
  onConnect() {
    const endorse = globalThis.Platform?.Brand?.endorsementKey?.() || 'brand.endorsement.nitda';
    this.render(`<style>
      :host{ display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap; }
      .dot{ width:6px; height:6px; border-radius:var(--radius-pill); background:var(--color-brand-accent); }
      .build{ font-size:var(--size-caption); color:var(--color-text-muted); font-variant-numeric:tabular-nums; }
    </style>
    <span class="pf-overline"><span class="dot"></span> ${this.t(endorse)}</span>
    <span class="build" title="running build marker">build ${BUILD_INFO.id}</span>
    <span style="margin-left:auto">${this.t('footer.copyright', { year: new Date().getFullYear() })}</span>`);
    this.bus('platform:brand:changed', () => this.onConnect());
  }
}
customElements.define('pf-app-footer', PfAppFooter);
export default PfAppFooter;
