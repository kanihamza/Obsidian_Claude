/** OBSIDIAN v4.0 — <pf-persona-switcher> · overt persona dropdown (local model, no auth). */
import { PfBaseElement } from './_base.js';
class PfPersonaSwitcher extends PfBaseElement {
  onConnect() {
    this.draw();
    this.bus('platform:persona:changed', () => this.sync());
  }
  draw() {
    const personas = globalThis.Platform?.Personas || [];
    const current = globalThis.Platform?.Persona?.current?.() || '';
    const opts = personas.map((p) => `<option value="${p.id}">${this.t(p.labelKey)}</option>`).join('');
    this.render(`<style>
      :host{ display:inline-flex; align-items:center; gap:var(--space-2); }
      label{ font-size:var(--size-caption); color:var(--color-text-muted); }
      select{ font:inherit; font-size:var(--size-body-sm); padding:var(--space-1) var(--space-2);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-sm);
        background:var(--color-surface); color:var(--color-text); }
    </style>
    <label for="p">${this.t('persona.switcher.label')}</label>
    <select id="p" aria-label="${this.t('persona.switcher.aria')}">${opts}</select>`);
    this.$('#p').value = current;
    this.on(this.$('#p'), 'change', (e) => globalThis.Platform?.Persona?.switch?.(e.target.value));
  }
  sync() { const s = this.$('#p'); if (s) s.value = globalThis.Platform?.Persona?.current?.() || s.value; }
}
customElements.define('pf-persona-switcher', PfPersonaSwitcher);
export default PfPersonaSwitcher;
