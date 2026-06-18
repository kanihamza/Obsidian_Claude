/** OBSIDIAN v4.0 — routes.config.js · routing defaults. Per-module routes are derived
 *  from the registry (#/<moduleId>[/<param>]); this file fixes the default + fallbacks. */
export const RoutesConfig = {
  mode:'hash',                 // zero-config for any static host
  defaultRoute:'home',         // landing module id
  notFoundRoute:'diagnostics', // unknown route falls to diagnostics
  sunsetRoute:'diagnostics',   // sunset modules route here (§3.12)
  deniedRoute:'home',          // audience-denied routes redirect here
  // D-5 deprecation pipeline (ratified): the standalone assignment module is removed; its assignment
  // workflow is absorbed by single-item-ops (single assignment) and bulk-assignment (reached via the
  // ops-hub selection flow). Per CLAUDE.md J-4, any deep-link to #/assignment/* is transparently
  // redirected to single-item-ops so old links land on the single-assignment surface and never dead-end.
  redirects:{ assignment:'single-item-ops' }
};
export default RoutesConfig;
