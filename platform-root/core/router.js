/** OBSIDIAN v4.0 — router.js · hash router. Routes derive from the module registry
 *  (#/<id>[/<param>]); audience + lifecycle status gate every transition. */
import { Bus } from './bus.js';
import { Modules } from './modules-registry.js';
import { Persona } from './persona-controller.js';
import { RoutesConfig } from '../config/routes.config.js';
import { Lifecycle } from './lifecycle.js';

let outlet = null;
let activeId = null;
let activeInstance = null;

function parseHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  const [id, ...rest] = h.split('/');
  return { id: id || RoutesConfig.defaultRoute, params: { path: rest } };
}

async function transition() {
  const { id, params } = parseHash();
  // D-5 deprecation redirect: catch any hash navigation to a retired route (e.g. #/assignment/*) and
  // perform a clean redirect to its successor surface before any module resolution happens.
  const redirect = RoutesConfig.redirects && RoutesConfig.redirects[id];
  if (redirect && redirect !== id) {
    Bus.emit('audit:route-redirected', { from: id, to: redirect, ts: new Date().toISOString() });
    return Router.navigate(redirect, params && params.path && params.path[0]);
  }
  let M = Modules.get(id);
  // unknown route — fall back, but never loop when the fallback itself is absent
  if (!M) {
    if (id === RoutesConfig.notFoundRoute) {
      if (outlet) { outlet.id = 'module-outlet'; outlet.innerHTML =
        `<div class="pf-empty"><div class="pf-empty__title">${(globalThis.Platform?.I18n?.t)?globalThis.Platform.I18n.t('shell.empty.title'):''}</div>`+
        `<div class="pf-empty__body">${(globalThis.Platform?.I18n?.t)?globalThis.Platform.I18n.t('shell.empty.body'):''}</div></div>`; }
      Bus.emit('platform:route:changed', { id, params });
      return;
    }
    return Router.navigate(RoutesConfig.notFoundRoute);
  }
  // sunset modules redirect to the sunset route
  if (M.status === 'sunset') return Router.navigate(RoutesConfig.sunsetRoute);
  // audience gate
  if (!Persona.canSee(M.audience || 'all')) {
    Bus.emit('audit:route-denied', { id, persona: Persona.current() });
    return Router.navigate(RoutesConfig.deniedRoute);
  }
  Lifecycle.mark('route:start');
  // tear down previous
  if (activeInstance) {
    try { await activeInstance.onHidden?.(outlet); } catch { /* ignore */ }
    try { await activeInstance.onUnmount?.(outlet); } catch { /* ignore */ }
  }
  // mount next
  const instance = new M();
  activeInstance = instance; activeId = id;
  // Keep the outlet's own id stable ('module-outlet'). The module's view.html root <section> carries
  // id="module-<id>", so renaming the outlet to the same id produced two elements sharing one id
  // (duplicate-id bug). getElementById('module-<id>') still resolves to the view section; module CSS
  // scoped to #module-<id> still matches its descendants.
  if (outlet) { outlet.innerHTML = ''; outlet.id = 'module-outlet'; }
  try {
    await instance.onMount?.(outlet, params);
    await instance.onVisible?.(outlet, params);
  } catch (e) { (globalThis.Platform?.Log)?.error('router.mount-failed', { id, message:String(e) }); }
  Lifecycle.mark('route:end'); Lifecycle.measure('route', 'route:start', 'route:end');
  Bus.emit('platform:nav:changed', { id, params });
  Bus.emit('platform:route:changed', { id, params });
  if (globalThis.Platform?.A11y) globalThis.Platform.A11y.announce(id);
}

export const Router = {
  init(outletEl) {
    outlet = outletEl;
    window.addEventListener('hashchange', transition);
    Bus.on('platform:persona:changed', () => { const M = Modules.get(activeId); if (M && !Persona.canSee(M.audience||'all')) Router.navigate(RoutesConfig.deniedRoute); });
    if (!location.hash) location.hash = '#/' + RoutesConfig.defaultRoute; else transition();
  },
  navigate(id, param) { const target = '#/' + id + (param ? '/' + param : '');
    if (location.hash === target) transition(); else location.hash = target; },
  current() { return { id: activeId, instance: activeInstance }; }
};
export default Router;
