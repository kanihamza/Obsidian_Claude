/** OBSIDIAN v4.0 — lens.js · shared workhorse for fabric-backed modules (§ holistic system).
 *  Three mounts, all reading the SAME Entities fabric, all cross-linked, all production-grade:
 *    mountListLens  — filterable table + row→context + cross-links + CSV (lens modules)
 *    mountAggregator — KPI tiles + by-status bar chart + optional table/CSV (aggregator modules)
 *    mountActionLens — form → mandatory preview/confirm → endpoint → entity upsert (write modules)
 *  No module re-implements list/stat/form/chart logic (§reuse). */
import { el, clear } from './dom.js';
import { createFilterCache } from './filter-cache.js';
import { BaseService } from '../../core/base-service.js';

const P = () => globalThis.Platform;
const t = (k, v) => (P()?.I18n?.t ? P().I18n.t(k, v) : k);
const SMAP = { pending:'pending', routed:'routed', replied:'replied', acknowledged:'replied',
  'action required':'action', action:'action', closed:'archived', archived:'archived',
  draft:'draft', escalated:'action', resolved:'replied', approved:'replied', rejected:'action', created:'replied' };
const sCls = (v) => SMAP[String(v || '').toLowerCase()] || 'archived';
const badge = (v) => `<span class="pf-badge pf-badge--${sCls(v)}">${v}</span>`;
const CROSS = [['email','correspondence','mail'],['comment','comments','message-square'],
  ['approval','approvals','check-circle'],['task','orchestrator','workflow'],
  ['document','ops-hub','folder'],['reference','response-tracking','table']];

function fmt(v) { return P()?.Format?.dateTime ? P().Format.dateTime(v) : String(v); }

/** Tolerant cell-value resolver (U6). Fixes blank cells across every list/detail renderer: date columns
 *  fall back ts → createdAt → created → Created (live documents carry `Created`/`createdAt`, not `ts`),
 *  and any column tolerates an un-normalized PascalCase source. Returns a formatted string for dates,
 *  the raw value otherwise (callers String()-coerce). */
const DATE_KEYS = new Set(['ts', 'date', 'createdAt', 'created', 'due', 'dueDate', 'ackDue', 'taskDue']);
function cellVal(r, c) {
  if (!r || !c) return '';
  const key = c.key;
  if (key === 'referenceId') return r.__ref || '';
  if (DATE_KEYS.has(key)) {
    const d = r[key] || r.ts || r.createdAt || r.created || r.Created || r.date;
    return d ? fmt(d) : '';
  }
  let v = r[key];
  if ((v == null || v === '') && key) v = r[key.charAt(0).toUpperCase() + key.slice(1)];   // PascalCase fallback
  return (v == null) ? '' : v;
}

/** Loading skeleton shown while data hydrates (production UX feedback). */
const submitGlobalAction = BaseService.endpoint('DYNAMIC_GLOBAL_ACTIONS', { expectedKeys: ['ok', 'data'] });
const META_FIELD_KEYS = new Set(['__ref', '__id', 'status', 'Status', 'referenceId', 'RefIDD', '_sla']);
function humanize(k) { return k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim(); }
function deriveFields(r, columnsHint) {
  const out = [], shown = new Set();
  if (columnsHint) {
    for (const c of columnsHint) {
      if (META_FIELD_KEYS.has(c.key) || c.key === 'referenceId') continue;
      const v = cellVal(r, c);
      if (v !== '' && v != null && typeof v !== 'object') { out.push({ label: t(c.labelKey), value: String(v) }); shown.add(c.key); }
    }
  }
  for (const [k, v] of Object.entries(r)) {
    if (META_FIELD_KEYS.has(k) || shown.has(k)) continue;
    if (v == null || v === '' || typeof v === 'object') continue;
    if (k === 'ts' || k === 'createdAt' || k === 'date') { out.push({ label: humanize(k), value: fmt(v) }); continue; }
    out.push({ label: humanize(k), value: String(v) });
  }
  return out;
}

/** Append rich, fabric-driven sections (comments thread, activity timeline, attachments) to a
 *  detail container for a selected record. Reusable by ANY module's detail renderer — used by
 *  mountListLens by default; callable from custom detail() callbacks (ops-hub, correspondence). */
export function appendRichSections(detail, r, mod, { type, enableComments = true, enableActivity = true, enableAttachments = true, enableReminder = true } = {}) {
  if (!r) return;
  const ref = r.__ref || '';
  const E = P().Entities;

  // Comments — read & post inline; never leave the lens
  if (enableComments && ref && type !== 'comment') {
    const items = E.byReference(ref).comment || [];
    const sec = el('details', { class: 'pf-detail__section pf-detail__collapsible' });
    if (items.length) sec.setAttribute('open', '');
    sec.append(el('summary', {}, [
      el('span', { class: 'pf-overline', text: t('lens.comments') }),
      el('span', { class: 'pf-detail__count', text: String(items.length) })
    ]));
    const thread = document.createElement('pf-comment-thread');
    thread.reference = ref; thread.items = items;
    thread.addEventListener('pf-comment:submit', async (e) => {
      const { text, sentiment, priority } = e.detail;
      if (!text) return;
      const ok = await P().UI.confirm({ titleKey: 'comments.confirmTitle', summaryKey: 'action.confirmSummary',
        details: [{ label: t('entity.reference'), value: ref }, { label: t('comments.add'), value: text }],
        confirmKey: 'comments.add' });
      if (!ok) return;
      const res = await submitGlobalAction({ action: 'addComment', referenceId: ref, body: text, sentiment, priority,
        author: P().State?.get('shared.session.userEmail', '') || t('comments.you') });
      if (res.ok) {
        E.upsert('comment', { referenceId: ref, body: text, sentiment, priority, status: 'Pending',
          author: P().State?.get('shared.session.userEmail', '') || t('comments.you'), ts: new Date().toISOString() });
        P().UI.toastSuccess('comments.added');
        thread.items = E.byReference(ref).comment || [];
      }
    });
    sec.append(thread);
    detail.append(sec);
  }

  // Activity timeline (latest first)
  if (enableActivity && ref && type !== 'activity') {
    const acts = (E.byReference(ref).activity || []).slice().sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
    if (acts.length) {
      const sec = el('details', { class: 'pf-detail__section pf-detail__collapsible' });
      sec.append(el('summary', {}, [
        el('span', { class: 'pf-overline', text: t('lens.activity') }),
        el('span', { class: 'pf-detail__count', text: String(acts.length) })
      ]));
      const list = el('ol', { class: 'pf-detail__activity' });
      acts.forEach((a) => list.append(el('li', { class: 'pf-detail__activity-item' }, [
        el('div', { class: 'pf-detail__activity-when', text: a.ts ? fmt(a.ts) : '' }),
        el('div', { class: 'pf-detail__activity-what', text: a.action || a.__id || '' }),
        a.status ? el('span', { html: badge(a.status) }) : null
      ].filter(Boolean))));
      sec.append(list);
      detail.append(sec);
    }
  }

  // Attachments for email-like records
  if (enableAttachments && (r.emailId || (type === 'email' && r.__id))) {
    const sec = el('details', { class: 'pf-detail__section pf-detail__collapsible' });
    sec.setAttribute('open', '');
    sec.append(el('summary', {}, [el('span', { class: 'pf-overline', text: t('lens.attachments') })]));
    const att = document.createElement('pf-attachment');
    att.emailId = r.emailId || r.__id;
    sec.append(att);
    detail.append(sec);
  }

  // Set reminder — schedule a follow-up against this record/task. Routed through the Dynamic Global
  // Actions flow (setReminder contract; no dedicated endpoint): due picker → preview + confirm →
  // parsed feedback. Surfaces wherever a ref or taskId is present.
  const taskId = (type === 'task' ? (r.taskId || r.__id) : r.taskId) || null;
  if (enableReminder && (ref || taskId)) {
    const sec = el('details', { class: 'pf-detail__section pf-detail__collapsible' });
    sec.append(el('summary', {}, [el('span', { class: 'pf-overline', text: t('reminder.title') })]));
    const due = el('input', { class: 'pf-input', type: 'datetime-local', id: 'rem-due-' + (ref || taskId) });
    const note = el('input', { class: 'pf-input', type: 'text', placeholder: t('reminder.notePlaceholder'), id: 'rem-note-' + (ref || taskId) });
    const channel = el('select', { class: 'pf-input' }, [
      el('option', { value: 'inapp', text: t('reminder.channelInapp') }),
      el('option', { value: 'email', text: t('reminder.channelEmail') })
    ]);
    const btn = el('button', { class: 'pf-btn pf-btn--primary', type: 'button', text: t('reminder.set'),
      onClick: () => {
        const raw = due.value;
        if (!raw) { P().UI && P().UI.toast && P().UI.toast({ messageKey: 'reminder.dueRequired', variant: 'warning' }); return; }
        let dueAt; try { dueAt = new Date(raw).toISOString(); } catch (_) { dueAt = raw; }
        const A = P().Actions;
        if (A && A.run) A.run('setReminder', {
          preview: {
            titleKey: 'reminder.confirmTitle',
            summary: t('reminder.confirmSummary', { when: fmt(dueAt) }),
            confirmKey: 'reminder.set',
            details: [
              ref ? { label: t('entity.reference'), value: ref } : { label: t('entity.task'), value: String(taskId) },
              { label: t('reminder.due'), value: fmt(dueAt) },
              note.value ? { label: t('reminder.note'), value: note.value } : null
            ].filter(Boolean)
          },
          payload: { ref: ref || null, taskId: taskId || null, dueAt, note: note.value || null, channel: channel.value }
        });
      } });
    sec.append(el('div', { class: 'pf-form' }, [
      el('div', { class: 'pf-field' }, [el('label', { class: 'pf-label', text: t('reminder.due') }), due]),
      el('div', { class: 'pf-field' }, [el('label', { class: 'pf-label', text: t('reminder.note') }), note]),
      el('div', { class: 'pf-field' }, [el('label', { class: 'pf-label', text: t('reminder.channel') }), channel]),
      el('div', { class: 'pf-field' }, [btn])
    ]));
    detail.append(sec);
  }
}

