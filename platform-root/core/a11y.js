/** OBSIDIAN v4.0 — a11y.js · live-region announcements + focus management. */
let liveRegion = null;
function ensureRegion() {
  if (liveRegion || typeof document === 'undefined') return liveRegion;
  liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'u-visually-hidden';
  document.body.appendChild(liveRegion);
  return liveRegion;
}
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export const A11y = {
  announce(message, assertive) {
    const r = ensureRegion(); if (!r) return;
    r.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    r.textContent = ''; requestAnimationFrame(() => { r.textContent = message; });
  },
  focusFirst(container) { const el = container && container.querySelector(FOCUSABLE); if (el) el.focus(); return el; },
  trapFocus(container) {
    const nodes = () => [...container.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const f = nodes(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container.addEventListener('keydown', onKey);
    return () => container.removeEventListener('keydown', onKey);
  },
  prefersReducedMotion() { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; }
};
export default A11y;
