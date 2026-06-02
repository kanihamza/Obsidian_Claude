/** OBSIDIAN v4.0 — nav.config.js · group order + utility actions (single source of truth).
 *  Module nav ENTRIES come from each BaseModule's static `nav`; this file fixes group
 *  order and the header utility actions. Items are audience-filtered by nav-controller. */
export const NAV_GROUPS = [
  { id:'Operations',   labelKey:'nav.group.operations' },
  { id:'Governance',   labelKey:'nav.group.governance' },
  { id:'Intelligence', labelKey:'nav.group.intelligence' },
  { id:'Assignments',  labelKey:'nav.group.assignments' },
  { id:'System',       labelKey:'nav.group.system' }
];
export const UTILITY_ACTIONS = [
  { id:'palette',       labelKey:'nav.util.palette',       icon:'command',  event:'platform:palette:open',     flag:'palette' },
  { id:'notifications', labelKey:'nav.util.notifications', icon:'bell',     event:'platform:notifications:open', flag:'notifications' },
  { id:'theme',         labelKey:'nav.util.theme',         icon:'contrast', event:'platform:theme:cycle' },
  { id:'persona',       labelKey:'nav.util.persona',       icon:'users',    component:'pf-persona-switcher' }
];
export default { NAV_GROUPS, UTILITY_ACTIONS };
