/** OBSIDIAN v4.0 — module 'reports' (Executive · AGGREGATOR · audience:executive).
 *  KPI tiles + reference CSV table (mountAggregator) AND a formatted NITDA Management Report
 *  (Key Insights / Activity / Document & Task / Conclusion) computed from Entities.counts(), with
 *  Print + Download-HTML export — consolidating Reports_Dashboard_Live / Reports_Builder SPAs.
 *  (Outbound report email = Phase-5 Dispatch, not built here.) */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { mountAggregator } from '../../shared/utils/lens.js';
import { el } from '../../shared/utils/dom.js';
class ReportsModule extends BaseModule {
  static id = 'reports'; static label = 'module.reports.title'; static icon = 'file-text';
  static nav = { group: 'CrossPhase', order: 3 }; static audience = 'executive'; static status = 'active';
  static base = new URL('.', import.meta.url);
  async onVisible(root) {
    const E = globalThis.Platform.Entities; if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    mountAggregator(this, root, { tiles: [['reference', 'response-tracking', 'table'], ['document', 'ops-hub', 'folder'], ['task', 'orchestrator', 'workflow'], ['email', 'correspondence', 'mail'], ['approval', 'approvals', 'check-circle'], ['comment', 'comments', 'message-square']], table: { type: 'reference', csvName: 'reports.csv', columns: [{ key: 'referenceId', labelKey: 'field.referenceId.label' }, { key: 'title', labelKey: 'field.subject.label' }, { key: 'status', labelKey: 'field.status.label' }, { key: 'priority', labelKey: 'field.priority.label' }, { key: 'ts', labelKey: 'field.ts.label' }] } });
    this._mgmtReport(root);
  }
  _mgmtReport(root) {
    const P = globalThis.Platform; const c = P.Entities.counts();
    const region = root.querySelector('[data-region="content"]') || root;
    const old = region.querySelector('#reports-mgmt'); if (old) old.remove();
    const n = (v) => String(v || 0);
    const byStatus = c.byStatus || {};
    const total = (c.reference || 0) + (c.document || 0) + (c.task || 0) + (c.email || 0) + (c.approval || 0) + (c.comment || 0);
    const completed = Object.entries(byStatus).filter(([s]) => /complete|closed|approved|dispatched|archived|resolved/.test(String(s).toLowerCase())).reduce((a, [, x]) => a + x, 0);
    const pendingAppr = Object.entries(byStatus).filter(([s]) => /pending|review/.test(String(s).toLowerCase())).reduce((a, [, x]) => a + x, 0) || (c.approval || 0);
    const overdue = (c.overdue && c.overdue.count) || 0;
    const stat = (label, value) => el('div', { class: 'pf-stat' }, [el('div', { class: 'pf-stat__label', text: this.t(label) }), el('div', { class: 'pf-stat__value', text: n(value) })]);
    const section = (titleKey, body) => el('div', { style: 'margin-top:var(--space-5)' }, [el('div', { class: 'pf-overline', text: this.t(titleKey) }), body]);
    const para = (text) => el('p', { class: 'pf-muted', style: 'margin-top:var(--space-2)', text });
    const report = el('section', { id: 'reports-mgmt', class: 'pf-card', style: 'margin-top:var(--space-6);padding:var(--space-6)' }, [
      el('div', { class: 'pf-view__head', style: 'padding-bottom:var(--space-3)' }, [
        el('h2', { text: this.t('reports.mgmtTitle') }),
        el('div', { class: 'pf-toolbar' }, [
          el('button', { class: 'pf-btn pf-btn--ghost', type: 'button', id: 'rep-print', html: `<pf-icon name="printer" size="14"></pf-icon> ${this.t('reports.print')}`, onClick: () => { try { globalThis.print && globalThis.print(); } catch (_) { /* ignore */ } } }),
          el('button', { class: 'pf-btn pf-btn--ghost', type: 'button', id: 'rep-html', html: `<pf-icon name="download" size="14"></pf-icon> ${this.t('reports.downloadHtml')}`, onClick: () => { try { P.Format.downloadHtml('nitda-management-report.html', report.innerHTML); P.UI && P.UI.toast && P.UI.toast({ messageKey: 'reports.exported', variant: 'success' }); } catch (_) { /* ignore */ } } }),
          // Send the report by email — routed through the Dynamic Global Actions flow (dispatchEmail
          // contract; no dedicated endpoint). Preview+confirm+parsed feedback via Platform.Actions.run.
          el('button', { class: 'pf-btn pf-btn--primary', type: 'button', id: 'rep-email', html: `<pf-icon name="mail" size="14"></pf-icon> ${this.t('reports.sendEmail')}`, onClick: () => { if (P.Actions && P.Actions.run) P.Actions.run('dispatchEmail', { preview: { titleKey: 'reports.sendTitle', summaryKey: 'reports.sendSummary', confirmKey: 'reports.sendEmail', details: [{ label: this.t('reports.mgmtTitle'), value: this.t('reports.sendSummary') }] }, payload: { kind: 'report', email: { subject: this.t('reports.mgmtTitle'), bodyHtml: report.innerHTML } } }); } })
        ])
      ]),
      section('reports.keyInsights', el('div', { class: 'pf-grid' }, [stat('reports.totalActivities', total), stat('reports.completed', completed), stat('reports.pendingApprovals', pendingAppr), stat('reports.overdue', overdue)])),
      section('reports.activitySummary', para(this.t('reports.activityBody', { total: n(total), completed: n(completed) }))),
      section('reports.docTaskSummary', para(this.t('reports.docTaskBody', { docs: n(c.document), tasks: n(c.task), emails: n(c.email) }))),
      section('reports.conclusion', para(this.t('reports.conclusionBody', { overdue: n(overdue), pending: n(pendingAppr) })))
    ]);
    region.append(report);
  }
}
Modules.register(ReportsModule);
export default ReportsModule;
