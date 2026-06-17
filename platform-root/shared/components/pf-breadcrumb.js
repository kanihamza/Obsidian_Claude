/** OBSIDIAN v4.0 — <pf-breadcrumb> · Home › current module, from route changes. */
import { PfBaseElement } from './_base.js';
class PfBreadcrumb extends PfBaseElement {
  onConnect() {
    this.render(`<style>
      :host{ display:block; }
      ol{ list-style:none; display:flex; align-items:center; gap:var(--space-2);
        font-size:var(--size-body-sm); color:var(--color-text-muted); }
      li::after{ content:"›"; margin-left:var(--space-2); color:var(--color-border-strong); }
      li:last-child::after{ content:""; }
      li[aria-current]{ color:var(--color-text); font-weight:var(--fw-semibold); }
    </style><nav aria-label="breadcrumb"><ol id="crumbs"></ol></nav>`);
    this.bus('platform:route:changed', (e) => this.paint(e.id));
    const cur = globalThis.Platform?.Router?.current?.(); if (cur?.id) this.paint(cur.id);
  }
  paint(id) {
    const M = globalThis.Platform?.Modules?.get?.(id);
    const label = M ? this.t(M.label) : id;
    this.$('#crumbs').innerHTML =
      `<li><a href="#/">${this.t('breadcrumb.home')}</a></li><li aria-current="page">${label}</li>`;
  }
}
customElements.define('pf-breadcrumb', PfBreadcrumb);
export default PfBreadcrumb;
