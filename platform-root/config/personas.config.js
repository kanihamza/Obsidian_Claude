/** OBSIDIAN v4.0 — personas.config.js · local persona model (no auth; UX/audit only). */
export const PERSONAS = [
  { id:'admin',     labelKey:'persona.admin.label',     audienceSees:['all','admin','executive','general'] },
  { id:'executive', labelKey:'persona.executive.label', audienceSees:['all','executive','general'] },
  { id:'general',   labelKey:'persona.general.label',   audienceSees:['all','general'] }
];
export const DEFAULT_PERSONA = 'general';
export const personaById = (id) => PERSONAS.find((p) => p.id === id) || null;
export default PERSONAS;
