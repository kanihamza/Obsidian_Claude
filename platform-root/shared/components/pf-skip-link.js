/** OBSIDIAN v4.0 — <pf-skip-link target="module-outlet"> · keyboard skip to main. */
import { PfBaseElement } from './_base.js';
class PfSkipLink extends PfBaseElement {
  onConnect() {
    this.render(`<style>
      a{ position:absolute; left:var(--space-2); top:-48px; z-index:var(--z-palette);
        padding:var(--space-2) var(--space-4); border-radius:var(--radius-md);
        background:var(--color-brand-primary); color:var(--color-text-inverse);
        transition:top var(--duration-fast) var(--easing-standard); }
      a:focus-visible{ top:var(--space-2); }
    </style><a href="#main">${this.t('shell.skipLink')}</a>`);
    this.on(this.$('a'), 'click', (e) => {
      e.preventDefault();
      const id = this.getAttribute('target') || 'module-outlet';
      const el = document.getElementById(id);
      if (el) { el.setAttribute('tabindex', '-1'); el.focus(); el.scrollIntoView(); }
    });
  }
}
customElements.define('pf-skip-link', PfSkipLink);
export default PfSkipLink;
