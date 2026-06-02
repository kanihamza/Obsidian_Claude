/** OBSIDIAN v4.0 — module 'bulk-assignment' (Administration · ACTION LENS · audience:admin).
 *  Purpose-built bulk task-assignment lens wired to the REAL canonical contract
 *  (Endpoints.BULK_ASSIGNMENT · family F3 · trigger fields SelectedItems/AssignmentType/payload).
 *
 *  Flow: pick items from the shared fabric (Entities.documents) → fill assignment params from
 *  Lookups (users/categories/departments) → MANDATORY preview/confirm → BULK_ASSIGNMENT →
 *  reflect F3 result (counts + failed[]) and upsert created tasks so every lens updates.
 *  No write occurs without explicit confirmation (execution-safety contract). */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { Lookups } from '../../shared/utils/lookups.js';
import { submitBulkAssignment } from './service.js';
import { PfOtpModal } from '../../shared/components/pf-otp-modal.js';

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

class BulkAssignmentModule extends BaseModule {
  static id = 'bulk-assignment';
  static label = 'module.bulk-assignment.title';
  static icon = 'layers';
  static nav = { group: 'Assignments', order: 2 };
  static audience = 'admin';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    const P = globalThis.Platform;
    this._selected = new Set();
    this._filter = '';
    // Ensure the shared fabric + option sets are ready (both are idempotent / cached).
    if (P?.Entities && !P.Entities.isHydrated()) await P.Entities.bootstrap();
    await Lookups.load();
    // Pre-fill selection from any hand-off (e.g. ops-hub.bulkAssign)
    const handoff = P?.Context?.getBulkSelection ? P.Context.getBulkSelection() : [];
    if (Array.isArray(handoff) && handoff.length) {
      handoff.forEach((r) => this._selected.add(r));
      P.Context.clearBulkSelection();
      P.UI?.toast?.({ messageKey: 'opshub.bulkHandoff', vars: { n: handoff.length }, variant: 'info' });
    }
    this._render(root);
    // Refresh the item picker whenever the fabric changes (e.g. another lens upserts).
    this.bus('entity:bootstrapped', () => this._renderPicker());
    this.bus('entity:changed', () => this._renderPicker());
  }

  _docs() {
    const P = globalThis.Platform;
    const rows = (P?.Entities?.all('document')) || [];
    const q = this._filter.trim().toLowerCase();
    return q ? rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q))) : rows;
  }

  _render(root) {
    const picker = root.querySelector('[data-region="picker"]');
    const form = root.querySelector('[data-region="form"]');
    if (!picker || !form) return;
    this._renderStepper();
    this._renderPicker();
    this._renderForm(form);
  }

  /** Three-step visual progress indicator (Select → Details → Confirm). Reflects state
   *  derived from _selected.size and _busy so the user always sees where they are. */
  _renderStepper() {
    const root = document.getElementById('module-bulk-assignment');
    const host = root && root.querySelector('[data-region="stepper"]');
    if (!host) return;
    clear(host);
    const selN = this._selected.size, busy = !!this._busy;
    const steps = [
      { id: 1, key: 'step1', sub: this.t('module.bulk-assignment.step1Sub', { n: selN }),
        state: selN === 0 ? 'current' : 'done' },
      { id: 2, key: 'step2', sub: this.t('module.bulk-assignment.step2Sub'),
        state: selN === 0 ? 'pending' : (busy ? 'done' : 'current') },
      { id: 3, key: 'step3', sub: this.t('module.bulk-assignment.step3Sub'),
        state: busy ? 'current' : 'pending' }
    ];
    const ol = el('ol', { class: 'pf-stepper', 'aria-label': this.t('module.bulk-assignment.stepperAria') },
      steps.map((s) => el('li', { class: `pf-stepper__step pf-stepper__step--${s.state}`,
        'aria-current': s.state === 'current' ? 'step' : null }, [
          el('div', { class: 'pf-stepper__marker', text: s.state === 'done' ? '✓' : String(s.id), 'aria-hidden': 'true' }),
          el('div', { class: 'pf-stepper__body' }, [
            el('div', { class: 'pf-stepper__label', text: this.t('module.bulk-assignment.' + s.key) }),
            el('div', { class: 'pf-stepper__sub', text: s.sub })
          ])
        ])));
    host.append(ol);
  }

  _renderPicker() {
    const root = document.getElementById('module-bulk-assignment');
    const picker = root && root.querySelector('[data-region="picker"]');
    if (!picker) return;
    clear(picker);
    const rows = this._docs();
    const filter = el('input', {
      class: 'pf-input', type: 'search', value: this._filter,
      placeholder: this.t('module.bulk-assignment.filterPlaceholder'),
      'aria-label': this.t('module.bulk-assignment.filterPlaceholder')
    });
    filter.addEventListener('input', (e) => { this._filter = e.target.value; this._renderPicker(); });

    const allOn = rows.length > 0 && rows.every((r) => this._selected.has(r.__ref || r.__id));
    const selectAll = el('label', { class: 'pf-bulk__selectall' }, [
      el('input', { type: 'checkbox', ...(allOn ? { checked: 'checked' } : {}) }),
      el('span', { text: this.t('module.bulk-assignment.selectAll') })
    ]);
    selectAll.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) rows.forEach((r) => this._selected.add(r.__ref || r.__id));
      else this._selected.clear();
      this._renderPicker(); this._syncCount();
    });

    const list = el('div', { class: 'pf-bulk__list', role: 'listbox', 'aria-multiselectable': 'true' });
    if (!rows.length) {
      list.append(el('p', { class: 'pf-muted', text: this.t('module.bulk-assignment.empty') }));
    } else {
      rows.forEach((r) => {
        const key = r.__ref || r.__id;
        const on = this._selected.has(key);
        const item = el('label', { class: 'pf-bulk__item' + (on ? ' is-selected' : '') }, [
          el('input', { type: 'checkbox', ...(on ? { checked: 'checked' } : {}) }),
          el('span', { class: 'pf-bulk__item-title', text: r.title || r.subject || key }),
          el('span', { class: 'pf-badge pf-badge--info', text: r.__ref || '—' })
        ]);
        item.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) { this._selected.add(key); if (r.__ref && globalThis.Platform?.Context) globalThis.Platform.Context.setActive(r.__ref, this.id); }
          else this._selected.delete(key);
          item.classList.toggle('is-selected', e.target.checked); this._syncCount();
        });
        list.append(item);
      });
    }
    picker.append(filter, selectAll, list);
    this._syncCount();
  }

  _syncCount() {
    const n = document.getElementById('bulk-selected-count');
    if (n) n.textContent = this.t('module.bulk-assignment.selected', { n: this._selected.size });
    this._renderStepper();
    const btn = document.getElementById('bulk-submit');
    if (btn) btn.disabled = this._selected.size === 0;
  }

  _renderForm(form) {
    clear(form);
    this._draft = this._draft || this._freshDraft();

    // ──────── RICH PICKERS (matching SPA UX): category, assignee, co-assignee, CC ────────
    const cats = Lookups.categories();
    const catPicker = this._mkPicker({
      id: 'bulk-category', placeholder: 'Choose a Category', placeholderIcon: '📂', searchable: true,
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
    });

    const assigneePicker = this._mkPicker({
      id: 'bulk-assignee', placeholder: 'Select Assignee', placeholderIcon: '👤', searchable: true,
      tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
      itemsByTab: { dept: this._deptItems(), user: this._userItems() }
    });
    assigneePicker.addEventListener('pf-picker:change', (e) => {
      const raw = e.detail.raw || {};
      if (raw.DSU_KEY) {
        this._draft.assignedTo = raw.DSU_HeadEmail || raw.DSU_HeadPersonalEmail || '';
        this._draft.assignedToTitle = raw.DSU_HeadTitle || raw.Title || '';
        this._draft.primaryDSU = raw.DSU_KEY;
      } else if (raw.email) {
        this._draft.assignedTo = raw.email;
        this._draft.assignedToTitle = raw.name || '';
        this._draft.primaryDSU = raw.department || this._draft.primaryDSU;
      }
    });

    const coassPicker = this._mkPicker({
      id: 'bulk-coassignee', placeholder: 'Select Co-Assignee', placeholderIcon: '👥', searchable: true,
      tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
      itemsByTab: { dept: this._deptItems(), user: this._userItems() }
    });
    coassPicker.addEventListener('pf-picker:change', (e) => {
      const raw = e.detail.raw || {};
      if (raw.DSU_KEY) { this._draft.supportAssignedTo = raw.DSU_HeadEmail || raw.DSU_HeadPersonalEmail || ''; this._draft.supportDSU = raw.DSU_KEY; }
      else if (raw.email) { this._draft.supportAssignedTo = raw.email; }
    });

    const ccPicker = this._mkPicker({
      id: 'bulk-cc', placeholder: 'Choose CC recipients', placeholderIcon: '📋', searchable: true, mode: 'multi',
      tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
      itemsByTab: { dept: this._deptItems(), user: this._userItems() }
    });
    ccPicker.addEventListener('pf-picker:change', (e) => {
      this._draft.copyTo = Array.isArray(e.detail.value) ? e.detail.value : [];
    });

    // ──────── CHIP GROUPS (assignment type, priority, action required) ────────
    const typeChips = this._mkChipGroup('bulk-assignmentType', ASSIGNMENT_TYPES, this._draft.assignmentType, (v) => { this._draft.assignmentType = v; });
    const priorityChips = this._mkChipGroup('bulk-priority', PRIORITIES.map((p) => ({ value: p.value, label: `${p.icon} ${p.label}` })), this._draft.priority, (v) => { this._draft.priority = v; });
    const actionChips = this._mkChipGroup('bulk-actionRequired', ACTION_REQUIRED, this._draft.actionRequired, (v) => { this._draft.actionRequired = v; });

    // ──────── DATES + ACTIVITY + COMMENTS ────────
    const ackDue = el('input', { id: 'bulk-ackDue', class: 'pf-input', type: 'date' });
    const taskDue = el('input', { id: 'bulk-taskDue', class: 'pf-input', type: 'date' });
    const activityTask = el('input', { id: 'bulk-activityTask', class: 'pf-input', type: 'text', placeholder: this.t('field.activityTask.label') });
    const comments = el('textarea', { id: 'bulk-comments', class: 'pf-input', rows: '2',
      placeholder: this.t('module.single-item-ops.commentsHint') });
    this.on(ackDue, 'change', () => { this._draft.ackDue = ackDue.value; });
    this.on(taskDue, 'change', () => { this._draft.taskDue = taskDue.value; });
    this.on(activityTask, 'input', () => { this._draft.activityTask = activityTask.value; });
    this.on(comments, 'input', () => { this._draft.comments = comments.value; });

    const field = (labelText, control, opts = {}) => {
      const wrap = el('div', { class: 'pf-field' + (opts.required ? ' pf-field--required' : '') });
      wrap.append(el('label', { class: 'pf-label', for: control.id },
        [document.createTextNode(labelText), opts.required ? el('abbr', { class: 'pf-label__req', text: ' *' }) : null].filter(Boolean)));
      wrap.append(control);
      if (opts.help) wrap.append(el('p', { class: 'pf-field__help', text: opts.help }));
      return wrap;
    };

    const count = el('span', { id: 'bulk-selected-count', class: 'pf-bulk__count' });
    const preview = el('button', { id: 'bulk-preview', class: 'pf-btn pf-btn--ghost', type: 'button',
      html: `<pf-icon name="mail" size="14"></pf-icon> ${this.t('notif.previewBtn')}` });
    preview.addEventListener('click', () => this._previewNotification());
    const submit = el('button', { id: 'bulk-submit', class: 'pf-btn pf-btn--danger', type: 'button',
      html: `<pf-icon name="check-circle" size="14"></pf-icon> ${this.t('module.bulk-assignment.submit')}` });
    submit.disabled = true;
    submit.addEventListener('click', () => this._submit());

    form.append(
      field('Assignment Type', typeChips, { required: true }),
      field('Category', catPicker, { required: true, help: this.t('module.single-item-ops.categoryHelp') }),
      field('Assignee', assigneePicker, { required: true, help: this.t('field.assignedTo.help') }),
      field('Co-Assignee (optional)', coassPicker),
      field('CC Recipients (optional)', ccPicker, { help: this.t('field.copyTo.help') }),
      field('Priority', priorityChips, { required: true }),
      field('Action Required', actionChips),
      field(this.t('field.ackDue.label'), ackDue),
      field(this.t('field.taskDue.label'), taskDue),
      field(this.t('field.activityTask.label'), activityTask),
      field(this.t('module.single-item-ops.comments'), comments),
      el('div', { class: 'pf-bulk__actions' }, [count, preview, submit])
    );
    this._syncCount();
  }

  // ──────── Helpers (mirror single-item-ops) ────────
  _freshDraft() {
    return {
      assignmentType: 'newassignment',
      category: '', categoryCode: '', subCategory: '', subCategoryCode: '', categoryRaw: null,
      assignedTo: '', assignedToTitle: '', primaryDSU: '',
      supportAssignedTo: '', supportDSU: '',
      copyTo: [],
      priority: 'P3 (Normal)',
      actionRequired: '',
      ackDue: '', taskDue: '',
      activityTask: '', comments: ''
    };
  }
  _mkPicker({ id, placeholder, placeholderIcon, searchable = true, mode = 'single', tabs, items, itemsByTab }) {
    const p = document.createElement('pf-rich-picker');
    p.id = id; p.placeholder = placeholder; p.placeholderIcon = placeholderIcon;
    p.searchable = searchable; p.mode = mode;
    if (tabs) { p.tabs = tabs; p.itemsByTab = itemsByTab || {}; } else { p.items = items || []; }
    return p;
  }
  _mkChipGroup(id, items, current, onChange) {
    const host = el('div', { id, class: 'pf-chipgroup', role: 'radiogroup' });
    items.forEach((it) => {
      const b = el('button', { type: 'button',
        class: 'pf-chip' + (it.value === current ? ' pf-chip--selected' : ''),
        role: 'radio', 'aria-checked': it.value === current ? 'true' : 'false',
        'data-val': it.value, text: it.label || it.value });
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
      sub: d.raw && d.raw.DSU_HeadTitle || '', raw: d.raw
    }));
  }
  _userItems() {
    return Lookups.users().slice(0, 800).map((u) => ({
      value: u.value, label: u.raw && u.raw.name || u.label,
      sub: u.raw && (u.raw.jobTitle || u.raw.department) || '', raw: u.raw
    }));
  }
  _applyCategoryCascade(catRaw) {
    if (!catRaw) return;
    const dsuKey = catRaw['Default Primary Responsible']; if (!dsuKey) return;
    const dept = Lookups.departments().find((d) => d.raw && d.raw.DSU_KEY === dsuKey);
    if (!dept || this._draft.assignedTo) return;
    this._draft.assignedTo = dept.raw.DSU_HeadEmail || dept.raw.DSU_HeadPersonalEmail || '';
    this._draft.assignedToTitle = dept.raw.DSU_HeadTitle || dept.raw.Title || '';
    this._draft.primaryDSU = dept.raw.DSU_KEY;
    const ap = document.getElementById('bulk-assignee');
    if (ap) { ap.value = this._draft.assignedTo; ap.selectedLabel = `👤 ${dept.raw.Title} — ${dept.raw.DSU_HeadTitle || ''}`; }
    globalThis.Platform.UI.toast({ messageKey: 'module.single-item-ops.cascadeApplied', vars: { dept: dept.raw.Title }, variant: 'info', timeout: 3000 });
  }

  _previewNotification() {
    const d = this._draft || this._freshDraft();
    const selected = [...this._selected];
    const E = globalThis.Platform.Entities;
    const items = selected.map((id) => {
      const it = (E.all('document').find((x) => (x.__ref || x.__id) === id)) || { __id: id, __ref: id, title: '' };
      return { ID: it.__id || id, RefIDD: String(it.__ref || it.__id || id), Title: it.title || it.Title || '' };
    });
    globalThis.Platform.UI.previewNotification({
      title: d.activityTask, assignedTo: d.assignedTo, assignedToTitle: d.assignedToTitle,
      category: d.category, subCategory: d.subCategory,
      priority: d.priority, actionRequired: d.actionRequired,
      ackDue: d.ackDue, taskDue: d.taskDue,
      copyTo: d.copyTo, comments: d.comments,
      assignmentType: d.assignmentType,
      createdBy: (globalThis.Platform.Persona?.email && globalThis.Platform.Persona.email()) || 'web-ops@nitda.gov.ng',
      items
    });
  }

  _collect() {
    const d = this._draft || this._freshDraft();
    return {
      assignmentType: d.assignmentType,
      assignedTo: d.assignedTo, assignedToTitle: d.assignedToTitle, primaryDSU: d.primaryDSU,
      supportAssignedTo: d.supportAssignedTo, supportDSU: d.supportDSU,
      category: d.category, categoryCode: d.categoryCode,
      subCategory: d.subCategory, subCategoryCode: d.subCategoryCode,
      priority: d.priority, actionRequired: d.actionRequired,
      ackDue: d.ackDue || null, taskDue: d.taskDue || null,
      copyTo: d.copyTo || [],
      activityTask: d.activityTask, comments: d.comments
    };
  }
  async _submit() {
    if (this._busy) return;
    this._busy = true; this._renderStepper();
    const P = globalThis.Platform;
    if (!this._selected.size) { this._busy = false; this._renderStepper(); return; }
    const f = this._collect();
    const selected = [...this._selected];
    const items = selected.map((key) => {
      const doc = P.Entities.get('document', key) || (P.Entities.byReference(key).reference) || { __ref: key };
      return { referenceId: doc.__ref || key, id: doc.__id || key, title: doc.title || key };
    });

    // MANDATORY preview/confirm — danger, irreversible bulk write.
    const ok = await P.UI.confirm({
      titleKey: 'module.bulk-assignment.title',
      summaryKey: 'bulk.confirmSummary',
      danger: true,
      confirmKey: 'module.bulk-assignment.submit',
      details: [
        { label: this.t('confirm.action'), value: this.t('module.bulk-assignment.submit') },
        { label: this.t('module.bulk-assignment.selected', { n: selected.length }), value: `${selected.length}` },
        { label: this.t('field.assignmentType.label'), value: f.assignmentType || '—' },
        { label: this.t('field.assignedTo.label'), value: f.assignedTo || '—' },
        { label: this.t('field.category.label'), value: f.category || '—' },
        { label: this.t('field.priority.label'), value: f.priority || '—' },
        { label: this.t('confirm.endpoint'), value: 'BULK_ASSIGNMENT' },
        { label: this.t('confirm.impact'), value: this.t('confirm.impactWrite') }
      ]
    });
    if (!ok) { this._busy = false; this._renderStepper(); return; }

    // Sensitive bulk write → OTP gate (OTP_GENERATE/OTP_VERIFY).
    const gated = await PfOtpModal.require({ reason: this.t('bulk.otpReason') });
    if (!gated) { this._busy = false; this._renderStepper(); return; }

    // Build the canonical BULK_TASK_ASSIGNMENT payload. action/operation/mode/source are
    // injected by Endpoints.BULK_ASSIGNMENT.defaults; we supply the contract's variable fields.
    const persona = (P.Persona?.current && P.Persona.current()) || 'web-ops';
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      action: 'bulkassignment', operation: 'create', mode: 'bulk',
      source: 'OBSIDIAN_v4',
      userEmail: (P.Persona?.email && P.Persona.email()) || `${persona}@nitda.gov.ng`,
      method: 'POST', device: { id: 'obsidian-platform' },
      AssignmentType: f.assignmentType,
      NewActivityTask: {
        StartDate: today,
        Title: f.activityTask || `Bulk: ${selected.length} item(s)`,
        Status: 'New',
        Category: f.category, CategoryCode: f.categoryCode,
        SubCategory: f.subCategory, SubCategoryCode: f.subCategoryCode,
        PrimaryDSU: f.primaryDSU,
        AssignedTo: f.assignedTo, AssignedToTitle: f.assignedToTitle, AssignedDSU: f.primaryDSU,
        supportingAssignedTo: f.supportAssignedTo, SupportAssignedTo: f.supportAssignedTo, SupportDSU: f.supportDSU,
        Priority: f.priority,
        Comments: f.comments,
        ActionRequired: f.actionRequired,
        CreatedBy: (P.Persona?.email && P.Persona.email()) || `${persona}@nitda.gov.ng`,
        Categorization: f.category + (f.subCategory ? '-' + f.subCategory : ''),
        TaskDue: f.taskDue, AckDue: f.ackDue, CopyTo: (f.copyTo || []).join(';')
      },
      SelectedItems: items,
      items,
      payload: {
        task: { StartDate: today, Title: f.activityTask, Category: f.category, AssignedTo: f.assignedTo },
        selection: { items, count: selected.length },
        assignment: { type: f.assignmentType }
      }
    };

    const btn = document.getElementById('bulk-submit');
    if (btn) { btn.disabled = true; btn.textContent = this.t('common.actions.processing'); }
    const res = await this.call(submitBulkAssignment, payload);
    if (btn) { btn.textContent = this.t('module.bulk-assignment.submit'); btn.disabled = this._selected.size === 0; }
    if (!res.ok) { this._busy = false; this._renderStepper(); return; } // error toast already raised by this.call

    // F3 result: data.{ selectedCount, tasksCreated, docsUpdated, notificationsSent, failed }
    const d = res.data || {};
    const failed = Array.isArray(d.failed) ? d.failed.length : (Number(d.failed) || 0);
    const created = Number(d.tasksCreated ?? d.selectedCount ?? selected.length);

    // Reflect into the shared fabric so every lens (response-tracking, ops-hub, stats…) updates.
    const ts = new Date().toISOString();
    items.forEach((it) => P.Entities.upsert('task', {
      referenceId: it.referenceId, title: it.title, assignedTo: f.assignedTo,
      priority: f.priority, status: 'Assigned', assignmentType: f.assignmentType, taskDue: f.taskDue, ackDue: f.ackDue, ts
    }));

    this._renderResult({ created, failed, notified: Number(d.notificationsSent || 0), total: selected.length });
    P.UI.actionCompleted('bulk.success', { n: created, module: 'response-tracking' });
    this._selected.clear(); this._renderPicker();
    this._busy = false; this._renderStepper();
  }

  _renderResult({ created, failed, notified, total }) {
    const root = document.getElementById('module-bulk-assignment');
    const region = root && root.querySelector('[data-region="result"]');
    if (!region) return;
    clear(region);
    const variant = failed ? 'pf-badge--review' : 'pf-badge--ok';
    region.append(el('div', { class: 'pf-bulk__result' }, [
      el('strong', { text: this.t('module.bulk-assignment.resultTitle') }),
      el('span', { class: 'pf-badge ' + variant, text: `${created}/${total}` }),
      el('span', { class: 'pf-muted', text: this.t('module.bulk-assignment.resultSummary', { created, notified, failed }) })
    ]));
  }
}

Modules.register(BulkAssignmentModule);
export default BulkAssignmentModule;
