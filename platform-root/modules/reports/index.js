/** OBSIDIAN v4.0 — module 'reports' (Executive · AGGREGATOR · audience:executive). Reads Entities.counts() + chart. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { mountAggregator } from '../../shared/utils/lens.js';
class ReportsModule extends BaseModule {
  static id='reports'; static label='module.reports.title'; static icon='file-text';
  static nav = { group: 'Intelligence', order: 3 }; static audience='executive'; static status='active';
  static base=new URL('.', import.meta.url);
  async onVisible(root){ const E=globalThis.Platform.Entities; if(!E.isHydrated()) await E.bootstrap().catch(()=>{});
    mountAggregator(this, root, { tiles:[['reference','response-tracking','table'], ['document','ops-hub','folder'], ['task','orchestrator','workflow'], ['email','correspondence','mail'], ['approval','approvals','check-circle'], ['comment','comments','message-square']], table:{ type:'reference', csvName:'reports.csv', columns:[{ key:'referenceId', labelKey:'field.referenceId.label' }, { key:'title', labelKey:'field.subject.label' }, { key:'status', labelKey:'field.status.label' }, { key:'priority', labelKey:'field.priority.label' }, { key:'ts', labelKey:'field.ts.label' }] } }); }
}
Modules.register(ReportsModule);
export default ReportsModule;
