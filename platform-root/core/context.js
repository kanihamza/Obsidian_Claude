/** OBSIDIAN v4.0 — context.js · Platform.Context · the cross-module selection focus.
 *  A Reference selected in one lens becomes the active focus every other lens observes. */
import { State } from './state.js';
import { Bus } from './bus.js';
import { ENTITY_HOME_MODULE } from '../config/entities.config.js';

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
  subscribe(fn) { return Bus.on('context:reference:changed', fn); }
};

/** Cross-module deep link: focus a Reference and route to a lens that shows it. */
export function goToEntity(refId, moduleId) {
  Context.setActive(refId);
  const target = moduleId || ENTITY_HOME_MODULE.reference;
  if (globalThis.Platform?.Router) globalThis.Platform.Router.navigate(target, refId ? String(refId) : undefined);
}
export default Context;
