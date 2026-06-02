/** Service for 'approvals' — list + decision via canonical SUBSIDIARY_ACTIONS (v4).
 *  Legacy SPA pointed approvals at a non-canonical workflow (f71397ff); re-pointed to the canonical
 *  Stream-B SUBSIDIARY_ACTIONS endpoint per locked authority. @see /docs/CONTRACT-CONFORMANCE.md */
import { BaseService } from '../../core/base-service.js';
export const fetchPending = BaseService.endpoint('SUBSIDIARY_ACTIONS', { cache: 10000, expectedKeys: ['success', 'data'] });
export const submitDecision = BaseService.endpoint('SUBSIDIARY_ACTIONS', { expectedKeys: ['success', 'data'] });