/** Full rich-detail renderer: header + fields + related links + inline comments/activity/attachments
 *  + explicit actions. The detail pane becomes a true workspace, not a summary. */
export function renderRichDetail(detail, r, mod, opts = {}) {
  const { type, columns = [], linked = true, actions = null, selectHintKey = 'lens.selectHint' } = opts;
  clear(detail);
  if (!r) {
    detail.append(el('div', { class: 'pf-detail__empty' }, [
      el('pf-icon', { name: 'table', size: '22' }),
      el('p', { class: 'pf-muted', text: t(selectHintKey) })]));
    return;
  }
  const ref = r.__ref || '';
  const E = P().Entities;
  detail.append(el('div', { class: 'pf-detail__head' }, [
    el('h3', { class: 'pf-detail__title', text: r.title || r.subject || ref || r.__id || '' }),
    el('span', { html: badge(r.status || r.Status || '') })]));
  if (ref) detail.append(el('div', { class: 'pf-detail__ref', text: ref }));
  const flds = deriveFields(r, columns);
  if (flds.length) {
    const dl = el('dl', { class: 'pf-detail__fields' });
    flds.forEach((f) => dl.append(el('dt', { text: f.label }), el('dd', { text: f.value })));
    detail.append(dl);
  }
  if (linked && ref) {
    const rel = E.byReference(ref);
    const links = CROSS.filter(([et]) => et !== type && et !== 'comment').map(([et, modId, icon]) => {
      const n = et === 'reference' ? 1 : (rel[et] || []).length; if (!n) return null;
      return el('button', { class: 'pf-btn pf-btn--ghost', html: `<pf-icon name="${icon}" size="14"></pf-icon> ${t('entity.' + et)} (${n})`,
        onClick: () => P().goToEntity(ref, modId) });
    }).filter(Boolean);
    if (links.length) detail.append(el('div', { class: 'pf-detail__section' },
      [el('div', { class: 'pf-overline', text: t('lens.related') }), el('div', { class: 'pf-detail__links' }, links)]));
  }
  // For emails: full headers block + sandboxed body (matches SPA renderEmailFullView)
  if (type === 'email') {
    const headers = [
      ['From',  r.sender || r.from || r.fromAddress || ''],
      ['To',    Array.isArray(r.toRecipients) ? r.toRecipients.join('; ') : (r.to || r.toRecipients || '')],
      ['Cc',    Array.isArray(r.ccRecipients) ? r.ccRecipients.join('; ') : (r.cc || r.ccRecipients || '')],
      ['Date',  r.ts || r.receivedDateTime || r.sentDateTime || ''],
      ['Subject', r.subject || r.title || ''],
      ['Importance', r.importance || ''],
      ['Has Attachments', r.hasAttachments != null ? String(r.hasAttachments) : '']
    ].filter(([, v]) => v != null && v !== '');
    if (headers.length) {
      const dl = el('dl', { class: 'pf-email-headers' });
      headers.forEach(([k, v]) => { dl.append(el('dt', { text: k }), el('dd', { text: String(v) })); });
      detail.append(el('div', { class: 'pf-detail__section' }, [
        el('div', { class: 'pf-overline', text: t('email.headers') }), dl
      ]));
    }
    const body = r.body || r.bodyContent || r.bodyPreview || '';
    if (body) {
      const isHtml = /<\s*[a-z][^>]*>/i.test(body);
      const sandbox = document.createElement('pf-sandboxed-iframe');
      if (isHtml) sandbox.html = body; else sandbox.text = body;
      detail.append(el('div', { class: 'pf-detail__section' }, [
        el('div', { class: 'pf-overline', text: t('email.body') }), sandbox
      ]));
    }
  }
  // Activity timeline — synthesised from record + related comments/tasks
  if (r && (r.__ref || r.referenceId)) {
    const tlSection = el('div', { class: 'pf-detail__section' });
    tlSection.append(el('div', { class: 'pf-overline', text: t('lens.timeline.title') }));
    const tlHost = el('div', {});
    tlSection.append(tlHost);
    renderActivityTimeline(tlHost, r, r.__ref || r.referenceId);
    detail.append(tlSection);
  }
  appendRichSections(detail, r, mod, { type });
  if (actions && actions.length) {
    const acts = actions.filter((a) => !a.when || a.when(r)).map((a) => {
      const b = el('button', { class: 'pf-btn ' + (a.danger ? 'pf-btn--danger' : 'pf-btn--primary'),
        html: `${a.icon ? `<pf-icon name="${a.icon}" size="14"></pf-icon> ` : ''}${t(a.labelKey)}` });
      b.addEventListener('click', () => a.run(r, mod, b));
      return b;
    });
    if (acts.length) detail.append(el('div', { class: 'pf-detail__actions' }, acts));
  }
}

function loadingBlock() {
  const rows = Array.from({ length: 4 }, () => el('div', { class: 'pf-skel-row', 'aria-hidden': 'true' }));
  return el('div', { class: 'pf-card', style: 'padding:var(--space-5)', 'aria-busy': 'true' },
    [el('div', { class: 'pf-overline', text: t('common.state.loading') }), ...rows]);
}
/** Skeleton helpers — shown while the fabric hydrates, then replaced by real content on
 *  entity:bootstrapped. Shimmer animation defined in styles/components.css (.pf-skeleton). */
