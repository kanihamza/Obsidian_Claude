/** OBSIDIAN v4.0 — brand-manager.js · NITDA parent + DGO sub-brand activation.
 *  DGO is prominent: activated by default at boot. currentLogo() is theme-aware. */
import { State } from './state.js';
import { Bus } from './bus.js';
import { BRANDS, DEFAULT_BRAND } from '../config/brand.config.js';

function classFor(id) { const b = BRANDS[id]; return b && b.rootClass; }
export const Brand = {
  init() { Brand.activate(State.get('shared.brand.active', DEFAULT_BRAND)); },
  activate(id) {
    const root = document.documentElement;
    for (const key of Object.keys(BRANDS)) { const c = classFor(key); if (c) root.classList.remove(c); }
    const cls = classFor(id); if (cls) root.classList.add(cls);
    State.set('shared.brand.active', id);
    const fav = BRANDS[id] && BRANDS[id].favicon;
    if (fav) { let l = document.querySelector('link[rel="icon"]'); if (!l){ l=document.createElement('link'); l.rel='icon'; document.head.appendChild(l);} l.href = fav; }
    Bus.emit('platform:brand:changed', { id });
  },
  current() { return State.get('shared.brand.active', DEFAULT_BRAND); },
  /** Theme-aware logo set for <pf-app-header>. */
  currentLogo() {
    const id = Brand.current(); const b = BRANDS[id] || BRANDS.parent;
    const dark = (globalThis.Platform?.Theme?.resolved?.() === 'dark');
    return { src: dark ? b.logo.dark : b.logo.light, mark: b.logo.mark, alt: b.labelKey };
  },
  endorsementKey() { const b = BRANDS[Brand.current()] || BRANDS.parent; return b.endorsementKey; }
};
export default Brand;
