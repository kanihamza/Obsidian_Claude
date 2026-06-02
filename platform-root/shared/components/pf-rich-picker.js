/** OBSIDIAN v4.0 — <pf-rich-picker> · search + (optional) tabs + single/multi-select dropdown.
 *  The reusable foundation behind every assignment picker (assignee, co-assignee, CC, category,
 *  priority, action-required) — matches the live-SPA UX while staying token-driven and accessible.
 *
 *  Properties (set via JS):
 *    placeholder       string   — placeholder label when nothing selected (e.g. "👤 Click to select")
 *    mode              "single" | "multi"  (default "single")
 *    searchable        boolean (default true)
 *    tabs              [{id, label}]  — optional tab bar; when set, use itemsByTab
 *    items             [{ value, label, sub?, hint? }]   (when no tabs)
 *    itemsByTab        { [tabId]: items[] }              (when tabs)
 *    value             string | string[]   — current selection
 *    selectedLabel     string              — visible label override for the toggle (single mode)
 *    placeholderIcon   string              — emoji/icon prefix in placeholder
 *    disabled          boolean
 *
 *  Events:
 *    pf-picker:change   { value, raw, label }   on selection (also fired on multi toggle/clear)
 *
 *  Methods:
 *    .reset()                — clear selection, close
 *    .open() / .close()      — programmatic toggle
 */
import { PfBaseElement } from './_base.js';

class PfRichPicker extends PfBaseElement {
  set placeholder(v) { this._placeholder = v; if (this.shadowRoot) this._renderToggle(); }
  set mode(v) { this._mode = v === 'multi' ? 'multi' : 'single'; }
  set searchable(v) { this._searchable = !!v; if (this.shadowRoot) this._renderBody(); }
  set tabs(v) { this._tabs = Array.isArray(v) ? v : null; this._activeTab = this._tabs && this._tabs[0] ? this._tabs[0].id : null; if (this.shadowRoot) this._renderBody(); }
  set items(v) { this._items = Array.isArray(v) ? v : []; if (this.shadowRoot && this._open) this._renderList(); }
  set itemsByTab(v) { this._itemsByTab = v && typeof v === 'object' ? v : {}; if (this.shadowRoot && this._open) this._renderList(); }
  set value(v) {
    if (this._mode === 'multi') this._value = Array.isArray(v) ? v.filter(Boolean) : (v ? String(v).split(';').filter(Boolean) : []);
    else this._value = v == null ? null : String(v);
    if (this.shadowRoot) this._renderToggle();
  }
  get value() { return this._mode === 'multi' ? (this._value || []) : (this._value || null); }
  set selectedLabel(v) { this._selectedLabel = v; if (this.shadowRoot) this._renderToggle(); }
  set placeholderIcon(v) { this._placeholderIcon = v; }
  set disabled(v) { this._disabled = !!v; if (this.shadowRoot) this._renderToggle(); }

