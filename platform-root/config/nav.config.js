/** OBSIDIAN v4.0 — nav.config.js · group order + utility actions (single source of truth).
 *  Module nav ENTRIES come from each BaseModule's static `nav`; this file fixes group
 *  order and the header utility actions. Items are audience-filtered by nav-controller. */
// J-1 / U2 — the nav is grouped by the 6-Phase Unified Correspondence Lifecycle (CLAUDE.md §3.1),
// plus Cross-Phase utilities and System. Group ids match each module's static nav.group. Empty groups
// are filtered by nav-controller, so DISPATCH/ARCHIVE appear automatically once their modules ship.
export const NAV_GROUPS = [
  { id:'INTAKE',     labelKey:'nav.group.intake' },
  { id:'ROUTING',    labelKey:'nav.group.routing' },
  { id:'ACTION',     labelKey:'nav.group.action' },
  { id:'REVIEW',     labelKey:'nav.group.review' },
  { id:'DISPATCH',   labelKey:'nav.group.dispatch' },
  { id:'ARCHIVE',    labelKey:'nav.group.archive' },
  { id:'CrossPhase', labelKey:'nav.group.crossPhase' },
  { id:'System',     labelKey:'nav.group.system' }
];
export const UTILITY_ACTIONS = [
  { id:'palette',       labelKey:'nav.util.palette',       icon:'command',  event:'platform:palette:open',     flag:'palette' },
  { id:'notifications', labelKey:'nav.util.notifications', icon:'bell',     event:'platform:notifications:open', flag:'notifications' },
  { id:'theme',         labelKey:'nav.util.theme',         icon:'contrast', event:'platform:theme:cycle' },
  { id:'persona',       labelKey:'nav.util.persona',       icon:'users',    component:'pf-persona-switcher' }
];
export default { NAV_GROUPS, UTILITY_ACTIONS };
