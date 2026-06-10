/** OBSIDIAN v4.0 — boot.js · bootstrap sequence. Imported once by index.html.
 *  The shell ALWAYS renders: nothing in the critical path awaits the network. The shared
 *  entity fabric is warmed in the background (modules self-hydrate + react to entity:bootstrapped).
 *  platform:ready is emitted in a finally block so the boot loader can never hang. */
import { Platform } from './platform.js';
import { AppConfig } from '../config/app.config.js';

export async function boot({ outlet } = {}) {
  Platform.Lifecycle.mark('boot:start');
  try {
    Platform.Storage.install();
    Platform.Errors.install();
    Platform.State.hydrate();

    // Local file on the serving origin — fast; failures fall back to «key» without hanging.
    await Platform.I18n.load(Platform.State.get('shared.locale.code', AppConfig.defaultLocale));
    Platform.Format.setLocale(Platform.I18n.locale());

    Platform.Theme.init();
    Platform.Brand.init();      // DGO sub-brand active by default
    Platform.Persona.init();

    const main = outlet || document.getElementById('module-outlet') || document.querySelector('.pf-shell__main');
    Platform.Nav.init();
    Platform.Router.init(main);

    if (typeof window !== 'undefined') {
      const setOnline = () => Platform.State.set('shared.connectivity.online', navigator.onLine);
      window.addEventListener('online', setOnline);
      window.addEventListener('offline', setOnline);
      setOnline();
    }
  } catch (e) {
    Platform.Log.error('boot.failed', { message: String(e && e.message || e) });
  } finally {
    Platform.Lifecycle.mark('boot:end');
    Platform.Lifecycle.measure('boot', 'boot:start', 'boot:end');
    // ALWAYS release the boot loader, even if a step above failed.
    Platform.Bus.emit('platform:ready', { ts: new Date().toISOString() });
  }

  // Background, non-blocking: warm the shared fabric. Never blocks first paint; if the API is
  // unreachable (offline / local server / no auth) the shell still renders and shows empty states.
  Platform.Entities.bootstrap().catch((e) => Platform.Log.warn('entities.bootstrap-failed', { message: String(e && e.message || e) }));
  // U1: warm the dropdown option-sets (categories / users / departments) at boot so every picker is
  // populated without requiring a manual Refresh. Non-blocking; falls back to FETCH_ALL collections.
  Platform.Lookups?.load?.().catch((e) => Platform.Log.warn('lookups.warm-failed', { message: String(e && e.message || e) }));

  if (Platform.Flags.serviceWorker && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch((e) => Platform.Log.warn('sw.register-failed', { message: String(e) }));
  }
  return Platform;
}
if (typeof window !== 'undefined') window.__obsidianBoot = boot;
export default boot;
