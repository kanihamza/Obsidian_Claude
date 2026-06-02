/** OBSIDIAN v4.0 — lifecycle.js · perf marks + app-level teardown coordinator. */
import { FeatureFlags } from '../config/feature-flags.config.js';
const teardowns = new Set();
const perf = (typeof performance !== 'undefined') ? performance : null;
export const Lifecycle = {
  mark(name) { if (FeatureFlags.perfInstrumentation && perf?.mark) perf.mark(name); },
  measure(name, start, end) {
    if (!FeatureFlags.perfInstrumentation || !perf?.measure) return null;
    try { perf.measure(name, start, end); const m = perf.getEntriesByName(name).pop(); return m ? m.duration : null; }
    catch { return null; }
  },
  registerTeardown(fn) { teardowns.add(fn); return () => teardowns.delete(fn); },
  runTeardown() { for (const fn of [...teardowns]) { try { fn(); } catch { /* ignore */ } } teardowns.clear(); }
};
export default Lifecycle;