export function skeletonTable(rowCount = 6, colCount = 4) {
  const head = el('thead', {}, [el('tr', {}, Array.from({ length: colCount }, () => el('th', {}, [el('div', { class: 'pf-skeleton', style: 'height:1em;width:60%' })])))]);
  const body = el('tbody', {}, Array.from({ length: rowCount }, () => el('tr', {},
    Array.from({ length: colCount }, () => el('td', {}, [el('div', { class: 'pf-skeleton', style: `height:1em;width:${50 + Math.floor(Math.random() * 40)}%` })])))));
  return el('div', { class: 'pf-card pf-table-wrap', 'aria-busy': 'true', 'aria-label': t('common.state.loading') },
    [el('table', { class: 'pf-table' }, [head, body])]);
}
export function skeletonTiles(count = 6) {
  return el('div', { class: 'pf-grid', 'aria-busy': 'true', 'aria-label': t('common.state.loading') },
    Array.from({ length: count }, () => el('div', { class: 'pf-stat pf-skeleton-tile' }, [
      el('div', { class: 'pf-skeleton', style: 'height:0.8em;width:55%;margin-bottom:var(--space-3)' }),
      el('div', { class: 'pf-skeleton', style: 'height:1.6em;width:35%' })])));
}
export function skeletonCards(count = 8) {
  return el('div', { class: 'pf-md__gallery', 'aria-busy': 'true', 'aria-label': t('common.state.loading') },
    Array.from({ length: count }, () => el('div', { class: 'pf-md__card pf-skeleton-card' }, [
      el('div', { class: 'pf-skeleton', style: 'height:0.7em;width:30%;margin-bottom:var(--space-3)' }),
      el('div', { class: 'pf-skeleton', style: 'height:1em;width:80%;margin-bottom:var(--space-2)' }),
      el('div', { class: 'pf-skeleton', style: 'height:0.8em;width:50%' })])));
}

export function setBusy(btn, on, busyKey) {
  if (!btn) return;
  if (on) { btn._t = btn.textContent; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = t(busyKey || 'common.actions.processing'); }
  else { btn.disabled = false; btn.removeAttribute('aria-busy'); if (btn._t != null) btn.textContent = btn._t; }
}

function barChart(byStatus) {
  const entries = Object.entries(byStatus || {}).filter(([k]) => k !== 'unknown');
  if (!entries.length) return el('span');
  const max = Math.max(1, ...entries.map(([, v]) => v));
  const viz = ['--viz-1','--viz-2','--viz-3','--viz-4','--viz-5','--viz-6','--viz-7','--viz-8'];
  const chart = el('div', { style: 'display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-3)' },
    entries.map(([k, v], i) => el('div', { style: 'display:flex;align-items:center;gap:var(--space-3)' }, [
      el('span', { style: 'width:130px;font-size:var(--size-body-sm);color:var(--color-text-muted);text-transform:capitalize', text: k }),
      el('div', { style: `height:18px;border-radius:var(--radius-sm);background:var(${viz[i % 8]});width:${Math.round(v / max * 100)}%;min-width:28px;transition:width var(--duration-slow) var(--easing-standard)` }),
      el('span', { style: 'font-weight:var(--fw-semibold)', text: String(v) })
    ])));
  return el('div', { class: 'pf-card', style: 'padding:var(--space-5);margin-top:var(--space-5)' },
    [el('div', { class: 'pf-overline', text: t('home.byStatus') }), chart]);
}

