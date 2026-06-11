/** OBSIDIAN v4.0 — module 'bulk-assignment' (ROUTING · audience:admin).
 *  Port of the NITDA Digital Ops Hub SPA bulk-assignment form + logic (authorized in-session,
 *  2026-06-10), extended for operator-requested parity with single-assign (2026-06-11): Category/
 *  Sub-Category <select>s, Assign-To + Co-Assignee email typeaheads, CC list, Priority + Action-Required
 *  <select>s, Ack/Task due-date pickers, Comments, and a DUAL-MODE submit —
 *  Direct (E06 / BULK_ASSIGNMENT_DIRECT) and Optimized (E07 / BULK_ASSIGNMENT) — gated by a
 *  confirm step. No OTP (the SPA has none). The submit payload mirrors the SPA's executeBulkAssign
 *  byte-for-byte (action/AssignmentType/NewActivityTask/SelectedItems/payload), including the SPA's
 *  duplicate/misspelled acknowledgement keys, which the live PA flow reads.
 *
 *  The surrounding shell (item picker, 3-step stepper, result region) is the platform surface that
 *  view.html defines; the SPA receives its items pre-selected from the document gallery, so the
 *  picker here is the platform equivalent of that selection. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { Lookups } from '../../shared/utils/lookups.js';
import { submitBulkAssignment } from './service.js';

// SPA bulk priority <select> options, in the SPA's order (P3 default first).
const PRIORITIES = ['P3 (Normal)', 'P1 (High)', 'P2 (Medium)', 'P4 (Low)'];
// SPA category-Priority → token map (applyBulkCategoryCascade).
const PRIORITY_MAP = { High: 'P1 (High)', Medium: 'P2 (Medium)', Normal: 'P3 (Normal)', Low: 'P4 (Low)' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class BulkAssignmentModule extends BaseModule {
  static id = 'bulk-assignment';
  static label = 'module.bulk-assignment.title';
  static icon = 'layers';
  static nav = { group: 'ROUTING', order: 3 };
  static audience = 'admin';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    const P = globalThis.Platform;
    this._selected = new Set();
    this._filter = '';
    this._draft = this._freshDraft();
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
    this.bus('entity:bootstrapped', () => this._renderPicker());
    this.bus('entity:changed', () => this._renderPicker());
  }

  _freshDraft() {
    return { category: '', subCategory: '', assignee: '', coAssignee: '', copyTo: [],
      priority: 'P3 (Normal)', actionRequired: '', ackDue: '', taskDue: '', comments: '' };
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

  /** Three-step visual progress indicator (Select → Details → Confirm). */
  _renderStepper() {
    const root = document.getElementById('module-bulk-assignment');
    const host = root && root.querySelector('[data-region="stepper"]');
    if (!host) return;
    clear(host);
    const selN = this._selected.size, busy = !!this._busy;
    const steps = [
      { id: 1, key: 'step1', sub: this.t('module.bulk-assignment.step1Sub', { n: selN }), state: selN === 0 ? 'current' : 'done' },
      { id: 2, key: 'step2', sub: this.t('module.bulk-assignment.step2Sub'), state: selN === 0 ? 'pending' : (busy ? 'done' : 'current') },
      { id: 3, key: 'step3', sub: this.t('module.bulk-assignment.step3Sub'), state: busy ? 'current' : 'pending' }
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
    const dis = this._selected.size === 0;
    ['bulk-submit-direct', 'bulk-submit-optimized'].forEach((id) => {
      const b = document.getElementById(id); if (b) b.disabled = dis;
    });
    this._updateSummary();
  }

  // ──────── FORM (SPA-exact: selects + email typeahead + dual-mode submit) ────────
  _renderForm(form) {
    clear(form);
    this._draft = this._draft || this._freshDraft();

    // Category <select> — unique Category names from the option set.
    const cats = Lookups.categories();
    const categoryNames = [...new Set(cats.map((c) => c.raw && c.raw.Category).filter(Boolean))];
    const catSel = el('select', { id: 'bulk-category', class: 'pf-input' },
      [el('option', { value: '', text: 'Select Category...' }),
        ...categoryNames.map((name) => el('option', { value: name, text: name }))]);
    catSel.value = this._draft.category;
    this.on(catSel, 'change', () => this._onCategoryChange());

    // Sub-Category <select> — populated from the chosen category.
    const subSel = el('select', { id: 'bulk-subcategory', class: 'pf-input' },
      [el('option', { value: '', text: 'Select Sub-Category...' })]);
    this.on(subSel, 'change', () => { this._draft.subCategory = subSel.value; this._applyCategoryCascade(); this._updateSummary(); });

    // Email typeahead factory over the user option set (min 2 chars, top 8). SPA filterBulkUsers,
    // generalized so Assign-To and Co-Assignee share the same behaviour, each bound to its draft key.
    const mkUserTypeahead = (id, key, placeholder) => {
      const input = el('input', { id, class: 'pf-input', type: 'text', maxlength: '254',
        placeholder, value: this._draft[key] || '', autocomplete: 'off' });
      const sugg = el('div', { class: 'pf-bulk__suggest', hidden: true });
      this.on(input, 'input', () => { this._draft[key] = input.value.trim(); this._filterUsers(input, sugg, key); this._updateSummary(); });
      this.on(input, 'keydown', (e) => this._suggestKeydown(e, sugg));
      return { input, sugg };
    };
    const assignee = mkUserTypeahead('bulk-assignee', 'assignee', 'Start typing name or email...');
    const coass = mkUserTypeahead('bulk-coassignee', 'coAssignee', 'Optional co-assignee email...');

    // CC recipients — semicolon/comma-separated email list applied to every selected item.
    const ccInput = el('input', { id: 'bulk-cc', class: 'pf-input', type: 'text', autocomplete: 'off',
      placeholder: 'CC emails, separated by ; or ,', value: (this._draft.copyTo || []).join('; ') });
    this.on(ccInput, 'input', () => { this._draft.copyTo = ccInput.value.split(/[;,]/).map((s) => s.trim()).filter(Boolean); this._updateSummary(); });

    // Priority <select>.
    const prioSel = el('select', { id: 'bulk-priority', class: 'pf-input' },
      PRIORITIES.map((p) => el('option', { value: p, text: p })));
    prioSel.value = this._draft.priority;
    this.on(prioSel, 'change', () => { this._draft.priority = prioSel.value; this._updateSummary(); });

    // Action Required <select>.
    const actionSel = el('select', { id: 'bulk-action', class: 'pf-input' },
      [['', 'Not set'], ['Review', 'Review'], ['Approval', 'Approval'], ['Information', 'Information']]
        .map(([v, l]) => el('option', { value: v, text: l })));
    actionSel.value = this._draft.actionRequired;
    this.on(actionSel, 'change', () => { this._draft.actionRequired = actionSel.value; });

    // Due-date pickers — operator value wins, else the SPA's tomorrow fallback at submit.
    const ackDue = el('input', { id: 'bulk-ackdue', class: 'pf-input', type: 'date', value: this._draft.ackDue });
    const taskDue = el('input', { id: 'bulk-taskdue', class: 'pf-input', type: 'date', value: this._draft.taskDue });
    this.on(ackDue, 'change', () => { this._draft.ackDue = ackDue.value; });
    this.on(taskDue, 'change', () => { this._draft.taskDue = taskDue.value; });

    // Comments.
    const comments = el('textarea', { id: 'bulk-comments', class: 'pf-input', rows: '3',
      placeholder: 'Comments for all selected items...' });
    comments.value = this._draft.comments;
    this.on(comments, 'input', () => { this._draft.comments = comments.value; });

    const field = (labelText, control, opts = {}) => {
      const wrap = el('div', { class: 'pf-field' + (opts.required ? ' pf-field--required' : '') });
      wrap.append(el('label', { class: 'pf-label', for: control.id },
        [document.createTextNode(labelText), opts.required ? el('abbr', { class: 'pf-label__req', text: ' *' }) : null].filter(Boolean)));
      wrap.append(control);
      if (opts.after) wrap.append(opts.after);
      return wrap;
    };

    // Dual-mode submit (SPA: Direct = E06, Optimized = E07).
    const count = el('span', { id: 'bulk-selected-count', class: 'pf-bulk__count' });
    const directBtn = el('button', { id: 'bulk-submit-direct', class: 'pf-btn pf-btn--primary', type: 'button',
      html: '📤 Bulk Assign (Direct)' });
    directBtn.addEventListener('click', () => this._submit('direct'));
    const optimizedBtn = el('button', { id: 'bulk-submit-optimized', class: 'pf-btn pf-btn--accent', type: 'button',
      html: '⚡ Optimized Assign' });
    optimizedBtn.addEventListener('click', () => this._submit('optimized'));

    // Live bulk summary (SPA updateBulkSummary).
    const summary = el('table', { id: 'bulk-summary-table', class: 'pf-bulk__summary' }, [
      el('tr', {}, [el('td', { text: 'Items' }), el('td', { id: 'bulk-sum-count', text: '0' })]),
      el('tr', {}, [el('td', { text: 'Category' }), el('td', { id: 'bulk-sum-category', text: '—' })]),
      el('tr', {}, [el('td', { text: 'Assigned To' }), el('td', { id: 'bulk-sum-assignee', text: '—' })]),
      el('tr', {}, [el('td', { text: 'Co-Assignee' }), el('td', { id: 'bulk-sum-coassignee', text: '—' })]),
      el('tr', {}, [el('td', { text: 'CC' }), el('td', { id: 'bulk-sum-cc', text: '—' })]),
      el('tr', {}, [el('td', { text: 'Priority' }), el('td', { id: 'bulk-sum-priority', text: 'P3 (Normal)' })])
    ]);

    const dueRow = el('div', { class: 'pf-bulk__duerow' }, [
      field('Acknowledgement Due', ackDue), field('Task Due', taskDue)
    ]);

    form.append(
      field('Category', catSel, { required: true }),
      field('Sub-Category', subSel),
      field('Assign To (email)', assignee.input, { required: true, after: assignee.sug }),
      field('Co-Assignee (email, optional)', coass.input, { after: coass.sug }),
      field('CC Recipients (optional)', ccInput),
      field('Priority', prioSel, { required: true }),
      field('Action Required', actionSel),
      dueRow,
      field('Comments', comments),
      el('div', { class: 'pf-bulk__actions' }, [count, directBtn, optimizedBtn]),
      summary
    );
    this._syncCount();
  }

  /** SPA onBulkCategoryChange: repopulate sub-categories; auto-select if only one; cascade. */
  _onCategoryChange() {
    const catSel = document.getElementById('bulk-category');
    const subSel = document.getElementById('bulk-subcategory');
    if (!catSel || !subSel) return;
    this._draft.category = catSel.value;
    const cat = catSel.value;
    const subs = [...new Set(Lookups.categories()
      .filter((c) => c.raw && c.raw.Category === cat)
      .map((c) => c.raw.Subcategory).filter(Boolean))];
    clear(subSel);
    subSel.append(el('option', { value: '', text: 'Select Sub-Category...' }));
    subs.forEach((s) => subSel.append(el('option', { value: s, text: s })));
    // SPA P2-5: single sub-category auto-locks the cascade.
    if (subs.length === 1) { subSel.value = subs[0]; this._draft.subCategory = subs[0]; }
    else { this._draft.subCategory = ''; }
    this._applyCategoryCascade();
    this._updateSummary();
  }

  /** SPA applyBulkCategoryCascade: fill assignee email from primary DSU head if empty; auto-set
   *  priority from the category's Priority only while the user is still on the P3 default. */
  _applyCategoryCascade() {
    const cat = this._draft.category, sub = this._draft.subCategory;
    if (!cat) return;
    const cats = Lookups.categories();
    const catRecord = (cats.find((c) => c.raw && c.raw.Category === cat && (!sub || c.raw.Subcategory === sub))
      || cats.find((c) => c.raw && c.raw.Category === cat) || {}).raw;
    if (!catRecord) return;

    const primaryDSU = catRecord['Default Primary Responsible'] || '';
    const catPriority = catRecord.Priority || '';

    const assigneeEl = document.getElementById('bulk-assignee');
    if (assigneeEl && !assigneeEl.value.trim() && primaryDSU) {
      const primDept = (Lookups.departments().find((d) => d.raw && d.raw.DSU_KEY === primaryDSU) || {}).raw;
      if (primDept) {
        const email = primDept.DSU_HeadEmail || primDept.DSU_HeadPersonalEmail || '';
        assigneeEl.value = email; this._draft.assignee = email;
      }
    }

    const prioEl = document.getElementById('bulk-priority');
    if (prioEl && catPriority && prioEl.value === 'P3 (Normal)') {
      const matched = PRIORITY_MAP[catPriority] || catPriority;
      if ([...prioEl.options].some((o) => o.value === matched)) { prioEl.value = matched; this._draft.priority = matched; }
    }
  }

  /** SPA filterBulkUsers / selectBulkUser — `key` is the draft field the chosen email is written to. */
  _filterUsers(input, host, key = 'assignee') {
    const q = (input.value || '').toLowerCase();
    if (!q || q.length < 2) { host.hidden = true; clear(host); return; }
    const matches = Lookups.users()
      .filter((u) => (u.label || '').toLowerCase().includes(q) || (u.value || '').toLowerCase().includes(q))
      .slice(0, 8);
    clear(host);
    if (!matches.length) { host.hidden = true; return; }
    matches.forEach((u) => {
      const opt = el('div', { class: 'pf-bulk__suggest-item', text: `${u.label} — ${u.value}` });
      opt.addEventListener('click', () => {
        input.value = u.value; this._draft[key] = u.value;
        host.hidden = true; clear(host); this._updateSummary();
      });
      host.append(opt);
    });
    host.hidden = false;
  }

  /** Keyboard navigation for the Assign-To typeahead (Arrow to move, Enter to pick, Escape to close). */
  _suggestKeydown(e, host) {
    if (host.hidden) return;
    const items = [...host.querySelectorAll('.pf-bulk__suggest-item')];
    if (!items.length) return;
    let idx = items.findIndex((n) => n.classList.contains('is-active'));
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % items.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + items.length) % items.length; }
    else if (e.key === 'Enter') { if (idx >= 0) { e.preventDefault(); items[idx].click(); } return; }
    else if (e.key === 'Escape') { host.hidden = true; clear(host); return; }
    else return;
    items.forEach((n) => n.classList.remove('is-active'));
    const active = items[idx] || items[0];
    active.classList.add('is-active');
    active.scrollIntoView({ block: 'nearest' });
  }

  _updateSummary() {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v || '—'; };
    set('bulk-sum-count', String(this._selected ? this._selected.size : 0));
    set('bulk-sum-category', this._draft.category + (this._draft.subCategory ? ' / ' + this._draft.subCategory : ''));
    set('bulk-sum-assignee', this._draft.assignee);
    set('bulk-sum-coassignee', this._draft.coAssignee);
    set('bulk-sum-cc', (this._draft.copyTo || []).join('; '));
    set('bulk-sum-priority', this._draft.priority || 'P3 (Normal)');
  }

  // ──────── Submit (SPA submitBulkAssign → confirm → executeBulkAssign) ────────
  async _submit(mode) {
    if (this._busy) return;
    const P = globalThis.Platform;
    const d = this._draft;

    // SPA validation order: category → assignee present → email format → items selected.
    if (!d.category) { P.UI.toast({ message: '❌ Please select a category.', variant: 'danger' }); return; }
    if (!d.assignee) { P.UI.toast({ message: '❌ Please enter an assignee.', variant: 'danger' }); return; }
    if (!EMAIL_RE.test(d.assignee)) { P.UI.toast({ message: '❌ Assignee email format is invalid.', variant: 'danger' }); return; }
    if (!this._selected.size) { P.UI.toast({ message: '❌ No items selected.', variant: 'danger' }); return; }

    const n = this._selected.size;
    const ok = await P.UI.confirm({
      titleKey: 'module.bulk-assignment.title',
      summaryKey: 'bulk.confirmSummary',
      danger: true,
      confirmKey: 'module.bulk-assignment.submit',
      details: [
        { label: 'Items', value: `${n} item${n !== 1 ? 's' : ''}` },
        { label: 'Category', value: d.category + (d.subCategory ? ' / ' + d.subCategory : '') },
        { label: 'Assigned To', value: d.assignee },
        { label: 'Co-Assignee', value: d.coAssignee || '—' },
        { label: 'CC', value: (d.copyTo || []).length ? d.copyTo.join('; ') : '—' },
        { label: 'Priority', value: d.priority },
        { label: 'Mode', value: mode === 'optimized' ? '⚡ Optimized' : '📤 Direct' },
        { label: this.t('confirm.endpoint'), value: mode === 'optimized' ? 'BULK_ASSIGNMENT' : 'BULK_ASSIGNMENT_DIRECT' },
        { label: this.t('confirm.impact'), value: this.t('confirm.impactWrite') }
      ]
    });
    if (!ok) return;
    await this._execute(mode);
  }

  /** SPA executeBulkAssign — builds the byte-for-byte SPA payload and posts to E06/E07. */
  async _execute(mode) {
    if (this._busy) return;
    this._busy = true; this._renderStepper();
    const P = globalThis.Platform;
    const d = this._draft;

    const category = d.category, subcategory = d.subCategory, assignee = d.assignee, priority = d.priority, comments = d.comments;
    const coAssignee = d.coAssignee || '', copyTo = (d.copyTo || []).join(';'), actionRequired = d.actionRequired || '';
    const cats = Lookups.categories();
    const catRecord = (cats.find((c) => c.raw && c.raw.Category === category && (!subcategory || c.raw.Subcategory === subcategory)) || {}).raw;
    const catCode = catRecord ? (catRecord['Category Code'] || '') : '';
    const subCatCode = catRecord ? (catRecord['SubCategory Code'] || '') : '';
    const primaryDSU = catRecord ? (catRecord['Default Primary Responsible'] || '') : '';
    const dept = (Lookups.departments().find((x) => x.raw && x.raw.DSU_KEY === primaryDSU) || {}).raw;
    const assignedToTitle = dept ? (dept.DSU_HeadTitle || '') : assignee;

    const today = new Date().toISOString().split('T')[0];
    const tDate = new Date(); tDate.setDate(tDate.getDate() + 1);
    const tomorrow = tDate.toISOString().split('T')[0];
    const ackDue = d.ackDue || tomorrow, taskDue = d.taskDue || tomorrow;

    const E = P.Entities;
    const selectedItems = [...this._selected].map((key) => {
      const doc = (E.all('document').find((x) => (x.__ref || x.__id) === key)) || { __id: key, __ref: key, title: '' };
      const id = doc.__id || key;
      return { ID: id, RefIDD: String(id), Title: doc.title || doc.Title || '' };
    });

    const userEmail = (P.Persona?.email && P.Persona.email())
      || `${(P.Persona?.current && P.Persona.current()) || 'web-ops'}@nitda.gov.ng`;
    const nav = globalThis.navigator || {};

    const payload = {
      action: 'bulkassignment',
      operation: 'create',
      mode: 'bulk',
      source: 'DGO_FAST_Track_WEB_OPS',
      userEmail,
      method: 'POST',
      device: { id: 'standalone-html', platform: nav.platform || '', ua: nav.userAgent || '' },
      AssignmentType: 'bulkassignment',
      NewActivityTask: {
        StartDate: today,
        Title: '',
        Status: 'New',
        Category: category,
        CategoryCode: catCode,
        SubCategory: subcategory,
        SubCategoryCode: subCatCode,
        PrimaryDSU: primaryDSU,
        AssignedTo: assignee,
        AssignedToTitle: assignedToTitle,
        AssignedDSU: primaryDSU,
        supportingAssignedTo: coAssignee,
        SupportAssignedTo: coAssignee,
        SupportAssignedToTitle: '',
        SupportDSU: '',
        Priority: priority,
        AcknowledgementDueBy: ackDue,
        AcknolwedgementDueBy: ackDue,
        TaskDueDate: taskDue,
        CopyTo: copyTo,
        ActionRequired: actionRequired,
        Comments: comments,
        CreatedBy: userEmail,
        Timeline: 'N/A',
        Categorization: category + '-' + subcategory
      },
      SelectedItems: selectedItems,
      payload: {
        task: {
          Category: category, CategoryCode: catCode, SubCategory: subcategory, SubCategoryCode: subCatCode,
          PrimaryDSU: primaryDSU, AssignedTo: assignee, AssignedToTitle: assignedToTitle,
          AssignedDSU: primaryDSU, supportingAssignedTo: coAssignee, SupportAssignedTo: coAssignee, SupportDSU: '',
          Priority: priority, AcknowledgementDueBy: ackDue, AcknolwedgementDueBy: ackDue,
          TaskDueDate: taskDue, CopyTo: copyTo, ActionRequired: actionRequired, Comments: comments, CreatedBy: userEmail
        },
        selection: { items: selectedItems },
        assignment: { type: 'bulkassignment' }
      }
    };

    const total = selectedItems.length;
    const res = await this.call(() => submitBulkAssignment(mode, payload));
    if (!res.ok) { this._busy = false; this._renderStepper(); return; } // error toast already raised by this.call

    const data = res.data || {};
    const failed = Array.isArray(data.failed) ? data.failed.length
      : Array.isArray(data.results) ? data.results.filter((r) => r && r.success === false).length
      : (Number(data.failed) || 0);
    const created = Number(data.tasksCreated ?? data.selectedCount ?? (total - failed));

    // Reflect into the shared fabric so every lens (response-tracking, ops-hub, stats…) updates —
    // the platform equivalent of the SPA's local AppState.docs mutation.
    const ts = new Date().toISOString();
    selectedItems.forEach((it) => P.Entities.upsert('task', {
      referenceId: it.RefIDD, title: it.Title, assignedTo: assignee,
      priority, status: 'Assigned', assignmentType: 'bulkassignment', category, subCategory: subcategory, ts
    }));

    this._renderResult({ created, failed, notified: Number(data.notificationsSent || 0), total, mode });
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
