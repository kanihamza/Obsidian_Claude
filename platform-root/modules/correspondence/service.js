/** Service for 'correspondence' — reads from the shared fabric (Entities); writes via canonical
 *  endpoints: AI classification → AI_EMAIL_ANALYSIS, create → EMAIL_RELATED_TASK.
 *  Legacy SPA transmitToPowerAutomate re-pointed per @see /docs/CONTRACT-CONFORMANCE.md */
import { BaseService } from '../../core/base-service.js';
export const aiClassify = BaseService.endpoint('AI_EMAIL_ANALYSIS', { expectedKeys: ['ok', 'data'] });
export const createCorrespondence = BaseService.endpoint('EMAIL_RELATED_TASK', { expectedKeys: ['ok', 'data'] });