export function mountListLens(mod, root, { type, columns, csvName = 'export.csv', linked = true, focusRef = '', fields = null, actions = null, selectHintKey = 'lens.selectHint' }) {
  const region = root.querySelector('[data-region="content"]') || root;
  clear(region);
  const E = P().Entities;
  const filter = document.createElement('pf-filter-bar');
  filter.statuses = [{ value:'pending', labelKey:'status.pending' }, { value:'routed', labelKey:'status.routed' },
    { value:'replied', labelKey:'status.replied' }, { value:'closed', labelKey:'status.closed' }];
  const toolbar = el('div', { class: 'pf-toolbar', style: 'margin-bottom:var(--space-3)' },
    [el('button', { class: 'pf-btn pf-btn--ghost', html: `<pf-icon name="download" size="14"></pf-icon> ${t('common.actions.export')}`, onClick: () => exportCsv() })]);
  const split = el('div', { class: 'pf-list__split' });
  const main = el('div', { class: 'pf-list__main' });
  const wrap = el('div', { class: 'pf-card pf-table-wrap' });
  const detail = el('aside', { class: 'pf-card pf-list__detail', 'aria-live': 'polite', 'aria-label': t('lens.detailLabel') });
  main.append(wrap); split.append(main, detail);
  region.append(toolbar, filter, el('div', { style: 'height:var(--space-3)' }), split);
  let q = focusRef ? String(focusRef).toLowerCase() : '', st = '', rows = [], _focused = false, _selRef = null;
  const _filterCache = createFilterCache();   // LRU cache so repeated keystrokes don't re-scan 300 docs
  let _allRows = null;                          // A-17: scoped snapshot; rebuilt only on fabric change

  function apply() {
    if (!E.isHydrated()) { renderSkeleton(); return; }
    // A-17 — snapshot E.all(type) ONCE per fabric version. Post-seal each reader call deep-clones +
    // freezes every record, so re-scanning on every keystroke is costly; a stable snapshot also lets
    // the LRU filter-cache (keyed on rows identity) actually hit across keystrokes.
    if (!_allRows) _allRows = E.all(type);
    rows = _filterCache.filter(_allRows, q, st, (r, qq, ss) => {
      const sv = String(r.status || r.Status || '').toLowerCase();
      if (ss && sv !== ss) return false;
      if (!qq) return true;
      return Object.values(r).some((v) => v != null && typeof v !== 'object' && String(v).toLowerCase().includes(qq));
    });
    render();
  }
  // Invalidate the scoped snapshot + cache when the fabric changes (new ingest / upsert).
  mod.bus('entity:bootstrapped', () => { _allRows = null; _filterCache.clear(); });
  mod.bus('entity:changed', () => { _allRows = null; _filterCache.clear(); });
  function renderSkeleton() {
    filter.count = 0;
    clear(wrap);
    const sk = skeletonTable(8, columns.length || 4);
    // strip the outer wrap card so we don't nest cards
    wrap.append(...sk.childNodes);
    clear(detail);
    detail.append(el('div', { class: 'pf-detail__empty' }, [
      el('div', { class: 'pf-skeleton', style: 'height:1.5em;width:60%;margin-bottom:var(--space-3)' }),
      el('div', { class: 'pf-skeleton', style: 'height:1em;width:40%' })]));
  }
  function render() {
    filter.count = rows.length;
    clear(wrap);
    if (!rows.length) {
      // module-specific empty hint, with generic fallback
      const hintKey = `module.${mod.id}.empty`;
      const hint = t(hintKey); const finalHint = hint === hintKey ? t('lens.emptyHint') : hint;
      wrap.append(el('div', { class: 'pf-empty' }, [
        el('div', { class: 'pf-empty__title', text: t('common.state.empty') }),
        el('p', { class: 'pf-empty__hint', text: finalHint })]));
      _selRef = null; renderDetail(null); return;
    }
    const head = el('thead', {}, [el('tr', {}, columns.map((c) => el('th', { text: t(c.labelKey) })))]);
    const body = el('tbody', {}, rows.map((r) => {
      const tr = el('tr', { 'data-ref': r.__ref || '', tabindex: linked ? '0' : null }, columns.map((c) => {
        const v = cellVal(r, c);
        return c.key === 'status' ? el('td', { html: badge(v) }) : el('td', { text: String(v) });
      }));
      if (linked) {
        tr.addEventListener('click', () => selectRow(tr, r));
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRow(tr, r); } });
      }
      return tr;
    }));
    wrap.append(el('table', { class: 'pf-table' + (linked ? ' pf-table--selectable' : '') }, [head, body]));
    // restore prior selection, or auto-focus the deep-linked / first row
    if (_selRef) { const tr = wrap.querySelector(`tr[data-ref="${cssEsc(_selRef)}"]`); if (tr) { highlight(tr); renderDetail(rows.find((x) => (x.__ref || '') === _selRef)); } else { _selRef = null; renderDetail(null); } }
    else if (focusRef && !_focused) {
      const tr = wrap.querySelector('tr[data-ref]'); const ref = tr && tr.getAttribute('data-ref');
      if (ref) { selectRow(tr, rows[0]); tr.scrollIntoView({ block: 'nearest' }); }
      _focused = true;
    } else { renderDetail(null); }
  }
  function cssEsc(v) { return String(v).replace(/["\\\]]/g, '\\$&'); }
  function highlight(tr) { [...wrap.querySelectorAll('tr[data-ref]')].forEach((x) => x.setAttribute('aria-selected', x === tr ? 'true' : 'false')); }
  /** User selection: highlight + set shared context (STATE ONLY — never a network call) + show detail. */
  function selectRow(tr, r) {
    _selRef = r.__ref || null;
    highlight(tr);
    if (r.__ref && P().Context && P().Context.activeReference?.() !== r.__ref) P().Context.setActive(r.__ref, mod.id);
    renderDetail(r);
    if (globalThis.matchMedia && matchMedia('(max-width:900px)').matches) detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  /** External context change (another module selected a ref): mirror selection here without re-emitting. */
  function syncSelection() {
    const ref = P().Context && P().Context.activeReference && P().Context.activeReference();
    if (!ref || ref === _selRef) return;
    const tr = wrap.querySelector(`tr[data-ref="${cssEsc(ref)}"]`);
    if (tr) { _selRef = ref; highlight(tr); renderDetail(rows.find((x) => (x.__ref || '') === ref)); tr.scrollIntoView({ block: 'nearest' }); }
  }
  function renderDetail(r) {
    renderRichDetail(detail, r, mod, { type, columns: fields || columns, linked, actions, selectHintKey });
  }
  function exportCsv() {
    const cols = columns.map((c) => ({ key: c.key === 'referenceId' ? '__ref' : c.key, label: t(c.labelKey) }));
    P().Format.downloadCsv(csvName, P().Format.toCsv(rows, cols));
  }
  filter.addEventListener('pf-filter:change', (e) => { q = e.detail.query; st = e.detail.status; apply(); });
  mod.bus('entity:loading', () => renderSkeleton());
  mod.bus('entity:bootstrapped', apply); mod.bus('entity:changed', apply);
  mod.bus('context:reference:changed', syncSelection);
  apply();
}

/** Reusable horizontal breakdown bars from a {label:count} map (priority, workload, …). */
export function breakdownBars(titleKey, obj, { max = 8, accent = 'var(--color-brand-primary)' } = {}) {
  const entries = Object.entries(obj || {}).filter(([k]) => k && k !== 'unknown')
    .sort((a, b) => b[1] - a[1]).slice(0, max);
  const peak = Math.max(1, ...entries.map(([, v]) => v));
  return el('div', { class: 'pf-card', style: 'padding:var(--space-5);margin-top:var(--space-5)' }, [
    el('div', { class: 'pf-overline', text: t(titleKey) }),
    el('div', { style: 'display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-3)' },
      entries.length ? entries.map(([k, v]) => el('div', { style: 'display:flex;align-items:center;gap:var(--space-3)' }, [
        el('div', { style: 'min-width:9rem;color:var(--color-text-muted);font-size:.85em', text: k }),
        el('div', { style: 'flex:1;background:var(--color-surface-sunken);border-radius:var(--radius-pill);overflow:hidden' },
          [el('div', { style: `height:.7rem;width:${Math.round((v / peak) * 100)}%;background:${accent};border-radius:var(--radius-pill)` })]),
        el('div', { style: 'min-width:2rem;text-align:right', text: String(v) })
      ])) : [el('p', { class: 'pf-muted', text: t('agg.none') })])
  ]);
}

/** Reusable "needs attention" list (e.g. overdue items) with deep-links into the fabric. */
export function attentionList(titleKey, items, { modId = 'response-tracking' } = {}) {
  return el('div', { class: 'pf-card', style: 'padding:var(--space-5);margin-top:var(--space-5)' }, [
    el('div', { class: 'pf-overline', text: t(titleKey) }),
    el('div', { style: 'display:flex;flex-direction:column;gap:var(--space-1);margin-top:var(--space-3)' },
      (items && items.length) ? items.map((it) => {
        const row = el('button', { class: 'pf-btn pf-btn--ghost', style: 'justify-content:space-between;width:100%;text-align:left' }, [
          el('span', { text: it.title || it.ref || '—' }),
          el('span', { class: 'pf-badge pf-badge--review', text: it.due ? fmt(it.due) : (it.assignedTo || '') })
        ]);
        if (it.ref) row.addEventListener('click', () => P().goToEntity(it.ref, modId));
        return row;
      }) : [el('p', { class: 'pf-muted', text: t('agg.clear') })])
  ]);
}


/** Render a due-date heatmap (7×N grid) from records that carry a due-date field.
 *  Each cell is one day; the intensity reflects how many records are due that day.
 *  Clicking a cell calls onCellClick({date, items}) so the consumer can show that day's items.
 *
 *  Mirrors the SPA's heat-calendar pattern. Uses tokens; no hex. */
export function renderHeatmap(container, items, opts = {}) {
  const {
    weeks = 12,                    // show this many weeks (past+future)
    startDaysAgo = 30,             // start window N days before today
    dueField = 'taskDue',          // record field carrying the date (ISO or yyyy-mm-dd)
    fallbackFields = ['dueDate', 'DueDate', 'TaskDue', 'taskDueDate'],
    onCellClick = null
  } = opts;
  clear(container);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(today.getDate() - startDaysAgo);
  // Snap start to a Sunday
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);

  // Build {yyyy-mm-dd: count + items} buckets
  const byDate = new Map();
  for (const it of items) {
    const raw = it[dueField] || fallbackFields.map((f) => it[f]).find(Boolean);
    if (!raw) continue;
    const d = new Date(raw);
    if (!Number.isFinite(d.valueOf())) continue;
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const entry = byDate.get(key) || { count: 0, items: [] };
    entry.count++; entry.items.push(it);
    byDate.set(key, entry);
  }
  const maxCount = Math.max(1, ...[...byDate.values()].map((e) => e.count));

  // Build the grid: 7 rows (Sun→Sat) × weeks columns
  const grid = el('div', { class: 'pf-heatmap__grid' });
  const monthLabels = el('div', { class: 'pf-heatmap__months' });
  let lastMonth = -1;
  for (let week = 0; week < weeks; week++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(start); d.setDate(start.getDate() + week * 7 + day);
      const key = d.toISOString().slice(0, 10);
      const entry = byDate.get(key) || { count: 0, items: [] };
      const isToday = d.getTime() === today.getTime();
      const isPast = d < today;
      const intensity = entry.count === 0 ? 0
        : entry.count === 1 ? 1
        : entry.count <= 3 ? 2
        : entry.count <= 6 ? 3 : 4;
      const cell = el('button', {
        type: 'button', class: 'pf-heatmap__cell',
        'data-intensity': String(intensity),
        'data-overdue': isPast && entry.count > 0 ? '1' : '0',
        'data-today': isToday ? '1' : '0',
        'data-date': key,
        title: `${key} — ${entry.count} item(s)${isPast && entry.count > 0 ? ' (overdue)' : ''}`,
        style: `grid-column:${week + 1};grid-row:${day + 1}`
      });
      if (onCellClick) cell.addEventListener('click', () => onCellClick({ date: key, items: entry.items }));
      grid.append(cell);
      // Month label for the top row, when month changes
      if (day === 0 && d.getMonth() !== lastMonth) {
        monthLabels.append(el('span', { class: 'pf-heatmap__month', style: `grid-column:${week + 1}`,
          text: d.toLocaleString(undefined, { month: 'short' }) }));
        lastMonth = d.getMonth();
      }
    }
  }

  // Legend
  const legend = el('div', { class: 'pf-heatmap__legend' }, [
    el('span', { class: 'pf-heatmap__legend-label', text: t('lens.heatmap.legend') }),
    ...[0, 1, 2, 3, 4].map((i) => el('span', { class: 'pf-heatmap__cell pf-heatmap__cell--legend',
      'data-intensity': String(i) })),
    el('span', { class: 'pf-heatmap__legend-label', text: t('lens.heatmap.more') })
  ]);

  const overdueCount = [...byDate.entries()].filter(([k]) => new Date(k) < today).reduce((n, [, v]) => n + v.count, 0);
  const upcoming = [...byDate.entries()].filter(([k]) => new Date(k) >= today).reduce((n, [, v]) => n + v.count, 0);

  container.append(
    el('div', { class: 'pf-heatmap__stats' }, [
      el('span', { html: `<strong>${overdueCount}</strong> ${t('lens.heatmap.overdue')}` }),
      el('span', { html: `<strong>${upcoming}</strong> ${t('lens.heatmap.upcoming')}` }),
      el('span', { html: `<strong>${maxCount}</strong> ${t('lens.heatmap.peak')}` })
    ]),
    monthLabels,
    grid,
    legend
  );
}


/** Build an activity timeline for a record. Synthesizes events from:
 *   - The record's own creation timestamp (ts/createdAt/Created)
 *   - Related comments (Entities.byReference(ref).comment) — each comment is a 'comment' event
 *   - Status changes if the record carries assignmentHistory / activity (defensive — not always present)
 *   - Assignment / re-assignment events from task records linked to the same ref
 *  Returns [{ts, kind, label, actor?, body?, badge?}] sorted oldest→newest. */
export function buildActivityTimeline(r, ref) {
  const events = [];
  const P = (typeof globalThis !== 'undefined' && globalThis.Platform) ? globalThis.Platform : null;
  const E = P && P.Entities;

  // Self-creation event
  const createdAt = r && (r.ts || r.createdAt || r.Created || r.receivedDateTime);
  if (createdAt) {
    events.push({ ts: createdAt, kind: 'created', label: 'Created',
      actor: r.createdBy || r.CreatedBy || r.author || '', body: r.title || r.subject || '', badge: 'neutral' });
  }
  if (!E || !ref) return events.sort((a, b) => new Date(a.ts) - new Date(b.ts));

  // Comments
  const comments = E.byReference(ref).comment || [];
  comments.forEach((c) => {
    if (c._deleted) return;
    events.push({ ts: c.ts || c.createdAt || c.Created, kind: 'comment',
      label: c.parentId ? 'Reply' : 'Comment',
      actor: c.author || c.by || '', body: (c.body || c.text || '').slice(0, 200),
      badge: (c.priority || '').toLowerCase().includes('urgent') ? 'danger' : 'neutral' });
  });

  // Sibling tasks (treat each one as an assignment event)
  if (r && r.__id !== undefined) {
    // For document records, sibling tasks indicate assignment events
    const tasks = E.byReference(ref).task || [];
    tasks.forEach((t) => {
      if (t === r) return;
      events.push({ ts: t.ts || t.createdAt || t.Created || createdAt, kind: 'assignment',
        label: 'Assigned',
        actor: t.assignedTo || '',
        body: t.title || '',
        badge: 'routed' });
    });
  }

  // A-16 — fold audit:* events for this reference into the thread. The audit log is a bounded ring
  // buffer (not yet ref-indexed, A-12), so we scan it and keep entries whose payload carries this ref.
  // This surfaces phase transitions, blocked-access attempts, dispatch + archive events in one timeline.
  const AL = P && P.AuditLog;
  if (AL && typeof AL.log === 'function') {
    let entries = [];
    try { entries = AL.log({ limit: 1000 }); } catch (_) { entries = []; }
    for (const e of entries) {
      const pr = e.payload || {};
      const evRef = pr.ref || pr.reference || pr.referenceId || pr.attemptedRef;
      if (String(evRef || '') !== String(ref)) continue;
      events.push({ ts: e.ts, kind: 'audit',
        label: auditLabel(e.kind),
        actor: pr.by || pr.persona || pr.actor || '',
        body: auditBody(e.kind, pr),
        badge: auditBadge(e.kind) });
    }
  }

  return events.sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

/** Audit-event presentation helpers (A-16). Map an audit kind + payload to label/body/badge. */
function auditLabel(kind) {
  return String(kind || 'audit').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()).trim();
}
function auditBody(kind, pr) {
  if (kind === 'phase-transition') return `${pr.from || '∅'} → ${pr.to || ''}`;
  if (kind === 'unauthorized-access-attempt') return pr.action || pr.requiredDirectorate || '';
  if (pr.to) return String(pr.to);
  if (pr.reason) return String(pr.reason);
  if (pr.message) return String(pr.message).slice(0, 200);
  return '';
}
function auditBadge(kind) {
  if (/unauthor|failed|reject|escalat/i.test(kind)) return 'danger';
  if (/transition|assign|dispatch|route/i.test(kind)) return 'routed';
  if (/archiv|closed|approv/i.test(kind)) return 'replied';
  return 'neutral';
}

const TIMELINE_ICON = { created: 'plus-circle', comment: 'message-square', assignment: 'user-plus', audit: 'shield' };
const TIMELINE_CHUNK = 40;   // A-14: render in windows so 100+ events don't build all DOM at once

/** Build one flattened timeline <li> (A-15: one wrapper fewer per item than the prior structure). */
function timelineItem(ev) {
  const dt = ev.ts ? new Date(ev.ts) : null;
  const when = dt && Number.isFinite(dt.valueOf())
    ? (globalThis.Platform?.Format?.dateTime ? globalThis.Platform.Format.dateTime(dt) : dt.toLocaleString())
    : '—';
  const icon = TIMELINE_ICON[ev.kind] || 'circle';
  return el('li', { class: 'pf-timeline__item', 'data-kind': ev.kind, 'data-badge': ev.badge || 'neutral' }, [
    el('span', { class: 'pf-timeline__icon', html: `<pf-icon name="${icon}" size="14"></pf-icon>` }),
    el('div', { class: 'pf-timeline__head' }, [
      el('strong', { text: ev.label }),
      ev.actor ? el('span', { class: 'pf-muted', text: ' · ' + ev.actor }) : null,
      el('span', { class: 'pf-timeline__when', text: when })
    ].filter(Boolean)),
    ev.body ? el('div', { class: 'pf-timeline__text', text: ev.body }) : null
  ].filter(Boolean));
}

/** Render a vertical activity timeline into a container.
 *  A-14 — virtualized: only TIMELINE_CHUNK items are built up front; the rest stream in as the user
 *  scrolls (IntersectionObserver), with a tap-to-reveal fallback where the observer is unavailable.
 *  Keeps the DOM small on the Galaxy Tab A9 for archive threads with hundreds of events (B-2). */
export function renderActivityTimeline(container, r, ref) {
  clear(container);
  const events = buildActivityTimeline(r, ref);
  if (!events.length) {
    container.append(el('p', { class: 'pf-muted', text: t('lens.timeline.empty') }));
    return;
  }
  const list = el('ol', { class: 'pf-timeline' });
  container.append(list);

  let i = 0;
  function appendChunk() {
    const end = Math.min(i + TIMELINE_CHUNK, events.length);
    const frag = document.createDocumentFragment();
    for (; i < end; i++) frag.append(timelineItem(events[i]));
    list.append(frag);
  }
  appendChunk();
  if (i >= events.length) return;   // everything fit in one chunk

  if (typeof globalThis.IntersectionObserver === 'function') {
    const sentinel = el('li', { class: 'pf-timeline__sentinel', 'aria-hidden': 'true' });
    list.append(sentinel);
    const io = new globalThis.IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      sentinel.remove();
      appendChunk();
      if (i < events.length) { list.append(sentinel); } else { io.disconnect(); }
    }, { root: null, rootMargin: '240px' });
    io.observe(sentinel);
  } else {
    // Fallback: explicit "show more" control for environments without IntersectionObserver.
    const more = el('button', { type: 'button', class: 'pf-btn pf-btn--ghost pf-timeline__more',
      text: t('lens.timeline.more', { n: events.length - i }) });
    const step = () => {
      appendChunk();
      if (i < events.length) { more.textContent = t('lens.timeline.more', { n: events.length - i }); container.append(more); }
      else more.remove();
    };
    more.addEventListener('click', () => { more.remove(); step(); });
    container.append(more);
  }
}

