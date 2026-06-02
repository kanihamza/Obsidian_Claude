/** OBSIDIAN v4.0 — module 'orchestrator' (Operations · LENS · audience:general).
 *  Task-orchestration lens over the shared fabric: filterable task list, row→active Reference,
 *  cross-links to the related document/email/approval, CSV export. It is the deep-link HOME for
 *  tasks (ENTITY_HOME_MODULE.task) — arriving via goToEntity(ref,'orchestrator') focuses that ref. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { mountListLens } from '../../shared/utils/lens.js';

class OrchestratorModule extends BaseModule {
  static id = 'orchestrator'; static label = 'module.orchestrator.title'; static icon = 'workflow';
  static nav = { group: 'Operations', order: 3 }; static audience = 'general'; static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root, params) {
    const E = globalThis.Platform.Entities;
    if (!E.isHydrated()) await E.bootstrap().catch(() => {});
    mountListLens(this, root, {
      type: 'task',
      columns: [
        { key: 'referenceId', labelKey: 'field.referenceId.label' },
        { key: 'title', labelKey: 'field.subject.label' },
        { key: 'priority', labelKey: 'field.priority.label' },
        { key: 'status', labelKey: 'field.status.label' },
        { key: 'assignedTo', labelKey: 'field.assignedTo.label' }
      ],
      csvName: 'orchestrator.csv',
      linked: true,
      focusRef: (params && params.path && params.path[0]) || ''   // deep-link: #/orchestrator/<ref>
    });
  }
}
Modules.register(OrchestratorModule);
export default OrchestratorModule;
