/** OBSIDIAN v4.0 — errors.js · global boundary + error normalisation. */
import { Log } from './log.js';
import { Bus } from './bus.js';

export function normalizeError(err) {
  if (err && typeof err === 'object' && 'kind' in err) return err; // already a normalized API result
  return { ok:false, kind:'client', status:0, data:null,
    errors:[{ code:'UNEXPECTED', message:String(err && err.message || err) }] };
}
export const Errors = {
  install() {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (e) => {
      Log.error('window.error', { message: e.message, src: e.filename, line: e.lineno });
      Bus.emit('platform:error', normalizeError(e.error || e.message));
    });
    window.addEventListener('unhandledrejection', (e) => {
      Log.error('window.unhandledrejection', { reason: String(e.reason) });
      Bus.emit('platform:error', normalizeError(e.reason));
    });
  },
  /** Wrap an async fn so failures normalize + log instead of throwing. */
  guard(fn, context) {
    return async (...args) => {
      try { return await fn(...args); }
      catch (e) { Log.error('guard.caught', { context, message:String(e && e.message || e) }); return normalizeError(e); }
    };
  }
};
export default Errors;