export function mountAggregator(mod, root, { tiles, table = null }) {
  const region = root.querySelector('[data-region="content"]') || root;
  const E = P().Entities;
  function render() {
    clear(region);
    if (!E.isHydrated()) { region.append(skeletonTiles(tiles.length)); return; }
    const c = E.counts();
    region.append(el('div', { class: 'pf-grid' }, tiles.map(([type, modId, icon]) => {
      const card = el('button', { class: 'pf-stat', style: 'text-align:left;width:100%;cursor:pointer' }, [
        el('div', { class: 'pf-stat__label', html: `<pf-icon name="${icon}" size="14"></pf-icon> ${t('entity.' + type)}` }),
        el('div', { class: 'pf-stat__value', text: String(c[type] || 0) })]);
      if (modId) card.addEventListener('click', () => P().Router.navigate(modId));
      return card;
    })));
    region.append(barChart(c.byStatus));
    if (table) {
      const rows = E.all(table.type);
      const wrap = el('div', { class: 'pf-card pf-table-wrap', style: 'margin-top:var(--space-5)' });
      const tb = el('div', { class: 'pf-toolbar', style: 'margin-bottom:var(--space-3)' },
        [el('button', { class: 'pf-btn pf-btn--ghost', text: t('common.actions.export'),
          onClick: () => P().Format.downloadCsv(table.csvName || 'report.csv', P().Format.toCsv(rows, table.columns.map((c) => ({ key: c.key === 'referenceId' ? '__ref' : c.key, label: t(c.labelKey) })))) })]);
      const head = el('thead', {}, [el('tr', {}, table.columns.map((c) => el('th', { text: t(c.labelKey) })))]);
      const body = el('tbody', {}, rows.map((r) => el('tr', {}, table.columns.map((c) => {
        const v = cellVal(r, c);
        return c.key === 'status' ? el('td', { html: badge(v) }) : el('td', { text: String(v) });
      }))));
      region.append(tb, wrap); wrap.append(el('table', { class: 'pf-table' }, [head, body]));
    }
  }
  mod.bus('entity:loading', render); mod.bus('entity:bootstrapped', render); mod.bus('entity:changed', render); render();
}

