/** OBSIDIAN v4.0 — module 'assignment' (Executive · AGGREGATOR · audience:executive).
 *  Assignment Intelligence: workload-by-assignee, priority mix, and overdue attention —
 *  all computed once from Entities.counts() over the shared fabric. Never a per-row fetch. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { breakdownBars, attentionList } from '../../shared/utils/lens.js';

class AssignmentModule extends BaseModule {
  static id = 'assignment'; static label = 'module.assignment.title'; static icon = 'users';
  static nav = { group: 'ROUTING', order: 9, hidden: true }; static audience = 'executive'; static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    this._region = root.querySelector('[data-region="content"]') || root;
    const E = globalThis.Platform.Entities;
    if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    this.bus('entity:bootstrapped', () => this.paint());
    this.bus('entity:changed', () => this.paint());
    this.paint();
  }

  _kpi(labelKey, value, danger) {
    return el('div', { class: 'pf-stat' + (danger && value ? ' pf-stat--alert' : '') }, [
      el('div', { class: 'pf-stat__label', text: this.t(labelKey) }),
      el('div', { class: 'pf-stat__value', text: String(value) })
    ]);
  }

  paint() {
    const E = globalThis.Platform.Entities;
    const c = E.counts();
    clear(this._region);
    const assignees = Object.keys(c.byAssignee || {}).length;
    this._region.append(
      el('div', { class: 'pf-grid' }, [
        this._kpi('agg.kpi.openTasks', c.task || 0),
        this._kpi('agg.kpi.assignees', assignees),
        this._kpi('agg.kpi.overdue', c.overdue?.count || 0, true),
        this._kpi('agg.kpi.references', c.reference || 0)
      ]),
      breakdownBars('agg.workload', c.byAssignee, { accent: 'var(--color-brand-primary)' }),
      breakdownBars('agg.priorityMix', c.byPriority, { accent: 'var(--color-warning)' }),
      attentionList('agg.overdue', c.overdue?.items, { modId: 'orchestrator' })
    );

    // CSV export of the underlying task list (reporting parity).
    const rows = E.all('task');
    const cols = [
      { key: '__ref', label: this.t('field.referenceId.label') },
      { key: 'title', label: this.t('field.subject.label') },
      { key: 'assignedTo', label: this.t('field.assignedTo.label') },
      { key: 'priority', label: this.t('field.priority.label') },
      { key: 'status', label: this.t('field.status.label') }
    ];
    const exportBtn = el('button', { class: 'pf-btn pf-btn--ghost', style: 'margin-top:var(--space-5)', text: this.t('common.actions.export') });
    this.on(exportBtn, 'click', () => globalThis.Platform.Format.downloadCsv('assignments.csv', globalThis.Platform.Format.toCsv(rows, cols)));
    this._region.append(exportBtn);
  }
}
Modules.register(AssignmentModule);
export default AssignmentModule;
