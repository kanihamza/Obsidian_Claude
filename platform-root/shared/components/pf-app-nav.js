/** OBSIDIAN v4.0 — <pf-app-nav> · renders the audience-filtered nav model; tracks
 *  active route via aria-current; keyboard arrows/home/end; never renders its own items. */
import { PfBaseElement } from './_base.js';
class PfAppNav extends PfBaseElement {
  onConnect() {
    this.render(`<style>
      :host{ display:block; }
      nav{ display:flex; flex-direction:column; gap:var(--space-5); }
      .group__title{ font-size:var(--size-caption); text-transform:uppercase;
        letter-spacing:var(--tracking-overline); color:var(--color-text-muted);
        font-weight:var(--fw-semibold); padding:0 var(--space-3); margin-bottom:var(--space-2); }
      ul{ list-style:none; display:flex; flex-direction:column; gap:2px; }
      a{ display:flex; align-items:center; gap:var(--space-3); padding:var(--space-2) var(--space-3);
        border-radius:var(--radius-md); color:var(--color-text); font-size:var(--size-body-sm);
        font-weight:var(--fw-medium); transition:background var(--duration-fast) var(--easing-standard); }
      a:hover{ background:var(--color-surface-sunken); }
      a[aria-current="page"]{ background:var(--color-brand-primary); color:var(--color-text-inverse); }
      a[aria-current="page"] pf-icon{ color:var(--color-text-inverse); }
      .badge{ margin-left:auto; min-width:18px; height:18px; padding:0 5px; border-radius:var(--radius-pill);
        background:var(--color-brand-accent); color:var(--color-text-inverse);
        font-size:var(--size-caption); display:inline-grid; place-items:center; }
      .dep{ margin-left:auto; font-size:var(--size-caption); color:var(--color-warning); }
      /* DGO a11y: 44px touch-target floor on touch devices (B-2 mobile-tablet target). */
      @media (pointer:coarse){ a{ min-height:44px; } }
    </style><nav aria-label="${this.t('shell.nav.aria')}"></nav>`);
    this.bus('platform:nav:rebuilt', (m) => this.paint(m));
    const model = globalThis.Platform?.Nav?.model?.(); if (model) this.paint(model);
    this.on(this.$('nav'), 'keydown', (e) => this.onKey(e));
  }
  paint(model) {
    const nav = this.$('nav'); if (!nav) return;
    nav.innerHTML = (model.groups || []).map((g) => `
      <div class="group">
        <div class="group__title">${this.t(g.labelKey)}</div>
        <ul role="list">${g.items.map((it) => `
          <li><a href="#/${it.id}" ${it.active ? 'aria-current="page"' : ''}>
            ${it.icon ? `<pf-icon name="${it.icon}"></pf-icon>` : ''}
            <span>${this.t(it.labelKey)}</span>
            ${it.badge ? `<span class="badge">${it.badge}</span>` : ''}
            ${it.status === 'deprecated' ? `<span class="dep">${this.t('nav.badge.deprecated')}</span>` : ''}
          </a></li>`).join('')}</ul>
      </div>`).join('');
  }
  onKey(e) {
    const links = this.$$('a'); const i = links.indexOf(this.shadowRoot.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); links[Math.min(i + 1, links.length - 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); links[Math.max(i - 1, 0)]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); links[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); links[links.length - 1]?.focus(); }
  }
}
customElements.define('pf-app-nav', PfAppNav);
export default PfAppNav;