export function mountActionLens(mod, root, { fields, endpoint, endpointKey = '', entityType, action, danger = false }) {
  const region = root.querySelector('[data-region="content"]') || root;
  clear(region);
  const form = el('form', { class: 'pf-form' });
  for (const f of fields) {
    const id = 'f-' + f.name;
    const input = f.type === 'textarea' ? el('textarea', { id, name: f.name, rows: '3' })
      : f.type === 'select' ? el('select', { id, name: f.name }, (f.options || []).map((o) => el('option', { value: o.value, text: t(o.labelKey) })))
      : el('input', { id, name: f.name, type: f.type || 'text' });
    form.append(el('div', { class: 'pf-field' }, [el('label', { for: id, text: t(f.labelKey) }), input]));
  }
  for (const f of fields) { const er = el('div', { class: 'pf-field__err', id: 'err-' + f.name, role: 'alert' }); form.querySelector('#f-' + f.name)?.insertAdjacentElement('afterend', er); }
  const submitBtn = el('button', { class: 'pf-btn pf-btn--primary', type: 'submit', text: t('common.actions.submit') });
  form.append(submitBtn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = {}; let invalid = false;
    for (const f of fields) {
      const inp = form.querySelector('[name="' + f.name + '"]'); values[f.name] = inp.value.trim();
      const er = form.querySelector('#err-' + f.name);
      if (f.required !== false && !values[f.name]) { inp.classList.add('is-invalid'); if (er) er.textContent = t('validation.required'); invalid = true; }
      else { inp.classList.remove('is-invalid'); if (er) er.textContent = ''; }
    }
    if (invalid) { P().UI.toast({ messageKey: 'validation.fix', variant: 'warning' }); return; }
    // MANDATORY preview/confirm before any write (§execution safety)
    const target = values.RefIDD || values.referenceId || '(new)';
    const details = [
      { label: t('confirm.action'), value: action },
      { label: t('confirm.target'), value: `${entityType || 'record'} · ${target}` },
      { label: t('confirm.endpoint'), value: endpointKey },
      ...fields.map((f) => ({ label: t(f.labelKey), value: values[f.name] || '—' })),
      { label: t('confirm.impact'), value: t('confirm.impactWrite') }
    ];
    const ok = await P().UI.confirm({ titleKey: 'action.confirmTitle', summaryKey: 'action.confirmSummary', details, confirmKey: 'common.actions.submit', danger });
    if (!ok) return;  // Cancel = full rollback: nothing written, form retained
    setBusy(submitBtn, true);
    try {
      const result = await mod.call(endpoint, { action, ...values });
      if (result.ok) {
        if (entityType) P().Entities.upsert(entityType, { referenceId: target === '(new)' ? undefined : target, title: values.Title || values.title, assignedTo: values.assignedTo, priority: values.Priority || values.priority, status: 'Created', ts: new Date().toISOString() });
        P().UI.actionCompleted('action.done', { module: mod.id, entityType, target });
        form.reset();
      } else {
        P().UI.toast({ messageKey: 'action.failed', variant: 'error' });
      }
    } catch (err) { P().UI.toast({ messageKey: 'action.failed', variant: 'error' }); P().Log.error('action.exception', { module: mod.id, message: String(err && err.message || err) }); }
    finally { setBusy(submitBtn, false); }
  });
  region.append(el('div', { class: 'pf-card', style: 'padding:var(--space-6)' }, [form]));
}

/* ── Sub-view infrastructure for bespoke hub panels (ported from NITDA_Digital_Ops_Hub) ── */

