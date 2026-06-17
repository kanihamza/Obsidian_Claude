/** OBSIDIAN v4.0 — personas.config.js · local persona model (no auth; UX/audit only).
 *  `directorateScope` (A-8 / Section 5 defensive layer 4) declares which directorates a persona may see:
 *  'all' for the elevated DG / DG's-Office (executive) and System (admin) tiers; '' (own-directorate only)
 *  for a general officer, whose concrete directorate is resolved at runtime from their profile
 *  (Persona.directorate()). Isolation itself is enforced in core/persona-controller.js#canSeeRecord. */
export const PERSONAS = [
  { id:'admin',     labelKey:'persona.admin.label',     audienceSees:['all','admin','executive','general'], directorateScope:['all'] },
  { id:'executive', labelKey:'persona.executive.label', audienceSees:['all','executive','general'],         directorateScope:['all'] },
  { id:'general',   labelKey:'persona.general.label',   audienceSees:['all','general'],                      directorateScope:['own'] }
];
export const DEFAULT_PERSONA = 'general';
export const personaById = (id) => PERSONAS.find((p) => p.id === id) || null;
export default PERSONAS;
