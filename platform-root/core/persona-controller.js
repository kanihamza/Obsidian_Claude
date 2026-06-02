/** OBSIDIAN v4.0 — persona-controller.js · local persona (UX + audit only, no auth).
 *  Also stores an optional user profile (fullName/email/department/jobTitle) in localStorage
 *  so the platform can stamp assignment payloads with the real user identity rather than a
 *  generic persona-derived stub. Set via UI.openProfileSetup(). */
import { State } from './state.js';
import { Bus } from './bus.js';
import { personaById, DEFAULT_PERSONA } from '../config/personas.config.js';

const PROFILE_KEY = 'obsidian.profile.v1';

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
  }
};
export default Persona;
