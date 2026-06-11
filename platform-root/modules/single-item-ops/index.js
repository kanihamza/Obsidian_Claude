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
    // D-3: restore an autosaved draft so tablet sleep / reload doesn't lose in-progress input.
    const restored = this._loadDraft();
    if (restored) this._draft = { ...this._draft, ...restored };
    if (this._preRef) this._draft.ref = this._preRef;
    this._render(root);
    if (restored && (restored.ref || restored.category || restored.assignedTo || restored.comments)) {
      P.UI?.toast?.({ message: 'Draft restored from your last session.', variant: 'info', timeout: 4000 });
    }
  }

  // ──────── D-3: localStorage draft autosave ────────
  _draftKey() { return 'obsidian.single-item-ops.draft.v1'; }
  _loadDraft() {
    try { const raw = globalThis.localStorage?.getItem(this._draftKey()); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  _saveDraft() {
    try {
      const d = this._draft;
      if (!d || (!d.ref && !d.category && !d.assignedTo && !d.comments && !d.activityTask && !(d.copyTo || []).length)) {
        globalThis.localStorage?.removeItem(this._draftKey()); return;
      }
      globalThis.localStorage?.setItem(this._draftKey(), JSON.stringify(d));
    } catch { /* storage unavailable / quota — autosave is best-effort */ }
  }
  _clearDraft() { try { globalThis.localStorage?.removeItem(this._draftKey()); } catch { /* ignore */ } }

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
    const docItems = docs.slice(0, 500).map((dd) => ({
      value: dd.__ref || dd.__id,
      label: dd.title || dd.subject || dd.__id || '(untitled)',
      sub: `${dd.__ref || dd.__id || '—'}${(dd.category || dd.Category) ? ' · ' + (dd.category || dd.Category) : ''}`,
      raw: dd
    }));
    const itemSel = this._mkPicker({ id: 'si-item', placeholder: 'Search a document to assign…',
      placeholderIcon: '📄', searchable: true, items: docItems });
    itemSel.addEventListener('pf-picker:change', (e) => {
      this._applyDocument(e.detail.raw, e.detail.value);
      this._clearError('si-item'); this._clearError('si-ref');
    });
    const manualRef = el('input', { id: 'si-ref', class: 'pf-input', type: 'text',
      placeholder: this.t('module.single-item-ops.manualRef'), value: this._draft.ref });
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
      this._applyCascade({ announce: true });
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
      // dept option carries DSU_HeadPersonalEmail / DSU_HeadEmail; user option carries the email as the
      // option VALUE (Lookups resolves email/upn/id into `value`). Keying off raw.email alone silently
      // failed when the source user record spelled the field Email/upn/mail — use e.detail.value first.
      if (raw.DSU_KEY) {
        this._draft.assignedTo = raw.DSU_HeadEmail || raw.DSU_HeadPersonalEmail || '';
        this._draft.assignedToTitle = raw.DSU_HeadTitle || raw.Title || '';
        this._draft.primaryDSU = raw.DSU_KEY;
      } else {
        this._draft.assignedTo = e.detail.value || raw.email || raw.Email || '';
        this._draft.assignedToTitle = raw.name || raw.displayName || raw.jobTitle || raw.Title || '';
        this._draft.primaryDSU = raw.department || raw.DSU_KEY || this._draft.primaryDSU;
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
      } else {
        this._draft.supportAssignedTo = e.detail.value || raw.email || raw.Email || '';
        this._draft.supportAssignedToTitle = raw.name || raw.displayName || raw.jobTitle || '';
        this._draft.supportDSU = raw.department || raw.DSU_KEY || '';
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
    this.on(activityTask, 'input', () => { this._draft.activityTask = activityTask.value; this._saveDraft(); });
    this.on(comments, 'input', () => { this._draft.comments = comments.value; this._saveDraft(); });
    comments.value = this._draft.comments || '';

    // Reflect any restored selection into the rich pickers (the simple inputs/chips/dates already
    // read from this._draft when built above). Setting .value via the setter does not re-emit change.
    if (this._draft.category) {
      catPicker.value = this._draft.categoryCode || this._draft.category;
      catPicker.selectedLabel = '📂 ' + this._draft.category + (this._draft.subCategory ? ' / ' + this._draft.subCategory : '');
    }
    if (this._draft.assignedTo) {
      assigneePicker.value = this._draft.assignedTo;
      assigneePicker.selectedLabel = '👤 ' + (this._draft.assignedToTitle || this._draft.assignedTo);
    }
    if (this._draft.supportAssignedTo) {
      coassPicker.value = this._draft.supportAssignedTo;
      coassPicker.selectedLabel = '👥 ' + (this._draft.supportAssignedToTitle || this._draft.supportAssignedTo);
    }
    if ((this._draft.copyTo || []).length) ccPicker.value = this._draft.copyTo;

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

    // Pre-populate from a handed-off ref (ops-hub / response-tracking "Assign" pass single-item-ops/<ref>)
    // or a restored draft — look the record up so its details flow into the form instead of arriving as a
    // bare ref. Runs after the controls are in the DOM so the pickers/chips can be reflected.
    if (this._draft.ref && !this._draft.category) {
      const findByRef = (type) => (globalThis.Platform?.Entities?.all(type) || []).find((rr) => (rr.__ref || rr.__id) === this._draft.ref);
      const pre = docs.find((dd) => (dd.__ref || dd.__id) === this._draft.ref) || findByRef('document') || findByRef('reference');
      if (pre) this._applyDocument(pre, this._draft.ref);
      else this._reflectPicker('si-item', this._draft.ref, `📄 ${this._draft.ref}`);
    } else if (this._draft.ref) {
      this._reflectPicker('si-item', this._draft.ref, this._draft.title ? `📄 ${this._draft.title}` : `📄 ${this._draft.ref}`);
    }

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

  /** Smart category cascade — fills primary DSU, assignee, co-assignee, CC and priority from the
   *  category's routing defaults via Lookups.resolveCategory (Default Primary Responsible head,
   *  Default Supporting Dept head, INFORMDSU1..3 heads, category Priority). Manual picks are preserved
   *  unless force=true; the assignee/co-assignee/CC pickers and the priority chip row are reflected. */
  _applyCascade({ force = false, announce = false } = {}) {
    const d = this._draft;
    if (!d.category) return;
    const r = Lookups.resolveCategory(d.category, d.subCategory);
    if (!r) return;
    if (r.primaryDSU) d.primaryDSU = r.primaryDSU;
    let filled = false;
    if (r.assignee && (force || !d.assignedTo)) {
      d.assignedTo = r.assignee; d.assignedToTitle = r.assigneeName || '';
      this._reflectPicker('si-assignee', r.assignee, `👤 ${r.assigneeName || r.assignee}`); filled = true;
    }
    if (r.coAssignee && (force || !d.supportAssignedTo)) {
      d.supportAssignedTo = r.coAssignee; d.supportAssignedToTitle = ''; d.supportDSU = r.supportDSU || '';
      this._reflectPicker('si-coassignee', r.coAssignee, `👥 ${r.coAssignee}`); filled = true;
    }
    if (r.cc && r.cc.length && (force || !(d.copyTo || []).length)) {
      d.copyTo = r.cc.slice();
      const cc = document.getElementById('si-cc'); if (cc) cc.value = d.copyTo; filled = true;
    }
    if (r.priorityToken && (force || d.priority === 'P3 (Normal)')) {
      const p = { p1: 'P1 (High)', p2: 'P2 (Medium)', p3: 'P3 (Normal)', p4: 'P4 (Low)' }[r.priorityToken];
      if (p) { d.priority = p; this._reflectChip('si-priority', p); }
    }
    if (announce && filled) globalThis.Platform.UI.toast({ messageKey: 'module.single-item-ops.cascadeApplied',
      vars: { dept: r.assigneeName || r.primaryDSU || r.category }, variant: 'info', timeout: 3000 });
    this._refreshSummary();
  }

  /** Pull category/title/source from a selected document and run the cascade — this is the
   *  "details passed from the document selection" path, used both when the operator picks an item
   *  and when the screen is opened with a handed-off ref from ops-hub / response-tracking. */
  _applyDocument(doc, ref) {
    const d = this._draft;
    d.sourceDoc = doc || null;
    d.ref = ref || d.ref || '';
    if (doc) {
      d.title = doc.title || doc.Title || doc.subject || d.title;
      const cat = doc.category || doc.Category || '';
      const sub = doc.subCategory || doc.SubCategory || doc.subcategory || '';
      if (cat) {
        const opt = Lookups.categories().find((o) => o.raw && String(o.raw.Category) === String(cat) && (!sub || String(o.raw.Subcategory || '') === String(sub)))
                 || Lookups.categories().find((o) => o.raw && String(o.raw.Category) === String(cat));
        d.category = cat; d.subCategory = sub || (opt && opt.raw && opt.raw.Subcategory) || '';
        if (opt && opt.raw) { d.categoryCode = opt.raw['Category Code'] || ''; d.subCategoryCode = opt.raw['SubCategory Code'] || ''; d.categoryRaw = opt.raw; }
        this._reflectPicker('si-category', d.categoryCode || cat, `📂 ${d.category}${d.subCategory ? ' / ' + d.subCategory : ''}`);
        this._applyCascade({ force: false });
      }
    }
    this._reflectPicker('si-item', d.ref, d.title ? `📄 ${d.title}` : `📄 ${d.ref}`);
    this._refreshSummary();
  }

  _reflectPicker(id, value, label) {
    const elx = document.getElementById(id);
    if (elx) { elx.value = value; if (label != null) elx.selectedLabel = label; }
  }
  _reflectChip(groupId, value) {
    const host = document.getElementById(groupId); if (!host) return;
    [...host.querySelectorAll('.pf-chip')].forEach((c) => {
      const on = c.dataset.val === value;
      c.classList.toggle('pf-chip--selected', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
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
    this._saveDraft();
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
    this._clearDraft();  // D-3: submitted successfully — drop the autosaved draft
    this._busy = false;
  }
}
Modules.register(SingleItemOpsModule);
export default SingleItemOpsModule;
