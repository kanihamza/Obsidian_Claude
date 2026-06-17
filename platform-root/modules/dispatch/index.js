/** OBSIDIAN v4.0 — module 'dispatch' (Phase-5 DISPATCH · LENS · audience:executive · register G-1).
 *  The outbound queue: a lens over references that have cleared REVIEW and are eligible for dispatch
 *  (approved / approved-with-edit / dispatch-pending / dispatch-in-flight / dispatch-failed) plus the
 *  recently-resolved (dispatched / no-dispatch / partial-dispatch) so the operator can close them out.
 *
 *  Selecting a row binds <pf-dispatch-panel> (G-2), which owns the mandated state machine
 *  (dispatch-pending → dispatch-in-flight → dispatched | dispatch-failed), resolves the recipient from
 *  the live directorate directory (DSU_Email | DSU_HeadEmail), and offers closure gated on
 *  Entities.canClose(ref). All status writes go through Entities.transitionStatus (C-7); dispatch itself
 *  is relayed through the Dynamic Global Actions flow (`dispatch` contract) until DISPATCH_OUTBOUND is
 *  provisioned. The queue re-renders on every reference status change so rows leave as they resolve. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { emptyState } from '../../shared/utils/render.js';

// Statuses that belong on the dispatch queue (active first, then recently-resolved-but-closeable).
const ACTIVE = new Set(['approved', 'approved-with-edit', 'dispatch-pending', 'dispatch-in-flight', 'dispatch-failed']);
const CLOSEABLE = new Set(['dispatched', 'no-dispatch', 'partial-dispatch']);

class DispatchModule extends BaseModule {
  static id = 'dispatch';
  static label = 'module.dispatch.title';
  static icon = 'send';
  static nav = { group: 'DISPATCH', order: 1 };
  static audience = 'executive';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root, params) {
    this._root = root;
    this._listEl = root.querySelector('[data-region="list"]');
    this._detailEl = root.querySelector('[data-region="detail"]');
    this._countEl = root.querySelector('[data-region="count"]');
    this._wrap = root.querySelector('.pf-dx');
    const refresh = root.querySelector('[data-act="refresh"]');
    if (refresh) this.on(refresh, 'click', () => this.refresh());

    const E = globalThis.Platform.Entities;
    if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    // Ensure the directorate directory is loaded so recipient resolution works on first paint.
    const L = globalThis.Platform.Lookups;
    if (L && typeof L.isLoaded === 'function' && !L.isLoaded()) L.load().catch(() => {});

    this.bus('entity:reference:updated', () => this.load());
    this.bus('entity:bootstrapped', () => this.load());
    this.bus('context:reference:changed', (e) => { if (e.source !== this.id) this.focusRef(e.ref); });

    this.load();
    const deep = params && params.path && params.path[0];
    if (deep) this.focusRef(deep);
  }

  /** Dispatch-eligible references, active queue first then closeable, newest first within each band. */
  queue() {
    const refs = globalThis.Platform.Entities.all('reference');
    const band = (s) => (ACTIVE.has(s) ? 0 : CLOSEABLE.has(s) ? 1 : 2);
    return refs
      .filter((r) => { const s = String(r.status || '').toLowerCase(); return ACTIVE.has(s) || CLOSEABLE.has(s); })
      .sort((a, b) => {
        const ba = band(String(a.status || '').toLowerCase()), bb = band(String(b.status || '').toLowerCase());
        if (ba !== bb) return ba - bb;
        return Date.parse(b.ts || b.createdAt || 0) - Date.parse(a.ts || a.createdAt || 0);
      });
  }

  load() {
    if (!this._listEl) return;
    this._items = this.queue();
    if (this._countEl) this._countEl.textContent = this.t('dispatch.queueCount', { n: this._items.length });
    this.renderList();
    if (this._items.length) {
      const keep = this._selRef && this._items.findIndex((x) => x.__ref === this._selRef);
      this.select(keep != null && keep >= 0 ? keep : 0);
    } else {
      emptyState(this._detailEl, 'dispatch.empty');
      if (this._wrap) this._wrap.setAttribute('data-mode', 'list');
    }
  }
  async refresh() { await globalThis.Platform.Entities.bootstrap(true); this.load(); }

  renderList() {
    clear(this._listEl);
    this._items.forEach((it, i) => {
      const status = String(it.status || '').toLowerCase();
      const card = el('button', { class: 'pf-dx__card', role: 'option', 'aria-selected': 'false' }, [
        el('div', { class: 'pf-dx__card-top' }, [
          el('span', { class: `pf-badge pf-badge--${this._badge(status)}`, text: it.status || '—' }),
          el('span', { class: 'pf-dx__ref', text: it.__ref || it.__id || '' })
        ]),
        el('div', { class: 'pf-dx__title', text: it.title || it.subject || it.__ref || it.__id || '' }),
        el('div', { class: 'pf-dx__sub', text: this.t('dispatch.cardDirectorate', { dsu: it.__directorate || '—' }) })
      ]);
      this.on(card, 'click', () => this.select(i));
      this._listEl.appendChild(card);
    });
  }

  select(i) {
    this._sel = i;
    const it = this._items[i];
    if (!it) return;
    this._selRef = it.__ref || null;
    [...this._listEl.children].forEach((c, idx) => c.setAttribute('aria-selected', idx === i ? 'true' : 'false'));
    if (this._wrap) this._wrap.setAttribute('data-mode', 'detail');
    if (it.__ref) globalThis.Platform.Context.setActive(it.__ref, this.id);
    this.renderDetail(it);
  }
  focusRef(ref) {
    if (!ref || !this._items) return;
    const i = this._items.findIndex((x) => x.__ref === String(ref));
    if (i >= 0 && i !== this._sel) this.select(i);
  }

  renderDetail(it) {
    if (!it) return emptyState(this._detailEl, 'dispatch.empty');
    clear(this._detailEl);
    const ref = it.__ref || it.__id || '';
    const head = el('div', { class: 'pf-dx__dhead' }, [
      el('div', { html: `<span class="pf-badge pf-badge--archived">${ref}</span>` }),
      el('h2', { text: it.title || it.subject || ref }),
      el('p', { class: 'pf-muted', text: this.t('dispatch.detailMeta', { status: it.status || '—', dsu: it.__directorate || '—' }) })
    ]);
    const panel = document.createElement('pf-dispatch-panel');
    panel.reference = ref;
    // When the panel drives a status change, refresh the queue so the row rebands/leaves.
    this.on(panel, 'pf-dispatch:dispatched', () => this.load());
    this.on(panel, 'pf-dispatch:closed', () => this.load());
    this.on(panel, 'pf-dispatch:failed', () => this.load());
    this._detailEl.append(head, panel);
  }

  _badge(status) {
    if (status === 'dispatched') return 'routed';
    if (status === 'dispatch-failed') return 'alert';
    if (status === 'closed') return 'archived';
    if (status === 'no-dispatch') return 'pending';
    return 'pending';
  }
}
Modules.register(DispatchModule);
export default DispatchModule;
