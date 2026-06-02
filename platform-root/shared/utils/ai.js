/** OBSIDIAN v4.0 — shared/utils/ai.js · Platform AI actions (dedup target, DECOMPOSITION).
 *  Single wrapper over the F5 AI flows so no module re-implements them:
 *    AI.analyseDocument(ref) → AI_DOC_ANALYSIS   AI.analyseEmail(id) → AI_EMAIL_ANALYSIS
 *    AI.chat(messages)       → AI_CHAT
 *  action/operation/mode/source are injected by each endpoint's defaults; callers pass only the
 *  variable fields. Returns the normalized API result ({ ok, data, errors, … }). */
import { BaseService } from '../../core/base-service.js';

const _doc = BaseService.endpoint('AI_DOC_ANALYSIS', { expectedKeys: ['ok', 'data'] });
const _email = BaseService.endpoint('AI_EMAIL_ANALYSIS', { expectedKeys: ['ok', 'data'] });
const _chat = BaseService.endpoint('AI_CHAT', { expectedKeys: ['ok', 'data'] });

export const AI = {
  analyseDocument(referenceOrId, extra = {}) {
    return _doc({ documentId: referenceOrId, referenceId: referenceOrId, ...extra });
  },
  analyseEmail(emailId, extra = {}) {
    return _email({ emailId, ...extra });
  },
  chat(messages, extra = {}) {
    const msgs = Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages || '') }];
    return _chat({ messages: msgs, ...extra });
  },
  /** Extract a human-readable string from an F5 result's data ({ <resultObject>, model, tokensUsed }). */
  summaryOf(result) {
    const d = (result && result.data) || {};
    if (typeof d.summary === 'string') return d.summary;
    if (typeof d.analysis === 'string') return d.analysis;
    if (typeof d.text === 'string') return d.text;
    if (typeof d.message === 'string') return d.message;
    // first non-meta value
    for (const [k, v] of Object.entries(d)) {
      if (k === 'model' || k === 'tokensUsed') continue;
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object') return JSON.stringify(v, null, 2);
    }
    return '';
  }
};

export default AI;
