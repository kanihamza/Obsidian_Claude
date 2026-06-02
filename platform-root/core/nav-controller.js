/** OBSIDIAN v4.0 — nav-controller.js · builds the audience-filtered nav model and
 *  keeps active-state + badges in sync with Router/State/Persona. <pf-app-nav> renders it. */
import { Bus } from './bus.js';
import { Modules } from './modules-registry.js';
import { Persona } from './persona-controller.js';
import { NAV_GROUPS, UTILITY_ACTIONS } from '../config/nav.config.js';
import { FeatureFlags } from '../config/feature-flags.config.js';

let activeId = null;
function build() {
  const persona = Persona.current();
  const grouped = Modules.navGroups(persona);
  const groups = NAV_GROUPS
    .map((g) => ({ id:g.id, labelKey:g.labelKey, items:(grouped[g.id] || []).map((it) => ({ ...it, active: it.id === activeId })) }))
    .filter((g) => g.items.length);
  const utils = UTILITY_ACTIONS.filter((u) => !u.flag || FeatureFlags[u.flag] === true);
  return { groups, utils, activeId };
}
function publish() { Bus.emit('platform:nav:rebuilt', build()); }
export const Nav = {
  init() {
    Bus.on('platform:nav:changed', (e) => { activeId = e.id; publish(); });
    Bus.on('platform:persona:changed', publish);
    Bus.on('platform:state:changed', (e) => { if (e.path && e.path.startsWith('shared.notifications')) publish(); });
    publish();
  },
  model: build,
  active() { return activeId; }
};
export default Nav;
