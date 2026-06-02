/** OBSIDIAN v4.0 — module 'registry' (Operations · LENS · audience:general).
 *  File-movement REGISTER: a chronological movement timeline per Reference (ported from
 *  registry_movement.html). Distinct from a flat table — vertical timeline grouped by Reference. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';

class RegistryModule extends BaseModule {
  static id = 'registry';
  static label = 'module.registry.title';
  static icon = 'git-branch';
  static nav = { group: 'Operations', order: 5 };
  static audience = 'general';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    this._region = root.querySelector('[data-region="content"]') || root;
    const E = globalThis.Platform.Entities; if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    this.bus('entity:bootstrapped', () => this.paint());
    this.bus('entity:changed', () => this.paint());
    this.paint();
  }

  paint() {
    const E = globalThis.Platform.Entities;
    clear(this._region);
    const acts = E.all('activity').slice().sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
    const total = acts.length;
    this._region.append(el('div', { class: 'pf-toolbar', style: 'margin-bottom:var(--space-4)' },
      [el('span', { class: 'pf-overline', text: this.t('registry.movements', { n: total }) })]));
    if (!total) { this._region.append(el('div', { class: 'pf-empty' }, [el('div', { class: 'pf-empty__title', text: this.t('common.state.empty') })])); return; }
    // group by reference
    const byRef = {}; for (const a of acts) { (byRef[a.__ref || '—'] ||= []).push(a); }
    const wrap = el('div', { class: 'pf-timeline' });
    for (const [ref, list] of Object.entries(byRef)) {
      const group = el('div', { class: 'pf-timeline__group' }, [
        el('button', { class: 'pf-timeline__ref', html: `<pf-icon name="table" size="14"></pf-icon> ${ref}`, onClick: () => globalThis.Platform.goToEntity(ref, 'response-tracking') }),
        el('ol', { class: 'pf-timeline__list' }, list.map((a) => el('li', { class: 'pf-timeline__item' }, [
          el('span', { class: `pf-timeline__dot pf-timeline__dot--${(a.status || 'routed').toLowerCase().replace(/\s+/g, '-')}` }),
          el('div', {}, [
            el('div', { class: 'pf-timeline__action', text: a.action || a.__id }),
            el('div', { class: 'pf-timeline__when', text: a.ts ? globalThis.Platform.Format.dateTime(a.ts) : '' })
          ])
        ])))
      ]);
      wrap.append(group);
    }
    this._region.append(wrap);
  }
}
Modules.register(RegistryModule);
export default RegistryModule;
