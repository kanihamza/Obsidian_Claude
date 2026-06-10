/** OBSIDIAN v4.0 — module 'response-tracking' (Governance · LENS · audience:general).
 *  Ports the NITDA hub Response-Tracking matrix: 5 bespoke sub-views (All · Docs · Emails ·
 *  Tasks · Pairs), incl. buildDocEmailPairs (doc↔email correlation by Reference). Fabric-backed. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { mountTabbedLens, renderFabricTable, buildDocEmailPairs } from '../../shared/utils/lens.js';
import { el } from '../../shared/utils/dom.js';

const E = () => globalThis.Platform.Entities;
const open = (ref, mod) => ref && globalThis.Platform.Context.setActive(ref, mod.id);

/** Export the active tab's rows as CSV (matches SPA exportRTCSV behaviour). */
function rowsForTab(tabId) {
  const e = E();
  if (tabId === 'all') return e.all('reference');
  if (tabId === 'docs') return e.all('document');
  if (tabId === 'emails') return e.all('email');
  if (tabId === 'tasks') return e.all('task');
  if (tabId === 'pairs') return buildDocEmailPairs();
  return [];
}
function colsForTab(tabId) {
  if (tabId === 'all')    return [{ key: '__ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' }, { key: 'ts', label: 'Date' }];
  if (tabId === 'docs')   return [{ key: '__ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }, { key: 'assignedTo', label: 'Assigned To' }];
  if (tabId === 'emails') return [{ key: '__ref', label: 'Reference' }, { key: 'subject', label: 'Subject' }, { key: 'sender', label: 'Sender' }, { key: 'status', label: 'Status' }];
  if (tabId === 'tasks')  return [{ key: '__ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'assignedTo', label: 'Assigned To' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }];
  if (tabId === 'pairs')  return [{ key: 'referenceId', label: 'Reference' }, { key: 'docTitle', label: 'Document' }, { key: 'emailSubject', label: 'Email' }];
  return [];
}

class ResponseTrackingModule extends BaseModule {
  static id = 'response-tracking';
  static label = 'module.response-tracking.title';
  static icon = 'table';
  static nav = { group: 'ACTION', order: 2 };
  static audience = 'general';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    const e = E(); if (!e.isHydrated()) await e.bootstrap().catch(() => {});
    mountTabbedLens(this, root, {
      toolbar: ({ active }) => [
        el('button', { class: 'pf-btn pf-btn--ghost', type: 'button',
          html: `<pf-icon name="download" size="14"></pf-icon> ${this.t('rt.exportCsv')}`,
          onClick: () => {
            const rows = rowsForTab(active);
            if (!rows.length) { globalThis.Platform.UI.toast({ messageKey: 'rt.noRowsToExport', variant: 'info' }); return; }
            const F = globalThis.Platform.Format;
            const csv = F.toCsv(rows.map((r) => Object.fromEntries(colsForTab(active).map((c) => [c.key, c.key === '__ref' ? (r.__ref || '') : (r[c.key] != null ? r[c.key] : '')]))), colsForTab(active).map((c) => ({ key: c.key, label: c.label })));
            F.downloadCsv(`response-tracking-${active}.csv`, csv);
            globalThis.Platform.UI.toast({ messageKey: 'rt.exportDone', vars: { n: rows.length, tab: active }, variant: 'success' });
          }
        })
      ],
      tabs: [
      { id: 'all', labelKey: 'rt.all', count: () => E().all('reference').length, render: (p, m) =>
        renderFabricTable(p, E().all('reference'), [
          { key: 'referenceId', labelKey: 'field.referenceId.label' }, { key: 'title', labelKey: 'field.subject.label' },
          { key: 'status', labelKey: 'field.status.label' }, { key: 'priority', labelKey: 'field.priority.label' }, { key: 'ts', labelKey: 'field.ts.label' }],
          (r) => open(r.__ref, m), { type: 'reference', detail: true, mod: m }) },
      { id: 'docs', labelKey: 'rt.docs', count: () => E().all('document').length, render: (p, m) =>
        renderFabricTable(p, E().all('document'), [
          { key: 'referenceId', labelKey: 'field.referenceId.label' }, { key: 'title', labelKey: 'field.subject.label' },
          { key: 'status', labelKey: 'field.status.label' }, { key: 'assignedTo', labelKey: 'field.assignedTo.label' }], (r) => open(r.__ref, m), { type: 'document', detail: true, mod: m, actions: [
            { labelKey: 'doc.assignBtn', icon: 'user-plus', run: (r) => globalThis.Platform.Router.navigate('single-item-ops/' + (r.__ref || r.__id || '')) },
            { labelKey: 'comments.openBtn', icon: 'message-square', run: (r) => globalThis.Platform.UI.openComments(r.__ref || r.__id || '') }
          ] }) },
      { id: 'emails', labelKey: 'rt.emails', count: () => E().all('email').length, render: (p, m) =>
        renderFabricTable(p, E().all('email'), [
          { key: 'referenceId', labelKey: 'field.referenceId.label' }, { key: 'subject', labelKey: 'field.subject.label' },
          { key: 'sender', labelKey: 'field.sender.label', get: (r) => r.sender || r.from || '' }, { key: 'status', labelKey: 'field.status.label' }], (r) => open(r.__ref, m), { type: 'email', detail: true, mod: m, actions: [
            { labelKey: 'email.createTaskBtn', icon: 'file-plus', run: (r) => globalThis.Platform.Router.navigate('single-item-ops/' + (r.__ref || r.__id || '')) },
            { labelKey: 'comments.openBtn', icon: 'message-square', run: (r) => globalThis.Platform.UI.openComments(r.__ref || r.__id || '') }
          ] }) },
      { id: 'tasks', labelKey: 'rt.tasks', count: () => E().all('task').length, render: (p, m) =>
        renderFabricTable(p, E().all('task'), [
          { key: 'referenceId', labelKey: 'field.referenceId.label' }, { key: 'title', labelKey: 'field.subject.label' },
          { key: 'assignedTo', labelKey: 'field.assignedTo.label' }, { key: 'priority', labelKey: 'field.priority.label' }, { key: 'status', labelKey: 'field.status.label' }], (r) => open(r.__ref, m), { type: 'task', detail: true, mod: m, actions: [
            { labelKey: 'task.update.openBtn', icon: 'edit', run: async (r) => { const out = await globalThis.Platform.UI.openTaskUpdate(r); if (out && out.ok) m.refresh && m.refresh(); } },
            { labelKey: 'task.openOrchestrator', icon: 'list', run: (r) => globalThis.Platform.Router.navigate('orchestrator/' + (r.__ref || '')) },
            { labelKey: 'comments.openBtn', icon: 'message-square', run: (r) => globalThis.Platform.UI.openComments(r.__ref || '') }
          ] }) },
      { id: 'pairs', labelKey: 'rt.pairs', count: () => buildDocEmailPairs().length, render: (p, m) =>
        renderFabricTable(p, buildDocEmailPairs(), [
          { key: 'referenceId', labelKey: 'field.referenceId.label' }, { key: 'doc', labelKey: 'rt.doc' },
          { key: 'email', labelKey: 'rt.email' }, { key: 'status', labelKey: 'field.status.label' }], (r) => open(r.__ref, m), { type: 'reference', detail: true, mod: m }) }
    ]});
  }
}
Modules.register(ResponseTrackingModule);
export default ResponseTrackingModule;
