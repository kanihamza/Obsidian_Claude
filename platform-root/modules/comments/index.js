/** OBSIDIAN v4.0 — module 'comments' (Governance · LENS · audience:general).
 *  Lens over the shared fabric: shows the comment thread for the active Reference (or all),
 *  follows cross-module context, and on submit writes via canonical DYNAMIC_GLOBAL_ACTIONS then
 *  upserts the shared entity so dependent lenses react. UI is the shared <pf-comment-thread>. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { addComment } from './service.js';

class CommentsModule extends BaseModule {
  static id = 'comments';
  static label = 'module.comments.title';
  static icon = 'message-square';
  static nav = { group: 'Governance', order: 3, hidden: true };
  static audience = 'general';
  static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root, params) {
    this._scopeEl = root.querySelector('[data-region="scope"]');
    const host = root.querySelector('[data-region="thread"]');
    host.innerHTML = '';
    this._thread = document.createElement('pf-comment-thread');
    host.appendChild(this._thread);
    this.on(this._thread, 'pf-comment:submit', (e) => this.submit(e.detail));

    const refresh = root.querySelector('[data-act="refresh"]');
    if (refresh) this.on(refresh, 'click', () => this.refresh());

    const E = globalThis.Platform.Entities;
    if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    this.bus('entity:comment:changed', () => this.paint());
    this.bus('context:reference:changed', () => this.paint());

    const deep = params && params.path && params.path[0];
    if (deep) globalThis.Platform.Context.setActive(deep, this.id);
    this.paint();
  }

  paint() {
    const E = globalThis.Platform.Entities;
    const ref = globalThis.Platform.Context.activeReference();
    const items = ref ? E.byReference(ref).comment : E.all('comment');
    this._thread.reference = ref;
    this._thread.items = items;
    this._scopeEl.textContent = ref
      ? this.t('comments.scopeRef', { ref, n: items.length })
      : this.t('comments.scopeAll', { n: items.length });
  }

  async refresh() { await globalThis.Platform.Entities.bootstrap(true); this.paint(); }

  async submit({ text, sentiment, priority, reference }) {
    const ref = reference || globalThis.Platform.Context.activeReference() || '';
    const ok = await globalThis.Platform.UI.confirm({ titleKey: 'comments.confirmTitle', summaryKey: 'action.confirmSummary',
      details: [ { label: this.t('entity.reference'), value: ref || '—' }, { label: this.t('comments.add'), value: text } ],
      confirmKey: 'comments.add' });
    if (!ok) return;
    const result = await this.call(addComment, {
      action: 'addComment', referenceId: ref, body: text, sentiment, priority,
      author: globalThis.Platform.State.get('shared.session.userEmail', '') || this.t('comments.you')
    });
    if (result.ok) {
      globalThis.Platform.Entities.upsert('comment', {
        referenceId: ref, body: text, sentiment, priority, status: 'Pending',
        author: globalThis.Platform.State.get('shared.session.userEmail', '') || this.t('comments.you'),
        ts: new Date().toISOString()
      });
      globalThis.Platform.UI.toastSuccess('comments.added');
    }
  }
}
Modules.register(CommentsModule);
export default CommentsModule;
