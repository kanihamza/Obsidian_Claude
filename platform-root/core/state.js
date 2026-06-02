/** OBSIDIAN v4.0 — state.js · reactive dot-path store with prefix subscriptions.
 *  modules.<id>.* (private) · shared.<domain>.* (declared in state.schema.js). */
import { Bus } from './bus.js';
import { Storage } from './storage.js';
import { StateSchema, persistedPaths } from '../config/state.schema.js';

const tree = {};
const subs = new Map(); // path-prefix -> Set<fn>

function getAt(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), tree);
}
function setAt(path, value) {
  const keys = path.split('.'); const last = keys.pop();
  let o = tree; for (const k of keys) { if (typeof o[k] !== 'object' || o[k] == null) o[k] = {}; o = o[k]; }
  o[last] = value;
}
function notify(path) {
  for (const [prefix, set] of subs) {
    if (path === prefix || path.startsWith(prefix + '.') || prefix.startsWith(path + '.')) {
      const val = getAt(prefix);
      for (const fn of [...set]) { try { fn(val, prefix); } catch (e) { (globalThis.Platform?.Log)?.error('state.sub-threw', { prefix, message: String(e) }); } }
    }
  }
}

export const State = {
  get: (path, fallback) => { const v = getAt(path); return v === undefined ? fallback : v; },
  set(path, value) {
    setAt(path, value);
    const def = StateSchema[path];
    if (def && def.persist) Storage.set(def.persist.replace(/^obsidian\./, ''), value);
    notify(path);
    Bus.emit('platform:state:changed', { path, value });
    return value;
  },
  subscribe(path, fn) {
    if (!subs.has(path)) subs.set(path, new Set());
    subs.get(path).add(fn);
    return () => subs.get(path)?.delete(fn);
  },
  /** Hydrate persisted shared paths from storage at boot, applying schema defaults. */
  hydrate() {
    for (const { path, key, def } of persistedPaths()) {
      const stored = Storage.get(key.replace(/^obsidian\./, ''), undefined);
      setAt(path, stored === undefined ? def : stored);
    }
    for (const [path, d] of Object.entries(StateSchema)) if (getAt(path) === undefined) setAt(path, d.default);
  }
};
export default State;
