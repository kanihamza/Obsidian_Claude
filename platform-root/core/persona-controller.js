/** OBSIDIAN v4.0 — persona-controller.js · local persona (UX + audit only, no auth).
 *  Also stores an optional user profile (fullName/email/department/jobTitle) in localStorage
 *  so the platform can stamp assignment payloads with the real user identity rather than a
 *  generic persona-derived stub. Set via UI.openProfileSetup(). */
import { State } from './state.js';
import { Bus } from './bus.js';
import { personaById, DEFAULT_PERSONA } from '../config/personas.config.js';
import { ELEVATED_PERSONAS, isIsolatedDirectorate, isElevatedDsuKey, hasCrossDirectorateFlag } from '../config/directorate.config.js';

const PROFILE_KEY = 'obsidian.profile.v1';

const _normKey = (v) => (v == null ? '' : String(v).trim().toUpperCase());

export const Persona = {
  init() { if (!State.get('shared.session.persona')) State.set('shared.session.persona', DEFAULT_PERSONA); },
  current() { return State.get('shared.session.persona', DEFAULT_PERSONA); },
  switch(id) {
    if (!personaById(id)) return Persona.current();
    State.set('shared.session.persona', id);
    Bus.emit('platform:persona:changed', { id });
    Bus.emit('audit:persona-switch', { persona:id, ts:new Date().toISOString() });
    return id;
  },
  canSee(audience) {
    const p = personaById(Persona.current()); if (!p) return audience === 'all' || audience === 'general';
    return p.audienceSees.includes(audience || 'all');
  },

  /** Read the saved user profile from localStorage. Returns null if not set. */
  profile() {
    try {
      const raw = globalThis.localStorage && localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  },
  /** Persist the user profile to localStorage and fire an event. */
  setProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (_) {}
    Bus.emit('platform:profile:changed', { profile });
    return profile;
  },
  /** Clear the saved profile (useful for testing or for explicit sign-out UX). */
  clearProfile() {
    try { localStorage.removeItem(PROFILE_KEY); } catch (_) {}
    Bus.emit('platform:profile:changed', { profile: null });
  },
  /** Convenience: return the user's email, preferring the saved profile then falling back to
   *  a persona-derived stub. Used by assignment payloads as `userEmail` / `CreatedBy`. */
  email() {
    const p = Persona.profile();
    if (p && p.email) return p.email;
    const id = Persona.current() || 'web-ops';
    return id + '@nitda.gov.ng';
  },

  // ── Multi-directorate isolation (Directive 2 / Q-6, register A-8) ───────────────────────────────
  /** The viewer's own directorate (DSU_KEY), derived from the saved profile's department/DSU field.
   *  Null when the viewer has no profiled directorate (then they see only non-isolated records). */
  directorate() {
    const p = Persona.profile() || {};
    const dsu = p.dsuKey ?? p.DSU_KEY ?? p.directorate ?? p.department ?? null;
    const v = _normKey(dsu);
    return v || null;
  },

  /** Persona-scope declaration (A-8 / Section 5 defensive layer 4): the set of directorates a persona
   *  may see. Elevated personas (DG / DG's Office = executive, System = admin) get 'all'; a general
   *  officer is scoped to their own profiled directorate (or none). */
  directorateScope() {
    if (Persona.isElevated()) return ['all'];
    const own = Persona.directorate();
    return own ? [own] : [];
  },

  /** Is the viewer elevated across isolation boundaries? True for the executive/admin persona tier
   *  (DG / DG's Office / System) OR when the profiled directorate is an elevated DSU_KEY (CEO / EAA). */
  isElevated() {
    if (ELEVATED_PERSONAS.has(Persona.current())) return true;
    return isElevatedDsuKey(Persona.directorate());
  },

  /** Sealed-fabric read gate (Section 5 defensive layer 4) — the fabric's visible() filter calls this on
   *  every read. A record in an ISOLATED directorate is strictly invisible unless the viewer is elevated
   *  (CEO/EAA or DG/DG's-Office tier), the record carries an explicit global cross-directorate flag, or
   *  the viewer belongs to that same directorate. Non-isolated and directorate-underivable records are
   *  governed by the Context directorate scope alone (handled in entity-store.visible()). */
  canSeeRecord(rec) {
    if (!rec || typeof rec !== 'object') return true;
    const dsu = rec.__directorate;
    if (!dsu) return true;                          // underivable → 'all' tier only (fabric scope filter)
    if (!isIsolatedDirectorate(dsu)) return true;   // non-isolated → directorate scope governs
    if (Persona.isElevated()) return true;          // CEO / EAA / DG / DG's Office / System
    if (hasCrossDirectorateFlag(rec)) return true;  // explicit global cross-directorate permission
    const mine = Persona.directorate();             // same-directorate officer
    return !!(mine && mine === _normKey(dsu));
  }
};
export default Persona;
