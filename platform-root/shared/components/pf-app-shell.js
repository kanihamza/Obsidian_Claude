/** OBSIDIAN v4.0 — <pf-app-shell> · top-level grid (header/nav/main/footer slots),
 *  responsive nav drawer (<768px), and the infoweb/atomic-O orbit boot/route loader. */
import { PfBaseElement } from './_base.js';
class PfAppShell extends PfBaseElement {
  onConnect() {
    this.render(`<style>
      :host{ display:block; }
      .shell{ display:grid; min-height:100vh;
        grid-template-columns:var(--nav-w,264px) 1fr;
        grid-template-rows:var(--header-h,56px) auto 1fr auto;
        grid-template-areas:"header header" "banner banner" "nav main" "nav footer"; }
      .header{ grid-area:header; position:sticky; top:0; z-index:var(--z-sticky);
        display:flex; align-items:center; padding-inline:var(--space-5);
        background:var(--color-surface-raised); border-bottom:1px solid var(--color-border);
        box-shadow:var(--shadow-xs); }
      .banner{ grid-area:banner; position:sticky; top:var(--header-h,56px); z-index:calc(var(--z-sticky) - 1);
        background:transparent; }
      .nav{ grid-area:nav; position:sticky; top:var(--header-h,56px); align-self:start;
        height:calc(100vh - var(--header-h,56px)); overflow-y:auto;
        background:var(--color-surface); border-right:1px solid var(--color-border);
        padding:var(--space-4) var(--space-3); }
      .main{ grid-area:main; padding:var(--space-6) var(--space-7);
        background:var(--color-surface-sunken); min-width:0; }
      .footer{ grid-area:footer; padding:var(--space-4) var(--space-7);
        background:var(--color-surface); border-top:1px solid var(--color-border);
        color:var(--color-text-muted); font-size:var(--size-body-sm); }
      /* Loading overlay + atomic-O orbit motif */
      .loader{ position:fixed; inset:0; z-index:var(--z-overlay); display:grid; place-items:center;
        background:var(--color-surface); transition:opacity var(--duration-slow) var(--easing-standard); }
      .loader[hidden]{ opacity:0; pointer-events:none; }
      .orbit{ width:64px; height:64px; position:relative; }
      .orbit .ring{ position:absolute; inset:0; border:3px solid var(--motif-orbit);
        border-right-color:transparent; border-radius:50%; animation:spin 1s linear infinite; }
      .orbit .core{ position:absolute; inset:42%; border-radius:50%; background:var(--motif-core); }
      @keyframes spin{ to{ transform:rotate(360deg); } }
      @media (max-width:900px){
        .shell{ grid-template-columns:1fr; grid-template-areas:"header" "banner" "main" "footer"; }
        .nav{ position:fixed; top:var(--header-h,56px); left:0; bottom:0; width:min(80vw,300px);
          z-index:var(--z-drawer); transform:translateX(-105%);
          transition:transform var(--duration-base) var(--easing-standard); }
        :host([nav-open]) .nav{ transform:none; box-shadow:var(--shadow-xl); }
      }
    </style>
    <div class="shell">
      <div class="header"><slot name="header"></slot></div>
      <div class="banner"><slot name="banner"></slot></div>
      <div class="nav"><slot name="nav"></slot></div>
      <div class="main"><slot name="main"></slot></div>
      <div class="footer"><slot name="footer"></slot></div>
    </div>
    <div class="loader" id="loader"><div class="orbit"><div class="ring"></div><div class="core"></div></div></div>`);
    this.bus('platform:nav:toggle', () => this.toggleAttribute('nav-open'));
    this.bus('platform:nav:changed', () => this.removeAttribute('nav-open'));
    const hideLoader = () => { const l = this.$('#loader'); if (l && !l.hidden) { l.hidden = true; setTimeout(() => l.remove(), 320); } if (this._loaderTimer) clearTimeout(this._loaderTimer); };
    this.bus('platform:ready', hideLoader);
    this._loaderTimer = setTimeout(hideLoader, 4000); // safety net: UI can never hang on the loader
  }
}
customElements.define('pf-app-shell', PfAppShell);
export default PfAppShell;
