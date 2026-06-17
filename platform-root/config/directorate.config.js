/** OBSIDIAN v4.0 — directorate.config.js · the immutable parent-child data lineage / directorate
 *  taxonomy (Directive 2, Q-6 resolution). POLICY ONLY — the authoritative directorate *data*
 *  (DSU_KEY, DSU_Email, DSU_HeadEmail, Title) is derived at runtime from the Reference_Data flow
 *  (Platform.Lookups.departments()), never hard-coded here. This file declares the isolation policy
 *  and elevation hierarchy that the sealed fabric and persona controller enforce over that live data.
 *
 *  Multi-directorate isolation (Section 5): a record whose directorate is one of ISOLATED_DIRECTORATES
 *  is strictly invisible to other entities UNLESS (a) the viewer is elevated (CEO / EAA, or the DG /
 *  DG's-Office persona tier), or (b) the record carries an explicit global cross-directorate flag, or
 *  (c) the viewer belongs to that same directorate. Enforced in core/persona-controller.js#canSeeRecord,
 *  which the fabric's visible() filter calls on every read (core/entity-store.js). */

/** Directorates whose records are isolated by default (Directive 2 names CS, AIC, FMC, ITPCU). The set
 *  is keyed by DSU_KEY (verbatim from Reference_Data); comparison is case-insensitive. Extend as further
 *  directorates are placed under isolation — no code change required elsewhere. */
export const ISOLATED_DIRECTORATES = new Set(['CS', 'AIC', 'FMC', 'ITPCU', 'ITPC']);

/** DSU_KEYs whose holders see across ALL isolation boundaries (Executive / Assistant elevation layer).
 *  Directive 2 elevates CEO and EAA; the DG's-Office assistant chain is governed by persona tier below. */
export const ELEVATED_DSU_KEYS = new Set(['CEO', 'EAA', 'DGCEO', 'ODG']);

/** Persona tiers that are elevated for isolation purposes — the DG (executive) and System (admin).
 *  A general/officer persona is scoped to its own directorate. */
export const ELEVATED_PERSONAS = new Set(['executive', 'admin']);

/** Record fields that, when truthy, grant a record global cross-directorate visibility regardless of
 *  isolation (the "explicit global cross-directorate permission flag" of Directive 2). Several spellings
 *  are tolerated because the field originates server-side. */
export const CROSS_DIRECTORATE_FLAG_KEYS = [
  'crossDirectorate', 'CrossDirectorate', 'isGlobal', 'IsGlobal', 'globalVisibility', 'GlobalVisibility',
  'GlobalVisible', 'sharedAllDirectorates', 'SharedAllDirectorates'
];

/** Shorthand → DSU_KEY aliases for the AI-assistant routing parser (Directive 5). These complement the
 *  live DSU_KEY dictionary from Reference_Data; they are NOT a substitute for it. Keys are lower-case. */
export const DSU_ALIASES = {
  cybersecurity: 'CS', cyber: 'CS', security: 'CS',
  finance: 'FMC', 'finance management': 'FMC',
  audit: 'AIC', 'internal control': 'AIC',
  'it projects clearance': 'ITPCU', 'project clearance': 'ITPCU',
  'corporate communications': 'CCMR', comms: 'CCMR', communications: 'CCMR',
  legal: 'LBMU', 'human resources': 'HRA', hr: 'HRA',
  procurement: 'PU', research: 'RD'
};

const _norm = (v) => (v == null ? '' : String(v).trim().toUpperCase());

/** Is this directorate (DSU_KEY) under isolation policy? Case-insensitive. */
export function isIsolatedDirectorate(key) {
  const k = _norm(key);
  if (!k) return false;
  for (const i of ISOLATED_DIRECTORATES) if (_norm(i) === k) return true;
  return false;
}

/** Does this DSU_KEY confer cross-isolation elevation (CEO / EAA tier)? Case-insensitive. */
export function isElevatedDsuKey(key) {
  const k = _norm(key);
  if (!k) return false;
  for (const e of ELEVATED_DSU_KEYS) if (_norm(e) === k) return true;
  return false;
}

/** Does a record carry an explicit global cross-directorate permission flag? */
export function hasCrossDirectorateFlag(rec) {
  if (!rec || typeof rec !== 'object') return false;
  for (const k of CROSS_DIRECTORATE_FLAG_KEYS) {
    const v = rec[k];
    if (v === true || v === 1 || v === '1') return true;
    if (typeof v === 'string' && /^(true|yes|y|all|global)$/i.test(v.trim())) return true;
  }
  return false;
}

export default {
  ISOLATED_DIRECTORATES, ELEVATED_DSU_KEYS, ELEVATED_PERSONAS, CROSS_DIRECTORATE_FLAG_KEYS, DSU_ALIASES,
  isIsolatedDirectorate, isElevatedDsuKey, hasCrossDirectorateFlag
};
