/** OBSIDIAN v4.0 — render.js · reusable view renderers (table/stats/form/diagnostics).
 *  Centralised so no module re-implements list/stat/form rendering (§1.10 reuse). */
import { el, clear, firstArray } from './dom.js';
const P = () => globalThis.Platform;
const t = (k, v) => (P()?.I18n?.t ? P().I18n.t(k, v) : k);
const STATUS_CLASS = { pending:'pending', routed:'routed', replied:'replied', acknowledged:'replied',
  'action required':'action', action:'action', draft:'draft', archived:'archived', created:'ok', ok:'ok' };

export function emptyState(container, titleKey = 'common.state.empty', bodyKey) {
  clear(container);
  container.append(el('div', { class:'pf-empty' }, [
    el('div', { class:'pf-empty__title', text:t(titleKey) }),
    bodyKey ? el('div', { text:t(bodyKey) }) : null
  ]));
}

export function renderTable(container, result, { columns, csvName = 'export.csv' } = {}) {
  clear(container);
  if (!result || !result.ok) { emptyState(container, 'common.state.empty'); return; }
  const rows = result.rows || firstArray(result.data);
  if (!rows.length) { emptyState(container, 'common.state.empty'); return; }
  const cols = columns || Object.keys(rows[0]).map((key) => ({ key, labelKey:`field.${key}.label`, label:key }));
  const toolbar = el('div', { class:'pf-toolbar' }, [
    el('button', { class:'pf-btn pf-btn--ghost', text:t('common.actions.export'),
      onClick:() => P()?.Format?.downloadCsv(csvName,
        P().Format.toCsv(rows, cols.map((c) => ({ key:c.key, label:t(c.labelKey, c.label && { def:c.label }) || c.label })))) })
  ]);
  const thead = el('thead', {}, [ el('tr', {}, cols.map((c) => el('th', { text:resolveLabel(c) }))) ]);
  const tbody = el('tbody', {}, rows.map((r) => el('tr', {}, cols.map((c) => cell(r[c.key], c.key)))));
  container.append(toolbar, el('div', { class:'pf-table-wrap' }, [ el('table', { class:'pf-table' }, [thead, tbody]) ]));
}
function resolveLabel(c) { const v = t(c.labelKey); return v.startsWith('\u00ab') ? (c.label || c.key) : v; }
function cell(value, key) {
  if (key === 'status' && value != null) {
    const cls = STATUS_CLASS[String(value).toLowerCase()] || 'archived';
    return el('td', {}, [ el('span', { class:`pf-badge pf-badge--${cls}`, text:String(value) }) ]);
  }
  return el('td', { text: value == null ? '' : String(value) });
}

export function renderStats(container, items) {
  clear(container);
  if (!items || !items.length) { emptyState(container, 'common.state.empty'); return; }
  container.append(el('div', { class:'pf-grid' }, items.map((s) => el('div', { class:'pf-stat' }, [
    el('div', { class:'pf-stat__label', text:t(s.labelKey, s.vars) }),
    el('div', { class:'pf-stat__value', text:String(s.value) })
  ]))));
}

export function renderForm(container, { fields, submitKey = 'common.actions.submit', onSubmit }) {
  clear(container);
  const form = el('form', { class:'pf-form' });
  for (const f of fields) {
    const id = 'f-' + f.name;
    const input = f.type === 'textarea' ? el('textarea', { id, name:f.name, rows:'4' })
      : f.type === 'select' ? el('select', { id, name:f.name }, (f.options || []).map((o) => el('option', { value:o.value, text:t(o.labelKey) })))
      : el('input', { id, name:f.name, type:f.type || 'text' });
    form.append(el('div', { class:'pf-field' }, [ el('label', { for:id, text:t(f.labelKey) }), input ]));
  }
  form.append(el('button', { class:'pf-btn pf-btn--primary', type:'submit', text:t(submitKey) }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = {}; for (const f of fields) values[f.name] = form.querySelector('[name="' + f.name + '"]').value;
    onSubmit(values);
  });
  container.append(form);
}

export function renderDiagnostics(container, results) {
  clear(container);
  container.append(el('div', { class:'pf-diag' }, results.map((r) => el('div', { class:'pf-diag__row' }, [
    el('span', { class:`pf-diag__dot pf-diag__dot--${r.ok ? 'ok' : 'bad'}` }),
    el('span', { text:r.key }),
    el('span', { class:'meta', text:`${r.kind} · ${r.status} · ${r.durationMs}ms` })
  ]))));
}
