/** OBSIDIAN v4.0 — module 'single-item-ops' (Assignments · audience:admin).
 *  Full single-task assignment screen aligned to the live SPA contract: rich pickers (category,
 *  assignee, co-assignee, CC) backed by Lookups, category cascade, chip groups (assignment type,
 *  priority, action required), inline validation, live summary card, and a canonical payload
 *  matching the SPA's singleassignment shape (action + AssignmentType + NewActivityTask + Selected
 *  + payload). Wired to the real SINGLE_ASSIGNMENT endpoint. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { Lookups } from '../../shared/utils/lookups.js';
import { assignSingle } from './service.js';
import { AI } from '../../shared/utils/ai.js';

const ASSIGNMENT_TYPES = [
  { value: 'newassignment', label: 'New Assignment' },
  { value: 'reassignment', label: 'Re-Assignment' }
];
const PRIORITIES = [
  { value: 'P1 (High)',   label: 'P1 (High)',   icon: '🔴' },
  { value: 'P2 (Medium)', label: 'P2 (Medium)', icon: '🟡' },
  { value: 'P3 (Normal)', label: 'P3 (Normal)', icon: '🟢' },
  { value: 'P4 (Low)',    label: 'P4 (Low)',    icon: '⚪' }
];
const ACTION_REQUIRED = [
  { value: '',            label: 'Not set' },
  { value: 'Review',      label: 'Review' },
  { value: 'Approval',    label: 'Approval' },
  { value: 'Information', label: 'Information' }
];

class SingleItemOpsModule extends BaseModule {
  static id = 'single-item-ops';
  static label = 'module.single-item-ops.title';
  static icon = 'file-plus';
  static nav = { group: 'ROUTING', order: 2 };
  static audience = 'admin';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root, params) {
    const P = globalThis.Platform;
    if (P?.Entities && !P.Entities.isHydrated()) await P.Entities.bootstrap();
    if (!Lookups.isLoaded()) await Lookups.load();
    this._preRef = params && params.path && params.path[0] || '';
    this._draft = this._freshDraft();
    if (this._preRef) this._draft.ref = this._preRef;
    this._render(root);
  }

  _freshDraft() {
    return {
      ref: '', title: '', sourceDoc: null,
      assignmentType: 'newassignment',
      category: '', categoryCode: '', categoryRaw: null,
      subCategory: '', subCategoryCode: '',
      assignedTo: '', assignedToTitle: '', primaryDSU: '',
      supportAssignedTo: '', supportAssignedToTitle: '', supportDSU: '',
      copyTo: [],          // array of emails (joined with ; on submit)
      priority: 'P3 (Normal)',
      actionRequired: '',
      ackDue: '', taskDue: '',
      activityTask: '',
      comments: ''
    };
  }

  _render(root) {
    const form = root.querySelector('[data-region="form"]'); if (!form) return;
    clear(form);

    // ──────── ITEM SOURCE (top section: source document + manual ref) ────────
    const docs = (globalThis.Platform?.Entities?.all('document')) || [];
    const itemSel = el('select', { id: 'si-item', class: 'pf-input', 'aria-required': 'true' },
      [el('option', { value: '', text: '— ' + this.t('module.single-item-ops.pickLabel') + ' —' }),
        ...docs.slice(0, 200).map((d) => el('option', { value: d.__ref || d.__id, text: `${(d.title || d.__id || '').slice(0, 90)} (${d.__ref || '—'})` }))]);
    const manualRef = el('input', { id: 'si-ref', class: 'pf-input', type: 'text',
      placeholder: this.t('module.single-item-ops.manualRef'), value: this._draft.ref });

    this.on(itemSel, 'change', () => {
      const v = itemSel.value;
      const doc = docs.find((d) => (d.__ref || d.__id) === v);
      this._draft.sourceDoc = doc || null;
      this._draft.ref = v || manualRef.value || '';
      this._draft.title = (doc && (doc.title || doc.Title)) || this._draft.title;
      this._clearError('si-item'); this._clearError('si-ref'); this._refreshSummary();
    });
    this.on(manualRef, 'input', () => { this._draft.ref = manualRef.value.trim(); this._clearError('si-ref'); this._clearError('si-item'); this._refreshSummary(); });

    // ──────── CATEGORY PICKER (with subcategory cascade) ────────
    const cats = Lookups.categories();
    const catPicker = this._mkPicker({
      id: 'si-category', placeholder: 'Choose a Category', placeholderIcon: '📂',
      searchable: true,
      items: cats.map((c) => ({ value: c.value, label: c.raw.Category || c.label,
        sub: c.raw.Subcategory ? `Subcategory: ${c.raw.Subcategory}` : '', raw: c.raw }))
    });
    catPicker.addEventListener('pf-picker:change', (e) => {
      const raw = e.detail.raw || {};
      this._draft.category = raw.Category || '';
      this._draft.categoryCode = raw['Category Code'] || '';
      this._draft.subCategory = raw.Subcategory || '';
      this._draft.subCategoryCode = raw['SubCategory Code'] || '';
      this._draft.categoryRaw = raw;
      this._applyCategoryCascade(raw);
      this._clearError('si-category');
      this._refreshSummary();
    });

    // ──────── ASSIGNEE PICKER (tabs: dept / user, single-select) ────────
    const assigneePicker = this._mkPicker({
      id: 'si-assignee', placeholder: 'Select Assignee', placeholderIcon: '👤',
      searchable: true,
      tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
      itemsByTab: { dept: this._deptItems(), user: this._userItems() }
    });
    assigneePicker.addEventListener('pf-picker:change', (e) => {
      const raw = e.detail.raw || {};
      // dept option carries DSU_HeadPersonalEmail / DSU_HeadEmail; user option carries email
      if (raw.DSU_KEY) {
        this._draft.assignedTo = raw.DSU_HeadEmail || raw.DSU_HeadPersonalEmail || '';
        this._draft.assignedToTitle = raw.DSU_HeadTitle || raw.Title || '';
        this._draft.primaryDSU = raw.DSU_KEY;
      } else if (raw.email) {
        this._draft.assignedTo = raw.email;
        this._draft.assignedToTitle = raw.name || raw.jobTitle || '';
        this._draft.primaryDSU = raw.department || this._draft.primaryDSU;
      }
      this._clearError('si-assignee'); this._refreshSummary();
    });

    // ──────── CO-ASSIGNEE PICKER (single, same shape) ────────
    const coassPicker = this._mkPicker({
      id: 'si-coassignee', placeholder: 'Select Co-Assignee', placeholderIcon: '👥',
      searchable: true,
      tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
      itemsByTab: { dept: this._deptItems(), user: this._userItems() }
    });
    coassPicker.addEventListener('pf-picker:change', (e) => {
      const raw = e.detail.raw || {};
      if (raw.DSU_KEY) {
        this._draft.supportAssignedTo = raw.DSU_HeadEmail || raw.DSU_HeadPersonalEmail || '';
        this._draft.supportAssignedToTitle = raw.DSU_HeadTitle || raw.Title || '';
        this._draft.supportDSU = raw.DSU_KEY;
      } else if (raw.email) {
        this._draft.supportAssignedTo = raw.email;
        this._draft.supportAssignedToTitle = raw.name || '';
        this._draft.supportDSU = raw.department || '';
      }
      this._refreshSummary();
    });

    // ──────── CC PICKER (MULTI-select, tabs same) ────────
    const ccPicker = this._mkPicker({
      id: 'si-cc', placeholder: 'Choose CC recipients', placeholderIcon: '📋',
      searchable: true, mode: 'multi',
      tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
      itemsByTab: { dept: this._deptItems(), user: this._userItems() }
    });
    ccPicker.addEventListener('pf-picker:change', (e) => {
      this._draft.copyTo = Array.isArray(e.detail.value) ? e.detail.value : [];
      this._refreshSummary();
    });

    // ──────── CHIP GROUPS (flat — assignment type / priority / action required) ────────
    const typeChips = this._mkChipGroup('si-assignmentType', ASSIGNMENT_TYPES, this._draft.assignmentType, (v) => { this._draft.assignmentType = v; this._refreshSummary(); });
    const priorityChips = this._mkChipGroup('si-priority', PRIORITIES.map((p) => ({ value: p.value, label: `${p.icon} ${p.label}` })), this._draft.priority, (v) => { this._draft.priority = v; this._refreshSummary(); });
    const actionChips = this._mkChipGroup('si-actionRequired', ACTION_REQUIRED, this._draft.actionRequired, (v) => { this._draft.actionRequired = v; this._refreshSummary(); });

    // ──────── DATES + ACTIVITY + COMMENTS ────────
    const ackDue = el('input', { id: 'si-ackDue', class: 'pf-input', type: 'date', value: this._draft.ackDue });
    const taskDue = el('input', { id: 'si-taskDue', class: 'pf-input', type: 'date', value: this._draft.taskDue });
    const activityTask = el('input', { id: 'si-activityTask', class: 'pf-input', type: 'text', value: this._draft.activityTask });
    const comments = el('textarea', { id: 'si-comments', class: 'pf-input', rows: '3', placeholder: this.t('module.single-item-ops.commentsHint') });
    this.on(ackDue, 'change', () => { this._draft.ackDue = ackDue.value; this._refreshSummary(); });
    this.on(taskDue, 'change', () => { this._draft.taskDue = taskDue.value; this._refreshSummary(); });
    this.on(activityTask, 'input', () => { this._draft.activityTask = activityTask.value; });
    this.on(comments, 'input', () => { this._draft.comments = comments.value; });

    // ──────── ASSEMBLE THE FORM (left) ────────
    const field = ({ labelKey, labelText, control, required, helpKey, id }) => {
      const wrap = el('div', { class: 'pf-field' + (required ? ' pf-field--required' : '') });
      const lbl = el('label', { class: 'pf-label', for: id || (control && control.id) }, [
        document.createTextNode(labelText || this.t(labelKey)),
        required ? el('abbr', { class: 'pf-label__req', title: this.t('field.required'), text: ' *' }) : null
      ].filter(Boolean));
      wrap.append(lbl, control);
      if (helpKey) wrap.append(el('p', { class: 'pf-field__help', text: this.t(helpKey) }));
      wrap.append(el('p', { class: 'pf-field__error', 'data-error-for': id || (control && control.id), hidden: true }));
      return wrap;
    };

    const left = el('div', { class: 'pf-si__col-form' }, [
      field({ labelKey: 'module.single-item-ops.pickLabel', control: itemSel, required: true, helpKey: 'module.single-item-ops.pickHelp', id: 'si-item' }),
      field({ labelKey: 'field.referenceId.label', control: manualRef, helpKey: 'module.single-item-ops.manualRefHelp', id: 'si-ref' }),
      field({ labelText: 'Assignment Type', control: typeChips, required: true, id: 'si-assignmentType' }),
      field({ labelText: 'Category', control: catPicker, required: true, helpKey: 'module.single-item-ops.categoryHelp', id: 'si-category' }),
      field({ labelText: 'Assignee', control: assigneePicker, required: true, helpKey: 'field.assignedTo.help', id: 'si-assignee' }),
      field({ labelText: 'Co-Assignee (optional)', control: coassPicker, id: 'si-coassignee' }),
      field({ labelText: 'CC Recipients (optional)', control: ccPicker, helpKey: 'field.copyTo.help', id: 'si-cc' }),
      field({ labelText: 'Priority', control: priorityChips, required: true, id: 'si-priority' }),
      field({ labelText: 'Action Required', control: actionChips, id: 'si-actionRequired' }),
      field({ labelKey: 'field.ackDue.label', control: ackDue, helpKey: 'field.ackDue.help', id: 'si-ackDue' }),
      field({ labelKey: 'field.taskDue.label', control: taskDue, helpKey: 'field.taskDue.help', id: 'si-taskDue' }),
      field({ labelKey: 'field.activityTask.label', control: activityTask, helpKey: 'field.activityTask.help', id: 'si-activityTask' }),
      field({ labelText: this.t('module.single-item-ops.comments'), control: comments, helpKey: 'module.single-item-ops.commentsHelp', id: 'si-comments' })
    ]);

    // ──────── SUMMARY CARD (right) — live preview of what will be submitted ────────
    const summary = el('aside', { class: 'pf-si__summary pf-card', id: 'si-summary' });
    const preview = el('button', { id: 'si-preview', class: 'pf-btn pf-btn--ghost', type: 'button',
      html: `<pf-icon name="mail" size="14"></pf-icon> ${this.t('notif.previewBtn')}` });
    preview.addEventListener('click', () => this._previewNotification());
    const submit = el('button', { id: 'si-submit', class: 'pf-btn pf-btn--primary', type: 'button',
      html: `<pf-icon name="check-circle" size="14"></pf-icon> ${this.t('module.single-item-ops.submit')}` });
    submit.addEventListener('click', () => this._submit());
    const actions = el('div', { class: 'pf-si__actions', style: 'margin-top:var(--space-4)' }, [preview, submit]);
    summary.append(this._buildSummary(), actions);

    // ──────── TWO-COLUMN GRID ────────
    const grid = el('div', { class: 'pf-si__grid' }, [left, summary]);
    form.append(grid);

    // Tools (AI + attachments) — preserved from prior implementation, augmented
    const tools = el('div', { class: 'pf-si__tools pf-card', style: 'margin-top:var(--space-5);padding:var(--space-4);display:grid;gap:var(--space-3)' });
    const aiBtn = el('button', { class: 'pf-btn pf-btn--ghost', type: 'button',
      html: `<pf-icon name="activity" size="14"></pf-icon> ${this.t('ai.analyseDoc')}` });
    const aiOut = el('pre', { class: 'pf-si__aiout' });
    const att = el('pf-attachment');
    aiBtn.addEventListener('click', async () => {
      const ref = this._draft.ref;
      if (!ref) { globalThis.Platform.UI.toast({ messageKey: 'module.single-item-ops.needRef', variant: 'danger' }); return; }
      aiBtn.disabled = true; aiBtn.textContent = this.t('common.actions.processing');
      const res = await this.call(() => AI.analyseDocument(ref));
      aiBtn.disabled = false;
      aiBtn.innerHTML = `<pf-icon name="activity" size="14"></pf-icon> ${this.t('ai.analyseDoc')}`;
      aiOut.textContent = res.ok ? (AI.summaryOf(res) || this.t('ai.noResult')) : this.t('ai.failed');
      if (att) att.emailId = ref;
    });
    tools.append(el('div', { class: 'pf-overline', text: this.t('ai.toolsTitle') }), aiBtn, aiOut, att);
    form.append(tools);

    this._refreshSummary();
  }

  // ──────── Helpers: picker / chip-group / dept-and-user item lists ────────
  _mkPicker({ id, placeholder, placeholderIcon, searchable = true, mode = 'single', tabs, items, itemsByTab }) {
    const p = document.createElement('pf-rich-picker');
    p.id = id; p.placeholder = placeholder; p.placeholderIcon = placeholderIcon;
    p.searchable = searchable; p.mode = mode;
    if (tabs) { p.tabs = tabs; p.itemsByTab = itemsByTab || {}; }
    else { p.items = items || []; }
    return p;
  }

  _mkChipGroup(id, items, currentValue, onChange) {
    const host = el('div', { id, class: 'pf-chipgroup', role: 'radiogroup' });
    items.forEach((it) => {
      const b = el('button', { type: 'button', class: 'pf-chip' + (it.value === currentValue ? ' pf-chip--selected' : ''),
        role: 'radio', 'aria-checked': it.value === currentValue ? 'true' : 'false', 'data-val': it.value, text: it.label || it.value });
      this.on(b, 'click', () => {
        [...host.querySelectorAll('.pf-chip')].forEach((c) => { c.classList.remove('pf-chip--selected'); c.setAttribute('aria-checked', 'false'); });
        b.classList.add('pf-chip--selected'); b.setAttribute('aria-checked', 'true');
        onChange(it.value);
      });
      host.append(b);
    });
    return host;
  }

  _deptItems() {
    return Lookups.departments().map((d) => ({
      value: d.raw && d.raw.DSU_KEY || d.value,
      label: d.raw && d.raw.Title || d.label,
      sub: d.raw && d.raw.DSU_HeadTitle || '',
      raw: d.raw
    }));
  }

  _userItems() {
    return Lookups.users().slice(0, 800).map((u) => ({
      value: u.value, label: u.raw && u.raw.name || u.label,
      sub: u.raw && (u.raw.jobTitle || u.raw.department) || '',
      raw: u.raw
    }));
  }

  /** Category cascade: when a category is chosen, default the assignee to the dept matching
   *  the category's 'Default Primary Responsible' DSU_KEY (mirrors the SPA cascade). */
  _applyCategoryCascade(catRaw) {
    if (!catRaw) return;
    const dsuKey = catRaw['Default Primary Responsible']; if (!dsuKey) return;
    const dept = Lookups.departments().find((d) => d.raw && d.raw.DSU_KEY === dsuKey);
    if (!dept) return;
    if (this._draft.assignedTo) return; // don't override user's pick
    this._draft.assignedTo = dept.raw.DSU_HeadEmail || dept.raw.DSU_HeadPersonalEmail || '';
    this._draft.assignedToTitle = dept.raw.DSU_HeadTitle || dept.raw.Title || '';
    this._draft.primaryDSU = dept.raw.DSU_KEY;
    // Reflect in the assignee picker UI
    const ap = document.getElementById('si-assignee');
    if (ap) {
      ap.value = this._draft.assignedTo;
      ap.selectedLabel = `👤 ${dept.raw.Title} — ${dept.raw.DSU_HeadTitle || ''}`;
    }
    globalThis.Platform.UI.toast({ messageKey: 'module.single-item-ops.cascadeApplied',
      vars: { dept: dept.raw.Title }, variant: 'info', timeout: 3000 });
  }

  // ──────── Summary card ────────
  _buildSummary() {
    return el('div', { class: 'pf-si__summary-body' }, [
      el('h3', { class: 'pf-detail__title', text: this.t('module.single-item-ops.summaryTitle') }),
      el('p', { class: 'pf-detail__ref', id: 'sum-ref', text: '—' }),
      el('dl', { class: 'pf-detail__fields', id: 'sum-fields' })
    ]);
  }
  _refreshSummary() {
    const d = this._draft;
    const refEl = document.getElementById('sum-ref'); if (refEl) refEl.textContent = d.ref || '—';
    const dl = document.getElementById('sum-fields'); if (!dl) return; clear(dl);
    const rows = [
      ['Activity', d.title || d.activityTask || '—'],
      ['Type', d.assignmentType === 'newassignment' ? 'New Assignment' : 'Re-Assignment'],
      ['Category', d.category || '—'],
      ['Sub-Category', d.subCategory || '—'],
      ['Assignee', d.assignedTo ? `${d.assignedTo} ${d.assignedToTitle ? '(' + d.assignedToTitle + ')' : ''}` : '—'],
      ['Primary DSU', d.primaryDSU || '—'],
      ['Co-Assignee', d.supportAssignedTo || '—'],
      ['CC', d.copyTo.length ? d.copyTo.join('; ') : '—'],
      ['Priority', d.priority],
      ['Action Required', d.actionRequired || '—'],
      ['Ack Due', d.ackDue || '—'],
      ['Task Due', d.taskDue || '—']
    ];
    rows.forEach(([k, v]) => dl.append(el('dt', { text: k }), el('dd', { text: String(v) })));
  }

  // ──────── Notification preview ────────
  _previewNotification() {
    const d = this._draft;
    const P = globalThis.Platform;
    P.UI.previewNotification({
      ref: d.ref, title: d.title || d.activityTask || d.ref,
      assignedTo: d.assignedTo, assignedToTitle: d.assignedToTitle,
      category: d.category, subCategory: d.subCategory,
      priority: d.priority, actionRequired: d.actionRequired,
      ackDue: d.ackDue, taskDue: d.taskDue,
      copyTo: d.copyTo, comments: d.comments,
      assignmentType: d.assignmentType,
      createdBy: (P.Persona?.email && P.Persona.email()) || 'web-ops@nitda.gov.ng'
    });
  }

  // ──────── Inline-error helpers ────────
  _showError(id, msgKey) {
    const ctrl = document.getElementById(id); if (!ctrl) return;
    ctrl.classList.add('pf-input--error'); ctrl.setAttribute('aria-invalid', 'true');
    const slot = document.querySelector(`[data-error-for="${id}"]`);
    if (slot) { slot.textContent = this.t(msgKey); slot.hidden = false; }
  }
  _clearError(id) {
    const ctrl = document.getElementById(id); if (!ctrl) return;
    ctrl.classList.remove('pf-input--error'); ctrl.removeAttribute('aria-invalid');
    const slot = document.querySelector(`[data-error-for="${id}"]`);
    if (slot) { slot.textContent = ''; slot.hidden = true; }
  }
  _clearAllErrors() { ['si-item','si-ref','si-assignmentType','si-category','si-assignee','si-priority'].forEach((id) => this._clearError(id)); }

  // ──────── Submit — canonical SPA payload + always release _busy ────────
  async _submit() {
    if (this._busy) return;
    this._busy = true;
    const P = globalThis.Platform;
    const d = this._draft;

    this._clearAllErrors();
    const errs = [];
    if (!d.ref) errs.push({ id: 'si-item', key: 'module.single-item-ops.needRef' });
    if (!d.category) errs.push({ id: 'si-category', key: 'field.required' });
    if (!d.assignedTo) errs.push({ id: 'si-assignee', key: 'module.single-item-ops.needAssignee' });
    if (!d.assignmentType) errs.push({ id: 'si-assignmentType', key: 'field.required' });
    if (!d.priority) errs.push({ id: 'si-priority', key: 'field.required' });
    if (errs.length) {
      errs.forEach((e) => this._showError(e.id, e.key));
      const first = document.getElementById(errs[0].id); if (first) first.focus();
      P.UI.toast({ messageKey: 'form.fixErrors', variant: 'danger' });
      this._busy = false; return;
    }

    const ok = await P.UI.confirm({
      titleKey: 'module.single-item-ops.title', summaryKey: 'single.confirmSummary',
      confirmKey: 'module.single-item-ops.submit',
      details: [
        { label: this.t('confirm.action'), value: 'singleassignment' },
        { label: this.t('field.referenceId.label'), value: d.ref },
        { label: 'Activity', value: d.title || d.activityTask || d.ref },
        { label: 'Assignee', value: d.assignedTo },
        { label: 'Category', value: d.category + (d.subCategory ? ' / ' + d.subCategory : '') },
        { label: 'Priority', value: d.priority },
        { label: 'CC', value: d.copyTo.length ? d.copyTo.join('; ') : '—' },
        { label: this.t('confirm.endpoint'), value: 'SINGLE_ASSIGNMENT' },
        { label: this.t('confirm.impact'), value: this.t('confirm.impactWrite') }
      ]
    });
    if (!ok) { this._busy = false; return; }

    // ──────── SPA payload — byte-for-byte the SPA submitAssignment shape (authorized 2026-06-10) ────────
    // Field set, key spellings (incl. the SPA's duplicate/misspelled `AcknolwedgementDueBy`), and the
    // nested payload.{task,selection,assignment} block all mirror the source. The SPA hard-codes every
    // due date to `tomorrow`; here the platform's own Ack/Task-Due pickers win when set, falling back to
    // `tomorrow` to stay faithful when they are blank.
    const today = new Date().toISOString().split('T')[0];
    const tDate = new Date(); tDate.setDate(tDate.getDate() + 1);
    const tomorrow = tDate.toISOString().split('T')[0];
    const ackDue = d.ackDue || tomorrow;
    const taskDue = d.taskDue || tomorrow;
    const userEmail = (P.Persona?.email && P.Persona.email()) || `${(P.Persona?.current && P.Persona.current()) || 'web-ops'}@nitda.gov.ng`;
    const nav = globalThis.navigator || {};
    const doc = d.sourceDoc || {};
    const docId = doc.__id || d.ref;
    const docTitle = doc.title || doc.Title || d.title || d.activityTask || d.ref;
    const docDesc = doc.description || doc.Description || '';
    const docAttach = doc.attachmentLink || doc.AttachmentLink || '';
    // SPA refId pattern: YYYYMMDD-<docId>-<catCode>-<subCatCode>-  (server appends the new task id).
    const refId = `${today.replace(/-/g, '')}-${docId}-${d.categoryCode}-${d.subCategoryCode}-`;
    const copyTo = d.copyTo.join(';');
    const timeline = 'N/A';
    const payload = {
      action: 'singleassignment',
      operation: 'create',
      mode: 'single',
      source: 'DGO_FAST_Track_WEB_OPS',
      userEmail,
      method: 'POST',
      device: { id: 'standalone-html', platform: nav.platform || '', ua: nav.userAgent || '' },
      AssignmentType: d.assignmentType,
      NewActivityTask: {
        StartDate: today,
        ActivityID: docId,
        Title: docTitle,
        Description: docDesc,
        Status: 'New',
        Category: d.category,
        CategoryCode: d.categoryCode,
        SubCategory: d.subCategory,
        SubCategoryCode: d.subCategoryCode,
        PrimaryDSU: d.primaryDSU,
        AssignedTo: d.assignedTo,
        AssignedToTitle: d.assignedToTitle,
        AssignedDSU: d.primaryDSU,
        supportingAssignedTo: d.supportAssignedTo,
        SupportAssignedTo: d.supportAssignedTo,
        SupportAssignedToTitle: d.supportAssignedToTitle,
        SupportDSU: d.supportDSU,
        SupportDSUKey: d.supportDSU,
        AckDue: ackDue,
        AcknowledgementDueBy: ackDue,
        AcknolwedgementDueBy: ackDue,
        TaskDue: taskDue,
        TaskDueDate: taskDue,
        Timeline: timeline,
        CopyTo: copyTo,
        Priority: d.priority,
        PreReferenceID: refId,
        Categorization: d.category + '-' + d.subCategory,
        AttachmentLink: docAttach,
        Comments: d.comments,
        ActionRequired: d.actionRequired || '',
        CreatedBy: userEmail
      },
      Selected: { ID: docId, RefIDD: String(docId), Title: docTitle },
      payload: {
        task: {
          StartDate: today,
          ActivityID: docId,
          Title: docTitle,
          Category: d.category,
          CategoryCode: d.categoryCode,
          SubCategory: d.subCategory,
          SubCategoryCode: d.subCategoryCode,
          AssignedTo: d.assignedTo,
          AssignedToTitle: d.assignedToTitle,
          AssignedDSU: d.primaryDSU,
          PrimaryDSU: d.primaryDSU,
          supportingAssignedTo: d.supportAssignedTo,
          SupportDSU: d.supportDSU,
          Priority: d.priority,
          AcknowledgementDueBy: ackDue,
          TaskDueDate: taskDue,
          CopyTo: copyTo,
          PreReferenceID: refId,
          Comments: d.comments,
          ActionRequired: d.actionRequired || '',
          CreatedBy: userEmail
        },
        selection: { single: { ID: docId, RefIDD: String(docId), Title: docTitle }, items: [] },
        assignment: { type: d.assignmentType }
      }
    };

    const btn = document.getElementById('si-submit');
    if (btn) { btn.disabled = true; btn.textContent = this.t('common.actions.processing'); }
    const res = await this.call(assignSingle, payload);
    if (btn) { btn.disabled = false; btn.innerHTML = `<pf-icon name="check-circle" size="14"></pf-icon> ${this.t('module.single-item-ops.submit')}`; }
    if (!res.ok) { this._busy = false; return; }

    // Local upsert so the UI immediately reflects the new task
    const dRes = res.data || {};
    P.Entities.upsert('task', {
      id: dRes.createdTaskId || undefined, referenceId: d.ref,
      title: d.title || d.activityTask || d.ref,
      assignedTo: d.assignedTo, priority: d.priority,
      status: dRes.status || 'Assigned',
      assignmentType: d.assignmentType,
      taskDue: d.taskDue, ackDue: d.ackDue,
      category: d.category, subCategory: d.subCategory,
      ts: new Date().toISOString()
    });
    const region = document.getElementById('module-single-item-ops')?.querySelector('[data-region="result"]');
    if (region) { clear(region); region.append(el('div', { class: 'pf-si__result pf-card' }, [
      el('span', { class: 'pf-badge pf-badge--ok', text: '✓' }),
      el('span', { text: this.t('module.single-item-ops.resultSummary', { ref: d.ref, who: d.assignedTo }) })
    ])); }
    P.UI.actionCompleted('single.success', { module: 'response-tracking', target: d.ref });
    this._busy = false;
  }
}
Modules.register(SingleItemOpsModule);
export default SingleItemOpsModule;