  onConnect() {
    this._placeholder = this.getAttribute('placeholder') || 'Click to select';
    this._placeholderIcon = this.getAttribute('placeholder-icon') || '';
    this._mode = this.getAttribute('mode') === 'multi' ? 'multi' : 'single';
    this._searchable = this.getAttribute('searchable') !== 'false';
    this._tabs = null; this._items = []; this._itemsByTab = {};
    this._activeTab = null; this._query = ''; this._open = false; this._disabled = false;
    this._value = this._mode === 'multi' ? [] : null;
    this._selectedLabel = '';

    this.render(`<style>
      :host { display:block; position:relative; }
      .row { display:flex; gap:var(--space-1); align-items:stretch; }
      .toggle { flex:1; min-width:0; text-align:left; font:inherit; font-size:var(--size-body-sm);
        background:var(--color-surface); border:1px solid var(--color-border-strong);
        border-radius:var(--radius-sm); padding:var(--space-2) var(--space-3); cursor:pointer;
        color:var(--color-text); display:flex; align-items:center; gap:var(--space-2);
        justify-content:space-between; }
      .toggle:hover:not([disabled]) { border-color:var(--color-brand-primary); }
      .toggle:focus-visible { outline:2px solid var(--color-brand-primary); outline-offset:1px; border-color:var(--color-brand-primary); }
      .toggle[aria-expanded="true"] { border-color:var(--color-brand-primary); box-shadow:inset 0 0 0 1px var(--color-brand-primary); }
      .toggle[disabled] { opacity:.6; cursor:not-allowed; }
      .toggle .lbl { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
      .toggle .lbl.placeholder { color:var(--color-text-muted); font-weight:normal; }
      .toggle .lbl:not(.placeholder) { font-weight:var(--fw-semibold); }
      .toggle .chev { color:var(--color-text-muted); transition:transform var(--duration-fast); flex-shrink:0; }
      .toggle[aria-expanded="true"] .chev { transform:rotate(180deg); }
      .clear { font:inherit; padding:0 var(--space-2); background:transparent; border:1px solid transparent;
        color:var(--color-text-muted); cursor:pointer; border-radius:var(--radius-sm); }
      .clear:hover { color:var(--color-danger); border-color:var(--color-border); }
      .panel { position:absolute; top:calc(100% + var(--space-1)); left:0; right:0; z-index:10;
        background:var(--color-surface-raised); border:1px solid var(--color-border-strong);
        border-radius:var(--radius-md); box-shadow:var(--shadow-md);
        max-height:340px; display:none; flex-direction:column; overflow:hidden; }
      .panel[data-open="1"] { display:flex; }
      .tabs { display:flex; border-bottom:1px solid var(--color-border); flex-shrink:0; }
      .tabs button { flex:1; font:inherit; font-size:var(--size-caption); font-weight:var(--fw-semibold);
        background:transparent; border:none; padding:var(--space-3); cursor:pointer;
        color:var(--color-text-muted); border-bottom:2px solid transparent; }
      .tabs button[aria-selected="true"] { color:var(--color-brand-primary); border-bottom-color:var(--color-brand-primary); }
      .tabs button:focus-visible { outline:2px solid var(--color-brand-primary); outline-offset:-2px; }
      .search { padding:var(--space-2) var(--space-3); border-bottom:1px solid var(--color-border); flex-shrink:0; }
      .search input { width:100%; box-sizing:border-box; font:inherit; font-size:var(--size-body-sm);
        padding:var(--space-2) var(--space-3); border:1px solid var(--color-border);
        border-radius:var(--radius-sm); background:var(--color-surface); color:var(--color-text); }
      .search input:focus-visible { outline:2px solid var(--color-brand-primary); outline-offset:1px; border-color:var(--color-brand-primary); }
      .list { overflow-y:auto; flex:1; padding:var(--space-1); }
      .opt { display:flex; align-items:flex-start; gap:var(--space-2); padding:var(--space-2) var(--space-3);
        cursor:pointer; border-radius:var(--radius-sm); font-size:var(--size-body-sm);
        color:var(--color-text); }
      .opt:hover, .opt:focus-visible { background:color-mix(in srgb, var(--color-brand-primary) 8%, transparent); outline:none; }
      .opt[aria-selected="true"] { background:color-mix(in srgb, var(--color-brand-primary) 12%, transparent);
        font-weight:var(--fw-semibold); color:var(--color-brand-primary); }
      .opt .check { width:1rem; flex-shrink:0; }
      .opt .body { flex:1; min-width:0; }
      .opt .body .label { font-weight:inherit; overflow:hidden; text-overflow:ellipsis; }
      .opt .body .sub { font-size:var(--size-caption); color:var(--color-text-muted); margin-top:2px; }
      .empty { padding:var(--space-4); text-align:center; color:var(--color-text-muted); font-size:var(--size-caption); }
      .chips { display:flex; flex-wrap:wrap; gap:var(--space-1); padding:var(--space-2) var(--space-3);
        border-top:1px solid var(--color-border); flex-shrink:0; background:var(--color-surface-sunken); }
      .chips .chip { display:inline-flex; align-items:center; gap:var(--space-1);
        padding:2px var(--space-2); border-radius:var(--radius-pill);
        background:var(--color-brand-primary); color:var(--color-text-inverse);
        font-size:var(--size-caption); font-weight:var(--fw-semibold); }
      .chips .chip button { background:transparent; border:none; color:inherit; cursor:pointer;
        padding:0; font:inherit; opacity:.85; }
      .chips .chip button:hover { opacity:1; }
    </style>
    <div class="row">
      <button class="toggle" type="button" id="toggle" aria-haspopup="listbox" aria-expanded="false"><span class="lbl placeholder" id="lbl"></span><span class="chev">▾</span></button>
      <button class="clear" type="button" id="clear" hidden aria-label="${this.t('common.actions.clear')}">✕</button>
    </div>
    <div class="panel" id="panel" role="dialog">
      <div class="tabs" id="tabs" role="tablist"></div>
      <div class="search" id="searchWrap"><input id="q" type="search" placeholder="${this.t('filter.searchPlaceholder')}"></div>
      <div class="list" id="list" role="listbox" tabindex="-1"></div>
      <div class="chips" id="chips" hidden></div>
    </div>`);

    this._toggle = this.$('#toggle'); this._lbl = this.$('#lbl');
    this._clearBtn = this.$('#clear'); this._panel = this.$('#panel');
    this._tabsHost = this.$('#tabs'); this._searchWrap = this.$('#searchWrap');
    this._listEl = this.$('#list'); this._chipsHost = this.$('#chips');

    this.on(this._toggle, 'click', () => { if (!this._disabled) this._toggleOpen(); });
    this.on(this._toggle, 'keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); this.open(); this._focusFirstOption(); } });
    this.on(this._clearBtn, 'click', (e) => { e.stopPropagation(); this._clear(); });
    this._qInput = this.$('#q');
    if (this._qInput) this.on(this._qInput, 'input', () => { this._query = this._qInput.value.trim().toLowerCase(); this._renderList(); });
    this._renderToggle(); this._renderBody();

    // Close on outside click / escape
    this._outsideHandler = (e) => { if (!this.contains(e.target)) this.close(); };
    this._escHandler = (e) => { if (e.key === 'Escape' && this._open) { this.close(); this._toggle.focus(); } };
    document.addEventListener('click', this._outsideHandler);
    document.addEventListener('keydown', this._escHandler);
  }

  onDisconnect() {
    document.removeEventListener('click', this._outsideHandler);
    document.removeEventListener('keydown', this._escHandler);
  }

  open() { this._open = true; this._panel.dataset.open = '1'; this._toggle.setAttribute('aria-expanded', 'true'); this._renderList(); if (this._qInput && this._searchable) setTimeout(() => this._qInput.focus(), 50); }
  close() { this._open = false; this._panel.dataset.open = ''; this._toggle.setAttribute('aria-expanded', 'false'); this._query = ''; if (this._qInput) this._qInput.value = ''; }
  _toggleOpen() { this._open ? this.close() : this.open(); }

  _renderToggle() {
    if (!this._lbl) return;
    let labelText, placeholder = false;
    if (this._mode === 'multi') {
      const v = this._value || [];
      if (!v.length) { labelText = (this._placeholderIcon ? this._placeholderIcon + ' ' : '') + this._placeholder; placeholder = true; }
      else labelText = `${this._placeholderIcon || ''} ${v.length === 1 ? v[0] : v.length + ' selected'}`.trim();
    } else {
      const v = this._value;
      if (!v) { labelText = (this._placeholderIcon ? this._placeholderIcon + ' ' : '') + this._placeholder; placeholder = true; }
      else labelText = this._selectedLabel || (this._placeholderIcon ? this._placeholderIcon + ' ' : '') + String(v);
    }
    this._lbl.textContent = labelText;
    this._lbl.classList.toggle('placeholder', placeholder);
    this._clearBtn.hidden = placeholder;
    this._toggle.toggleAttribute('disabled', !!this._disabled);
    if (this._mode === 'multi') this._renderChips();
  }

  _renderBody() {
    if (!this._tabsHost) return;
    if (this._tabs && this._tabs.length > 1) {
      this._tabsHost.innerHTML = '';
      for (const t of this._tabs) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = t.label; b.dataset.tab = t.id;
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', t.id === this._activeTab ? 'true' : 'false');
        b.addEventListener('click', () => { this._activeTab = t.id; this._renderBody(); this._renderList(); });
        this._tabsHost.appendChild(b);
      }
      this._tabsHost.hidden = false;
    } else {
      this._tabsHost.hidden = true;
    }
    this._searchWrap.hidden = !this._searchable;
  }

