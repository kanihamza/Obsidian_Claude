/** Service for 'bulk-assignment' — @see Endpoints#BULK_ASSIGNMENT / #BULK_ASSIGNMENT_DIRECT
 *  (family F3, envelope v1). Faithful to the SPA's dual-mode bulk submit:
 *    - submitBulkAssignmentDirect    → SPA E06 'bulk Assign direct'
 *    - submitBulkAssignmentOptimized → SPA E07 'optimized bulk assign'
 *  Both share one payload contract; the lens picks the endpoint by the button the operator clicks.
 *  Each returns the full normalized API result; the lens reads result.data. */
import { BaseService } from '../../core/base-service.js';

export const submitBulkAssignmentDirect = BaseService.endpoint('BULK_ASSIGNMENT_DIRECT', { expectedKeys: ['ok', 'data'] });
export const submitBulkAssignmentOptimized = BaseService.endpoint('BULK_ASSIGNMENT', { expectedKeys: ['ok', 'data'] });

/** Route by SPA mode token: 'direct' → E06, 'optimized' → E07. */
export function submitBulkAssignment(mode, payload) {
  return mode === 'optimized' ? submitBulkAssignmentOptimized(payload) : submitBulkAssignmentDirect(payload);
}
export default submitBulkAssignment;
