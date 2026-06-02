/** OBSIDIAN v4.0 — routes.config.js · routing defaults. Per-module routes are derived
 *  from the registry (#/<moduleId>[/<param>]); this file fixes the default + fallbacks. */
export const RoutesConfig = {
  mode:'hash',                 // zero-config for any static host
  defaultRoute:'home',         // landing module id
  notFoundRoute:'diagnostics', // unknown route falls to diagnostics
  sunsetRoute:'diagnostics',   // sunset modules route here (§3.12)
  deniedRoute:'home'           // audience-denied routes redirect here
};
export default RoutesConfig;