  _currentItems() {
    if (this._tabs && this._activeTab) return (this._itemsByTab[this._activeTab] || []);
    return this._items || [];
  }

  _renderList() {
    if (!this._listEl) return;
    const items = this._currentItems().filter((it) => {
      if (!this._query) return true;
      const hay = ((it.label || '') + ' ' + (it.sub || '')).toLowerCase();
      return hay.includes(this._query);
    }).slice(0, 200);
    if (!items.length) { this._listEl.innerHTML = `<div class="empty">${this.t('common.state.empty')}</div>`; return; }
    this._listEl.innerHTML = '';
    const selectedSet = this._mode === 'multi' ? new Set(this._value || []) : new Set(this._value ? [this._value] : []);
    for (const it of items) {
      const opt = document.createElement('div');
      opt.className = 'opt'; opt.setAttribute('role', 'option'); opt.tabIndex = 0;
      opt.dataset.value = it.value;
      const isSel = selectedSet.has(it.value);
      opt.setAttribute('aria-selected', isSel ? 'true' : 'false');
      const checkmark = this._mode === 'multi' ? (isSel ? '☑' : '☐') : (isSel ? '●' : '○');
      opt.innerHTML = `<span class="check" aria-hidden="true">${checkmark}</span><div class="body"><div class="label"></div>${it.sub ? '<div class="sub"></div>' : ''}</div>`;
      opt.querySelector('.label').textContent = it.label || it.value;
      if (it.sub) opt.querySelector('.sub').textContent = it.sub;
      opt.addEventListener('click', () => this._select(it));
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._select(it); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); opt.nextElementSibling?.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); opt.previousElementSibling?.focus(); }
      });
      this._listEl.appendChild(opt);
    }
  }

  _renderChips() {
    if (!this._chipsHost) return;
    const v = this._value || [];
    if (this._mode !== 'multi' || !v.length) { this._chipsHost.hidden = true; this._chipsHost.innerHTML = ''; return; }
    this._chipsHost.hidden = false; this._chipsHost.innerHTML = '';
    for (const val of v) {
      const chip = document.createElement('span'); chip.className = 'chip';
      chip.textContent = val;
      const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕';
      x.setAttribute('aria-label', this.t('common.actions.remove'));
      x.addEventListener('click', (e) => { e.stopPropagation(); this._remove(val); });
      chip.appendChild(x);
      this._chipsHost.appendChild(chip);
    }
  }

  _focusFirstOption() { const f = this._listEl?.querySelector('.opt'); if (f) f.focus(); }

  _select(it) {
    if (this._mode === 'multi') {
      const v = new Set(this._value || []);
      if (v.has(it.value)) v.delete(it.value); else v.add(it.value);
      this._value = [...v];
      this._renderList(); this._renderToggle();
      this.emit('pf-picker:change', { value: this._value, raw: it.raw, label: it.label });
    } else {
      this._value = it.value;
      this._selectedLabel = (this._placeholderIcon ? this._placeholderIcon + ' ' : '') + (it.label || it.value);
      this._renderToggle(); this.close();
      this.emit('pf-picker:change', { value: this._value, raw: it.raw, label: it.label });
    }
  }

  _remove(val) {
    if (this._mode !== 'multi') return;
    this._value = (this._value || []).filter((x) => x !== val);
    this._renderList(); this._renderToggle();
    this.emit('pf-picker:change', { value: this._value });
  }

  _clear() {
    if (this._mode === 'multi') this._value = [];
    else { this._value = null; this._selectedLabel = ''; }
    this._renderToggle(); if (this._open) this._renderList();
    this.emit('pf-picker:change', { value: this._mode === 'multi' ? [] : null });
  }

  reset() { this._clear(); this.close(); }
}
customElements.define('pf-rich-picker', PfRichPicker);
export default PfRichPicker;
