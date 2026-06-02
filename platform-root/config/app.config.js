/** OBSIDIAN v4.0 — app.config.js · global, build-free app constants. */
export const AppConfig = {
  id: 'obsidian',
  storagePrefix: 'obsidian',
  defaultLocale: 'en',
  availableLocales: ['en'],          // additional locales are opt-in (Phase 0 default OFF)
  defaultTheme: 'system',            // 'light' | 'dark' | 'system'
  themes: ['light', 'dark', 'system', 'hc'],
  defaultDensity: 'compact',         // brand default
  densities: ['compact', 'comfortable'],
  defaultBrand: 'dgo',               // DGO-forward: sub-brand active by default
  apiTimeoutMs: 45000,
  titleKey: 'app.title',
  correlationHeader: 'X-Correlation-Id'
};
export default AppConfig;
