/** OBSIDIAN v4.0 — <pf-app-header> · brand logo (theme-aware) + NITDA endorsement +
 *  utility actions + persona switcher + mobile menu toggle. */
import { PfBaseElement } from './_base.js';
import { BRANDS, DEFAULT_BRAND } from '../../config/brand.config.js';
class PfAppHeader extends PfBaseElement {
  onConnect() {
    this.draw();
    this.bus('platform:brand:changed', () => this.draw());
    this.bus('platform:theme:changed', () => this.draw());
    this.bus('platform:nav:rebuilt', (m) => this.drawUtils(m.utils));
  }
  /** Resolve the brand logo regardless of Platform.Brand init ordering — falls back to the
   *  static brand.config so the DGO logo renders on the very first draw, before Brand.init(). */
  _resolveLogo() {
    if (globalThis.Platform?.Brand?.currentLogo) return globalThis.Platform.Brand.currentLogo();
    const b = BRANDS[DEFAULT_BRAND] || BRANDS.parent;
    const dark = (globalThis.Platform?.Theme?.resolved?.() === 'dark');
    return b && b.logo ? { src: dark ? b.logo.dark : b.logo.light, mark: b.logo.mark, alt: b.labelKey } : { src: '', alt: 'brand.dgo.label' };
  }
  draw() {
    const logo = this._resolveLogo();
    const endorse = globalThis.Platform?.Brand?.endorsementKey?.() || (BRANDS[DEFAULT_BRAND] && BRANDS[DEFAULT_BRAND].endorsementKey) || 'brand.endorsement.nitda';
    this.render(`<style>
      :host{ display:flex; align-items:center; gap:var(--space-4); width:100%; }
      .menu{ display:none; }
      .brand{ display:flex; align-items:center; gap:var(--space-3); }
      .brand img{ height:28px; width:auto; }
      .endorse{ display:inline-flex; align-items:center; gap:var(--space-2);
        font-size:var(--size-caption); text-transform:uppercase;
        letter-spacing:var(--tracking-overline); color:var(--color-text-muted); }
      .endorse::before{ content:""; width:6px; height:6px; border-radius:var(--radius-pill);
        background:var(--color-brand-accent); }
      .spacer{ margin-left:auto; }
      .utils{ display:flex; align-items:center; gap:var(--space-2); }
      .utils button{ display:inline-grid; place-items:center; width:36px; height:36px;
        border-radius:var(--radius-md); color:var(--color-text-muted); }
      .utils button:hover{ background:var(--color-surface-sunken); color:var(--color-text); }
      .iconbtn{ display:inline-grid; place-items:center; width:36px; height:36px; border-radius:var(--radius-md); color:var(--color-text-muted); }
      .iconbtn:hover{ background:var(--color-surface-sunken); color:var(--color-text); }
      @media (max-width:768px){ .menu{ display:inline-grid; place-items:center; width:36px; height:36px; }
        .endorse{ display:none; } }
    </style>
    <button class="menu" aria-label="${this.t('shell.menu.toggle')}"><pf-icon name="menu"></pf-icon></button>
    <a class="brand" href="#/" aria-label="${this.t(logo.alt)}">
      ${logo.src ? `<img src="${logo.src}" alt="${this.t(logo.alt)}">` : `<strong>${this.t(logo.alt)}</strong>`}
    </a>
    <span class="endorse">${this.t(endorse)}</span>
    <span class="spacer"></span>
    <button class="iconbtn" id="refresh" title="${this.t('common.actions.refresh')}" aria-label="${this.t('common.actions.refresh')}"><pf-icon name="refresh-cw"></pf-icon></button>
    <button class="iconbtn" id="profile" title="${this.t('profile.title')}" aria-label="${this.t('profile.title')}"><pf-icon name="user"></pf-icon></button>
    <span class="utils" id="utils"></span>
    <pf-persona-switcher></pf-persona-switcher>`);
    this.on(this.$('.menu'), 'click', () => globalThis.Platform?.Bus?.emit('platform:nav:toggle', {}));
    this.drawUtils(globalThis.Platform?.Nav?.model?.().utils || []);
    this.on(this.$('#refresh'), 'click', async () => { try { await globalThis.Platform?.Entities?.bootstrap(true); } catch (e) {} try { await globalThis.Platform?.Lookups?.load?.(true); } catch (e) {} });
    this.on(this.$('#profile'), 'click', () => globalThis.Platform?.UI?.openProfileSetup?.());
  }
  drawUtils(utils) {
    const host = this.$('#utils'); if (!host || !utils) return;
    host.innerHTML = utils.filter((u) => u.event).map((u) =>
      `<button data-event="${u.event}" title="${this.t(u.labelKey)}" aria-label="${this.t(u.labelKey)}"><pf-icon name="${u.icon}"></pf-icon></button>`).join('');
    for (const b of host.querySelectorAll('button')) this.on(b, 'click', () => globalThis.Platform?.Bus?.emit(b.dataset.event, {}));
  }
}
customElements.define('pf-app-header', PfAppHeader);
export default PfAppHeader;