/** Tabbed sub-view container. tabs:[{id,labelKey,render(panel,mod)}]. Re-renders active tab on fabric change. */
export function mountTabbedLens(mod, root, { tabs, defaultTab, toolbar = null }) {
  const region = root.querySelector('[data-region="content"]') || root;
  clear(region);
  const bar = el('div', { class: 'pf-subnav', role: 'tablist' });
  const toolHost = el('div', { class: 'pf-subnav__toolbar' });
  const panel = el('div', { class: 'pf-subpanel' });
  region.append(bar, toolHost, panel);
  let active = defaultTab || tabs[0].id;
  function paintBar() {
    clear(bar);
    tabs.forEach((tb) => {
      const count = typeof tb.count === 'function' ? tb.count() : null;
      const b = el('button', { class: 'pf-subnav__tab' + (tb.id === active ? ' is-active' : ''), role: 'tab',
        'aria-selected': tb.id === active ? 'true' : 'false',
        html: `${t(tb.labelKey)}${count != null ? ` <span class="pf-subnav__count">${count}</span>` : ''}` });
      b.addEventListener('click', () => { active = tb.id; render(); });
      bar.append(b);
    });
  }
  function render() {
    paintBar(); clear(toolHost);
    if (typeof toolbar === 'function') {
      const items = toolbar({ active, mod }) || [];
      items.forEach((b) => toolHost.append(b));
    }
    clear(panel);
    const tab = tabs.find((x) => x.id === active) || tabs[0];
    tab.render(panel, mod);
  }
  mod.bus('entity:bootstrapped', render); mod.bus('entity:changed', render); mod.bus('context:reference:changed', render);
  render();
}

/** Render a fabric table into a container (shared by sub-views). columns:[{key,labelKey}] */
/** Reusable fabric-backed table.
 *  Default mode (no opts): plain table — backward compatible for any existing caller.
 *  Master-detail mode (opts.detail = true): table on the left + sticky workspace detail pane on the
 *  right (renderRichDetail). Selection is state-only (no flow); `onRow` still fires for cross-module
 *  context sync. Provide opts.type to enable proper detail-pane comments/activity sections. */
export function renderFabricTable(container, rows, columns, onRow, opts = {}) {
  const { type, detail = false, linked = true, actions = null, mod = null, selectHintKey = 'lens.selectHint',
          pageSize = 100 } = opts;
  clear(container);
  const moduleHintKey = mod && mod.id ? `module.${mod.id}.empty` : null;
  if (!rows.length) {
    const hint = moduleHintKey ? t(moduleHintKey) : t('lens.emptyHint');
    const finalHint = (moduleHintKey && hint === moduleHintKey) ? t('lens.emptyHint') : hint;
    container.append(el('div', { class: 'pf-empty' }, [
      el('div', { class: 'pf-empty__title', text: t('common.state.empty') }),
      el('p', { class: 'pf-empty__hint', text: finalHint })]));
    return;
  }
  // Pagination state — only kicks in when pageSize > 0 and rows.length > pageSize
  const paginate = pageSize > 0 && rows.length > pageSize;
  let page = 1;
  function visibleRows() { return paginate ? rows.slice((page - 1) * pageSize, page * pageSize) : rows; }
  function pager() {
    if (!paginate) return null;
    const total = rows.length, pages = Math.ceil(total / pageSize);
    const wrap = el('div', { class: 'pf-pager' });
    const info = el('span', { class: 'pf-pager__info',
      text: t('lens.pagerInfo', { from: ((page - 1) * pageSize + 1), to: Math.min(page * pageSize, total), total }) });
    const prev = el('button', { class: 'pf-btn pf-btn--ghost', type: 'button', text: '‹ ' + t('lens.pagerPrev'),
      disabled: page === 1 ? 'disabled' : null });
    const next = el('button', { class: 'pf-btn pf-btn--ghost', type: 'button', text: t('lens.pagerNext') + ' ›',
      disabled: page === pages ? 'disabled' : null });
    prev.addEventListener('click', () => { if (page > 1) { page--; rerender(); } });
    next.addEventListener('click', () => { if (page < pages) { page++; rerender(); } });
    wrap.append(prev, info, next);
    return wrap;
  }
  if (!detail) {
    // Plain table mode — preserved for any caller that doesn't opt-in to master-detail.
    function rerender() {
      clear(container);
      container.append(el('div', { class: 'pf-card pf-table-wrap' }, [_fabricTable(visibleRows(), columns, onRow, false)]));
      const lg0 = rowLegend(rows); if (lg0) container.append(lg0);
      const p = pager(); if (p) container.append(p);
    }
    rerender();
    return;
  }
  // Master-detail mode — adds an always-visible sticky detail workspace.
  const split = el('div', { class: 'pf-list__split' });
  const main = el('div', { class: 'pf-list__main' });
  const wrap = el('div', { class: 'pf-card pf-table-wrap' });
  const detailEl = el('aside', { class: 'pf-card pf-list__detail', 'aria-live': 'polite', 'aria-label': t('lens.detailLabel') });
  let _selRef = null;
  const select = (r, tr) => {
    _selRef = r.__ref || null;
    [...wrap.querySelectorAll('tr[data-ref]')].forEach((x) => x.setAttribute('aria-selected', x === tr ? 'true' : 'false'));
    renderRichDetail(detailEl, r, mod, { type, columns, linked, actions, selectHintKey });
    if (onRow) onRow(r, tr);   // preserve existing cross-module context-setting behavior
    if (globalThis.matchMedia && matchMedia('(max-width:900px)').matches) detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  function rerender() {
    clear(wrap); wrap.append(_fabricTable(visibleRows(), columns, select, true));
    // Refresh pager — split-mode pager goes below the table
    const oldPager = main.querySelector('.pf-pager'); if (oldPager) oldPager.remove();
    const p = pager(); if (p) main.append(p);
  }
  rerender();
  main.append(wrap); const lg = rowLegend(rows); if (lg) main.append(lg); split.append(main, detailEl); container.append(split);
  renderRichDetail(detailEl, null, mod, { type, columns, linked, actions, selectHintKey });   // initial: empty hint
}

/** Conditional/dynamic row formatting (operator request): encode workflow status + SLA urgency as row
 *  classes so tables read at a glance. Status drives a tint; a due date within/after the window drives a
 *  left accent. All styling is token-based + theme-aware (see styles/components.css .pf-row--*). */
function rowStateClass(r) {
  const cls = [];
  const st = String((r && (r.status || r.Status)) || '').toLowerCase();
  if (/overdue|escalat|fail|action-required|reassign|danger|rejected/.test(st)) cls.push('pf-row--alert');
  else if (/pending|await|assigning|dispatch-pending|pending-review|in-flight/.test(st)) cls.push('pf-row--pending');
  const due = r && (r.taskDue || r.dueDate || r.DueDate || r.TaskDue || r.AckDue || r.ackDue || r.AcknolwedgementDueBy);
  if (due) {
    const ms = Date.parse(due);
    if (!Number.isNaN(ms)) {
      const hrs = (ms - Date.now()) / 3600000;
      if (hrs < 0) cls.push('pf-row--overdue');
      else if (hrs < 24) cls.push('pf-row--due-soon');
    }
  }
  return cls.join(' ');
}

/** Self-explaining legend for the conditional row formatting — renders only the states actually present
 *  in the given rows, so it stays relevant and quiet when nothing is flagged. */
function rowLegend(rows) {
  const present = new Set();
  for (const r of rows) {
    const c = rowStateClass(r);
    if (c.includes('pf-row--overdue')) present.add('overdue');
    if (c.includes('pf-row--due-soon')) present.add('dueSoon');
    if (c.includes('pf-row--alert')) present.add('alert');
    if (c.includes('pf-row--pending')) present.add('pending');
  }
  if (!present.size) return null;
  const order = [['overdue', 'lens.legendOverdue'], ['dueSoon', 'lens.legendDueSoon'], ['alert', 'lens.legendAlert'], ['pending', 'lens.legendPending']];
  const items = order.filter(([k]) => present.has(k)).map(([k, key]) =>
    el('span', { class: 'pf-row-legend__item pf-row-legend__item--' + k }, [
      el('span', { class: 'pf-row-legend__swatch', 'aria-hidden': 'true' }), el('span', { text: t(key) })]));
  return el('div', { class: 'pf-row-legend', role: 'note', 'aria-label': t('lens.legendTitle') }, items);
}

function _fabricTable(rows, columns, onRow, selectable) {
  const head = el('thead', {}, [el('tr', {}, columns.map((c) => el('th', { text: t(c.labelKey) })))]);
  const body = el('tbody', {}, rows.map((r) => {
    const tr = el('tr', { class: rowStateClass(r) || null, 'data-ref': r.__ref || '', tabindex: selectable ? '0' : null }, columns.map((c) => {
      const v = c.get ? c.get(r) : cellVal(r, c);
      return c.key === 'status' ? el('td', { html: badge(v) }) : el('td', { text: String(v) });
    }));
    if (onRow) {
      if (!selectable) tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => onRow(r, tr));
      if (selectable) tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRow(r, tr); } });
    }
    return tr;
  }));
  return el('table', { class: 'pf-table' + (selectable ? ' pf-table--selectable' : '') }, [head, body]);
}

