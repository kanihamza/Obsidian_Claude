/** OBSIDIAN v4.0 — module 'executive' (Executive · AGGREGATOR · audience:executive).
 *  DG/CEO overview: top-line KPIs, priority mix, overdue attention, and recent references —
 *  computed from Entities.counts() over the whole fabric. Cross-links into the lenses. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { breakdownBars, attentionList } from '../../shared/utils/lens.js';
import { Charts } from '../../core/charts.js';

class ExecutiveModule extends BaseModule {
  static id = 'executive'; static label = 'module.executive.title'; static icon = 'briefcase';
  static nav = { group: 'Intelligence', order: 1 }; static audience = 'executive'; static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    this._region = root.querySelector('[data-region="content"]') || root;
    const E = globalThis.Platform.Entities;
    if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    this.bus('entity:bootstrapped', () => this.paint());
    this.bus('entity:changed', () => this.paint());
    this.paint();
  }

  _kpi(labelKey, value, modId, danger) {
    const card = el('button', { class: 'pf-stat' + (danger && value ? ' pf-stat--alert' : ''), style: 'text-align:left;width:100%;cursor:pointer' }, [
      el('div', { class: 'pf-stat__label', text: this.t(labelKey) }),
      el('div', { class: 'pf-stat__value', text: String(value) })
    ]);
    if (modId) this.on(card, 'click', () => globalThis.Platform.Router.navigate(modId));
    return card;
  }

  paint() {
    const E = globalThis.Platform.Entities;
    const c = E.counts();
    clear(this._region);
    this._region.append(
      el('div', { class: 'pf-grid' }, [
        this._kpi('agg.kpi.references', c.reference || 0, 'response-tracking'),
        this._kpi('agg.kpi.openTasks', c.task || 0, 'orchestrator'),
        this._kpi('agg.kpi.pendingApprovals', c.approval || 0, 'approvals'),
        this._kpi('agg.kpi.overdue', c.overdue?.count || 0, 'orchestrator', true)
      ]),
      breakdownBars('agg.priorityMix', c.byPriority, { accent: 'var(--color-warning)' }),
      attentionList('agg.overdue', c.overdue?.items, { modId: 'orchestrator' }),
      el('div', { class: 'pf-card', style: 'padding:var(--space-5);margin-top:var(--space-5)' }, [
        el('div', { class: 'pf-overline', text: this.t('charts.activity14d') }),
        el('div', { style: 'margin-top:var(--space-3)' }, [Charts.sparkline(c.timeline, { label: this.t('charts.activity14d') })])
      ])
    );

    // Recent references — the spine's latest activity, deep-linking into response-tracking.
    const recent = c.recent || [];
    const list = el('div', { class: 'pf-card', style: 'padding:var(--space-5);margin-top:var(--space-5)' }, [
      el('div', { class: 'pf-overline', text: this.t('agg.recent') }),
      el('div', { style: 'display:flex;flex-direction:column;gap:var(--space-1);margin-top:var(--space-3)' },
        recent.length ? recent.map((r) => {
          const row = el('button', { class: 'pf-btn pf-btn--ghost', style: 'justify-content:space-between;width:100%;text-align:left' }, [
            el('span', { text: r.title || r.referenceId }),
            el('span', { class: 'pf-badge pf-badge--info', text: r.referenceId })
          ]);
          this.on(row, 'click', () => globalThis.Platform.goToEntity(r.referenceId, 'response-tracking'));
          return row;
        }) : [el('p', { class: 'pf-muted', text: this.t('agg.none') })])
    ]);
    this._region.append(list);
  }
}
Modules.register(ExecutiveModule);
export default ExecutiveModule;
