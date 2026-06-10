/** OBSIDIAN v4.0 — module 'home' (Operations · AGGREGATOR · audience:all).
 *  Daily ops dashboard. All values flow from Entities.counts() — no per-row fetch.
 *  Sections: greeting · hero KPIs (with sparkline trend) · attention + pulse split ·
 *  status mix donut · quick actions. Renders skeletons during fabric hydration. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { Charts } from '../../core/charts.js';
import { attentionList, skeletonTiles, skeletonTable, renderHeatmap } from '../../shared/utils/lens.js';

const TILE = [
  ['reference', 'response-tracking', 'table'],
  ['document', 'ops-hub', 'folder'],
  ['task', 'orchestrator', 'workflow'],
  ['email', 'correspondence', 'mail'],
  ['approval', 'approvals', 'check-circle'],
  ['comment', 'comments', 'message-square']
];

function greetKey() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }
function fmtDate(d) { return globalThis.Platform?.Format?.dateTime ? Platform.Format.dateTime(d) : String(d); }

class HomeModule extends BaseModule {
  static id = 'home';
  static label = 'module.home.title';
  static icon = 'layout-dashboard';
  static nav = { group: 'CrossPhase', order: 0 };
  static audience = 'all';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    this._region = root.querySelector('[data-region="content"]') || root;
    const E = globalThis.Platform.Entities;
    if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    this.bus('entity:loading', () => this.paint());
    this.bus('entity:bootstrapped', () => this.paint());
    this.bus('entity:changed', () => this.paint());
    this.paint();
  }

  paint() {
    const E = globalThis.Platform.Entities;
    clear(this._region);
    if (!E.isHydrated()) {
      this._region.append(skeletonTiles(6));
      this._region.append(skeletonTable(6, 4));
      return;
    }
    const c = E.counts();
    this._region.append(this._renderGreeting(c));
    this._region.append(this._renderHeroKpis(c));
    this._region.append(this._renderAttentionAndPulse(c));
    this._region.append(this._renderStatusMix(c));
    this._region.append(this._renderQuickActions());
    this._renderHeatmap(host);
  }

  _renderGreeting(c) {
    const persona = (globalThis.Platform.Persona?.current && globalThis.Platform.Persona.current()) || 'general';
    const total = (c.reference || 0) + (c.document || 0) + (c.task || 0) + (c.email || 0);
    const overdue = (c.overdue && c.overdue.count) || 0;
    const brandMark = (globalThis.Platform?.Brand?.currentLogo && globalThis.Platform.Brand.currentLogo().mark) || '/assets/subbrands/dgo/logo-mark.svg';
    return el('section', { class: 'pf-home-hero' }, [
      el('div', { class: 'pf-home-hero__row' }, [
        el('div', { class: 'pf-home-hero__brand' }, [
          el('img', { src: brandMark, alt: this.t('brand.dgo.label'), class: 'pf-home-hero__mark' }),
          el('div', {}, [
            el('h2', { class: 'pf-home-greet', text: this.t('home.greet.' + greetKey()) }),
            el('p', { class: 'pf-home-summary',
              text: overdue ? this.t('home.summary.attention', { n: total, overdue }) : this.t('home.summary.calm', { n: total }) })
          ])
        ]),
        el('div', { class: 'pf-home-meta' }, [
          el('div', { class: 'pf-overline', text: this.t('home.persona') }),
          el('div', { class: 'pf-home-meta__val', text: persona }),
          el('div', { class: 'pf-overline', style: 'margin-top:var(--space-2)', text: this.t('home.today') }),
          el('div', { class: 'pf-home-meta__val', text: fmtDate(new Date()) })
        ])
      ])
    ]);
  }

  _renderHeroKpis(c) {
    return el('div', { class: 'pf-grid', style: 'margin-top:var(--space-5)' }, TILE.map(([type, modId, icon]) => {
      const card = el('button', { class: 'pf-stat pf-stat--rich', style: 'text-align:left;cursor:pointer;width:100%' }, [
        el('div', { class: 'pf-stat__label', html: `<pf-icon name="${icon}" size="14"></pf-icon> ${this.t('entity.' + type)}` }),
        el('div', { class: 'pf-stat__value', text: String(c[type] || 0) })
      ]);
      if (c.timeline && c.timeline.length) {
        card.append(el('div', { class: 'pf-stat__trend' }, [Charts.sparkline(c.timeline, { width: 160, height: 28 })]));
      }
      this.on(card, 'click', () => globalThis.Platform.Router.navigate(modId));
      return card;
    }));
  }

  _renderAttentionAndPulse(c) {
    const split = el('section', { class: 'pf-home-split' });
    const overdue = (c.overdue && c.overdue.items) || [];
    split.append(attentionList('home.attention', overdue, { modId: 'response-tracking' }));
    const recent = c.recent || [];
    const pulse = el('div', { class: 'pf-card', style: 'padding:var(--space-5)' }, [
      el('div', { class: 'pf-overline', text: this.t('home.pulse') }),
      el('div', { style: 'margin:var(--space-3) 0' }, [Charts.sparkline(c.timeline || [], { width: 400, height: 60 })]),
      el('div', { class: 'pf-overline', style: 'margin-top:var(--space-3)', text: this.t('home.recent') }),
      recent.length
        ? el('ol', { class: 'pf-pulse-list' }, recent.slice(0, 6).map((r) => el('li', { class: 'pf-pulse-item' }, [
            el('span', { class: 'pf-pulse-when', text: r.ts ? fmtDate(r.ts) : '' }),
            el('span', { class: 'pf-pulse-what', text: r.title || r.subject || r.action || r.__id || r.__ref || '' })
          ])))
        : el('p', { class: 'pf-muted', text: this.t('home.recentEmpty') })
    ]);
    split.append(pulse);
    return split;
  }

  _renderStatusMix(c) {
    const byStatus = c.byStatus || {};
    if (!Object.keys(byStatus).length) return el('div');
    const d = Charts.donut(byStatus, { label: this.t('home.byStatus'), size: 160 });
    return el('section', { class: 'pf-card', style: 'padding:var(--space-5);margin-top:var(--space-5)' }, [
      el('div', { class: 'pf-overline', text: this.t('home.byStatus') }),
      el('div', { style: 'display:flex;gap:var(--space-5);align-items:center;margin-top:var(--space-3);flex-wrap:wrap' }, [d.svg, d.legend])
    ]);
  }

  _renderQuickActions() {
    const items = [
      { label: 'home.qa.assignSingle', icon: 'file-plus', mod: 'single-item-ops', primary: true },
      { label: 'home.qa.assignBulk',   icon: 'users',     mod: 'bulk-assignment' },
      { label: 'home.qa.correspondence', icon: 'mail',    mod: 'correspondence' },
      { label: 'home.qa.tasks',        icon: 'workflow',  mod: 'orchestrator' },
      { label: 'home.qa.assistant',    icon: 'message-circle', mod: 'assistant' }
    ];
    return el('section', { class: 'pf-card', style: 'padding:var(--space-5);margin-top:var(--space-5)' }, [
      el('div', { class: 'pf-overline', text: this.t('home.quickActions') }),
      el('div', { class: 'pf-toolbar', style: 'margin-top:var(--space-3);flex-wrap:wrap' }, items.map((it) => {
        const b = el('button', { class: 'pf-btn ' + (it.primary ? 'pf-btn--primary' : 'pf-btn--ghost'),
          html: `<pf-icon name="${it.icon}" size="14"></pf-icon> ${this.t(it.label)}` });
        this.on(b, 'click', () => globalThis.Platform.Router.navigate(it.mod));
        return b;
      }))
    ]);
  }
  _renderHeatmap(container) {
    const tasks = (globalThis.Platform?.Entities?.all('task')) || [];
    // Heatmap reads taskDue / dueDate / DueDate; the entity-store normalises taskDue
    const wrap = el('section', { class: 'pf-card', style: 'padding:var(--space-4);margin-top:var(--space-4)' });
    wrap.append(
      el('header', { class: 'pf-view__head', style: 'margin-bottom:var(--space-3);padding:0' }, [
        el('h2', { class: 'pf-view__title', style: 'margin:0', text: this.t('lens.heatmap.title') }),
        el('p', { class: 'pf-muted', style: 'margin:0;font-size:var(--size-body-sm)', text: this.t('lens.heatmap.subtitle') })
      ])
    );
    const heatmapHost = el('div', {});
    wrap.append(heatmapHost);
    renderHeatmap(heatmapHost, tasks, {
      weeks: 14, startDaysAgo: 21, dueField: 'taskDue',
      fallbackFields: ['dueDate', 'DueDate', 'TaskDue', 'taskDueDate'],
      onCellClick: ({ date, items }) => {
        if (!items.length) return;
        // Open a small inline modal listing that day's items
        const list = el('div', {});
        items.slice(0, 20).forEach((it) => {
          list.append(el('div', { style: 'padding:var(--space-2) 0;border-bottom:1px solid var(--color-border)' }, [
            el('strong', { text: it.title || it.Title || it.__id || '—' }),
            el('div', { class: 'pf-muted', style: 'font-size:var(--size-caption)', text: (it.assignedTo || '') + ' · ' + (it.priority || '') })
          ]));
        });
        globalThis.Platform.UI.modal({
          title: this.t('lens.heatmap.dayItems', { date }),
          bodyEl: list,
          actions: [{ labelKey: 'common.actions.close', variant: 'ghost' }]
        });
      }
    });
    container.append(wrap);
  }

}
Modules.register(HomeModule);
export default HomeModule;
