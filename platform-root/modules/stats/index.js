/** OBSIDIAN v4.0 — module 'stats' (Executive · AGGREGATOR · audience:executive).
 *  KPI tiles + by-status bar (shared mountAggregator) + status donut and 14-day activity
 *  sparkline (core/charts.js), all from Entities.counts(). No per-row fetch. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { mountAggregator } from '../../shared/utils/lens.js';
import { Charts } from '../../core/charts.js';
import { el, clear } from '../../shared/utils/dom.js';

class StatsModule extends BaseModule {
  static id = 'stats'; static label = 'module.stats.title'; static icon = 'trending-up';
  static nav = { group: 'Intelligence', order: 2 }; static audience = 'executive'; static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    const E = globalThis.Platform.Entities;
    if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    this._root = root;
    mountAggregator(this, root, { tiles: [
      ['reference', 'response-tracking', 'table'], ['document', 'ops-hub', 'folder'],
      ['task', 'orchestrator', 'workflow'], ['email', 'correspondence', 'mail'],
      ['approval', 'approvals', 'check-circle'], ['comment', 'comments', 'message-square']
    ], table: null });
    this._charts();
    this.bus('entity:bootstrapped', () => this._charts());
    this.bus('entity:changed', () => this._charts());
  }

  _charts() {
    const region = (this._root && this._root.querySelector('[data-region="content"]')) || this._root;
    if (!region) return;
    let host = region.querySelector('#stats-charts');
    if (!host) { host = el('div', { id: 'stats-charts', class: 'pf-grid', style: 'margin-top:var(--space-6);gap:var(--space-6)' }); region.append(host); }
    clear(host);
    const c = globalThis.Platform.Entities.counts();
    const d = Charts.donut(c.byStatus, { label: this.t('charts.statusMix') });
    host.append(
      el('div', { class: 'pf-card', style: 'padding:var(--space-5)' }, [
        el('div', { class: 'pf-overline', text: this.t('charts.statusMix') }),
        el('div', { style: 'display:flex;gap:var(--space-5);align-items:center;margin-top:var(--space-3)' }, [d.svg, d.legend])
      ]),
      el('div', { class: 'pf-card', style: 'padding:var(--space-5)' }, [
        el('div', { class: 'pf-overline', text: this.t('charts.activity14d') }),
        el('div', { style: 'margin-top:var(--space-3)' }, [Charts.sparkline(c.timeline, { label: this.t('charts.activity14d') })])
      ])
    );
  }
}
Modules.register(StatsModule);
export default StatsModule;
