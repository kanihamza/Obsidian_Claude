/** OBSIDIAN v4.0 — context.js · Platform.Context · the cross-module selection focus.
 *  A Reference selected in one lens becomes the active focus every other lens observes.
 *
 *  SLICE S0 — Context directorate seal (register A-7 / Section 5 defensive layer 5):
 *    The active directorate scope lives in a module-scoped closure variable (_directorate) — NOT a
 *    property on the Context object — so UI code cannot spoof it by assignment. `directorate()` is a
 *    read-only getter consumed by the sealed fabric's scope filter. `setDirectorate(id)` is the only
 *    mutator and is intended to be called solely by the authenticated persona-switch flow; it emits
 *    an audit event on every change so scope shifts are traceable. */
import { State } from './state.js';
import { Bus } from './bus.js';
import { ENTITY_HOME_MODULE } from '../config/entities.config.js';

// Sealed scope value — closure-private. 'all' grants DG / DG's-Office-wide visibility (default).
let _directorate = 'all';

export const Context = {
  /** Bulk selection store: refs for a bulk action handoff (e.g. ops-hub → bulk-assignment). */
  _bulk: [],
  setBulkSelection(refs) { this._bulk = Array.isArray(refs) ? refs.slice() : []; },
  getBulkSelection() { return this._bulk.slice(); },
  clearBulkSelection() { this._bulk = []; },
  activeReference() { return State.get('shared.context.activeReference', null); },
  setActive(refId, sourceModule) {
    State.set('shared.context.activeReference', refId ? String(refId) : null);
    Bus.emit('context:reference:changed', { ref: refId ? String(refId) : null, source: sourceModule || null });
    Bus.emit('reference:change', { ref: refId ? String(refId) : null, source: sourceModule || null });  // §2 event contract alias
    return refId;
  },

  /** Read-only directorate scope getter (A-7). The fabric's scope filter calls this on every read. */
  directorate() { return _directorate; },

  /** Sealed setter — internal only; call from the authenticated persona-switch flow, never from UI.
   *  Returns the active scope. Emits an audit event so every scope change is traceable (Section 5.4). */
  setDirectorate(id) {
    const next = (id == null || id === '') ? 'all' : String(id);
    if (next === _directorate) return _directorate;
    const prev = _directorate;
    _directorate = next;
    Bus.emit('context:directorate:changed', { from: prev, to: next });
    Bus.emit('audit:directorate-scope-changed', { from: prev, to: next, ts: new Date().toISOString() });
    return _directorate;
  },

  subscribe(fn) { return Bus.on('context:reference:changed', fn); }
};

/** Cross-module deep link: focus a Reference and route to a lens that shows it. */
export function goToEntity(refId, moduleId) {
  Context.setActive(refId);
  const target = moduleId || ENTITY_HOME_MODULE.reference;
  if (globalThis.Platform?.Router) globalThis.Platform.Router.navigate(target, refId ? String(refId) : undefined);
}
export default Context;
