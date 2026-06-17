/** OBSIDIAN v4.0 — base-module.js · mandatory base class for every module (§3.2).
 *  Subclass declares: static id,label,icon,nav,audience,status [,subbrand,sunsetDate,replacedBy]
 *  and `static base = new URL('.', import.meta.url)` so default onMount can fetch its view/styles.
 *  Provides scoped state, shared state, auto-cleaned timers/listeners, this.call(), this.t(). */
import { State } from './state.js';
import { Bus } from './bus.js';

export class BaseModule {
  static id = ''; static label = ''; static icon = ''; static nav = null;
  static audience = 'all'; static status = 'active';
  static base = null; // set by subclass: new URL('.', import.meta.url)

  constructor() { this._disposers = []; this._stylesInjected = false; this.id = this.constructor.id; }

  /* ---- default lifecycle: fetch view.html + inject styles.css once ---- */
  async onMount(root, _params) {
    const base = this.constructor.base; if (!base || !root) return;
    if (!this._stylesInjected) {
      const href = new URL('./styles.css', base).href;
      if (!document.querySelector(`link[data-module="${this.id}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = href; link.dataset.module = this.id;
        document.head.appendChild(link);
      }
      this._stylesInjected = true;
    }
    try {
      const html = await (await fetch(new URL('./view.html', base))).text();
      root.innerHTML = html;
      root.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = this.t(n.getAttribute('data-i18n')); });
    } catch (e) { (globalThis.Platform?.Log)?.error('module.view-fetch-failed', { id:this.id, message:String(e) }); }
  }
  onVisible(_root, _params) {}     // override: MUST call this.call(...) for real data
  onHidden(_root) { this._cleanup(); }
  onUnmount(_root) {}
  onParamsChange(_params) {}

  /* ---- service invocation with module-scoped error toast + log context ---- */
  async call(serviceFn, args, opts = {}) {
    const result = await serviceFn(args || {}, opts.query || {});
    if (!result.ok) {
      (globalThis.Platform?.Log)?.error('module.call-failed',
        { module:this.id, endpoint: serviceFn.endpointKey, kind: result.kind, correlationId: result.correlationId });
      if (!opts.silent && globalThis.Platform?.UI) globalThis.Platform.UI.toastError(result);
    } else {
      Bus.emit(`module:${this.id}:data-loaded`, { endpoint: serviceFn.endpointKey });
    }
    return result;
  }

  /* ---- scoped state: modules.<id>.* (auto-unsubscribed on hide) ---- */
  get state() {
    const ns = (p) => `modules.${this.id}.${p}`;
    return {
      get: (p, d) => State.get(ns(p), d),
      set: (p, v) => State.set(ns(p), v),
      subscribe: (p, fn) => { const off = State.subscribe(ns(p), fn); this._disposers.push(off); return off; }
    };
  }
  /* ---- shared cross-module state: shared.<domain>.* ---- */
  get shared() {
    return {
      get: (p, d) => State.get(`shared.${p}`, d),
      set: (p, v) => State.set(`shared.${p}`, v),
      subscribe: (p, fn) => { const off = State.subscribe(`shared.${p}`, fn); this._disposers.push(off); return off; }
    };
  }

  /* ---- auto-cleaned timers + listeners ---- */
  interval(fn, ms) { const h = setInterval(fn, ms); this._disposers.push(() => clearInterval(h)); return h; }
  timeout(fn, ms) { const h = setTimeout(fn, ms); this._disposers.push(() => clearTimeout(h)); return h; }
  on(target, event, handler, opts) { target.addEventListener(event, handler, opts);
    this._disposers.push(() => target.removeEventListener(event, handler, opts)); }
  bus(event, handler) { const off = Bus.on(event, handler); this._disposers.push(off); return off; }

  t(key, vars) { return (globalThis.Platform?.I18n?.t) ? globalThis.Platform.I18n.t(key, vars) : key; }

  _cleanup() { for (const d of this._disposers.splice(0)) { try { d(); } catch { /* ignore */ } } }
}
export default BaseModule;
