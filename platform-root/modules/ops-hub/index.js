/** OBSIDIAN v4.0 — module 'ops-hub' (Operations · LENS · audience:general).
 *  Ports the NITDA hub Docs view: gallery + doc detail with Assign-from-doc and
 *  Flag-for-DG-attention, both routed through the mandatory confirm layer (canonical SINGLE_ASSIGNMENT).
 *  Fabric-backed master-detail with cross-links. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { BaseService } from '../../core/base-service.js';
import { mountMasterDetail, appendRichSections } from '../../shared/utils/lens.js';
import { el, clear } from '../../shared/utils/dom.js';

const assignEndpoint = BaseService.endpoint('SINGLE_ASSIGNMENT', { expectedKeys: ['ok', 'data'] });

class OpsHubModule extends BaseModule {
  static id = 'ops-hub';
  static label = 'module.ops-hub.title';
  static icon = 'folder';
  static nav = { group: 'ROUTING', order: 1 };
  static audience = 'general';
  static status = 'active';
  static base = new URL('.', import.meta.url);
  // D-1: statuses that mean a record has already moved past routing (or is terminal). Anything NOT in
  // this set — fresh / registered / triaged / triage_complete / unknown — stays in the routing queue.
  static ROUTED = new Set(['assigning', 'assigned', 'assignment-failed', 'acknowledged', 'in-progress',
    'action-complete', 'reassign-requested', 'pending-review', 'approved', 'approved-with-edit', 'returned',
    'escalated', 'dispatch-pending', 'dispatch-in-flight', 'dispatched', 'dispatch-failed', 'no-dispatch',
    'closed', 'partial-dispatch', 'archived', 'cold-archived', 'routed', 'replied']);

  async onVisible(root) {
    const E = globalThis.Platform.Entities; if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    mountMasterDetail(this, root, {
      type: 'document', cardLabel: 'title',
      detail: (it, pane, mod) => mod.renderDocDetail(it, pane),
      // ROUTING is for items still needing routing. Default scope hides clearly-routed/terminal records
      // but keeps fresh / triage-complete / unknown visible, so the queue is never wrongly emptied. The
      // built-in toggle reveals everything on demand.
      prefilter: (r) => !OpsHubModule.ROUTED.has(String((r && (r.status || r.Status)) || '').toLowerCase().trim()),
      enableBulkSelect: true,
      bulkActions: ({ selected, clear }) => [
        el('button', {
          class: 'pf-btn pf-btn--primary', type: 'button',
          html: `<pf-icon name="layers" size="14"></pf-icon> ${this.t('opshub.bulkAssign', { n: selected.length })}`,
          onClick: () => {
            // Hand selected refs to bulk-assignment via Context (it can hydrate the picker from this)
            globalThis.Platform.Context.setBulkSelection?.(selected);
            // Also persist in State for fallback
            globalThis.Platform.State?.set('shared.bulkSelection', { refs: selected, source: this.id, ts: Date.now() });
            globalThis.Platform.Router.navigate('bulk-assignment');
          }
        }),
        // Consolidate the selected references into a meeting pack — routed through the Dynamic Global
        // Actions flow (prepareMeetingPack contract; no dedicated endpoint). Selection → refs, with
        // preview + confirm + parsed feedback via Platform.Actions.run.
        el('button', {
          class: 'pf-btn pf-btn--ghost', type: 'button',
          html: `<pf-icon name="clipboard" size="14"></pf-icon> ${this.t('opshub.meetingPack', { n: selected.length })}`,
          onClick: () => {
            const A = globalThis.Platform.Actions;
            if (A && A.run) A.run('prepareMeetingPack', {
              preview: {
                titleKey: 'opshub.meetingPackTitle',
                summary: this.t('opshub.meetingPackSummary', { n: selected.length }),
                confirmKey: 'opshub.meetingPackConfirm',
                details: selected.slice(0, 12).map((r) => ({ label: this.t('field.referenceId.label'), value: r }))
              },
              payload: { refs: selected }
            }).then((res) => { if (res && res.ok) clear(); });
          }
        })
      ]
    });
  }

  renderDocDetail(it, pane) {
    clear(pane);
    const ref = it.__ref || '';
    const rel = ref ? globalThis.Platform.Entities.byReference(ref) : { email: [], task: [], comment: [], approval: [] };
    pane.append(
      el('div', { class: 'pf-md__dhead' }, [
        el('div', { html: `<span class="pf-badge pf-badge--archived">${ref}</span>` }),
        el('h2', { text: it.title || it.__id }),
        el('p', { class: 'pf-md__meta', text: this.t('opshub.assignedMeta', { who: it.assignedTo || '—', status: it.status || it.Status || '—' }) })
      ]),
      el('div', { class: 'pf-toolbar', style: 'margin:var(--space-4) 0;flex-wrap:wrap' }, [
        el('button', { class: 'pf-btn pf-btn--primary', text: this.t('opshub.assign'),
          onClick: () => globalThis.Platform.Router.navigate('single-item-ops/' + (it.__ref || it.__id || '')) }),
        el('button', { class: 'pf-btn pf-btn--danger', text: this.t('opshub.flag'), onClick: () => this.flag(it) })
      ]),
      el('div', { class: 'pf-toolbar', style: 'flex-wrap:wrap' }, [
        el('span', { class: 'pf-overline', text: this.t('lens.relatedTo', { ref }) }),
        ...[['email', 'correspondence', 'mail'], ['task', 'orchestrator', 'workflow'], ['comment', 'comments', 'message-square'], ['approval', 'approvals', 'check-circle']]
          .map(([et, mod, icon]) => { const n = (rel[et] || []).length; if (!n) return null;
            return el('button', { class: 'pf-btn pf-btn--ghost', html: `<pf-icon name="${icon}" size="14"></pf-icon> ${this.t('entity.' + et)} (${n})`, onClick: () => globalThis.Platform.goToEntity(ref, mod) }); }).filter(Boolean)
      ])
    );
    // Inline workspace: comments thread + activity timeline (no navigate-away).
    appendRichSections(pane, it, this, { type: 'document' });
  }

  /** Flag for DG attention — opens the proper rich modal (reason + urgency + classification). */
  async flag(it) {
    const result = await globalThis.Platform.UI.openFlagDocument(it);
    if (result && result.ok) {
      // Upserts + actionCompleted handled inside UI.openFlagDocument; nothing else required here.
    }
  }
}
Modules.register(OpsHubModule);
export default OpsHubModule;
