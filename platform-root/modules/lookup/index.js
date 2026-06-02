/** OBSIDIAN v4.0 — module 'lookup' (System Record Lookup · audience:general).
 *  Cross-source search across References / Documents / Tasks / Emails / Comments. Mirrors the
 *  live SPA "System Record Lookup" screen: a single query + scope chips, grouped results, and
 *  click-through to the canonical module for the matching record's type. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';

const SCOPES = [
  { id: 'all', labelKey: 'lookup.scope.all' },
  { id: 'reference', labelKey: 'lookup.scope.ref' },
  { id: 'document', labelKey: 'lookup.scope.doc' },
  { id: 'task', labelKey: 'lookup.scope.task' },
  { id: 'email', labelKey: 'lookup.scope.email' },
  { id: 'comment', labelKey: 'lookup.scope.comment' }
];
const TYPE_TO_MODULE = {
  reference: 'response-tracking', document: 'ops-hub',
  task: 'orchestrator', email: 'correspondence', comment: 'comments'
};
const TYPE_TO_ICON = { reference: 'table', document: 'folder', task: 'workflow', email: 'mail', comment: 'message-square' };

class LookupModule extends BaseModule {
  static id = 'lookup';
  static label = 'module.lookup.title';
  static icon = 'search';
  static nav = { group: 'Operations', order: 6 };
  static audience = 'general';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root, params) {
    const P = globalThis.Platform;
    if (P?.Entities && !P.Entities.isHydrated()) await P.Entities.bootstrap();
    this._scope = 'all';
    this._query = (params && params.path && params.path[0]) || '';
    this._debounceTimer = null;
    this._showFilters = false;
    this._filters = { dateFrom: '', dateTo: '', statuses: new Set(), assignedTo: '' };
    this._render(root);
  }

  _render(root) {
    const region = root.querySelector('[data-region="content"]') || root;
    clear(region);

    // ─── Search bar ────────────────────────────────────────────────────────
    const search = el('div', { class: 'pf-lookup__search-bar' }, [
      el('div', { class: 'pf-lookup__search-input-wrap' }, [
        el('pf-icon', { name: 'search', size: '16', class: 'pf-lookup__search-icon' }),
        el('input', { id: 'lookup-q', class: 'pf-input pf-lookup__search-input',
          type: 'search', placeholder: this.t('lookup.searchPlaceholder'),
          value: this._query, 'aria-label': this.t('lookup.searchPlaceholder') })
      ]),
      el('button', { id: 'lookup-clear', class: 'pf-btn pf-btn--ghost', type: 'button',
        text: this.t('common.actions.clear') })
    ]);

    // ─── Filters toggle button (after the search bar, before scope chips) ─
    const filterToggle = el('button', { id: 'lookup-filters-toggle', class: 'pf-btn pf-btn--ghost',
      type: 'button', html: `<pf-icon name="filter" size="14"></pf-icon> ${this.t('lookup.filters.toggle')}` });
    filterToggle.addEventListener('click', () => {
      this._showFilters = !this._showFilters;
      const panel = document.getElementById('lookup-filter-panel');
      if (panel) panel.hidden = !this._showFilters;
    });
    search.append(filterToggle);

    // ─── Advanced filter panel (hidden by default) ────────────────────────
    const filterPanel = el('div', { id: 'lookup-filter-panel', class: 'pf-lookup__filter-panel',
      hidden: !this._showFilters }, [
      el('div', { class: 'pf-lookup__filter-row' }, [
        el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', for: 'lookup-date-from', text: this.t('lookup.filters.dateFrom') }),
          el('input', { id: 'lookup-date-from', class: 'pf-input', type: 'date',
            value: this._filters.dateFrom })
        ]),
        el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', for: 'lookup-date-to', text: this.t('lookup.filters.dateTo') }),
          el('input', { id: 'lookup-date-to', class: 'pf-input', type: 'date',
            value: this._filters.dateTo })
        ]),
        el('div', { class: 'pf-field' }, [
          el('label', { class: 'pf-label', for: 'lookup-assignedto', text: this.t('lookup.filters.assignedTo') }),
          el('input', { id: 'lookup-assignedto', class: 'pf-input', type: 'text',
            placeholder: this.t('lookup.filters.assignedToPlaceholder'), value: this._filters.assignedTo })
        ])
      ]),
      el('div', { class: 'pf-field' }, [
        el('label', { class: 'pf-label', text: this.t('lookup.filters.statuses') }),
        el('div', { id: 'lookup-status-chips', class: 'pf-chipgroup', role: 'group',
          'aria-label': this.t('lookup.filters.statuses') })
      ]),
      el('div', { class: 'pf-toolbar', style: 'margin-top:var(--space-3)' }, [
        el('button', { id: 'lookup-filters-clear', class: 'pf-btn pf-btn--ghost', type: 'button',
          text: this.t('lookup.filters.clearAll') })
      ])
    ]);

    // ─── Scope chips ──────────────────────────────────────────────────────
    const scopeChips = el('div', { class: 'pf-chipgroup pf-lookup__scope', role: 'radiogroup',
      'aria-label': this.t('lookup.scope.label') });
    SCOPES.forEach((s) => {
      const b = el('button', { type: 'button',
        class: 'pf-chip' + (s.id === this._scope ? ' pf-chip--selected' : ''),
        'data-scope': s.id, role: 'radio',
        'aria-checked': s.id === this._scope ? 'true' : 'false', text: this.t(s.labelKey) });
      b.addEventListener('click', () => {
        this._scope = s.id;
        scopeChips.querySelectorAll('.pf-chip').forEach((c) => {
          c.classList.toggle('pf-chip--selected', c.dataset.scope === s.id);
          c.setAttribute('aria-checked', c.dataset.scope === s.id ? 'true' : 'false');
        });
        this._refreshResults();
      });
      scopeChips.appendChild(b);
    });

    // ─── Results area ─────────────────────────────────────────────────────
    const summary = el('div', { id: 'lookup-summary', class: 'pf-lookup__summary' });
    const results = el('div', { id: 'lookup-results', class: 'pf-lookup__results' });

    region.append(
      el('section', { class: 'pf-card pf-lookup' }, [search, scopeChips, filterPanel, summary, results])
    );

    // Status chips inside the filter panel (post-render — needs DOM-attached host)
    const statusHost = root.querySelector('#lookup-status-chips');
    const STATUSES = ['Pending', 'Routed', 'Action Required', 'Treated', 'Replied', 'Closed', 'Not Assigned'];
    STATUSES.forEach((st) => {
      const b = el('button', { type: 'button',
        class: 'pf-chip' + (this._filters.statuses.has(st.toLowerCase()) ? ' pf-chip--selected' : ''),
        'data-st': st.toLowerCase(), text: st });
      b.addEventListener('click', () => {
        const k = st.toLowerCase();
        if (this._filters.statuses.has(k)) { this._filters.statuses.delete(k); b.classList.remove('pf-chip--selected'); }
        else { this._filters.statuses.add(k); b.classList.add('pf-chip--selected'); }
        this._refreshResults();
      });
      statusHost.appendChild(b);
    });

    // Date + assignedTo handlers (debounced)
    const debounced = () => { clearTimeout(this._debounceTimer); this._debounceTimer = setTimeout(() => this._refreshResults(), 200); };
    root.querySelector('#lookup-date-from').addEventListener('change', (e) => { this._filters.dateFrom = e.target.value; this._refreshResults(); });
    root.querySelector('#lookup-date-to').addEventListener('change', (e) => { this._filters.dateTo = e.target.value; this._refreshResults(); });
    root.querySelector('#lookup-assignedto').addEventListener('input', (e) => { this._filters.assignedTo = e.target.value; debounced(); });
    root.querySelector('#lookup-filters-clear').addEventListener('click', () => {
      this._filters = { dateFrom: '', dateTo: '', statuses: new Set(), assignedTo: '' };
      root.querySelector('#lookup-date-from').value = '';
      root.querySelector('#lookup-date-to').value = '';
      root.querySelector('#lookup-assignedto').value = '';
      statusHost.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
      this._refreshResults();
    });

    // Wire events with debouncing on input (200ms — feels live but doesn't thrash)
    const qInput = root.querySelector('#lookup-q');
    qInput.addEventListener('input', () => {
      this._query = qInput.value;
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this._refreshResults(), 200);
    });
    root.querySelector('#lookup-clear').addEventListener('click', () => {
      qInput.value = ''; this._query = ''; qInput.focus(); this._refreshResults();
    });

    this._refreshResults();
    if (this._query) qInput.focus();
  }

  _refreshResults() {
    const summary = document.getElementById('lookup-summary');
    const results = document.getElementById('lookup-results');
    if (!summary || !results) return;
    clear(summary); clear(results);

    const q = (this._query || '').trim().toLowerCase();
    const E = globalThis.Platform.Entities;
    const types = this._scope === 'all' ? ['reference', 'document', 'task', 'email', 'comment'] : [this._scope];

    // Build the per-type matches (limited to 200 each to keep DOM manageable)
    const groups = {};
    let totalMatched = 0;
    for (const type of types) {
      const matches = E.all(type).filter((r) => {
        // Apply text query
        if (q && !Object.values(r).some((v) => v != null && typeof v !== 'object' && String(v).toLowerCase().includes(q))) return false;
        // Apply date filter (ts / createdAt / Created field)
        const recTs = r.ts || r.createdAt || r.Created || r.receivedDateTime;
        if (this._filters.dateFrom && recTs) {
          const d = new Date(recTs); const from = new Date(this._filters.dateFrom);
          if (Number.isFinite(d.valueOf()) && d < from) return false;
        }
        if (this._filters.dateTo && recTs) {
          const d = new Date(recTs); const to = new Date(this._filters.dateTo); to.setHours(23,59,59,999);
          if (Number.isFinite(d.valueOf()) && d > to) return false;
        }
        // Apply status filter
        if (this._filters.statuses.size) {
          const rs = String(r.status || r.Status || r.AssignmentStatus || '').toLowerCase();
          if (!this._filters.statuses.has(rs)) return false;
        }
        // Apply assignedTo filter (substring match)
        if (this._filters.assignedTo) {
          const at = String(r.assignedTo || r.AssignedTo || '').toLowerCase();
          if (!at.includes(this._filters.assignedTo.toLowerCase())) return false;
        }
        return true;
      }).slice(0, 200);
      if (matches.length) groups[type] = matches;
      totalMatched += matches.length;
    }

    if (!q) {
      summary.innerHTML = `<p class="pf-muted">${this.t('lookup.idleHint')}</p>`;
      return;
    }
    if (!totalMatched) {
      summary.innerHTML = `<p class="pf-muted">${this.t('lookup.noResults', { q })}</p>`;
      return;
    }
    summary.innerHTML = `<p>${this.t('lookup.resultsFor', { n: totalMatched, q })}</p>`;

    // Render groups
    for (const type of Object.keys(groups)) {
      const rows = groups[type];
      const groupEl = el('section', { class: 'pf-lookup__group', 'data-type': type }, [
        el('header', { class: 'pf-lookup__group-header' }, [
          el('pf-icon', { name: TYPE_TO_ICON[type] || 'circle', size: '18' }),
          el('h3', { class: 'pf-lookup__group-title', text: this.t('entity.' + type) }),
          el('span', { class: 'pf-lookup__group-count', text: this.t('lookup.nMatches', { n: rows.length }) })
        ])
      ]);
      const list = el('div', { class: 'pf-lookup__list' });
      rows.forEach((r) => {
        const titleText = r.title || r.Title || r.subject || r.body ||
          (type === 'reference' ? (r.__ref || r.referenceId || '') : '') ||
          (type === 'comment' ? (r.body || '').slice(0, 80) : '') ||
          r.__id || r.__ref || '—';
        const subText = type === 'email' ? (r.sender || r.from || '')
          : type === 'task' ? (r.assignedTo || '')
          : type === 'comment' ? (r.author || '')
          : (r.assignedTo || '');
        const card = el('button', { class: 'pf-lookup__item', type: 'button',
          'data-type': type, 'data-ref': r.__ref || r.__id || '' }, [
          el('span', { class: 'pf-lookup__item-type pf-badge',
            html: `<pf-icon name="${TYPE_TO_ICON[type] || 'circle'}" size="12"></pf-icon> ${this.t('entity.' + type)}` }),
          el('div', { class: 'pf-lookup__item-body' }, [
            el('div', { class: 'pf-lookup__item-title', text: String(titleText).slice(0, 120) }),
            el('div', { class: 'pf-lookup__item-meta' }, [
              r.__ref ? el('span', { class: 'pf-overline', text: r.__ref }) : null,
              subText ? el('span', { class: 'pf-muted', text: subText }) : null,
              (r.status || r.Status) ? el('span', { class: 'pf-badge pf-badge--' + this._badgeCls(r.status || r.Status), text: (r.status || r.Status) }) : null
            ].filter(Boolean))
          ])
        ]);
        card.addEventListener('click', () => this._openResult(type, r));
        list.appendChild(card);
      });
      groupEl.appendChild(list);
      results.appendChild(groupEl);
    }
  }

  _badgeCls(s) {
    const v = String(s || '').toLowerCase();
    if (v.includes('complet') || v.includes('done') || v.includes('replied')) return 'ok';
    if (v.includes('action') || v.includes('urgent') || v.includes('overdue')) return 'danger';
    if (v.includes('pending') || v.includes('new')) return 'pending';
    return 'neutral';
  }

  _openResult(type, r) {
    const ref = r.__ref || r.__id || '';
    const targetModule = TYPE_TO_MODULE[type] || 'home';
    globalThis.Platform.Context.setActive(ref, this.id);
    globalThis.Platform.Router.navigate(`${targetModule}${ref ? '/' + ref : ''}`);
  }
}
Modules.register(LookupModule);
export default LookupModule;
