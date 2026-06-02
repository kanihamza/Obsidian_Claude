/** OBSIDIAN v4.0 — storage.js · namespaced localStorage with cross-tab propagation. */
import { AppConfig } from '../config/app.config.js';
import { Bus } from './bus.js';
const PFX = AppConfig.storagePrefix + '.';
const full = (k) => (k.startsWith(PFX) ? k : PFX + k);

export const Storage = {
  get(key, fallback = null) {
    try { const raw = localStorage.getItem(full(key)); return raw == null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(full(key), JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(full(key)); } catch { /* ignore */ } },
  install() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => {
      if (!e.key || !e.key.startsWith(PFX)) return;
      let value = null; try { value = e.newValue == null ? null : JSON.parse(e.newValue); } catch { /* ignore */ }
      Bus.emit('platform:storage:changed', { key: e.key.slice(PFX.length), value });
    });
  }
};
export default Storage;
