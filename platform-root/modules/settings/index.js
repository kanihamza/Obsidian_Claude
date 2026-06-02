/** OBSIDIAN v4.0 — module 'settings' (System · audience:admin).
 *  Endpoint-override workspace: lists every Power Automate endpoint in the registry and lets ops
 *  override the URL at runtime (stored in localStorage; honoured by `_resolveUrl` in core/api.js).
 *  Useful for swapping sandbox/production URLs without a rebuild. Mirrors the SPA settings screen. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { Endpoints } from '../../config/endpoints.config.js';
import { el, clear } from '../../shared/utils/dom.js';

const LS_PREFIX = 'obsidian.endpoint.';
const VALID_URL = /^https?:\/\/[^\s"'<>]+$/;

class SettingsModule extends BaseModule {
  static id = 'settings';
  static label = 'module.settings.title';
  static icon = 'settings';
  static nav = { group: 'System', order: 2 };
  static audience = 'admin';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    const region = root.querySelector('[data-region="content"]') || root;
    clear(region);

    // Header: explainer + toolbar
    const explainer = el('p', { class: 'pf-muted', style: 'margin-bottom:var(--space-3)',
      text: this.t('settings.endpointsExplainer') });
    const resetAllBtn = el('button', { class: 'pf-btn pf-btn--ghost', type: 'button',
      html: `<pf-icon name="rotate-ccw" size="14"></pf-icon> ${this.t('settings.resetAll')}` });
    resetAllBtn.addEventListener('click', () => this._resetAll(region));

    const toolbar = el('div', { class: 'pf-toolbar', style: 'margin-bottom:var(--space-3);display:flex;align-items:center;justify-content:space-between' }, [
      el('span', { class: 'pf-overline', text: this.t('settings.endpoints') }),
      resetAllBtn
    ]);

    // Endpoint list
    const list = el('div', { class: 'pf-settings__list' });
    const entries = Object.entries(Endpoints || {});
    let activeOverrides = 0;
    entries.forEach(([key, ep]) => {
      if (!ep.url) return;  // skip reserved
      const overrideVal = this._getOverride(key);
      if (overrideVal) activeOverrides++;
      list.append(this._renderEndpointRow(key, ep, overrideVal));
    });

    const summary = el('div', { class: 'pf-card', style: 'padding:var(--space-3);margin-bottom:var(--space-3);background:var(--color-surface-sunken)' }, [
      el('div', { style: 'display:flex;gap:var(--space-4);font-size:var(--size-body-sm)' }, [
        el('span', { html: `<strong>${entries.filter(([_, e]) => e.url).length}</strong> ${this.t('settings.totalEndpoints')}` }),
        el('span', { html: `<strong>${activeOverrides}</strong> ${this.t('settings.activeOverrides')}` })
      ])
    ]);

    // Language switcher section
    const langSection = el('section', { class: 'pf-card', style: 'padding:var(--space-3);margin-bottom:var(--space-3);background:var(--color-surface-sunken)' });
    langSection.append(el('div', { class: 'pf-overline', style: 'margin-bottom:var(--space-2)', text: this.t('settings.language') }));
    langSection.append(el('p', { class: 'pf-muted', style: 'font-size:var(--size-body-sm);margin-bottom:var(--space-3)', text: this.t('settings.languageBlurb') }));
    const I = globalThis.Platform.I18n;
    const langs = [
      { code: 'en', label: 'English' },
      { code: 'fr', label: 'Français' },
      { code: 'ha', label: 'Hausa' }
    ];
    const langChips = el('div', { class: 'pf-chipgroup', role: 'radiogroup' });
    langs.forEach((l) => {
      const b = el('button', { type: 'button',
        class: 'pf-chip' + (I.locale() === l.code ? ' pf-chip--selected' : ''),
        text: l.label, 'data-lang': l.code });
      b.addEventListener('click', async () => {
        if (I.locale() === l.code) return;
        await I.switch(l.code);
        // Re-render this page to reflect new locale
        this.onVisible(root);
      });
      langChips.append(b);
    });
    langSection.append(langChips);
    region.append(langSection, explainer, summary, toolbar, list);
  }

  _renderEndpointRow(key, ep, currentOverride) {
    const row = el('div', { class: 'pf-settings__row pf-card', style: 'padding:var(--space-3);margin-bottom:var(--space-2)' });
    const head = el('div', { class: 'pf-settings__row-head' }, [
      el('strong', { text: key }),
      el('span', { class: 'pf-muted', text: ` · ${ep.flowName || ''}` }),
      currentOverride ? el('span', { class: 'pf-badge pf-badge--pending', text: this.t('settings.overrideActive') }) : null
    ].filter(Boolean));
    const def = el('div', { class: 'pf-settings__row-default' }, [
      el('span', { class: 'pf-overline', text: this.t('settings.defaultUrl') }),
      el('code', { class: 'pf-settings__url', text: this._truncUrl(ep.url) })
    ]);

    const inputId = `settings-${key}`;
    const input = el('input', { id: inputId, class: 'pf-input', type: 'url',
      placeholder: this.t('settings.overridePlaceholder'),
      value: currentOverride || '' });
    const errorSlot = el('p', { class: 'pf-field__error', hidden: true });

    const saveBtn = el('button', { class: 'pf-btn pf-btn--primary', type: 'button',
      text: this.t('settings.save') });
    const clearBtn = el('button', { class: 'pf-btn pf-btn--ghost', type: 'button',
      text: this.t('settings.clear'),
      disabled: currentOverride ? null : 'disabled' });

    saveBtn.addEventListener('click', () => {
      errorSlot.hidden = true;
      const v = (input.value || '').trim();
      if (!v) { this._clearOverride(key); this._refreshRow(row, key, ep); return; }
      if (!VALID_URL.test(v)) {
        errorSlot.textContent = this.t('settings.invalidUrl'); errorSlot.hidden = false;
        input.focus(); return;
      }
      this._setOverride(key, v);
      this._refreshRow(row, key, ep);
      globalThis.Platform.UI.toast({ messageKey: 'settings.saved', vars: { key }, variant: 'success' });
    });
    clearBtn.addEventListener('click', () => {
      this._clearOverride(key); input.value = '';
      this._refreshRow(row, key, ep);
      globalThis.Platform.UI.toast({ messageKey: 'settings.cleared', vars: { key }, variant: 'info' });
    });

    const controls = el('div', { class: 'pf-settings__row-controls' }, [
      el('div', { class: 'pf-field', style: 'flex:1' }, [
        el('label', { class: 'pf-label', for: inputId, text: this.t('settings.override') }),
        input, errorSlot
      ]),
      el('div', { class: 'pf-settings__row-actions' }, [saveBtn, clearBtn])
    ]);

    row.append(head, def, controls);
    return row;
  }

  _refreshRow(row, key, ep) {
    const replacement = this._renderEndpointRow(key, ep, this._getOverride(key));
    row.replaceWith(replacement);
  }

  _getOverride(key) {
    try { return (globalThis.localStorage && localStorage.getItem(LS_PREFIX + key)) || ''; }
    catch (_) { return ''; }
  }
  _setOverride(key, value) {
    try { localStorage.setItem(LS_PREFIX + key, value); }
    catch (_) { /* private browsing — silently fail */ }
  }
  _clearOverride(key) {
    try { localStorage.removeItem(LS_PREFIX + key); }
    catch (_) {}
  }

  async _resetAll(region) {
    const ok = await globalThis.Platform.UI.confirm({
      titleKey: 'settings.resetAll', summaryKey: 'settings.resetAllWarn',
      confirmKey: 'settings.resetAll', danger: true,
      details: [{ label: this.t('confirm.impact'), value: this.t('settings.resetAllImpact') }]
    });
    if (!ok) return;
    try {
      const toRemove = [];
      for (let i = 0; i < (localStorage?.length || 0); i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LS_PREFIX)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      globalThis.Platform.UI.toast({ messageKey: 'settings.resetAllDone', vars: { n: toRemove.length }, variant: 'success' });
      this.onVisible({ querySelector: () => region });
    } catch (_) {}
  }

  _truncUrl(url) {
    if (!url) return '';
    if (url.length <= 80) return url;
    // Show host + start of path + …elided sig
    const m = url.match(/^(https?:\/\/[^/]+)(\/[^?]+)/);
    return m ? `${m[1]}${m[2].slice(0, 60)}…` : url.slice(0, 80) + '…';
  }
}
Modules.register(SettingsModule);
export default SettingsModule;
