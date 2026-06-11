/** OBSIDIAN v4.0 — ui.js · toast + modal orchestration (drives shell components via Bus).
 *  No raw UI strings: error toasts map normalized API result.kind -> i18n key. */
import { Bus } from './bus.js';
const ERR_KEY = { network:'errors.api.network', timeout:'errors.api.timeout', server:'errors.api.server',
  client:'errors.api.client', parse:'errors.api.parse', notImplemented:'errors.api.notImplemented',
  config:'errors.api.unknownEndpoint',
  rateLimit:'errors.api.rateLimit', unavailable:'errors.api.unavailable', auth:'errors.api.auth',
  duplicate:'errors.api.duplicate', abort:null };
function t(key, vars) { return (globalThis.Platform?.I18n?.t) ? globalThis.Platform.I18n.t(key, vars) : key; }
let seq = 0;
export const UI = {
  toast({ messageKey, message, variant='info', timeout=5000, vars, action }) {
    const id = ++seq;
    Bus.emit('platform:ui:toast', { id, text: message ?? t(messageKey, vars), variant, timeout, action: action || null });
    return id;
  },
  /** Mandatory preview/confirmation before any write/state-change/backend trigger.
   *  Opens a modal showing the intended action + details; resolves true only on explicit confirm. */
  confirm({ titleKey, summaryKey, summary, details = [], confirmKey = 'common.actions.confirm', danger = false } = {}) {
    return new Promise((resolve) => {
      const id = 'cfm-' + Math.random().toString(36).slice(2, 8);
      let settled = false;
      const done = (v) => { if (settled) return; settled = true; resolve(v); };
      const yes = 'platform:ui:confirm:' + id + ':yes', no = 'platform:ui:confirm:' + id + ':no';
      Bus.once(yes, () => done(true));
      Bus.once(no, () => done(false));
      Bus.once('platform:ui:modal-close', () => done(false));
      Bus.emit('platform:ui:modal', { id, titleKey, preview: { summaryKey, summary, details },
        actions: [ { labelKey: confirmKey, variant: danger ? 'danger' : 'primary', event: yes },
                   { labelKey: 'common.actions.cancel', event: no } ] });
    });
  },
  /** Emit completion event + show success toast with optional "View" deep-link when meta carries
   *  module (+ target). Backward-compatible: meta without module produces a plain success toast. */
  actionCompleted(key, meta = {}) {
    Bus.emit('ui:action:completed', { key, ...meta });
    let action = null;
    if (meta && meta.module) {
      const deepLink = meta.target ? `#/${meta.module}/${meta.target}` : `#/${meta.module}`;
      action = { label: t('common.actions.view'), deepLink };
    }
    return UI.toast({ messageKey: key, variant: 'success', vars: meta, action, timeout: 6500 });
  },
  toastSuccess(messageKey, vars, action) { return UI.toast({ messageKey, variant:'success', vars, action }); },
  toastError(result) {
    // A-10: when the API attached a canonical errorKind, route through the taxonomy (re-auth / OTP /
    // rate-limit behaviours + correct aria-live). Falls back to the legacy transport-kind map below.
    const R = globalThis.Platform && globalThis.Platform.ErrorRouter;
    if (R && result && result.errorKind) return R.handle(result);
    const kind = result && result.kind; const key = ERR_KEY[kind] ?? 'errors.api.client';
    if (key === null) return null; // aborted: silent
    const detail = (result && Array.isArray(result.errors) && result.errors[0] && result.errors[0].message) || '';
    const base = t(key);
    const text = detail ? `${base} — ${detail}` : base;
    const timeout = kind === 'rateLimit' && result.retryAfter
      ? Math.min(Math.max(result.retryAfter * 1000, 5000), 30000)
      : 5500;
    return UI.toast({ message: text, variant:'danger', timeout });
  },
  dismiss(id) { Bus.emit('platform:ui:toast-dismiss', { id }); },
  modal({ titleKey, title, bodyKey, bodyEl, component, props, preview, actions }) {
    const id = ++seq;
    Bus.emit('platform:ui:modal', { id, titleKey, title, bodyKey, bodyEl, component, props, preview, actions: actions || [] });
    return { id, close: () => Bus.emit('platform:ui:modal-close', { id }) };
  },
  /** Open a Task Update workspace — status / priority / due date / notes — and commit changes
   *  through SUBSIDIARY_ACTIONS#UPDATE_TASK. Returns a promise that resolves with the result. */
  openTaskUpdate(task) {
    return new Promise((resolve) => {
      import('../shared/utils/dom.js').then(({ el, clear }) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const PRIORITIES = ['P1 (High)', 'P2 (Medium)', 'P3 (Normal)', 'P4 (Low)'];
        const STATUSES = ['New', 'In Progress', 'Pending Review', 'Completed', 'On Hold'];
        const draft = {
          status: task.status || task.Status || 'New',
          priority: task.priority || task.Priority || 'P3 (Normal)',
          dueDate: task.dueDate || task.taskDue || task.DueDate || '',
          notes: ''
        };
        const root = el('div', { class: 'pf-task-update' });
        // Status chips
        const stWrap = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', text: T('field.status.label') }),
          el('div', { class: 'pf-chipgroup', id: 'tu-status', role: 'radiogroup' },
            STATUSES.map((s) => {
              const b = el('button', { type: 'button', class: 'pf-chip' + (s === draft.status ? ' pf-chip--selected' : ''),
                'data-val': s, text: s });
              b.addEventListener('click', () => {
                stWrap.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
                b.classList.add('pf-chip--selected'); draft.status = s;
              });
              return b;
            }))
        ]);
        // Priority chips
        const prWrap = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', text: T('field.priority.label') }),
          el('div', { class: 'pf-chipgroup', id: 'tu-priority', role: 'radiogroup' },
            PRIORITIES.map((p) => {
              const b = el('button', { type: 'button', class: 'pf-chip' + (p === draft.priority ? ' pf-chip--selected' : ''),
                'data-val': p, text: p });
              b.addEventListener('click', () => {
                prWrap.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
                b.classList.add('pf-chip--selected'); draft.priority = p;
              });
              return b;
            }))
        ]);
        const due = el('input', { class: 'pf-input', type: 'date', value: draft.dueDate });
        due.addEventListener('change', () => { draft.dueDate = due.value; });
        const notes = el('textarea', { class: 'pf-input', rows: '3', placeholder: T('module.single-item-ops.commentsHint') });
        notes.addEventListener('input', () => { draft.notes = notes.value; });

        root.append(stWrap, prWrap,
          el('div', { class: 'pf-field' }, [el('label', { class: 'pf-label', text: T('field.taskDue.label') }), due]),
          el('div', { class: 'pf-field' }, [el('label', { class: 'pf-label', text: T('field.comments.label') }), notes]));

        let submitting = false;
        const id = ++seq;
        const close = (result) => { Bus.emit('platform:ui:modal-close', { id }); resolve(result); };
        Bus.emit('platform:ui:modal', { id, title: T('task.update.title'), bodyEl: root, actions: [
          { labelKey: 'common.actions.cancel', variant: 'ghost' },
          { labelKey: 'task.update.submit', variant: 'primary', close: false, event: '__tu_submit_' + id }
        ] });
        Bus.on('__tu_submit_' + id, async () => {
          if (submitting) return; submitting = true;
          try {
            const P = globalThis.Platform;
            const svc = await import('../core/base-service.js');
            const update = svc.BaseService.endpoint('SUBSIDIARY_ACTIONS', { expectedKeys: ['ok', 'data'] });
            const ref = task.__ref || task.referenceId || task.RefIDD || '';
            const res = await update({ action: 'UPDATE_TASK', RefIDD: ref, taskId: task.__id || task.id,
              status: draft.status, priority: draft.priority, dueDate: draft.dueDate, notes: draft.notes });
            if (res.ok) {
              P.Entities.upsert('task', { ...task, status: draft.status, priority: draft.priority, dueDate: draft.dueDate });
              P.UI.actionCompleted('task.updated', { module: 'response-tracking', target: ref });
              close({ ok: true, draft });
            } else { submitting = false; (P.Actions ? P.Actions.feedback(res) : UI.toastError(res)); }
          } catch (err) { submitting = false; }
        });
      });
    });
  },
  /** Open a Flag-for-DG-Attention modal (reason + urgency). Fires SUBSIDIARY_ACTIONS#flagDocument
   *  on submit. Returns a promise that resolves with { ok, draft } or { ok:false }. */
  openFlagDocument(doc) {
    return new Promise((resolve) => {
      Promise.all([
        import('../shared/utils/dom.js'),
        import('./base-service.js')
      ]).then(([{ el }, svc]) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const draft = { urgency: 'High', reason: '', classification: 'Action Required' };
        const URGENCIES = ['High', 'Medium', 'Low'];
        const CLASSIFICATIONS = ['Action Required', 'Information', 'Escalation'];
        const root = el('div', { class: 'pf-flagdoc' });
        const docTitle = doc.title || doc.Title || doc.__id || doc.__ref || 'Document';
        const ref = doc.__ref || doc.__id || '';

        root.append(
          el('p', { style: 'color:var(--color-text-muted);font-size:var(--size-body-sm);margin-bottom:var(--space-3)',
            text: T('opshub.flagBlurb') }),
          el('dl', { class: 'pf-preview', style: 'margin-bottom:var(--space-4)' }, [
            el('div', { class: 'row' }, [el('span', { class: 'k', text: 'Document' }), el('span', { class: 'v', text: docTitle.slice(0, 80) })]),
            el('div', { class: 'row' }, [el('span', { class: 'k', text: 'Reference' }), el('span', { class: 'v', text: ref || '—' })])
          ])
        );
        // Urgency chips
        const urgWrap = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', text: T('opshub.flagUrgency') }),
          el('div', { class: 'pf-chipgroup', role: 'radiogroup' },
            URGENCIES.map((u) => {
              const b = el('button', { type: 'button', class: 'pf-chip' + (u === draft.urgency ? ' pf-chip--selected' : ''),
                'data-val': u, text: u });
              b.addEventListener('click', () => {
                urgWrap.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
                b.classList.add('pf-chip--selected'); draft.urgency = u;
              });
              return b;
            }))
        ]);
        const classWrap = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', text: T('opshub.flagClassification') }),
          el('div', { class: 'pf-chipgroup', role: 'radiogroup' },
            CLASSIFICATIONS.map((c) => {
              const b = el('button', { type: 'button', class: 'pf-chip' + (c === draft.classification ? ' pf-chip--selected' : ''),
                'data-val': c, text: c });
              b.addEventListener('click', () => {
                classWrap.querySelectorAll('.pf-chip').forEach((x) => x.classList.remove('pf-chip--selected'));
                b.classList.add('pf-chip--selected'); draft.classification = c;
              });
              return b;
            }))
        ]);
        // Reason
        const reason = el('textarea', { class: 'pf-input', rows: '4', placeholder: T('opshub.flagReasonHint') });
        reason.addEventListener('input', () => { draft.reason = reason.value; });
        const reasonWrap = el('div', { class: 'pf-field pf-field--required' }, [
          el('label', { class: 'pf-label', text: T('opshub.flagReason') }, [el('abbr', { class: 'pf-label__req', text: ' *' })]),
          reason
        ]);
        root.append(urgWrap, classWrap, reasonWrap);

        const id = ++seq;
        let submitting = false;
        const close = (result) => { Bus.emit('platform:ui:modal-close', { id }); resolve(result); };
        Bus.emit('platform:ui:modal', { id, title: T('opshub.flagTitle'), bodyEl: root, actions: [
          { labelKey: 'common.actions.cancel', variant: 'ghost' },
          { labelKey: 'opshub.flagSubmit', variant: 'danger', close: false, event: '__fl_submit_' + id }
        ] });
        Bus.on('__fl_submit_' + id, async () => {
          if (submitting) return;
          if (!draft.reason || draft.reason.trim().length < 3) {
            globalThis.Platform.UI.toast({ messageKey: 'opshub.flagReasonRequired', variant: 'danger' });
            return;
          }
          submitting = true;
          const flag = svc.BaseService.endpoint('SUBSIDIARY_ACTIONS', { expectedKeys: ['ok'] });
          const res = await flag({ action: 'flagDocument', RefIDD: ref, documentId: doc.__id || ref,
            dgAttention: true, urgency: draft.urgency, classification: draft.classification, reason: draft.reason });
          if (res.ok) {
            const P = globalThis.Platform;
            P.Entities.upsert('document', { ...doc, status: 'Action Required', dgFlagged: true, dgFlagReason: draft.reason });
            P.Entities.upsert('task', { referenceId: ref, title: T('opshub.dgReview', { t: docTitle }),
              priority: draft.urgency === 'High' ? 'P1 (High)' : draft.urgency === 'Medium' ? 'P2 (Medium)' : 'P3 (Normal)',
              status: 'Created', ts: new Date().toISOString() });
            P.UI.actionCompleted('opshub.flagged', { module: 'ops-hub', target: ref });
            close({ ok: true, draft });
          } else { submitting = false; (globalThis.Platform.Actions ? globalThis.Platform.Actions.feedback(res) : UI.toastError(res)); }
        });
      });
    });
  },

  /** Open an Email-to-Task workflow modal — same rich-picker grammar as single-item-ops but
   *  with the source being an email object (subject/body/sender pre-filled). Fires
   *  EMAIL_RELATED_TASK on submit with the canonical payload. */
  openEmailToTask(email) {
    return new Promise((resolve) => {
      Promise.all([
        import('../shared/utils/dom.js'),
        import('../shared/utils/lookups.js'),
        import('./base-service.js'),
        import('../shared/components/pf-rich-picker.js')
      ]).then(([{ el }, { Lookups }, svc]) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const PRIORITIES = ['P1 (High)', 'P2 (Medium)', 'P3 (Normal)', 'P4 (Low)'];
        const ACTIONS = ['', 'Review', 'Approval', 'Information'];
        const draft = {
          category: '', categoryCode: '', subCategory: '', subCategoryCode: '', categoryRaw: null,
          assignedTo: '', assignedToTitle: '', primaryDSU: '',
          supportAssignedTo: '', supportDSU: '',
          copyTo: [], priority: 'P3 (Normal)', actionRequired: '',
          dueDate: '', notes: ''
        };
        const mkPicker = ({ placeholder, placeholderIcon, mode = 'single', tabs, items, itemsByTab }) => {
          const p = document.createElement('pf-rich-picker');
          p.placeholder = placeholder; p.placeholderIcon = placeholderIcon; p.mode = mode;
          if (tabs) { p.tabs = tabs; p.itemsByTab = itemsByTab || {}; } else { p.items = items || []; }
          return p;
        };
        const deptItems = () => Lookups.departments().map((d) => ({
          value: d.raw && d.raw.DSU_KEY || d.value, label: d.raw && d.raw.Title || d.label,
          sub: d.raw && d.raw.DSU_HeadTitle || '', raw: d.raw }));
        const userItems = () => Lookups.users().slice(0, 800).map((u) => ({
          value: u.value, label: u.raw && u.raw.name || u.label,
          sub: u.raw && (u.raw.jobTitle || u.raw.department) || '', raw: u.raw }));
        const cats = Lookups.categories();
        const catPicker = mkPicker({ placeholder: 'Choose a Category', placeholderIcon: '📂',
          items: cats.map((c) => ({ value: c.value, label: c.raw.Category || c.label,
            sub: c.raw.Subcategory ? `Subcategory: ${c.raw.Subcategory}` : '', raw: c.raw })) });
        const assigneePicker = mkPicker({ placeholder: 'Select Assignee', placeholderIcon: '👤',
          tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
          itemsByTab: { dept: deptItems(), user: userItems() } });
        const coassPicker = mkPicker({ placeholder: 'Select Co-Assignee', placeholderIcon: '👥',
          tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
          itemsByTab: { dept: deptItems(), user: userItems() } });
        const ccPicker = mkPicker({ placeholder: 'Choose CC recipients', placeholderIcon: '📋', mode: 'multi',
          tabs: [{ id: 'dept', label: 'By Department' }, { id: 'user', label: 'By User' }],
          itemsByTab: { dept: deptItems(), user: userItems() } });

        catPicker.addEventListener('pf-picker:change', (e) => {
          const raw = e.detail.raw || {};
          draft.category = raw.Category || ''; draft.categoryCode = raw['Category Code'] || '';
          draft.subCategory = raw.Subcategory || ''; draft.subCategoryCode = raw['SubCategory Code'] || '';
          draft.categoryRaw = raw;
          // Cascade: default assignee from category's Default Primary Responsible (DSU_KEY → dept head)
          const dsuKey = raw['Default Primary Responsible'];
          if (dsuKey && !draft.assignedTo) {
            const dept = Lookups.departments().find((d) => d.raw && d.raw.DSU_KEY === dsuKey);
            if (dept) {
              draft.assignedTo = dept.raw.DSU_HeadEmail || dept.raw.DSU_HeadPersonalEmail || '';
              draft.assignedToTitle = dept.raw.DSU_HeadTitle || dept.raw.Title || '';
              draft.primaryDSU = dept.raw.DSU_KEY;
              assigneePicker.value = draft.assignedTo;
              assigneePicker.selectedLabel = `👤 ${dept.raw.Title} — ${dept.raw.DSU_HeadTitle || ''}`;
              globalThis.Platform.UI.toast({ messageKey: 'module.single-item-ops.cascadeApplied',
                vars: { dept: dept.raw.Title }, variant: 'info', timeout: 3000 });
            }
          }
        });
        assigneePicker.addEventListener('pf-picker:change', (e) => {
          const raw = e.detail.raw || {};
          if (raw.DSU_KEY) {
            draft.assignedTo = raw.DSU_HeadEmail || raw.DSU_HeadPersonalEmail || '';
            draft.assignedToTitle = raw.DSU_HeadTitle || raw.Title || '';
            draft.primaryDSU = raw.DSU_KEY;
          } else {
            // user option: email lives in the option VALUE (Lookups resolves email/upn/id), not always raw.email
            draft.assignedTo = e.detail.value || raw.email || raw.Email || '';
            draft.assignedToTitle = raw.name || raw.displayName || raw.jobTitle || '';
            draft.primaryDSU = raw.department || raw.DSU_KEY || draft.primaryDSU;
          }
        });
        coassPicker.addEventListener('pf-picker:change', (e) => {
          const raw = e.detail.raw || {};
          if (raw.DSU_KEY) { draft.supportAssignedTo = raw.DSU_HeadEmail || raw.DSU_HeadPersonalEmail || ''; draft.supportDSU = raw.DSU_KEY; }
          else draft.supportAssignedTo = e.detail.value || raw.email || raw.Email || '';
        });
        ccPicker.addEventListener('pf-picker:change', (e) => { draft.copyTo = Array.isArray(e.detail.value) ? e.detail.value : []; });

        // Chip groups
        const mkChips = (items, init, onChange) => {
          const host = el('div', { class: 'pf-chipgroup', role: 'radiogroup' });
          items.forEach((v) => {
            const b = el('button', { type: 'button', class: 'pf-chip' + (v === init ? ' pf-chip--selected' : ''),
              'data-val': v, text: v || 'Not set' });
            b.addEventListener('click', () => {
              host.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
              b.classList.add('pf-chip--selected'); onChange(v);
            });
            host.append(b);
          });
          return host;
        };
        const priorityChips = mkChips(PRIORITIES, draft.priority, (v) => { draft.priority = v; });
        const actionChips = mkChips(ACTIONS, draft.actionRequired, (v) => { draft.actionRequired = v; });

        const due = el('input', { class: 'pf-input', type: 'date' });
        due.addEventListener('change', () => { draft.dueDate = due.value; });
        const notes = el('textarea', { class: 'pf-input', rows: '3', placeholder: T('module.single-item-ops.commentsHint') });
        notes.addEventListener('input', () => { draft.notes = notes.value; });

        const field = (label, ctrl, required) => el('div', { class: 'pf-field' + (required ? ' pf-field--required' : '') }, [
          el('label', { class: 'pf-label', text: label },
            required ? [el('abbr', { class: 'pf-label__req', text: ' *' })] : []),
          ctrl
        ]);

        const root = el('div', { class: 'pf-etask' });
        root.append(
          el('div', { class: 'pf-preview', style: 'margin-bottom:var(--space-4)' }, [
            el('div', { class: 'row' }, [el('span', { class: 'k', text: 'From' }), el('span', { class: 'v', text: (email.sender || email.from || '—') })]),
            el('div', { class: 'row' }, [el('span', { class: 'k', text: 'Subject' }), el('span', { class: 'v', text: (email.subject || '—').slice(0, 80) })])
          ]),
          field('Category', catPicker, true),
          field('Assignee', assigneePicker, true),
          field('Co-Assignee (optional)', coassPicker),
          field('CC Recipients (optional)', ccPicker),
          field('Priority', priorityChips, true),
          field('Action Required', actionChips),
          field(T('field.taskDue.label'), due),
          field(T('module.single-item-ops.comments'), notes)
        );

        const id = ++seq;
        let submitting = false;
        const close = (result) => { Bus.emit('platform:ui:modal-close', { id }); resolve(result); };
        Bus.emit('platform:ui:modal', { id, title: T('email.taskTitle'), bodyEl: root, actions: [
          { labelKey: 'common.actions.cancel', variant: 'ghost' },
          { labelKey: 'email.taskSubmit', variant: 'primary', close: false, event: '__et_submit_' + id }
        ] });
        Bus.on('__et_submit_' + id, async () => {
          if (submitting) return;
          if (!draft.category || !draft.assignedTo) {
            globalThis.Platform.UI.toast({ messageKey: 'form.fixErrors', variant: 'danger' });
            return;
          }
          submitting = true;
          const P = globalThis.Platform;
          const today = new Date().toISOString().split('T')[0];
          const userEmail = (P.Persona?.email && P.Persona.email()) || 'web-ops@nitda.gov.ng';
          const fire = svc.BaseService.endpoint('EMAIL_RELATED_TASK', { expectedKeys: ['ok'] });
          const payload = {
            action: 'emailtotaskassignment', operation: 'create', mode: 'email-to-task',
            source: 'OBSIDIAN_v4', userEmail, method: 'POST', device: { id: 'obsidian-platform' },
            AssignmentType: 'newassignment',
            NewActivityTask: {
              StartDate: today, ActivityID: email.__id || email.id || '',
              Title: email.subject || 'Email task', Status: 'New',
              Category: draft.category, CategoryCode: draft.categoryCode,
              SubCategory: draft.subCategory, SubCategoryCode: draft.subCategoryCode,
              PrimaryDSU: draft.primaryDSU, AssignedTo: draft.assignedTo,
              AssignedToTitle: draft.assignedToTitle, AssignedDSU: draft.primaryDSU,
              SupportAssignedTo: draft.supportAssignedTo, SupportDSU: draft.supportDSU,
              Priority: draft.priority, Comments: draft.notes,
              ActionRequired: draft.actionRequired,
              CreatedBy: userEmail, Categorization: draft.category + (draft.subCategory ? '-' + draft.subCategory : ''),
              TaskDue: draft.dueDate, CopyTo: draft.copyTo.join(';')
            },
            SourceEmail: { id: email.__id || email.id, subject: email.subject || '', sender: email.sender || email.from || '', body: email.body || email.bodyContent || '' },
            payload: { email: { id: email.__id, subject: email.subject }, task: draft, assignment: { type: 'newassignment' } }
          };
          const res = await fire(payload);
          if (res.ok) {
            P.Entities.upsert('email', { ...email, status: 'Routed', actionedAt: new Date().toISOString() });
            P.Entities.upsert('task', { referenceId: email.__ref || '', title: email.subject || 'Email task',
              assignedTo: draft.assignedTo, priority: draft.priority, status: 'Assigned', ts: new Date().toISOString() });
            P.UI.actionCompleted('email.taskCreated', { module: 'response-tracking', target: email.__ref || '' });
            close({ ok: true, draft });
          } else { submitting = false; }
        });
      });
    });
  },

  /** Open a preview of the notification email that will be sent on assignment.
   *  Builds the HTML via core/notification-email.buildNotificationEmail, then renders it in
   *  pf-sandboxed-iframe so the preview matches the eventual email rendering closely while
   *  remaining safely sandboxed (no script execution, no parent-DOM access). */
  previewNotification(data) {
    return Promise.all([
      import('../shared/utils/dom.js'),
      import('./notification-email.js')
    ]).then(([{ el }, ne]) => {
      const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
      const T = (k, vars) => I.t(k, vars);
      const { subject, html } = ne.buildNotificationEmail(data || {});
      const root = el('div', { class: 'pf-notif-preview' }, [
        el('div', { class: 'pf-overline', style: 'margin-bottom:var(--space-2)', text: T('notif.subject') }),
        el('div', { class: 'pf-card', style: 'padding:var(--space-3);margin-bottom:var(--space-3);font-weight:var(--fw-semibold);background:var(--color-surface-sunken)', text: subject })
      ]);
      const iframe = document.createElement('pf-sandboxed-iframe');
      iframe.html = html;
      iframe.setAttribute('max-height', '500');
      root.append(el('div', { class: 'pf-overline', style: 'margin-bottom:var(--space-2)', text: T('notif.preview') }), iframe);
      const id = ++seq;
      Bus.emit('platform:ui:modal', { id, title: T('notif.title'), bodyEl: root, actions: [
        { labelKey: 'common.actions.close', variant: 'ghost' }
      ] });
      return { close: () => Bus.emit('platform:ui:modal-close', { id }) };
    });
  },

  /** Open a Comments modal — full thread view for a Reference with inline composer.
   *  Reads from the shared fabric (Entities.byReference(ref).comment), writes via
   *  DYNAMIC_GLOBAL_ACTIONS (the canonical comment action), upserts locally on success. */
  openComments(reference) {
    return Promise.all([
      import('../shared/utils/dom.js'),
      import('./base-service.js'),
      import('../shared/components/pf-comment-thread.js')
    ]).then(([{ el }, svc]) => {
      const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
      const T = (k, vars) => I.t(k, vars);
      const P = globalThis.Platform;
      const ref = reference || P.Context?.activeReference?.() || '';

      const thread = document.createElement('pf-comment-thread');
      thread.reference = ref;
      const refresh = () => {
        const items = ref ? P.Entities.byReference(ref).comment : P.Entities.all('comment');
        thread.items = items;
      };
      refresh();

      const root = el('div', { class: 'pf-comments-modal' }, [
        el('div', { class: 'pf-preview', style: 'margin-bottom:var(--space-3)' }, [
          el('div', { class: 'row' }, [el('span', { class: 'k', text: T('comments.scopeLabel') }), el('span', { class: 'v', text: ref || T('comments.scopeAllShort') })]),
          el('div', { class: 'row' }, [el('span', { class: 'k', text: T('comments.count') }), el('span', { class: 'v', id: 'cm-count', text: String((thread.items || []).length) })])
        ]),
        thread
      ]);

      const id = ++seq;
      const close = () => { Bus.emit('platform:ui:modal-close', { id }); };
      const addComment = svc.BaseService.endpoint('DYNAMIC_GLOBAL_ACTIONS', { expectedKeys: ['ok', 'data'] });

      // Listen for thread submit events while modal is open
      const submitHandler = async (e) => {
        const detail = e.detail || {};
        if (!detail.text) return;
        const author = (P.Persona?.email && P.Persona.email()) || `${(P.Persona?.current && P.Persona.current()) || 'web-ops'}@nitda.gov.ng`;
        const payload = {
          action: 'addComment', operation: 'create',
          referenceId: ref || detail.reference || null,
          body: detail.text, sentiment: detail.sentiment, priority: detail.priority,
          author, ts: new Date().toISOString()
        };
        const res = await addComment(payload);
        if (res.ok) {
          const newId = (res.data && (res.data.id || res.data.commentId)) || ('local-' + Date.now());
          P.Entities.upsert('comment', {
            id: newId, referenceId: ref, body: detail.text,
            sentiment: detail.sentiment, priority: detail.priority,
            author, ts: payload.ts
          });
          Bus.emit('entity:comment:changed', { ref });
          refresh();
          const c = document.getElementById('cm-count'); if (c) c.textContent = String(thread.items.length);
          P.UI.toast({ messageKey: 'comments.added', variant: 'success' });
        } else { P.Actions && P.Actions.feedback ? P.Actions.feedback(res) : UI.toastError(res); }
      };
      thread.addEventListener('pf-comment:submit', submitHandler);

      // Reply event — same payload shape as submit, but with parentId set
      // (the thread already forwards parentId on its submit event when replyTo is active,
      // so submitHandler covers it). No separate listener needed.

      // Edit own comment
      thread.addEventListener('pf-comment:edit', async (e) => {
        const { id, text } = e.detail || {};
        if (!id || !text) return;
        const res = await addComment({
          action: 'editComment', operation: 'update',
          commentId: id, referenceId: ref || null,
          body: text, editedAt: new Date().toISOString()
        });
        if (res.ok) {
          const existing = P.Entities.all('comment').find((c) => (c.__id === id || c.id === id || c.commentId === id));
          if (existing) P.Entities.upsert('comment', { ...existing, body: text, editedAt: new Date().toISOString() });
          refresh();
          P.UI.toast({ messageKey: 'comments.edited', variant: 'success' });
        }
      });

      // Delete own comment (with confirm)
      thread.addEventListener('pf-comment:delete', async (e) => {
        const { id } = e.detail || {};
        if (!id) return;
        const ok = await P.UI.confirm({
          titleKey: 'comments.delete', summaryKey: 'comments.deleteConfirm',
          confirmKey: 'comments.delete', danger: true,
          details: [{ label: 'Comment', value: String(id) }]
        });
        if (!ok) return;
        const res = await addComment({
          action: 'deleteComment', operation: 'delete',
          commentId: id, referenceId: ref || null
        });
        if (res.ok) {
          // Soft-remove locally: re-pull all comments minus this one
          const all = P.Entities.all('comment').filter((c) => (c.__id || c.id || c.commentId) !== id);
          // Entity store has no .remove; replace by re-indexing (acceptable for tiny comment set)
          // Simplest: mark as deleted and let refresh filter
          const target = P.Entities.all('comment').find((c) => (c.__id || c.id || c.commentId) === id);
          if (target) P.Entities.upsert('comment', { ...target, _deleted: true, body: '(deleted)', deletedAt: new Date().toISOString() });
          Bus.emit('entity:comment:changed', { ref });
          // Re-read the thread items excluding deleted ones
          thread.items = (ref ? P.Entities.byReference(ref).comment : P.Entities.all('comment')).filter((c) => !c._deleted);
          const cEl = document.getElementById('cm-count'); if (cEl) cEl.textContent = String(thread.items.length);
          P.UI.toast({ messageKey: 'comments.deleted', variant: 'success' });
        }
      });

      // Set the currentUser so the thread can show Edit/Delete on own comments
      thread.currentUser = (P.Persona?.email && P.Persona.email()) ||
        ((P.Persona?.current && P.Persona.current()) ? P.Persona.current() + '@nitda.gov.ng' : '');

      Bus.emit('platform:ui:modal', { id, title: T('comments.modalTitle', { ref: ref || T('comments.scopeAllShort') }),
        bodyEl: root, actions: [{ labelKey: 'common.actions.close', variant: 'ghost' }] });
      return { close };
    });
  },

  /** Push a persistent warning into the top banner. Survives data refreshes until dismissed.
   *  @param {{key?:string, text:string, dismissable?:boolean, variant?:'warning'|'critical'}} w */
  pushWarning(w) { Bus.emit('platform:warning:push', w); },
  /** Dismiss a persistent warning by key. */
  dismissWarning(key) { Bus.emit('platform:warning:dismiss', { key }); },

  /** Open a Profile Setup modal — first-launch user setup. Asks for fullName/email/department/
   *  jobTitle and persists via Persona.setProfile(). Returns the saved profile (or null on cancel). */
  openProfileSetup() {
    return new Promise((resolve) => {
      Promise.all([
        import('../shared/utils/dom.js'),
        import('./persona-controller.js'),
        import('../shared/utils/lookups.js')
      ]).then(([{ el }, { Persona }, { Lookups }]) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const existing = Persona.profile() || {};
        const draft = {
          fullName: existing.fullName || '',
          email:    existing.email || '',
          department: existing.department || '',
          jobTitle: existing.jobTitle || ''
        };

        const field = (id, label, type, value, opts = {}) => {
          const wrap = el('div', { class: 'pf-field' + (opts.required ? ' pf-field--required' : '') });
          wrap.append(el('label', { class: 'pf-label', for: id },
            [document.createTextNode(label),
             opts.required ? el('abbr', { class: 'pf-label__req', text: ' *' }) : null].filter(Boolean)));
          const input = el('input', { id, class: 'pf-input', type, value, placeholder: opts.placeholder || '' });
          wrap.append(input);
          if (opts.help) wrap.append(el('p', { class: 'pf-field__help', text: opts.help }));
          return { wrap, input };
        };

        const nameF = field('prof-fullname', T('profile.fullName'), 'text', draft.fullName, { required: true, help: T('profile.fullNameHelp') });
        const emailF = field('prof-email', T('profile.email'), 'email', draft.email, { required: true, help: T('profile.emailHelp') });
        nameF.input.addEventListener('input', () => { draft.fullName = nameF.input.value.trim(); });
        emailF.input.addEventListener('input', () => { draft.email = emailF.input.value.trim(); });

        // Department dropdown sourced from Lookups (or text input fallback)
        let deptInput;
        const depts = Lookups.departments?.() || [];
        if (depts.length) {
          const sel = el('select', { id: 'prof-dept', class: 'pf-input' },
            [el('option', { value: '', text: '— ' + T('profile.pickDept') + ' —' }),
              ...depts.map((d) => el('option', { value: d.raw?.Title || d.label, text: d.raw?.Title || d.label,
                ...(draft.department === (d.raw?.Title || d.label) ? { selected: 'selected' } : {}) }))]);
          sel.addEventListener('change', () => { draft.department = sel.value; });
          deptInput = sel;
        } else {
          const inp = el('input', { id: 'prof-dept', class: 'pf-input', type: 'text', value: draft.department });
          inp.addEventListener('input', () => { draft.department = inp.value.trim(); });
          deptInput = inp;
        }
        const deptF = el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', for: 'prof-dept', text: T('profile.department') }),
          deptInput,
          el('p', { class: 'pf-field__help', text: T('profile.departmentHelp') })
        ]);

        const titleF = field('prof-title', T('profile.jobTitle'), 'text', draft.jobTitle, { help: T('profile.jobTitleHelp') });
        titleF.input.addEventListener('input', () => { draft.jobTitle = titleF.input.value.trim(); });

        const root = el('div', { class: 'pf-profile-setup' }, [
          el('p', { class: 'pf-muted', style: 'margin-bottom:var(--space-4)', text: T('profile.blurb') }),
          nameF.wrap, emailF.wrap, deptF, titleF.wrap
        ]);

        const id = ++seq;
        const close = (result) => { Bus.emit('platform:ui:modal-close', { id }); resolve(result); };

        Bus.emit('platform:ui:modal', { id, title: T('profile.title'), bodyEl: root, actions: [
          { labelKey: 'common.actions.cancel', variant: 'ghost' },
          { labelKey: 'profile.save', variant: 'primary', close: false, event: '__pr_save_' + id }
        ] });
        Bus.on('__pr_save_' + id, () => {
          if (!draft.fullName) { globalThis.Platform.UI.toast({ messageKey: 'profile.nameRequired', variant: 'danger' }); nameF.input.focus(); return; }
          if (!draft.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) {
            globalThis.Platform.UI.toast({ messageKey: 'profile.emailRequired', variant: 'danger' });
            emailF.input.focus(); return;
          }
          Persona.setProfile(draft);
          globalThis.Platform.UI.toast({ messageKey: 'profile.saved', variant: 'success' });
          close(draft);
        });
      });
    });
  },

  /** Open the keyboard-shortcuts cheatsheet modal. Categories: Navigation, Actions, Forms. */
  openShortcuts() {
    return new Promise((resolve) => {
      import('../shared/utils/dom.js').then(({ el }) => {
        const I = (globalThis.Platform && globalThis.Platform.I18n) || { t: (k) => k };
        const T = (k, vars) => I.t(k, vars);
        const groups = [
          { titleKey: 'shortcuts.navigation', items: [
            { keys: ['?'], descKey: 'shortcuts.help' },
            { keys: ['Esc'], descKey: 'shortcuts.closeModal' },
            { keys: ['/'], descKey: 'shortcuts.focusSearch' },
            { keys: ['g', 'h'], descKey: 'shortcuts.goHome' },
            { keys: ['g', 'o'], descKey: 'shortcuts.goOpsHub' },
            { keys: ['g', 'l'], descKey: 'shortcuts.goLookup' },
            { keys: ['g', 'r'], descKey: 'shortcuts.goRT' },
            { keys: ['g', 's'], descKey: 'shortcuts.goSettings' },
            { keys: ['g', 'd'], descKey: 'shortcuts.goDiagnostics' }
          ]},
          { titleKey: 'shortcuts.actions', items: [
            { keys: ['r'], descKey: 'shortcuts.refresh' },
            { keys: ['n'], descKey: 'shortcuts.newAssign' }
          ]},
          { titleKey: 'shortcuts.forms', items: [
            { keys: ['Enter'], descKey: 'shortcuts.submit' },
            { keys: ['Esc'], descKey: 'shortcuts.cancel' }
          ]}
        ];
        const root = el('div', { class: 'pf-shortcuts' });
        groups.forEach((g) => {
          const section = el('section', { class: 'pf-shortcuts__group' });
          section.append(el('h3', { class: 'pf-overline', text: T(g.titleKey) }));
          const dl = el('dl', { class: 'pf-shortcuts__list' });
          g.items.forEach((it) => {
            const dt = el('dt', { class: 'pf-shortcuts__keys' });
            it.keys.forEach((k, i) => {
              if (i > 0) dt.append(el('span', { class: 'pf-shortcuts__sep', text: 'then' }));
              dt.append(el('kbd', { class: 'pf-shortcuts__kbd', text: k }));
            });
            section.append(dt, el('dd', { class: 'pf-shortcuts__desc', text: T(it.descKey) }));
          });
          section.append(dl);
          root.append(section);
        });
        const id = ++seq;
        Bus.emit('platform:ui:modal', { id, title: T('shortcuts.title'), bodyEl: root,
          actions: [{ labelKey: 'common.actions.close', variant: 'ghost' }] });
        resolve({ close: () => Bus.emit('platform:ui:modal-close', { id }) });
      });
    });
  },

  closeModal(id) { Bus.emit('platform:ui:modal-close', { id }); }
};

// SW update-available toast — fires when a new version of the shell is cached and ready
Bus.on('platform:sw:update-available', () => {
  try {
    UI.toast({ messageKey: 'sw.updateAvailable', variant: 'info', timeout: 8000,
      action: { labelKey: 'sw.reload', onClick: () => globalThis.location?.reload?.() } });
  } catch (_) {}
});

export default UI;
