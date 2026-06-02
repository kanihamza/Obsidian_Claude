/** OBSIDIAN v4.0 — <pf-toast> · live-region toast stack driven by platform:ui:toast.
 *  Supports an optional clickable action (e.g. "View") that navigates to a deep-link hash route.
 *  DOM-built (not innerHTML for user strings) — XSS-safe for action labels and deep-links. */
import { PfBaseElement } from './_base.js';
class PfToast extends PfBaseElement {
  onConnect() {
    this.render(`<style>
      :host{ position:fixed; right:var(--space-5); bottom:var(--space-5); z-index:var(--z-toast);
        display:flex; flex-direction:column; gap:var(--space-2); max-width:min(92vw,420px); pointer-events:none; }
      .t{ pointer-events:auto; }
      .t{ display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3) var(--space-4);
        border-radius:var(--radius-md); background:var(--color-surface-raised);
        box-shadow:var(--shadow-lg); border-left:4px solid var(--color-info);
        animation:slide var(--duration-base) var(--easing-standard); }
      .t[data-variant="success"]{ border-left-color:var(--color-success); }
      .t[data-variant="danger"]{ border-left-color:var(--color-danger); }
      .t[data-variant="warning"]{ border-left-color:var(--color-warning); }
      .t__text{ flex:1; font-size:var(--size-body-sm); color:var(--color-text); min-width:0; word-break:break-word; }
      .t__action{ background:transparent; border:1px solid transparent; color:var(--color-brand-primary);
        font:inherit; font-size:var(--size-body-sm); font-weight:var(--fw-semibold); cursor:pointer;
        padding:var(--space-1) var(--space-3); border-radius:var(--radius-sm); white-space:nowrap;
        transition:all var(--duration-fast) var(--easing-standard); }
      .t__action:hover{ background:color-mix(in srgb, var(--color-brand-primary) 10%, transparent); }
      .t__action:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:2px; }
      .t__dismiss{ background:none; border:none; cursor:pointer; color:var(--color-text-muted);
        font-size:1.25rem; line-height:1; padding:0 var(--space-2); }
      .t__dismiss:hover{ color:var(--color-text); }
      .t__dismiss:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:2px; border-radius:var(--radius-sm); }
      @keyframes slide{ from{ transform:translateY(8px); opacity:0; } to{ transform:none; opacity:1; } }
      @media (prefers-reduced-motion:reduce){ .t{ animation:none; } }
    </style><div id="stack" role="status" aria-live="polite" aria-atomic="false"></div>`);
    this.bus('platform:ui:toast', (d) => this.add(d));
    this.bus('platform:ui:toast-dismiss', (d) => this.remove(d.id));
  }
  add({ id, text, variant = 'info', timeout = 5000, action = null }) {
    const stack = this.$('#stack'); if (!stack) return;
    // Cap stack: auto-dismiss the oldest when more than 3 are visible
    const visible = stack.querySelectorAll('.t');
    if (visible.length >= 3) this.remove(Number(visible[0].dataset.id));
    const root = document.createElement('div');
    root.className = 't'; root.dataset.variant = variant; root.dataset.id = id;
    const span = document.createElement('span'); span.className = 't__text'; span.textContent = text;
    root.appendChild(span);
    if (action && action.label && action.deepLink) {
      const a = document.createElement('button');
      a.type = 'button'; a.className = 't__action'; a.textContent = action.label;
      a.addEventListener('click', () => {
        const dl = action.deepLink;
        if (dl.startsWith('#')) window.location.hash = dl.slice(1);
        else if (dl.startsWith('/')) window.location.hash = dl;
        else window.location.hash = '/' + dl;
        this.remove(id);
      });
      root.appendChild(a);
    }
    const d = document.createElement('button');
    d.type = 'button'; d.className = 't__dismiss';
    d.setAttribute('aria-label', this.t('common.actions.dismiss'));
    d.innerHTML = '&times;';
    d.addEventListener('click', () => this.remove(id));
    root.appendChild(d);
    stack.appendChild(root);
    // Pause-on-hover: clear pending dismiss; re-arm on mouse-leave / focus-out
    let timer = null;
    const arm = () => { if (timeout) timer = setTimeout(() => this.remove(id), timeout); };
    const disarm = () => { if (timer) { clearTimeout(timer); timer = null; } };
    if (timeout) {
      arm();
      root.addEventListener('mouseenter', disarm); root.addEventListener('mouseleave', arm);
      root.addEventListener('focusin', disarm);    root.addEventListener('focusout', arm);
    }
  }
  remove(id) { const el = this.$(`.t[data-id="${id}"]`); if (el) el.remove(); }
}
customElements.define('pf-toast', PfToast);
export default PfToast;
