/** OBSIDIAN v4.0 — <pf-filter-bar> · search + status chips + result count (dedup target).
 *  Props (backward compatible): el.statuses = [{value,labelKey}]; el.count = N.
 *  Emits 'pf-filter:change' { query, status } (debounced 180ms).
 *  Status filter renders as **visible chip toggles** instead of a dropdown — clearer affordance,
 *  one click to apply/clear, current filter always visible. */
import { PfBaseElement } from './_base.js';

class PfFilterBar extends PfBaseElement {
  set statuses(v) { this._statuses = Array.isArray(v) ? v : []; if (this.shadowRoot) this.paintChips(); }
  set count(v) { this._count = v; const c = this.$('#count'); if (c) c.textContent = this.t('filter.results', { n: v }); }

  onConnect() {
    this._status = '';
    this.render(`<style>
      :host{ display:block; }
      .bar{ display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap;
        background:var(--color-surface-raised); border:1px solid var(--color-border);
        border-radius:var(--radius-md); padding:var(--space-2) var(--space-3); }
      .search{ flex:1; min-width:14rem; display:flex; align-items:center; gap:var(--space-2); }
      .search input{ flex:1; font:inherit; font-size:var(--size-body-sm); padding:var(--space-2) var(--space-3);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-sm);
        background:var(--color-surface); color:var(--color-text); }
      .search input:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:1px; border-color:var(--color-brand-primary); }
      .chips{ display:flex; gap:var(--space-1); flex-wrap:wrap; }
      .chip{ font:inherit; font-size:var(--size-caption); font-weight:var(--fw-semibold);
        padding:var(--space-1) var(--space-3); border-radius:var(--radius-pill);
        border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text-muted);
        cursor:pointer; transition:all var(--duration-fast) var(--easing-standard); }
      .chip:hover{ border-color:var(--color-brand-primary); color:var(--color-text); }
      .chip[aria-pressed="true"]{ background:var(--color-brand-primary); color:var(--color-text-inverse); border-color:var(--color-brand-primary); }
      .chip:focus-visible{ outline:2px solid var(--color-brand-primary); outline-offset:2px; }
      #clear{ font:inherit; font-size:var(--size-caption); background:none; border:none; color:var(--color-text-muted); cursor:pointer; padding:var(--space-1) var(--space-2); text-decoration:underline; }
      #clear:hover{ color:var(--color-danger); }
      #count{ font-size:var(--size-caption); color:var(--color-text-muted); margin-left:auto; white-space:nowrap; }
    </style>
    <div class="bar" role="search">
      <span class="search"><pf-icon name="table" size="16"></pf-icon>
        <input id="q" type="search" placeholder="${this.t('filter.searchPlaceholder')}" aria-label="${this.t('filter.searchAria')}"></span>
      <div class="chips" id="chips" role="group" aria-label="${this.t('filter.statusAria')}"></div>
      <button id="clear" type="button" hidden>${this.t('filter.clear')}</button>
      <span id="count" aria-live="polite"></span>
    </div>`);
    this.paintChips();
    let timer;
    this.on(this.$('#q'), 'input', () => { clearTimeout(timer); timer = setTimeout(() => this._refresh(), 180); });
    this.on(this.$('#clear'), 'click', () => this._clearAll());
  }

  paintChips() {
    const host = this.$('#chips'); if (!host) return;
    host.innerHTML = '';
    const all = this._mkChip('', this.t('filter.all'));
    host.appendChild(all);
    (this._statuses || []).forEach((s) => host.appendChild(this._mkChip(s.value, this.t(s.labelKey))));
    this._reflect();
  }

  _mkChip(value, label) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.value = value; b.textContent = label;
    b.setAttribute('aria-pressed', this._status === value ? 'true' : 'false');
    b.addEventListener('click', () => { this._status = (this._status === value && value) ? '' : value; this._reflect(); this._refresh(); });
    return b;
  }

  _reflect() {
    const chips = [...this.shadowRoot.querySelectorAll('.chip')];
    chips.forEach((c) => c.setAttribute('aria-pressed', c.dataset.value === this._status ? 'true' : 'false'));
    const q = this.$('#q'); const hasQ = q && q.value && q.value.trim();
    const clear = this.$('#clear');
    if (clear) clear.hidden = !(this._status || hasQ);
  }

  _clearAll() {
    const q = this.$('#q'); if (q) q.value = '';
    this._status = '';
    this._reflect(); this._refresh();
  }

  _refresh() { this._reflect(); this.emit('pf-filter:change', { query: (this.$('#q').value || '').trim().toLowerCase(), status: this._status }); }
}
customElements.define('pf-filter-bar', PfFilterBar);
export default PfFilterBar;
