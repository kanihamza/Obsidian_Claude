/** OBSIDIAN v4.0 — module 'diagnostics' (System · audience:all).
 *  Operator visibility into the live platform: aggregate endpoint health, per-endpoint ping,
 *  entity-fabric telemetry, recent failures, system info. Zero static placeholders. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { ACTIVE_ENDPOINT_KEYS, Endpoints } from '../../config/endpoints.config.js';
import { el, clear } from '../../shared/utils/dom.js';
import { Charts } from '../../core/charts.js';

const fmt = (d) => globalThis.Platform?.Format?.dateTime ? Platform.Format.dateTime(d) : new Date(d).toLocaleString();

class DiagnosticsModule extends BaseModule {
  static id = 'diagnostics';
  static label = 'module.diagnostics.title';
  static icon = 'stethoscope';
  static nav = { group: 'System', order: 1 };
  static audience = 'all';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    this._region = root.querySelector('[data-region="content"]') || root;
    this._results = [];           // last ping batch
    this._recentFailures = [];    // rolling window across runs
    this._lastRunAt = null;
    this._paint();
    await this.run();
  }

  _paint() {
    clear(this._region);
    const tb = el('div', { class: 'pf-toolbar', style: 'margin-bottom:var(--space-3)' }, [
      el('button', { class: 'pf-btn pf-btn--primary', html: `<pf-icon name="refresh-cw" size="14"></pf-icon> ${this.t('common.actions.refresh')}`, onClick: () => this.run() }),
      el('span', { id: 'diag-last-run', class: 'pf-muted', style: 'margin-left:var(--space-3)' })
    ]);
    this._summary  = el('section', { 'aria-label': this.t('diag.summary') });
    this._epTable  = el('section', { class: 'pf-card', style: 'margin-top:var(--space-4);padding:var(--space-4)' });
    this._fabric   = el('section', { class: 'pf-card', style: 'margin-top:var(--space-4);padding:var(--space-4)' });
    this._failures = el('section', { class: 'pf-card', style: 'margin-top:var(--space-4);padding:var(--space-4)' });
    this._reqLog   = el('section', { class: 'pf-card', style: 'margin-top:var(--space-4);padding:var(--space-4)' });
    this._storageHealth = el('section', { class: 'pf-card', style: 'margin-top:var(--space-4);padding:var(--space-4)' });
    this._system   = el('section', { class: 'pf-card', style: 'margin-top:var(--space-4);padding:var(--space-4)' });
    this._region.append(tb, this._summary, this._epTable, this._fabric, this._failures, this._reqLog, this._storageHealth, this._system);
  }

  async run() {
    this._renderEndpointSkeleton();
    this._results = [];
    for (const key of ACTIVE_ENDPOINT_KEYS) {
      const ep = Endpoints[key];
      const t0 = (globalThis.performance || Date).now();
      const r = await this.call(() => globalThis.Platform.API.callAPI(key, { action: 'ping' }, { timeout: 8000, silent: true }));
      const ms = Math.max(0, Math.round(((globalThis.performance || Date).now()) - t0));
      const entry = {
        key, method: ep.method || 'POST', ok: r.ok, kind: r.kind, status: r.status, ms, at: new Date().toISOString(),
        dataPresent: !!(r.data && (Array.isArray(r.data) ? r.data.length : Object.keys(r.data).length)),
        errorMessage: r.errors && r.errors[0] && (r.errors[0].message || r.errors[0].code) || ''
      };
      this._results.push(entry);
      if (!entry.ok) this._recentFailures.unshift(entry);
      this._renderEndpointRow(entry);
    }
    this._recentFailures = this._recentFailures.slice(0, 15);  // rolling window
    this._lastRunAt = new Date().toISOString();
    document.getElementById('diag-last-run').textContent = this.t('diag.lastRunAt', { when: fmt(this._lastRunAt) });
    this._renderSummary();
    this._renderFabric();
    this._renderFailures();
    this._renderRequestLog();
    this._renderStorageHealth();
    this._renderSystem();
  }

  _renderSummary() {
    clear(this._summary);
    const total = this._results.length;
    const ok = this._results.filter((r) => r.ok).length;
    const fail = total - ok;
    const avgMs = total ? Math.round(this._results.reduce((s, r) => s + r.ms, 0) / total) : 0;
    const items = [
      { label: this.t('diag.endpointsTotal'), value: total, cls: '' },
      { label: this.t('diag.online'),         value: ok,    cls: 'pf-stat--ok' },
      { label: this.t('diag.offline'),        value: fail,  cls: fail ? 'pf-stat--alert' : '' },
      { label: this.t('diag.avgLatency'),     value: avgMs + ' ms', cls: avgMs > 2000 ? 'pf-stat--alert' : '' }
    ];
    this._summary.append(el('div', { class: 'pf-grid' },
      items.map((it) => el('div', { class: 'pf-stat ' + it.cls }, [
        el('div', { class: 'pf-stat__label', text: it.label }),
        el('div', { class: 'pf-stat__value', text: String(it.value) })]))));
  }

  _renderEndpointSkeleton() {
    clear(this._epTable);
    this._epTable.append(el('div', { class: 'pf-overline', text: this.t('diag.endpointHealth') }));
    const head = el('thead', {}, [el('tr', {}, ['diag.endpoint', 'diag.method', 'diag.status', 'diag.latency', 'diag.time', 'diag.data', 'diag.error']
      .map((k) => el('th', { text: this.t(k) })))]);
    this._epBody = el('tbody', {});
    for (const key of ACTIVE_ENDPOINT_KEYS) {
      const ep = Endpoints[key];
      const tr = el('tr', { 'data-key': key }, [
        el('td', { text: key }),
        el('td', { text: ep.method || 'POST' }),
        el('td', { html: `<span class="pf-badge pf-badge--pending">${this.t('diag.pinging')}</span>` }),
        el('td', { text: '…' }), el('td', { text: '—' }), el('td', { text: '—' }), el('td', { text: '—' })
      ]);
      this._epBody.append(tr);
    }
    this._epTable.append(el('table', { class: 'pf-table' }, [head, this._epBody]));
  }

  _renderEndpointRow(r) {
    const row = this._epBody.querySelector(`tr[data-key="${r.key}"]`); if (!row) return;
    const c = row.children;
    c[2].innerHTML = `<span class="pf-badge pf-badge--${r.ok ? 'replied' : 'action'}">${r.ok ? this.t('diag.ok') : (r.kind || this.t('diag.fail'))}</span>`;
    c[3].textContent = r.ms + ' ms';
    c[3].className = r.ms > 2000 ? 'pf-warn' : '';
    c[4].textContent = new Date(r.at).toLocaleTimeString();
    c[5].textContent = r.dataPresent ? this.t('diag.present') : this.t('diag.none');
    c[6].textContent = r.ok ? '—' : (r.errorMessage || r.kind || '—');
  }

  _renderFabric() {
    const E = globalThis.Platform.Entities;
    const c = E.counts();
    clear(this._fabric);
    this._fabric.append(el('div', { class: 'pf-overline', text: this.t('diag.fabric') }));
    const types = ['reference', 'document', 'task', 'email', 'approval', 'comment', 'activity'];
    const tiles = el('div', { class: 'pf-grid', style: 'margin-top:var(--space-2)' },
      types.map((t) => el('div', { class: 'pf-stat' }, [
        el('div', { class: 'pf-stat__label', text: this.t('entity.' + t) }),
        el('div', { class: 'pf-stat__value', text: String(c[t] || 0) })])));
    this._fabric.append(tiles);
    const isHyd = E.isHydrated();
    this._fabric.append(el('div', { class: 'pf-diag-meta', style: 'margin-top:var(--space-3)' }, [
      el('div', {}, [el('span', { class: 'pf-overline', text: this.t('diag.hydrated') + ': ' }),
        el('span', { html: `<span class="pf-badge pf-badge--${isHyd ? 'replied' : 'pending'}">${isHyd ? this.t('diag.yes') : this.t('diag.no')}</span>` })]),
      el('div', {}, [el('span', { class: 'pf-overline', text: this.t('diag.source') + ': ' }),
        el('span', { text: String(E.source || '—') })])]));
  }

  _renderFailures() {
    clear(this._failures);
    this._failures.append(el('div', { class: 'pf-overline', text: this.t('diag.recentFailures') }));
    if (!this._recentFailures.length) {
      this._failures.append(el('p', { class: 'pf-muted', style: 'margin-top:var(--space-2)', text: this.t('diag.noFailures') }));
      return;
    }
    const list = el('ol', { class: 'pf-detail__activity', style: 'margin-top:var(--space-2)' });
    this._recentFailures.forEach((f) => list.append(el('li', { class: 'pf-detail__activity-item' }, [
      el('div', { class: 'pf-detail__activity-when', text: new Date(f.at).toLocaleTimeString() }),
      el('div', { class: 'pf-detail__activity-what', text: `${f.key} — ${f.errorMessage || f.kind || 'failed'}` }),
      el('span', { html: `<span class="pf-badge pf-badge--action">${f.kind || 'fail'}</span>` })
    ])));
    this._failures.append(list);
  }

  _renderRequestLog() {
    clear(this._reqLog);
    const Id = globalThis.Platform.Idempotency;
    const entries = (Id && Id.log) ? Id.log({ limit: 50 }) : [];
    this._reqLog.append(
      el('div', { class: 'pf-overline', style: 'margin-bottom:var(--space-3)', text: this.t('diag.requestLog') })
    );
    if (!entries.length) {
      this._reqLog.append(el('p', { class: 'pf-muted', text: this.t('diag.requestLogEmpty') }));
      return;
    }
    // Toolbar with filter
    let filterMode = 'all';
    const filterBar = el('div', { class: 'pf-toolbar', style: 'margin-bottom:var(--space-3)' });
    const list = el('div', { class: 'pf-card pf-table-wrap' });
    const renderList = () => {
      clear(list);
      const filtered = filterMode === 'errors' ? entries.filter((e) => !e.ok)
        : filterMode === 'writes' ? entries.filter((e) => e.action)
        : entries;
      if (!filtered.length) { list.append(el('p', { class: 'pf-muted', style: 'padding:var(--space-3)', text: this.t('diag.requestLogEmpty') })); return; }
      const tbl = el('table', { class: 'pf-table' });
      tbl.append(el('thead', {}, [el('tr', {}, [
        el('th', { text: this.t('diag.col.when') }),
        el('th', { text: this.t('diag.col.endpoint') }),
        el('th', { text: this.t('diag.col.action') }),
        el('th', { text: this.t('diag.col.status') }),
        el('th', { text: this.t('diag.col.ms') }),
        el('th', { text: this.t('diag.col.detail') }),
        el('th', { text: '' })
      ])]));
      const body = el('tbody', {});
      filtered.slice(0, 50).forEach((e) => {
        const copyBtn = el('button', { class: 'pf-btn pf-btn--ghost', type: 'button', style: 'padding:2px 8px;font-size:var(--size-caption)',
          title: this.t('diag.copyRowTitle'), text: this.t('diag.copyRow') });
        copyBtn.addEventListener('click', () => this._copyToClipboard(JSON.stringify(e, null, 2), this.t('diag.copiedRow')));
        const row = el('tr', {}, [
          el('td', { text: e.ts ? new Date(e.ts).toLocaleTimeString() : '—' }),
          el('td', { text: e.endpointKey || '—' }),
          el('td', { text: e.action || '—' }),
          el('td', { html: `<span class="pf-badge pf-badge--${e.ok ? 'ok' : 'danger'}">${e.ok ? 'OK' : (e.status || 'ERR')}</span>` }),
          el('td', { text: e.durationMs != null ? e.durationMs + ' ms' : '—' }),
          el('td', { text: e.errorMessage || (e.key ? e.key.slice(0, 50) : '—'), style: 'color:var(--color-text-muted);font-size:var(--size-caption)' }),
          el('td', {}, [copyBtn])
        ]);
        body.appendChild(row);
      });
      tbl.appendChild(body); list.append(tbl);
    };
    ['all', 'writes', 'errors'].forEach((m) => {
      const b = el('button', { type: 'button', class: 'pf-chip' + (filterMode === m ? ' pf-chip--selected' : ''),
        text: this.t('diag.filter.' + m) });
      b.addEventListener('click', () => {
        filterMode = m;
        filterBar.querySelectorAll('.pf-chip').forEach((c) => c.classList.remove('pf-chip--selected'));
        b.classList.add('pf-chip--selected');
        renderList();
      });
      filterBar.appendChild(b);
    });
    const exportBtn = el('button', { type: 'button', class: 'pf-btn pf-btn--ghost',
      style: 'margin-left:auto', text: this.t('diag.exportLog') });
    exportBtn.addEventListener('click', () => this._downloadJson('obsidian-request-log-' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.json', entries));
    const clearBtn = el('button', { type: 'button', class: 'pf-btn pf-btn--ghost',
      text: this.t('diag.clearLog') });
    clearBtn.addEventListener('click', () => { Id.clear(); this._renderRequestLog(); });
    filterBar.appendChild(exportBtn);
    filterBar.appendChild(clearBtn);
    // Telemetry chart — response times for the last 30 entries, oldest→newest
    const chartHost = el('div', { class: 'pf-card', style: 'padding:var(--space-3);margin:var(--space-3) 0;background:var(--color-surface-sunken)' });
    chartHost.append(el('div', { class: 'pf-overline', style: 'margin-bottom:var(--space-2)', text: this.t('diag.telemetryChart') }));
    const last = entries.slice(0, 30).reverse();   // log() returns newest-first; chart wants oldest-left
    if (last.length >= 2) {
      const series = last.map((e) => ({ count: e.durationMs || 0 }));
      const chartEl = Charts.bars(series, { width: 600, height: 80, label: 'response times (ms)' });
      chartEl.style.width = '100%';
      chartHost.append(chartEl);
      const stats = (() => {
        const ms = last.map((e) => e.durationMs).filter((v) => Number.isFinite(v));
        const avg = ms.length ? Math.round(ms.reduce((a,b) => a+b, 0) / ms.length) : 0;
        const max = ms.length ? Math.max(...ms) : 0;
        const errs = last.filter((e) => !e.ok).length;
        const errRate = last.length ? Math.round((errs / last.length) * 100) : 0;
        return { avg, max, errs, errRate, n: last.length };
      })();
      chartHost.append(el('div', { style: 'display:flex;gap:var(--space-4);margin-top:var(--space-2);font-size:var(--size-caption);color:var(--color-text-muted)' }, [
        el('span', { html: `<strong>${stats.n}</strong> calls` }),
        el('span', { html: `avg <strong>${stats.avg} ms</strong>` }),
        el('span', { html: `max <strong>${stats.max} ms</strong>` }),
        el('span', { html: `errors <strong>${stats.errs}</strong> (${stats.errRate}%)` })
      ]));
    } else {
      chartHost.append(el('p', { class: 'pf-muted', style: 'margin:0', text: this.t('diag.telemetryChartHint') }));
    }
    this._reqLog.append(filterBar, chartHost, list);
    renderList();
  }

  _renderStorageHealth() {
    clear(this._storageHealth);
    this._storageHealth.append(el('div', { class: 'pf-overline', style: 'margin-bottom:var(--space-3)', text: this.t('diag.storageHealth') }));

    const tiles = el('div', { class: 'pf-tiles', style: 'gap:var(--space-3)' });

    // localStorage size estimate — sum of key+value lengths × 2 bytes (UTF-16)
    let lsBytes = 0; let lsKeys = 0;
    try {
      for (let i = 0; i < (localStorage?.length || 0); i++) {
        const k = localStorage.key(i); if (!k) continue;
        const v = localStorage.getItem(k) || '';
        lsBytes += (k.length + v.length) * 2;
        lsKeys++;
      }
    } catch (_) { /* private browsing — localStorage may be unavailable */ }

    const fmtBytes = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB'
      : n > 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
    const lsLevel = lsBytes < 1024 * 1024 ? 'ok' : lsBytes < 4 * 1024 * 1024 ? 'pending' : 'danger';

    tiles.append(
      el('div', { class: 'pf-tile' }, [
        el('div', { class: 'pf-tile__label', text: this.t('diag.localStorage') }),
        el('div', { class: 'pf-tile__value', text: fmtBytes(lsBytes) }),
        el('div', { class: 'pf-tile__sub', html: `<span class="pf-badge pf-badge--${lsLevel}">${lsKeys} key(s)</span>` })
      ])
    );

    // Async: navigator.storage.estimate() if available
    if (globalThis.navigator?.storage?.estimate) {
      globalThis.navigator.storage.estimate().then((est) => {
        const used = est.usage || 0, quota = est.quota || 0;
        const pct = quota ? Math.round((used / quota) * 100) : 0;
        const level = pct < 50 ? 'ok' : pct < 80 ? 'pending' : 'danger';
        const tile = el('div', { class: 'pf-tile' }, [
          el('div', { class: 'pf-tile__label', text: this.t('diag.browserStorage') }),
          el('div', { class: 'pf-tile__value', text: fmtBytes(used) }),
          el('div', { class: 'pf-tile__sub', html: `<span class="pf-badge pf-badge--${level}">${pct}% of ${fmtBytes(quota)}</span>` })
        ]);
        tiles.append(tile);
      }).catch(() => {});
    }

    // Entity-store memory estimate (rough — based on JSON.stringify of all entities)
    try {
      const E = globalThis.Platform.Entities;
      const totalRecords = ['reference','document','task','email','comment','approval','activity']
        .reduce((n, t) => n + E.all(t).length, 0);
      tiles.append(el('div', { class: 'pf-tile' }, [
        el('div', { class: 'pf-tile__label', text: this.t('diag.fabricRecords') }),
        el('div', { class: 'pf-tile__value', text: totalRecords.toLocaleString() }),
        el('div', { class: 'pf-tile__sub', html: `<span class="pf-muted">${this.t('diag.fabricRecordsHint')}</span>` })
      ]));
    } catch (_) {}

    this._storageHealth.append(tiles);

    // Manage actions
    const actions = el('div', { class: 'pf-toolbar', style: 'margin-top:var(--space-3)' });
    const clearBtn = el('button', { class: 'pf-btn pf-btn--ghost', type: 'button', text: this.t('diag.clearStorage') });
    clearBtn.addEventListener('click', async () => {
      const ok = await globalThis.Platform.UI.confirm({
        titleKey: 'diag.clearStorage', summaryKey: 'diag.clearStorageWarn',
        confirmKey: 'diag.clearStorage', danger: true,
        details: [{ label: 'Cleared', value: 'localStorage + entity fabric' }, { label: 'Effect', value: 'Page reload required to re-hydrate' }]
      });
      if (!ok) return;
      try { localStorage.clear(); } catch (_) {}
      this._renderStorageHealth();
      globalThis.Platform.UI.toast({ messageKey: 'diag.storageCleared', variant: 'success' });
    });
    actions.append(clearBtn);
    this._storageHealth.append(actions);
  }

  // ──────── Incident-triage helpers (Copy / Export / Last Response) ────────
  _copyToClipboard(text, successKey) {
    const done = () => globalThis.Platform.UI.toast({ messageKey: successKey || 'diag.copiedRow', variant: 'success', timeout: 2000 });
    if (globalThis.navigator?.clipboard?.writeText) {
      globalThis.navigator.clipboard.writeText(text).then(done).catch(() => this._copyFallback(text, done));
    } else { this._copyFallback(text, done); }
  }
  _copyFallback(text, done) {
    // textarea fallback for environments without async clipboard API
    try {
      const ta = document.createElement('textarea'); ta.value = text;
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      done();
    } catch (_) {
      globalThis.Platform.UI.toast({ messageKey: 'diag.copyFailed', variant: 'danger' });
    }
  }
  _downloadJson(filename, data) {
    try {
      const text = JSON.stringify(data, null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      globalThis.Platform.UI.toast({ messageKey: 'diag.exported', vars: { file: filename }, variant: 'success' });
    } catch (e) {
      globalThis.Platform.UI.toast({ messageKey: 'diag.exportFailed', variant: 'danger' });
    }
  }
  _renderLastResponse() {
    clear(this._lastResponse);
    const env = globalThis.Platform.Entities.lastRawResponse?.();
    this._lastResponse.append(el('div', { class: 'pf-overline', style: 'margin-bottom:var(--space-3)', text: this.t('diag.lastResponse') }));
    if (!env) {
      this._lastResponse.append(el('p', { class: 'pf-muted', text: this.t('diag.lastResponseEmpty') }));
      return;
    }
    const sizeKb = env.body ? Math.round(JSON.stringify(env.body).length / 1024) : 0;
    const summary = el('div', { style: 'display:flex;gap:var(--space-4);font-size:var(--size-body-sm);margin-bottom:var(--space-3);flex-wrap:wrap' }, [
      el('span', { html: `<strong>${env.ok ? 'OK' : 'FAIL'}</strong> · status ${env.status || '?'}` }),
      el('span', { html: `${env.durationMs || 0} ms` }),
      el('span', { html: `<strong>${sizeKb}</strong> KB body` }),
      env.correlationId ? el('span', { class: 'pf-muted', html: `correlation: <code>${env.correlationId}</code>` }) : null,
      el('span', { class: 'pf-muted', text: env.ts ? new Date(env.ts).toLocaleString() : '' })
    ].filter(Boolean));
    const actions = el('div', { class: 'pf-toolbar', style: 'margin-bottom:var(--space-3)' });
    const copy = el('button', { class: 'pf-btn pf-btn--ghost', type: 'button', text: this.t('diag.copyResponse') });
    copy.addEventListener('click', () => this._copyToClipboard(JSON.stringify(env, null, 2), 'diag.copiedResponse'));
    const dl = el('button', { class: 'pf-btn pf-btn--ghost', type: 'button', text: this.t('diag.exportResponse') });
    dl.addEventListener('click', () => this._downloadJson('obsidian-last-response-' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.json', env));
    actions.append(copy, dl);
    this._lastResponse.append(summary, actions);
    if (env._bodyOmitted) {
      this._lastResponse.append(el('p', { class: 'pf-muted', text: env._bodyOmitted }));
    }
  }

  _renderSystem() {
    const P = globalThis.Platform;
    const persona = (P.Persona?.current && P.Persona.current()) || '—';
    const theme = (P.Theme?.current && P.Theme.current()) || document.documentElement.getAttribute('data-theme') || '—';
    const moduleCount = P.Modules ? (P.Modules.list ? P.Modules.list().length : '?') : '?';
    clear(this._system);
    this._system.append(el('div', { class: 'pf-overline', text: this.t('diag.system') }));
    const dl = el('dl', { class: 'pf-detail__fields', style: 'margin-top:var(--space-3)' });
    const add = (k, v) => dl.append(el('dt', { text: k }), el('dd', { text: String(v) }));
    add(this.t('diag.persona'), persona);
    add(this.t('diag.theme'), theme);
    add(this.t('diag.modules'), moduleCount);
    add(this.t('diag.lastRun'), this._lastRunAt ? fmt(this._lastRunAt) : '—');
    add(this.t('diag.userAgent'), (globalThis.navigator && navigator.userAgent ? navigator.userAgent.substring(0, 80) + '…' : '—'));
    this._system.append(dl);
  }
}
Modules.register(DiagnosticsModule);
export default DiagnosticsModule;
