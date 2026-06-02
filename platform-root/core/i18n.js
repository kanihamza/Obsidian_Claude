/** OBSIDIAN v4.0 — i18n.js · Platform.I18n with fallback + RTL detection.
 *  When a key is missing in the active locale, falls back to the default locale dict
 *  (loaded on first init) before showing «key» — so partial translations look polished.
 *  Tracks `dir` (ltr/rtl) per locale so the shell can apply `direction: rtl` for Arabic etc. */
import { AppConfig } from '../config/app.config.js';
import { Log } from './log.js';
import { Bus } from './bus.js';

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);
let current = AppConfig.defaultLocale;
let dict = {};
let fallbackDict = {};   // always the default locale, loaded once at init
let fallbackLoaded = false;

function resolve(d, key) { return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d); }
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

async function _fetchLocale(code) {
  const res = await fetch(`/config/i18n/${code}.json`);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

export const I18n = {
  /** Load a locale. On first call, also loads the default locale into the fallback dict
   *  (unless it's the same locale). Emits `platform:locale:changed` on success. */
  async load(locale) {
    const code = locale || current;
    try {
      const loaded = await _fetchLocale(code);
      dict = loaded; current = code;

      // Ensure the fallback dict (default locale) is loaded — done lazily on first load
      if (!fallbackLoaded && code !== AppConfig.defaultLocale) {
        try { fallbackDict = await _fetchLocale(AppConfig.defaultLocale); fallbackLoaded = true; }
        catch (e) { Log.warn('i18n.fallback-load-failed', { code: AppConfig.defaultLocale }); }
      } else if (code === AppConfig.defaultLocale) {
        fallbackDict = dict; fallbackLoaded = true;
      }

      // Apply direction to root document if in browser context
      if (globalThis.document?.documentElement) {
        const dir = RTL_LOCALES.has(code) ? 'rtl' : 'ltr';
        globalThis.document.documentElement.dir = dir;
        globalThis.document.documentElement.lang = code;
      }
      Bus.emit('platform:locale:changed', { code, dir: RTL_LOCALES.has(code) ? 'rtl' : 'ltr' });
    } catch (e) {
      Log.error('i18n.load-failed', { code, message:String(e && e.message || e) });
    }
    return current;
  },
  /** Translate a key with variable interpolation. Falls back to the default locale dict
   *  before showing «key» so partial translations remain usable. */
  t(key, vars) {
    let val = resolve(dict, key);
    if (typeof val !== 'string' && fallbackDict !== dict) {
      val = resolve(fallbackDict, key);
    }
    if (typeof val === 'string') return interpolate(val, vars);
    Log.warn('i18n.missing-key', { key, locale: current });
    return `\u00ab${key}\u00bb`;
  },
  /** True if the current locale renders right-to-left. */
  isRTL() { return RTL_LOCALES.has(current); },
  /** List of supported locales (advertised; actual file presence is what counts). */
  supported: ['en', 'fr', 'ha'],   // Hausa added; Arabic stub deliberately deferred
  /** Current locale code. */
  locale() { return current; },
  async switch(code) {
    if (!code || code === current) return current;
    try { localStorage.setItem('obsidian.locale.v1', code); } catch (_) {}
    return I18n.load(code);
  }
};

// Auto-restore previously-chosen locale on init
(function _restoreLocale() {
  try {
    const saved = globalThis.localStorage && localStorage.getItem('obsidian.locale.v1');
    if (saved) current = saved;
  } catch (_) {}
})();

export default I18n;
