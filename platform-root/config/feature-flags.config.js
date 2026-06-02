/** OBSIDIAN v4.0 — feature-flags.config.js · tier selection (Phase 0 resolved). */
export const FeatureFlags = {
  // Core — mandatory, non-removable (declared for introspection only)
  core: { shell:true, router:true, state:true, api:true, theme:true, brand:true,
          persona:true, toast:true, modal:true, errorBoundary:true, keyboardNav:true,
          responsive:true, csvExport:true, print:true, diagnostics:true, i18n:true },
  // Standard — default ON
  palette:true, tour:true, idle:true, offline:true, audit:true,
  notifications:true, density:true, highContrast:true,
  // Advanced — default ON
  serviceWorker:true, pwa:true, broadcastSync:true, perfInstrumentation:true,
  // Advanced — opt-in (default OFF)
  additionalLocales:false
};
export const isEnabled = (flag) => FeatureFlags[flag] === true || (FeatureFlags.core && FeatureFlags.core[flag] === true);
export default FeatureFlags;
