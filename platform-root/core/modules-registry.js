/** OBSIDIAN v4.0 — modules-registry.js · single source of truth for modules.
 *  Holds BaseModule subclasses; enforces lifecycle status + audience filtering. */
import { personaById } from '../config/personas.config.js';
const registry = new Map(); // id -> ModuleClass

export const Modules = {
  register(ModuleClass) {
    const id = ModuleClass.id;
    if (!id) { (globalThis.Platform?.Log)?.error('registry.missing-id', { name: ModuleClass.name }); return; }
    registry.set(id, ModuleClass);
    return ModuleClass;
  },
  get(id) { return registry.get(id) || null; },
  all() { return [...registry.values()]; },
  /** Modules a persona may see: audience match AND status not 'sunset'. */
  visibleFor(personaId) {
    const p = personaById(personaId); const sees = p ? p.audienceSees : ['all','general'];
    return Modules.all().filter((M) => M.status !== 'sunset' && sees.includes(M.audience || 'all'));
  },
  /** Nav-ready grouping: { group: [ {id,label,icon,order,status,badge} ] }, audience-filtered. */
  navGroups(personaId) {
    const groups = {};
    for (const M of Modules.visibleFor(personaId)) {
      if (!M.nav || M.nav.hidden) continue;
      const g = M.nav.group || 'System';
      (groups[g] = groups[g] || []).push({
        id:M.id, labelKey:M.label, icon:M.icon, order:M.nav.order ?? 99,
        status:M.status, badge:M.nav.badge || null, subbrand:M.subbrand || null
      });
    }
    for (const g of Object.keys(groups)) groups[g].sort((a, b) => a.order - b.order);
    return groups;
  },
  statuses() { return Modules.all().map((M) => ({ id:M.id, status:M.status, audience:M.audience, group:M.nav?.group })); }
};
export default Modules;
