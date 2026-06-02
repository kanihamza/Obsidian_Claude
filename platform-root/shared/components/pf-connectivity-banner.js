/** OBSIDIAN v4.0 — <pf-connectivity-banner> · live data-state feedback + persistent warnings.
 *  Three independent bands, top-to-bottom:
 *    1. loading  — fabric is hydrating (auto, fired by entity:loading)
 *    2. warning  — persistent warnings pushed via Bus.emit('platform:warning:push', {text,key,dismissable})
 *    3. error    — last bootstrap failed / fabric unreachable (auto)
 *  Each band shows independently; banners stack inside the shell's banner row.
 *  Persistent warnings survive entity refreshes — they only clear via `platform:warning:dismiss` or
 *  via the dismiss button. Token-driven; no hex. */
import { PfBaseElement } from './_base.js';

class PfConnectivityBanner extends PfBaseElement {
  onConnect() {
    this._warnings = [];   // [{ key, text, dismissable, variant }]
    this.render(`<style>
      :host{ display:block; }
      .bar{ display:none; pointer-events:auto; align-items:center; gap:var(--space-3); justify-content:center;
        padding:var(--space-2) var(--space-4); font-size:var(--size-body-sm); }
      .bar[data-show="1"]{ display:flex; }
      .loading{ background:var(--color-surface-sunken); color:var(--color-text-muted); }
      .warning{ background:color-mix(in srgb, var(--color-warning) 18%, var(--color-surface));
        color:var(--color-text); border-bottom:1px solid var(--color-warning); }
      .warning--critical{ background:color-mix(in srgb, var(--color-danger) 18%, var(--color-surface));
        border-bottom-color:var(--color-danger); }
      .error{ background:var(--dgo-status-action-bg); color:var(--dgo-status-action-fg); }
      button{ padding:2px var(--space-3); border-radius:var(--radius-pill); font-weight:var(--fw-semibold);
        background:var(--color-brand-primary); color:var(--color-text-inverse); font-size:var(--size-caption);
        font-family:inherit; cursor:pointer; border:none; }
      .dismiss{ background:transparent; color:inherit; opacity:.7; }
      .icon{ font-size:var(--size-body-md); }
    </style>
    <div class="bar loading" id="loading"><span>${this.t('connectivity.loading')}</span></div>
    <div id="warnings"></div>
    <div class="bar error" id="error">
      <span>${this.t('connectivity.offline')}</span>
      <button id="retry">${this.t('connectivity.retry')}</button>
      <button class="dismiss" id="dismiss" aria-label="${this.t('common.actions.cancel')}">✕</button>
    </div>`);
    this._show('loading', false); this._show('error', false);
    this.bus('entity:loading',     () => { this._show('error', false); this._show('loading', true); });
    this.bus('entity:bootstrapped', (e) => { this._show('loading', false); this._show('error', !e || e.ok === false); });
    this.on(this.$('#retry'), 'click', () => this._retry());
    this.on(this.$('#dismiss'), 'click', () => this._show('error', false));

    // Persistent warnings — push / dismiss via bus
    this.bus('platform:warning:push', (w) => this._pushWarning(w));
    this.bus('platform:warning:dismiss', (e) => this._dismissWarning(e && e.key));
  }

  _show(id, on) { const b = this.$('#' + id); if (b) b.dataset.show = on ? '1' : '0'; }

  _pushWarning(w) {
    if (!w || (!w.text && !w.key)) return;
    // De-dupe by key (if provided)
    if (w.key && this._warnings.some((x) => x.key === w.key)) return;
    this._warnings.push({ key: w.key || ('w-' + Date.now()), text: w.text || w.key,
      dismissable: w.dismissable !== false, variant: w.variant || 'warning' });
    this._renderWarnings();
  }
  _dismissWarning(key) {
    if (!key) return;
    this._warnings = this._warnings.filter((x) => x.key !== key);
    this._renderWarnings();
  }
  _renderWarnings() {
    const host = this.$('#warnings'); if (!host) return;
    host.innerHTML = '';
    this._warnings.forEach((w) => {
      const bar = document.createElement('div');
      bar.className = 'bar warning' + (w.variant === 'critical' ? ' warning--critical' : '');
      bar.dataset.show = '1';
      const icon = document.createElement('span'); icon.className = 'icon';
      icon.textContent = w.variant === 'critical' ? '⚠' : 'ℹ';
      bar.appendChild(icon);
      const span = document.createElement('span'); span.textContent = w.text; bar.appendChild(span);
      if (w.dismissable) {
        const d = document.createElement('button');
        d.type = 'button'; d.className = 'dismiss';
        d.setAttribute('aria-label', this.t('common.actions.cancel'));
        d.textContent = '✕';
        d.addEventListener('click', () => this._dismissWarning(w.key));
        bar.appendChild(d);
      }
      host.appendChild(bar);
    });
  }

  async _retry() {
    this._show('error', false); this._show('loading', true);
    try { await globalThis.Platform?.Entities?.bootstrap(true); } catch (e) { /* event drives UI */ }
    try { await globalThis.Platform?.Lookups?.load?.(true); } catch (e) { /* optional */ }
  }
}
customElements.define('pf-connectivity-banner', PfConnectivityBanner);
export { PfConnectivityBanner };
export default PfConnectivityBanner;
