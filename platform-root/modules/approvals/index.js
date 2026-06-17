/** OBSIDIAN v4.0 — module 'approvals' (Governance · LENS · audience:general).
 *  A lens over the shared Reference fabric: reads pending approvals from Platform.Entities,
 *  sets the active Reference on select, renders cross-links to other lenses, and on decision
 *  mutates the shared entity so dependent modules (response-tracking, home, registry) react.
 *  Parity port of approvals.html (list + review: summary, documents, minute, signature). */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { submitDecision } from './service.js';
import { el, clear } from '../../shared/utils/dom.js';
import { emptyState } from '../../shared/utils/render.js';

class ApprovalsModule extends BaseModule {
  static id = 'approvals';
  static label = 'module.approvals.title';
  static icon = 'check-circle';
  static nav = { group: 'REVIEW', order: 1 };
  static audience = 'general';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root, params) {
    this._root = root;
    this._wrap = root.querySelector('.pf-ap');
    this._listEl = root.querySelector('[data-region="list"]');
    this._detailEl = root.querySelector('[data-region="detail"]');
    this._countEl = root.querySelector('[data-region="count"]');
    const refresh = root.querySelector('[data-act="refresh"]');
    if (refresh) this.on(refresh, 'click', () => this.refresh());

    const E = globalThis.Platform.Entities;
    if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    // Re-render when the fabric changes anywhere relevant to approvals/references.
    this.bus('entity:approval:changed', () => this.load());
    this.bus('entity:reference:updated', () => this.load());
    // Follow the shared selection focus set by other lenses.
    this.bus('context:reference:changed', (e) => { if (e.source !== this.id) this.focusRef(e.ref); });

    this.load();
    const deep = params && params.path && params.path[0];
    if (deep) this.focusRef(deep);
  }

  pending() {
    return globalThis.Platform.Entities.all('approval')
      .filter((a) => !/approved|rejected|closed/i.test(String(a.status || a.Status || 'pending')));
  }

  load() {
    this._items = this.pending();
    this._countEl.textContent = this.t('approvals.pending', { n: this._items.length });
    this.renderList();
    if (this._items.length) this.select(0); else emptyState(this._detailEl, 'approvals.empty');
  }
  async refresh() { await globalThis.Platform.Entities.bootstrap(true); this.load(); }

  renderList() {
    clear(this._listEl);
    this._items.forEach((it, i) => {
      const item = el('button', { class: 'pf-ap__item', role: 'option' }, [
        el('div', { class: 'row' }, [
          el('span', { class: 'pf-badge pf-badge--routed', text: it.type || it.category || this.t('approvals.typeMemo') }),
          el('span', { class: 'when', text: it.ts ? this.fmt(it.ts) : '' })
        ]),
        el('div', { class: 'ttl', text: it.title || it.subject || it.__ref || it.__id || '' }),
        el('div', { class: 'from', text: this.t('approvals.from', { who: it.from || it.initiator || it.assignedTo || '' }) })
      ]);
      this.on(item, 'click', () => this.select(i));
      this._listEl.appendChild(item);
    });
  }

  select(i) {
    this._sel = i;
    [...this._listEl.children].forEach((c, idx) => c.setAttribute('aria-selected', idx === i ? 'true' : 'false'));
    if (this._wrap) this._wrap.setAttribute('data-mode', 'detail');
    const it = this._items[i];
    if (it && it.__ref) globalThis.Platform.Context.setActive(it.__ref, this.id); // share focus
    this.renderDetail(it);
  }
  focusRef(ref) {
    if (!ref || !this._items) return;
    const i = this._items.findIndex((x) => x.__ref === String(ref));
    if (i >= 0 && i !== this._sel) this.select(i);
  }

  renderDetail(it) {
    if (!it) return emptyState(this._detailEl, 'approvals.empty');
    clear(this._detailEl);
    const ref = it.__ref || it.__id || '';
    const related = ref ? globalThis.Platform.Entities.byReference(ref) : null;

    const head = el('div', { class: 'pf-ap__dethead' }, [
      el('div', {}, [
        el('div', { class: 'row', html:
          `<span class="pf-badge pf-badge--archived">${ref}</span> <span class="pf-badge pf-badge--pending">${this.t('approvals.statusPending')}</span>` }),
        el('h2', { text: it.title || it.subject || ref }),
        el('p', { class: 'from', text: this.t('approvals.submittedBy', { who: it.from || it.initiator || '', date: it.ts ? this.fmt(it.ts) : '' }) })
      ]),
      el('div', { class: 'pf-ap__acts' }, [
        el('button', { class: 'pf-btn pf-btn--primary', text: this.t('approvals.approve'), onClick: () => this.decide('approve', ref) }),
        el('button', { class: 'pf-btn pf-btn--ghost', text: this.t('approvals.reject'), onClick: () => this.decide('reject', ref) })
      ])
    ]);

    const summary = el('div', { class: 'pf-ap__sec' }, [
      el('h3', { text: this.t('approvals.summary') }),
      el('p', { text: it.summary || it.body || it.description || this.t('common.state.empty') })
    ]);

    // Cross-links: the same Reference seen through the other lenses (the integration payoff).
    const links = el('div', { class: 'pf-ap__sec' }, [ el('h3', { text: this.t('approvals.related') }) ]);
    const linkRow = el('div', { class: 'pf-ap__docs' });
    if (related) {
      const map = [['email', 'correspondence'], ['comment', 'comments'], ['task', 'orchestrator'],
                   ['document', 'ops-hub'], ['activity', 'fasttrack'], ['reference', 'response-tracking']];
      for (const [type, mod] of map) {
        const n = type === 'reference' ? 1 : (related[type] || []).length;
        if (!n) continue;
        const b = el('button', { class: 'pf-ap__doc',
          html: `<pf-icon name="${this.iconFor(type)}"></pf-icon> ${this.t('entity.' + type)} (${n})` });
        this.on(b, 'click', () => globalThis.Platform.goToEntity(ref, mod));
        linkRow.appendChild(b);
      }
    }
    if (!linkRow.children.length) linkRow.appendChild(el('span', { class: 'from', text: this.t('common.state.empty') }));
    links.appendChild(linkRow);

    const minute = el('div', { class: 'pf-ap__sec pf-ap__minute' }, [
      el('h3', { text: this.t('approvals.minute') }),
      el('textarea', { id: 'ap-comment', rows: '3', placeholder: this.t('approvals.minutePlaceholder') }),
      el('div', { class: 'pf-ap__sign' }, [ el('label', { html: `<input type="checkbox" id="ap-sign"> ${this.t('approvals.sign')}` }) ])
    ]);
    this._detailEl.append(head, summary, links, minute);
  }

  async decide(kind, ref) {
    const comment = (this._detailEl.querySelector('#ap-comment') || {}).value || '';
    const signed = !!(this._detailEl.querySelector('#ap-sign') || {}).checked;
    if (kind === 'reject' && !comment.trim()) { globalThis.Platform.UI.toast({ messageKey: 'approvals.needReason', variant: 'warning' }); return; }
    const ok = await globalThis.Platform.UI.confirm({
      titleKey: kind === 'approve' ? 'approvals.confirmApproveTitle' : 'approvals.confirmRejectTitle',
      summaryKey: kind === 'approve' ? 'approvals.confirmApproveBody' : 'approvals.confirmRejectBody',
      details: [ { label: this.t('entity.reference'), value: ref }, { label: this.t('approvals.minute'), value: comment || '—' }, { label: this.t('approvals.sign'), value: signed ? '✓' : '—' } ],
      confirmKey: kind === 'approve' ? 'approvals.approve' : 'approvals.reject', danger: kind === 'reject' });
    if (!ok) return;
    this.commit(kind, ref, comment, signed);
  }

  async commit(kind, ref, comment, signed) {
    const decision = kind === 'approve' ? 'Approved' : 'Rejected';
    // SUBSIDIARY_ACTIONS canonical envelope — mirrors live SPA executeSubsidiaryAction shape:
    // lowercase envelope (action/operation/mode/source via endpoint defaults + userEmail/method)
    // PLUS PascalCase entity-identity (Selected.ID/RefIDD/Title, AssignmentType).
    const P = globalThis.Platform;
    const persona = (P.Persona?.current && P.Persona.current()) || 'web-ops';
    const userEmail = (P.Persona?.email && P.Persona.email()) || `${persona}@nitda.gov.ng`;
    const refRow = P.Entities?.byReference?.(ref)?.reference || {};
    const title = refRow.title || refRow.subject || ref;
    const actionName = kind === 'approve' ? 'ACKNOWLEDGE' : 'UPDATE_TASK';
    const existing = (this._items[this._sel] || {});

    // Q-7 — sequential reviewer engine. When the approval carries an ordered reviewer chain, the active
    // token may only advance once the prior position has approved (Directive 3). Approve advances the
    // chain (the record resolves only when the whole chain completes); reject/return breaks it.
    const R = P.Reviewers;
    const chain = existing.reviewers || existing.Reviewers || null;
    let reviewersOut = null, chainComplete = true;
    if (R && Array.isArray(chain) && chain.length) {
      const act = R.active(chain);
      if (!act) { P.UI.toast({ messageKey: 'approvals.reviewerComplete', variant: 'info' }); return; }
      const adv = R.advance(chain, act.sequence, kind === 'approve' ? 'approve' : 'reject', { comment });
      if (!adv.ok) { P.UI.toast({ messageKey: 'approvals.reviewerLocked', variant: 'warning' }); return; }
      reviewersOut = adv.reviewers;
      // On approve, the record only reaches Approved when the chain is complete; otherwise it stays in
      // review with the token advanced. On reject the chain breaks and the record resolves immediately.
      chainComplete = kind === 'approve' ? adv.complete : true;
    }

    const payload = {
      action: actionName, method: 'POST', userEmail,
      AssignmentType: actionName,
      Selected: { ID: ref, RefIDD: String(ref), Title: title },
      RefIDD: String(ref),  // legacy flat field — kept for the flow's flat-read branch
      ...(kind === 'approve' ? { decision, comment, signed }
                              : { status: decision, reason: comment }),
      ...(reviewersOut ? { reviewers: reviewersOut } : {}),
      payload: {
        selection: { single: { ID: ref, RefIDD: String(ref), Title: title }, items: [] },
        decision: kind === 'approve' ? { value: decision, comment, signed } : { value: decision, reason: comment },
        ...(reviewersOut ? { reviewers: reviewersOut } : {})
      }
    };
    const result = await this.call(submitDecision, payload);
    if (result.ok) {
      // Mutate the shared fabric so every dependent lens/aggregator reacts immediately. When a reviewer
      // chain is mid-flight (approve but not yet complete), keep the approval pending and persist the
      // advanced chain so the next reviewer in sequence can act.
      const nextStatus = (kind === 'approve' && !chainComplete) ? (existing.status || 'pending-review') : decision;
      globalThis.Platform.Entities.upsert('approval', { ...existing, referenceId: ref, status: nextStatus, ...(reviewersOut ? { reviewers: reviewersOut } : {}) });
      const doneKey = (kind === 'approve' && !chainComplete) ? 'approvals.reviewerAdvanced'
        : (kind === 'approve' ? 'approvals.approved' : 'approvals.rejected');
      globalThis.Platform.UI.actionCompleted(doneKey, { module: 'approvals', target: existing.__ref || existing.referenceId || ref });
    }
  }

  iconFor(t) { return { email: 'mail', comment: 'message-square', task: 'workflow', document: 'folder', activity: 'activity', reference: 'table' }[t] || 'file-text'; }
  fmt(v) { return globalThis.Platform?.Format?.dateTime ? globalThis.Platform.Format.dateTime(v) : String(v); }
}
Modules.register(ApprovalsModule);
export default ApprovalsModule;
