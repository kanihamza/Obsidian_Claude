/** OBSIDIAN v4.0 — module 'fasttrack' (Operations · LENS · audience:general).
 *  FastTrack MONITORING (ported from DGO_FastTrack_Monitoring): SLA board computing age
 *  from timestamps → On-track / Due-soon / Overdue, with live counts. Distinct monitoring semantics. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { appendRichSections, skeletonTiles, skeletonTable } from '../../shared/utils/lens.js';

const DAY = 86400000;
function sla(ts) {
  if (!ts) return { key: 'unknown', cls: 'archived' };
  const age = (Date.now() - new Date(ts).getTime()) / DAY;
  if (age > 7) return { key: 'overdue', cls: 'action' };
  if (age > 3) return { key: 'dueSoon', cls: 'pending' };
  return { key: 'onTrack', cls: 'replied' };
}

class FastTrackModule extends BaseModule {
  static id = 'fasttrack';
  static label = 'module.fasttrack.title';
  static icon = 'activity';
  static nav = { group: 'Operations', order: 4 };
  static audience = 'general';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    this._region = root.querySelector('[data-region="content"]') || root;
    this._filter = null;
    const E = globalThis.Platform.Entities; if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    this.bus('entity:loading', () => this.paint());
    this.bus('entity:bootstrapped', () => this.paint());
    this.bus('entity:changed', () => this.paint());
    this.paint();
  }

  paint() {
    const E = globalThis.Platform.Entities;
    clear(this._region);
    if (!E.isHydrated()) { this._region.append(skeletonTiles(3)); this._region.append(skeletonTable(6, 5)); return; }
    const items = [...E.all('task'), ...E.all('document')].map((r) => ({ ...r, _sla: sla(r.ts) }));
    const counts = { overdue: 0, dueSoon: 0, onTrack: 0 };
    items.forEach((i) => { if (counts[i._sla.key] != null) counts[i._sla.key]++; });

    // SLA summary tiles (clickable filters)
    const tiles = el('div', { class: 'pf-grid' }, [['overdue', 'action'], ['dueSoon', 'pending'], ['onTrack', 'replied']].map(([k, cls]) => {
      const tile = el('button', { class: 'pf-stat' + (this._filter === k ? ' is-active' : ''), style: 'text-align:left;width:100%;cursor:pointer', 'aria-pressed': this._filter === k ? 'true' : 'false' }, [
        el('div', { class: 'pf-stat__label', html: `<span class="pf-badge pf-badge--${cls}">${this.t('fasttrack.' + k)}</span>` }),
        el('div', { class: 'pf-stat__value', text: String(counts[k]) })]);
      this.on(tile, 'click', () => { this._filter = this._filter === k ? null : k; this.paint(); });
      return tile;
    }));
    this._region.append(tiles);

    // master-detail: SLA-filtered table (left) + in-place detail (right). Row click SELECTS — never navigates.
    const split = el('div', { class: 'pf-list__split', style: 'margin-top:var(--space-5)' });
    const main = el('div', { class: 'pf-list__main' });
    const wrap = el('div', { class: 'pf-card pf-table-wrap' });
    const detail = el('aside', { class: 'pf-card pf-list__detail', 'aria-live': 'polite', 'aria-label': this.t('lens.detailLabel') });
    if (this._filter) main.append(el('div', { class: 'pf-toolbar', style: 'margin-bottom:var(--space-3)' },
      [el('span', { class: 'pf-overline', text: this.t('fasttrack.' + this._filter) }),
       el('button', { class: 'pf-btn pf-btn--ghost', text: this.t('fasttrack.clear'), onClick: () => { this._filter = null; this.paint(); } })]));
    main.append(wrap); split.append(main, detail); this._region.append(split);

    const rows = this._filter ? items.filter((i) => i._sla.key === this._filter) : items;
    if (!rows.length) {
      wrap.append(el('div', { class: 'pf-empty' }, [el('div', { class: 'pf-empty__title', text: this.t('common.state.empty') }), el('p', { class: 'pf-empty__hint', text: this.t('lens.emptyHint') })]));
      this._ftDetail(detail, null); return;
    }
    const head = el('thead', {}, [el('tr', {}, ['field.referenceId.label', 'field.subject.label', 'fasttrack.sla', 'field.status.label', 'field.ts.label'].map((k) => el('th', { text: this.t(k) })))]);
    const body = el('tbody', {}, rows.map((r) => {
      const tr = el('tr', { 'data-ref': r.__ref || '', tabindex: '0' }, [
        el('td', { text: r.__ref || '' }),
        el('td', { text: r.title || r.__id || '' }),
        el('td', { html: `<span class="pf-badge pf-badge--${r._sla.cls}">${this.t('fasttrack.' + r._sla.key)}</span>` }),
        el('td', { text: r.status || r.Status || '' }),
        el('td', { text: r.ts ? globalThis.Platform.Format.dateTime(r.ts) : '' })
      ]);
      const select = () => {
        [...wrap.querySelectorAll('tr[data-ref]')].forEach((x) => x.setAttribute('aria-selected', x === tr ? 'true' : 'false'));
        if (r.__ref) globalThis.Platform.Context.setActive(r.__ref, this.id);
        this._ftDetail(detail, r);
      };
      this.on(tr, 'click', select);
      this.on(tr, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
      return tr;
    }));
    wrap.append(el('table', { class: 'pf-table pf-table--selectable' }, [head, body]));
    this._ftDetail(detail, null);
  }

  _ftDetail(detail, r) {
    clear(detail);
    if (!r) { detail.append(el('div', { class: 'pf-detail__empty' }, [el('pf-icon', { name: 'activity', size: '22' }), el('p', { class: 'pf-muted', text: this.t('lens.selectHint') })])); return; }
    const ref = r.__ref || '';
    detail.append(el('div', { class: 'pf-detail__head' }, [
      el('h3', { class: 'pf-detail__title', text: r.title || r.__id || ref }),
      el('span', { html: `<span class="pf-badge pf-badge--${r._sla.cls}">${this.t('fasttrack.' + r._sla.key)}</span>` })]));
    if (ref) detail.append(el('div', { class: 'pf-detail__ref', text: ref }));
    const dl = el('dl', { class: 'pf-detail__fields' });
    const add = (k, v) => { if (v) dl.append(el('dt', { text: k }), el('dd', { text: String(v) })); };
    add(this.t('field.status.label'), r.status || r.Status);
    add(this.t('fasttrack.sla'), this.t('fasttrack.' + r._sla.key));
    add(this.t('field.ts.label'), r.ts ? globalThis.Platform.Format.dateTime(r.ts) : '');
    if (dl.children.length) detail.append(dl);
    const open = el('button', { class: 'pf-btn pf-btn--primary', html: `<pf-icon name="table" size="14"></pf-icon> ${this.t('correspondence.track')}` });
    this.on(open, 'click', () => globalThis.Platform.goToEntity(ref, 'response-tracking'));
    detail.append(el('div', { class: 'pf-detail__actions' }, [open]));
    // Inline workspace below the action.
    appendRichSections(detail, r, this, { type: 'task' });
  }
}
Modules.register(FastTrackModule);
export default FastTrackModule;
