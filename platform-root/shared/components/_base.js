/** OBSIDIAN v4.0 — PfBaseElement (/shared/components/_base.js)
 *  Mandatory base for every <pf-*> custom element (§3.2). Shadow DOM on construction;
 *  one shared, cached stylesheet adopted into every shadow root (tokens pierce the
 *  boundary, so var(--*) works inside). Auto-cleanup listeners, scoped queries, i18n. */
const SHARED = new CSSStyleSheet();
SHARED.replaceSync(`
  :host{ box-sizing:border-box; font-family:var(--font-body); color:var(--color-text); }
  *,*::before,*::after{ box-sizing:border-box; }
  button{ font:inherit; color:inherit; background:none; border:none; cursor:pointer; }
  a{ color:inherit; text-decoration:none; }
  :where(button,a,[tabindex]):focus-visible{ outline:none; box-shadow:var(--focus-ring); border-radius:var(--radius-sm); }
  .pf-overline{ font-size:var(--size-caption); text-transform:uppercase;
    letter-spacing:var(--tracking-overline); color:var(--color-text-muted); font-weight:var(--fw-semibold); }
  @media (prefers-reduced-motion:reduce){ *{ animation-duration:.01ms !important; transition-duration:.01ms !important; } }
`);

export class PfBaseElement extends HTMLElement {
  static attrs = [];
  static get observedAttributes() { return this.attrs; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SHARED];
    this._disposers = [];
  }
  connectedCallback() { this.onConnect?.(); }
  disconnectedCallback() { for (const d of this._disposers.splice(0)) { try { d(); } catch { /* ignore */ } } this.onDisconnect?.(); }
  attributeChangedCallback(name, oldVal, newVal) { this.onAttrChange?.(name, oldVal, newVal); }
  render(html) { this.shadowRoot.innerHTML = html; }
  on(target, event, handler, opts) { target.addEventListener(event, handler, opts); this._disposers.push(() => target.removeEventListener(event, handler, opts)); }
  bus(event, handler) { const off = (globalThis.Platform?.Bus)?.on(event, handler); if (off) this._disposers.push(off); return off; }
  emit(name, detail, opts) { this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true, ...opts })); }
  $(sel) { return this.shadowRoot.querySelector(sel); }
  $$(sel) { return [...this.shadowRoot.querySelectorAll(sel)]; }
  t(key, vars) { return globalThis.Platform?.I18n?.t ? globalThis.Platform.I18n.t(key, vars) : key; }
  define(tag) { if (!customElements.get(tag)) customElements.define(tag, this); }
}
export default PfBaseElement;