/** Doc↔Email pairing by Reference (ports buildDocEmailPairs). Returns [{ref, doc, email, status}]. */
export function buildDocEmailPairs() {
  const E = P().Entities; const out = [];
  for (const ref of E.all('reference')) {
    const id = ref.__ref || ref.referenceId;
    const docs = E.byReference(id).document, emails = E.byReference(id).email;
    const n = Math.max(docs.length, emails.length, 1);
    for (let i = 0; i < n; i++) out.push({ __ref: id, doc: docs[i]?.title || docs[i]?.__id || '—', email: emails[i]?.subject || emails[i]?.__id || '—', status: ref.status || ref.Status || '—' });
  }
  return out;
}

/** Master-detail: gallery of cards + detail pane. card(item)->html string; detail(item,container,mod). */
export function mountMasterDetail(mod, root, { type, cardLabel, detail, enableBulkSelect = false, bulkActions = null, prefilter = null }) {
  const region = root.querySelector('[data-region="content"]') || root;
  clear(region);
  const E = P().Entities;
  const filter = document.createElement('pf-filter-bar');
  filter.statuses = [{ value:'pending', labelKey:'status.pending' }, { value:'routed', labelKey:'status.routed' }, { value:'replied', labelKey:'status.replied' }, { value:'closed', labelKey:'status.closed' }];
  const split = el('div', { class: 'pf-md__split' });
  const gallery = el('div', { class: 'pf-md__gallery' });
  const detailPane = el('div', { class: 'pf-card pf-md__detail' });
  split.append(gallery, detailPane);
  const bulkBar = el('div', { class: 'pf-md__bulkbar', hidden: true });
  let q = '', st = '';
  // D-1: when a prefilter is supplied (ops-hub routing scope), default to the scoped view but keep a
  // reversible toggle so the operator can always reveal everything — the scope never silently hides data.
  let scoped = !!prefilter;
  const scopeToggle = prefilter ? el('button', { class: 'pf-btn pf-btn--ghost pf-md__scope', type: 'button' }) : null;
  if (scopeToggle) {
    const syncScope = () => { scopeToggle.textContent = t(scoped ? 'lens.scopeQueue' : 'lens.scopeAll'); scopeToggle.setAttribute('aria-pressed', scoped ? 'true' : 'false'); };
    scopeToggle.addEventListener('click', () => { scoped = !scoped; syncScope(); render(); });
    syncScope();
    region.append(scopeToggle);
  }
  region.append(filter, bulkBar, el('div', { style: 'height:var(--space-3)' }), split);
  const selected = new Set();   // refs/ids of currently bulk-selected items
  function items() { return E.all(type).filter((r) => { if (scoped && prefilter && !prefilter(r)) return false; const s = String(r.status || r.Status || '').toLowerCase(); if (st && s !== st) return false; if (!q) return true; return Object.values(r).some((v) => String(v).toLowerCase().includes(q)); }); }
  function renderBulkBar() {
    if (!enableBulkSelect) { bulkBar.hidden = true; return; }
    bulkBar.hidden = selected.size === 0;
    if (selected.size === 0) return;
    clear(bulkBar);
    bulkBar.append(el('span', { class: 'pf-md__bulkcount', text: t('lens.selectedN', { n: selected.size }) }));
    if (typeof bulkActions === 'function') {
      const acts = bulkActions({ selected: [...selected], clear: () => { selected.clear(); render(); }, mod }) || [];
      acts.forEach((b) => bulkBar.append(b));
    }
    bulkBar.append(el('button', { class: 'pf-btn pf-btn--ghost', type: 'button',
      text: t('common.actions.clear'), onClick: () => { selected.clear(); render(); } }));
  }
  function render() {
    if (!E.isHydrated()) { clear(gallery); const sk = skeletonCards(8); while (sk.firstChild) gallery.append(sk.firstChild); return; }
    const rows = items(); filter.count = rows.length; clear(gallery);
    if (!rows.length) { gallery.append(el('div', { class: 'pf-empty' }, [el('div', { class: 'pf-empty__title', text: t('common.state.empty') })])); renderBulkBar(); return; }
    rows.forEach((r) => {
      const key = r.__ref || r.__id;
      const isSel = enableBulkSelect && selected.has(key);
      // The card itself remains clickable for detail; the optional checkbox stops propagation
      const tag = enableBulkSelect ? 'div' : 'button';
      const card = el(tag, { class: 'pf-md__card' + (isSel ? ' is-selected' : ''),
        role: enableBulkSelect ? 'group' : 'button', tabindex: '0' }, [
        ...(enableBulkSelect ? [el('label', { class: 'pf-md__check', onClick: (e) => e.stopPropagation() }, [
          el('input', { type: 'checkbox', ...(isSel ? { checked: 'checked' } : {}),
            onChange: (e) => { if (e.target.checked) selected.add(key); else selected.delete(key);
              card.classList.toggle('is-selected', e.target.checked); renderBulkBar(); } })])] : []),
        el('div', { class: 'pf-md__card-top', html: `<span class="pf-badge pf-badge--${sCls(r.status || r.Status)}">${r.status || r.Status || ''}</span><span class="pf-md__ref">${r.__ref || ''}</span>` }),
        el('div', { class: 'pf-md__card-title', text: r[cardLabel] || r.title || r.subject || r.__id || '' }),
        el('div', { class: 'pf-md__card-sub', text: r.assignedTo || r.sender || r.from || '' })
      ]);
      card.addEventListener('click', (e) => {
        if (e.target && e.target.matches('input[type="checkbox"]')) return;
        if (r.__ref) P().Context.setActive(r.__ref, mod.id);
        [...gallery.children].forEach((c) => c.setAttribute('aria-selected', c === card ? 'true' : 'false'));
        detail(r, detailPane, mod);
      });
      gallery.append(card);
    });
    renderBulkBar();
  }
  filter.addEventListener('pf-filter:change', (e) => { q = e.detail.query; st = e.detail.status; render(); });
  mod.bus('entity:loading', render); mod.bus('entity:bootstrapped', render); mod.bus('entity:changed', render);
  render();
  detailPane.append(el('div', { class: 'pf-detail__empty' }, [el('pf-icon', { name: 'folder', size: '22' }), el('p', { class: 'pf-muted', text: t('lens.selectHint') })]));
}
