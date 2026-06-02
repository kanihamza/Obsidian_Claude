/** OBSIDIAN v4.0 — module 'correspondence' (Governance · LENS · audience:general).
 *  Parity port of Correspondence_Tracker + DGCEO Decision Hub: filterable records table
 *  (Reference·Subject·Sender·Dates·Priority·Status), CSV export, create, AI classification,
 *  and a decision detail with cross-links. Reads the shared fabric; uses shared <pf-filter-bar>. */
import { BaseModule } from '../../core/base-module.js';
import { appendRichSections } from '../../shared/utils/lens.js';
import { Modules } from '../../core/modules-registry.js';
import { aiClassify, createCorrespondence } from './service.js';
import { el, clear } from '../../shared/utils/dom.js';
import { renderForm, emptyState } from '../../shared/utils/render.js';

const STATUS_CLASS = { pending:'pending', routed:'routed', replied:'replied', acknowledged:'replied',
  'action required':'action', closed:'archived', archived:'archived', escalated:'action', draft:'draft' };

class CorrespondenceModule extends BaseModule {
  static id = 'correspondence';
  static label = 'module.correspondence.title';
  static icon = 'mail';
  static nav = { group: 'Operations', order: 2 };
  static audience = 'general';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root, params) {
    this._tableEl = root.querySelector('[data-region="table"]');
    this._detailEl = root.querySelector('[data-region="detail"]');
    const filterHost = root.querySelector('[data-region="filter"]');
    filterHost.innerHTML = '';
    this._filter = document.createElement('pf-filter-bar');
    this._filter.statuses = [
      { value: 'pending', labelKey: 'status.pending' }, { value: 'routed', labelKey: 'status.routed' },
      { value: 'replied', labelKey: 'status.replied' }, { value: 'closed', labelKey: 'status.closed' }];
    filterHost.appendChild(this._filter);
    this.on(this._filter, 'pf-filter:change', (e) => { this._q = e.detail.query; this._status = e.detail.status; this.renderTable(); });

    this.on(root.querySelector('[data-act="export"]'), 'click', () => this.exportCsv());
    this.on(root.querySelector('[data-act="new"]'), 'click', () => this.openCreate());

    const E = globalThis.Platform.Entities;
    if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    this.bus('entity:email:changed', () => this.refresh());
    this.bus('entity:reference:updated', () => this.refresh());
    this.bus('context:reference:changed', (e) => { if (e.source !== this.id) this.selectRef(e.ref); });

    this.refresh();
    const deep = params && params.path && params.path[0];
    if (deep) this.selectRef(deep);
  }

  source() {
    const E = globalThis.Platform.Entities;
    const rows = E.all('email');
    return rows.length ? rows : E.all('reference');
  }
  filtered() {
    return this.source().filter((r) => {
      const st = String(r.status || r.Status || '').toLowerCase();
      if (this._status && st !== this._status) return false;
      if (!this._q) return true;
      return [r.subject, r.sender, r.from, r.__ref, r.title, r.category].some((v) => String(v || '').toLowerCase().includes(this._q));
    });
  }
  refresh() { this._rows = this.filtered(); this.renderTable(); if (!this._selRef) this.renderDetail(null); }

  renderTable() {
    this._rows = this.filtered();
    this._filter.count = this._rows.length;
    clear(this._tableEl);
    if (!this._rows.length) { emptyState(this._tableEl, 'common.state.empty'); return; }
    const cols = ['referenceId', 'subject', 'sender', 'ts', 'priority', 'status'];
    const head = el('thead', {}, [ el('tr', {}, cols.map((c) => el('th', { text: this.t('field.' + c + '.label') }))) ]);
    const body = el('tbody', {}, this._rows.map((r) => {
      const st = String(r.status || r.Status || '');
      const tr = el('tr', { 'data-ref': r.__ref || '' }, cols.map((c) => {
        if (c === 'status') return el('td', {}, [ el('span', { class: 'pf-badge pf-badge--' + (STATUS_CLASS[st.toLowerCase()] || 'archived'), text: st }) ]);
        const v = c === 'referenceId' ? (r.__ref || '') : c === 'sender' ? (r.sender || r.from || '') : c === 'ts' ? (r.ts ? this.fmt(r.ts) : '') : (r[c] || '');
        return el('td', { text: String(v) });
      }));
      this.on(tr, 'click', () => { if (r.__ref) globalThis.Platform.Context.setActive(r.__ref, this.id); this.selectRef(r.__ref, r); });
      return tr;
    }));
    this._tableEl.append(el('table', { class: 'pf-table' }, [head, body]));
    this.markSelected();
  }
  markSelected() {
    [...this._tableEl.querySelectorAll('tr[data-ref]')].forEach((tr) =>
      tr.setAttribute('aria-selected', tr.getAttribute('data-ref') === this._selRef ? 'true' : 'false'));
  }

  selectRef(ref, rec) {
    if (!ref) return;
    this._selRef = String(ref);
    const item = rec || this.source().find((r) => r.__ref === this._selRef);
    this.markSelected();
    this.renderDetail(item);
  }

  renderDetail(it) {
    clear(this._detailEl);
    if (!it) { emptyState(this._detailEl, 'correspondence.selectHint'); return; }
    const ref = it.__ref || this._selRef || '';
    this._detailEl.append(
      el('h2', { text: it.subject || it.title || ref }),
      el('div', { class: 'meta', text: this.t('correspondence.fromMeta', { who: it.sender || it.from || '', ref }) }),
      el('p', { text: it.body || it.summary || this.t('common.state.empty') }),
      el('div', { class: 'pf-corr__links' }, [
        el('button', { html: `<pf-icon name="activity" size="14"></pf-icon> ${this.t('correspondence.aiClassify')}`, onClick: () => this.classify(it) }),
        el('button', { html: `<pf-icon name="check-circle" size="14"></pf-icon> ${this.t('entity.approval')}`, onClick: () => globalThis.Platform.goToEntity(ref, 'approvals') }),
        el('button', { html: `<pf-icon name="table" size="14"></pf-icon> ${this.t('correspondence.track')}`, onClick: () => globalThis.Platform.goToEntity(ref, 'response-tracking') }),
        el('button', { class: 'pf-btn pf-btn--primary', html: `<pf-icon name="file-plus" size="14"></pf-icon> ${this.t('email.createTaskBtn')}`, onClick: async () => { const r = await globalThis.Platform.UI.openEmailToTask(it); if (r && r.ok) this.refresh && this.refresh(); } })
      ])
    );
    // Inline workspace: comments thread, activity timeline, attachments (the old 'Comment' nav button is now redundant).
    appendRichSections(this._detailEl, it, this, { type: 'email' });
  }

  async classify(it) {
    const result = await this.call(aiClassify, { action: 'aiAnalyseEmail', emailId: it.__id, referenceId: it.__ref, subject: it.subject });
    if (result.ok) {
      const d = result.data || {};
      globalThis.Platform.Entities.upsert('email', { ...it, referenceId: it.__ref, category: d.category || it.category, priority: d.priority || it.priority, status: d.status || it.status });
      globalThis.Platform.UI.actionCompleted('correspondence.classified', { module: 'correspondence', target: it.__ref || it.referenceId || it.__id });
    }
  }

  openCreate() {
    const ev = 'correspondence:create';
    this.bus(ev, () => {});
    globalThis.Platform.UI.modal({
      titleKey: 'correspondence.new', component: null, bodyKey: null,
      actions: [{ labelKey: 'common.actions.cancel' }]
    });
    // Render the create form into the open modal body.
    const body = document.querySelector('pf-modal')?.shadowRoot?.querySelector('#m-body');
    if (body) renderForm(body, {
      fields: [
        { name: 'sender', labelKey: 'field.sender.label' },
        { name: 'subject', labelKey: 'field.subject.label' },
        { name: 'RefIDD', labelKey: 'field.referenceId.label' },
        { name: 'body', labelKey: 'correspondence.detailsLabel', type: 'textarea' },
        { name: 'priority', labelKey: 'field.priority.label', type: 'select',
          options: [{ value: 'High', labelKey: 'priority.high' }, { value: 'Medium', labelKey: 'priority.medium' }, { value: 'Low', labelKey: 'priority.low' }] }
      ],
      submitKey: 'correspondence.new',
      onSubmit: async (values) => {
        const ok = await globalThis.Platform.UI.confirm({ titleKey: 'correspondence.new', summaryKey: 'action.confirmSummary',
          details: [ { label: this.t('field.subject.label'), value: values.subject || '—' }, { label: this.t('field.sender.label'), value: values.sender || '—' }, { label: this.t('field.referenceId.label'), value: values.RefIDD || '—' } ], confirmKey: 'correspondence.new' });
        if (!ok) return;
        const result = await this.call(createCorrespondence, { action: 'emailtotaskassignment', ...values });
        if (result.ok) {
          globalThis.Platform.Entities.upsert('email', { referenceId: values.RefIDD, subject: values.subject, sender: values.sender, body: values.body, priority: values.priority, status: 'Pending', ts: new Date().toISOString() });
          globalThis.Platform.UI.closeModal();
          globalThis.Platform.UI.actionCompleted('correspondence.created', { module: 'response-tracking' });
        }
      }
    });
  }

  exportCsv() {
    const cols = [['referenceId', 'Reference'], ['subject', 'Subject'], ['sender', 'Sender'], ['ts', 'Date'], ['priority', 'Priority'], ['status', 'Status']];
    const rows = (this._rows || []).map((r) => ({ referenceId: r.__ref, subject: r.subject || r.title, sender: r.sender || r.from, ts: r.ts, priority: r.priority, status: r.status || r.Status }));
    globalThis.Platform.Format.downloadCsv('correspondence.csv', globalThis.Platform.Format.toCsv(rows, cols.map(([key, label]) => ({ key, label }))));
  }
  fmt(v) { return globalThis.Platform?.Format?.dateTime ? globalThis.Platform.Format.dateTime(v) : String(v); }
}
Modules.register(CorrespondenceModule);
export default CorrespondenceModule;
