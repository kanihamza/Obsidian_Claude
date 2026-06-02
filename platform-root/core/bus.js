/** OBSIDIAN v4.0 — bus.js · pub/sub event hub.
 *  Namespaces: module:<id>:<verb> · platform:<system>:<verb> · audit:<verb> (§3.11). */
const listeners = new Map(); // event -> Set<fn>

export const Bus = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => Bus.off(event, handler);
  },
  once(event, handler) {
    const off = Bus.on(event, (d) => { off(); handler(d); });
    return off;
  },
  off(event, handler) { const s = listeners.get(event); if (s) s.delete(handler); },
  emit(event, detail) {
    const s = listeners.get(event);
    if (s) for (const fn of [...s]) { try { fn(detail, event); } catch (e) { reportBusError(event, e); } }
    return detail;
  }
};
function reportBusError(event, e) {
  const L = globalThis.Platform && globalThis.Platform.Log;
  if (L) L.error('bus.handler-threw', { event, message: String(e && e.message || e) });
}
export default Bus;
